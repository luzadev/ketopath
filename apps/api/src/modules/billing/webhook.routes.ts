import type { ExtendedPrismaClient } from '@ketopath/db';
import type { FastifyPluginAsync } from 'fastify';
// eslint-disable-next-line import/no-named-as-default
import type Stripe from 'stripe';

import { billingEnv, isBillingConfigured } from './env.js';
import { applyStripeSubscription } from './service.js';
import { getStripe } from './stripe-client.js';

/**
 * ADR 0004 — webhook Stripe. Receive raw body, verifica firma HMAC,
 * idempotenza via tabella `BillingWebhookEvent`, dispatch agli handler
 * per i 5 eventi che ci interessano.
 *
 * Encapsulation: il content-type parser raw è registrato dentro un
 * `fastify.register()` scope così non interferisce con le altre rotte
 * (che si aspettano JSON parsato).
 */
export const stripeWebhookRoutes: FastifyPluginAsync = async (parent) => {
  await parent.register(async (instance) => {
    instance.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_request, body, done) => {
        done(null, body);
      },
    );

    instance.post('/webhooks/stripe', async (request, reply) => {
      if (!isBillingConfigured()) {
        return reply.code(503).send({ error: 'billing_not_configured' });
      }
      const signature = request.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        return reply.code(400).send({ error: 'missing_signature' });
      }
      const rawBody = request.body as Buffer;
      const stripe = getStripe();

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          billingEnv.STRIPE_WEBHOOK_SECRET!,
        );
      } catch (err) {
        request.log.warn({ err }, 'webhook signature verification failed');
        return reply.code(400).send({ error: 'invalid_signature' });
      }

      // Idempotenza: se l'evento è già stato visto, rispondiamo 200 senza
      // ri-eseguire l'handler. Stripe accetta anche 200 su evento già processato.
      const existing = await instance.prisma.billingWebhookEvent.findUnique({
        where: { id: event.id },
      });
      if (existing?.processedAt) {
        request.log.debug({ eventId: event.id }, 'webhook already processed, skipping');
        return reply.code(200).send({ received: true, duplicate: true });
      }
      // Registriamo l'evento (anche se l'handler fallirà sotto, così abbiamo
      // un audit trail di tutto quello che Stripe ci ha mandato).
      await instance.prisma.billingWebhookEvent.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          type: event.type,
          payload: event as unknown as Stripe.Event,
        },
        update: {},
      });

      try {
        await dispatchEvent(instance.prisma, stripe, event);
        await instance.prisma.billingWebhookEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
        return reply.code(200).send({ received: true });
      } catch (err) {
        request.log.error({ err, eventId: event.id, type: event.type }, 'webhook handler failed');
        // 500 → Stripe ritenta. processedAt resta null, idempotenza ok al
        // prossimo retry.
        return reply.code(500).send({ error: 'handler_failed' });
      }
    });
  });
};

async function dispatchEvent(
  prisma: ExtendedPrismaClient,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await applyStripeSubscription(prisma, sub);
      return;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription) return;
      const subId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      // Recuperiamo la subscription completa (con items expansi) per avere
      // tutti i dati che ci servono per applyStripeSubscription.
      const fullSub = await stripe.subscriptions.retrieve(subId);
      await applyStripeSubscription(prisma, fullSub);
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const lineSub = invoice.lines.data.find((line) => line.subscription)?.subscription;
      if (!lineSub) return;
      const subId = typeof lineSub === 'string' ? lineSub : lineSub.id;
      const fullSub = await stripe.subscriptions.retrieve(subId);
      await applyStripeSubscription(prisma, fullSub);
      return;
    }
    default:
      // Eventi non gestiti — log silenzioso. Stripe ne manda decine, normale.
      return;
  }
}
