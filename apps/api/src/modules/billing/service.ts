import type { ExtendedPrismaClient, Subscription } from '@ketopath/db';
import {
  computeTrialEndsAt,
  isProActive,
  type SubscriptionSnapshot,
  type SubscriptionStatus as SharedStatus,
} from '@ketopath/shared';
// eslint-disable-next-line import/no-named-as-default
import type Stripe from 'stripe';

/**
 * ADR 0004 — service di billing. Orchestrazione tra Stripe e DB locale.
 * Le route lo invocano per leggere/scrivere lo stato subscription; il
 * webhook lo invoca per applicare gli eventi `customer.subscription.*`.
 */

export function toSnapshot(sub: Subscription | null): SubscriptionSnapshot | null {
  if (!sub) return null;
  return {
    status: sub.status as SharedStatus,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

/**
 * Crea il record Subscription per l'utente se non esiste — il trial parte
 * dalla data di registrazione. Idempotente: se esiste già, non tocca nulla.
 */
export async function ensureSubscription(
  prisma: ExtendedPrismaClient,
  userId: string,
  signupAt: Date,
): Promise<Subscription> {
  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: 'TRIALING',
      trialEndsAt: computeTrialEndsAt(signupAt),
    },
    update: {},
  });
}

export async function getSubscription(
  prisma: ExtendedPrismaClient,
  userId: string,
): Promise<Subscription | null> {
  return prisma.subscription.findUnique({ where: { userId } });
}

export async function isUserPro(prisma: ExtendedPrismaClient, userId: string): Promise<boolean> {
  const sub = await getSubscription(prisma, userId);
  return isProActive(toSnapshot(sub));
}

/* ─────────────────────────────────────────────────────────────────────
 * Mapping da Stripe.Subscription al nostro stato.
 * ────────────────────────────────────────────────────────────────────── */

function mapStatus(
  stripeStatus: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean,
): SharedStatus {
  if (cancelAtPeriodEnd && (stripeStatus === 'active' || stripeStatus === 'trialing')) {
    return 'CANCEL_AT_PERIOD_END';
  }
  switch (stripeStatus) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'CANCELED';
    case 'incomplete':
    case 'paused':
      // Stati transitori — manteniamo lo stato corrente in DB. Stripe rinotifica
      // appena la situazione si stabilizza. Per sicurezza torniamo PAST_DUE.
      return 'PAST_DUE';
  }
}

function mapInterval(
  interval: Stripe.Price.Recurring.Interval | null | undefined,
): 'MONTH' | 'YEAR' | null {
  if (interval === 'month') return 'MONTH';
  if (interval === 'year') return 'YEAR';
  return null;
}

/**
 * Applica un evento `customer.subscription.*` o `checkout.session.completed`
 * di Stripe al record locale. Idempotente: lo possiamo invocare con lo stesso
 * payload N volte senza side effect.
 */
export async function applyStripeSubscription(
  prisma: ExtendedPrismaClient,
  stripeSub: Stripe.Subscription,
): Promise<void> {
  const userId = stripeSub.metadata?.userId;
  if (!userId) {
    throw new Error(`stripe subscription ${stripeSub.id} priva di metadata.userId`);
  }
  const item = stripeSub.items.data[0];
  if (!item) throw new Error(`stripe subscription ${stripeSub.id} senza items`);

  const cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
  const status = mapStatus(stripeSub.status, cancelAtPeriodEnd);
  const currentPeriodEnd = item.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status,
      // Se Stripe ci dà un trial_end (caso del trial-with-card), lo prendiamo.
      // Altrimenti usiamo il trial nativo a 30gg dalla creazione del record.
      trialEndsAt: trialEnd ?? computeTrialEndsAt(new Date()),
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: item.price.id,
      currentPeriodEnd,
      interval: mapInterval(item.price.recurring?.interval),
      cancelAtPeriodEnd,
      endedAt: status === 'CANCELED' ? new Date() : null,
    },
    update: {
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: item.price.id,
      currentPeriodEnd,
      interval: mapInterval(item.price.recurring?.interval),
      cancelAtPeriodEnd,
      endedAt: status === 'CANCELED' ? new Date() : null,
    },
  });
}

/**
 * Marca come EXPIRED le subscription TRIALING il cui trial è scaduto.
 * Invocata da uno scheduler giornaliero (vedi notifications/scheduler).
 * Restituisce il numero di record aggiornati.
 */
export async function expireFinishedTrials(prisma: ExtendedPrismaClient, now: Date = new Date()) {
  const res = await prisma.subscription.updateMany({
    where: {
      status: 'TRIALING',
      trialEndsAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
      endedAt: now,
    },
  });
  return res.count;
}
