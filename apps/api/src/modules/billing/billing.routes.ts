import { deriveProStatus } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../../plugins/auth.js';

import { billingEnv, isBillingConfigured } from './env.js';
import { ensureSubscription, getSubscription, toSnapshot } from './service.js';
import { getStripe } from './stripe-client.js';

const checkoutBodySchema = z.object({
  interval: z.enum(['MONTH', 'YEAR']),
});

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /me/billing/status — stato corrente dell'abbonamento + derived.
   * Risponde sempre 200 (anche per utenti senza subscription record): il
   * frontend usa lo stesso payload sia per chi non ha mai aperto la pagina
   * billing sia per chi è in trial / pro / canceled.
   */
  fastify.get('/me/billing/status', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const signupAt = request.user!.createdAt;
    // Side effect benefico: chiamare /status la prima volta crea il record
    // di trial se non esiste. Idempotente.
    const sub = await ensureSubscription(fastify.prisma, userId, signupAt);
    const snap = toSnapshot(sub);
    const derived = deriveProStatus(snap);
    return {
      subscription: snap
        ? {
            status: snap.status,
            trialEndsAt: snap.trialEndsAt.toISOString(),
            currentPeriodEnd: snap.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: snap.cancelAtPeriodEnd,
            interval: sub.interval,
            stripePriceId: sub.stripePriceId,
          }
        : null,
      derived: {
        kind: derived.kind,
        isPro: derived.isPro,
        trialDaysRemaining: derived.trialDaysRemaining,
        accessEndsAt: derived.accessEndsAt?.toISOString() ?? null,
      },
      configured: isBillingConfigured(),
    };
  });

  /**
   * POST /me/billing/checkout — crea una Stripe Checkout Session per il
   * primo upgrade. Restituisce l'URL hosted Stripe a cui redirigere l'utente.
   */
  fastify.post('/me/billing/checkout', { preHandler: requireAuth() }, async (request, reply) => {
    if (!isBillingConfigured()) {
      return reply.code(503).send({ error: 'billing_not_configured' });
    }
    const body = checkoutBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: body.error.issues });
    }
    const { interval } = body.data;
    const priceId =
      interval === 'YEAR' ? billingEnv.STRIPE_PRICE_ID_YEARLY : billingEnv.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) {
      return reply.code(503).send({ error: 'price_not_configured' });
    }

    const userId = request.user!.id;
    const userEmail = request.user!.email;
    const signupAt = request.user!.createdAt;
    const stripe = getStripe();

    const sub = await ensureSubscription(fastify.prisma, userId, signupAt);

    // Riusa il customer Stripe se l'utente ha già pagato in passato; altrimenti
    // ne creiamo uno nuovo passando metadata.userId per il webhook.
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
      await fastify.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${billingEnv.BILLING_RETURN_URL}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${billingEnv.BILLING_RETURN_URL}/billing?status=canceled`,
      // Critico: il webhook risale all'utente da queste metadata.
      subscription_data: { metadata: { userId } },
      // Stripe Tax: calcolo automatico dell'IVA UE (vedi ADR 0004).
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      // Permette all'utente di inserire una P.IVA (per chi compra B2B).
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      locale: 'it',
    });

    return reply.send({ url: session.url });
  });

  /**
   * POST /me/billing/portal — crea una Customer Portal Session per la
   * gestione self-service di abbonamento, fatture, metodo di pagamento.
   */
  fastify.post('/me/billing/portal', { preHandler: requireAuth() }, async (request, reply) => {
    if (!isBillingConfigured()) {
      return reply.code(503).send({ error: 'billing_not_configured' });
    }
    const userId = request.user!.id;
    const sub = await getSubscription(fastify.prisma, userId);
    if (!sub?.stripeCustomerId) {
      return reply.code(409).send({ error: 'no_stripe_customer' });
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${billingEnv.BILLING_RETURN_URL}/billing`,
      locale: 'it',
    });
    return reply.send({ url: session.url });
  });
};
