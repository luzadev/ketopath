/**
 * ADR 0004 — calcolo "isProActive" e derivazione dello stato di abbonamento
 * a partire dallo snapshot persistito in DB. Funzione pura e testabile.
 *
 * NB: lo stato in DB viene aggiornato dal webhook Stripe; questa logica è
 * usata sia dal backend (paywall middleware) sia dal frontend (banner /
 * pulsanti CTA in /billing).
 */

export const TRIAL_DAYS = 30;

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCEL_AT_PERIOD_END'
  | 'CANCELED'
  | 'EXPIRED';

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Vero se l'utente ha diritto alle feature Pro in questo momento.
 * Gestita anche la transizione "trial scaduto ma non ancora marcato EXPIRED
 * dal cron": in lettura calcoliamo live, così non serve un job che gira
 * ogni minuto. Il cron resta utile solo per allineare lo stato persistito.
 */
export function isProActive(snap: SubscriptionSnapshot | null, now: Date = new Date()): boolean {
  if (!snap) return false;
  const t = now.getTime();
  switch (snap.status) {
    case 'TRIALING':
      return snap.trialEndsAt.getTime() > t;
    case 'ACTIVE':
    case 'PAST_DUE':
      // Durante PAST_DUE Stripe ha la sua dunning sequence (3-7gg).
      // Manteniamo l'accesso Pro: l'utente non ha colpa di un retry in corso.
      return true;
    case 'CANCEL_AT_PERIOD_END':
      return snap.currentPeriodEnd != null && snap.currentPeriodEnd.getTime() > t;
    case 'CANCELED':
    case 'EXPIRED':
      return false;
  }
}

export type ProDerivedKind =
  | 'trial'
  | 'trial_expired'
  | 'active'
  | 'past_due'
  | 'canceling'
  | 'canceled'
  | 'no_subscription';

export interface ProDerivedStatus {
  kind: ProDerivedKind;
  /** True ↔ isProActive(snap). Comodità per l'UI. */
  isPro: boolean;
  /** Giorni rimasti del trial (solo se `kind === 'trial'`), arrotondati per eccesso. */
  trialDaysRemaining: number | null;
  /** Quando finisce l'accesso (trial o abbonamento). Null se canceled/no_sub. */
  accessEndsAt: Date | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function deriveProStatus(
  snap: SubscriptionSnapshot | null,
  now: Date = new Date(),
): ProDerivedStatus {
  if (!snap) {
    return { kind: 'no_subscription', isPro: false, trialDaysRemaining: null, accessEndsAt: null };
  }
  const isPro = isProActive(snap, now);
  const t = now.getTime();
  switch (snap.status) {
    case 'TRIALING': {
      const remainingMs = snap.trialEndsAt.getTime() - t;
      if (remainingMs <= 0) {
        // trial scaduto ma DB ancora TRIALING (cron in ritardo): trattiamo come expired
        return {
          kind: 'trial_expired',
          isPro: false,
          trialDaysRemaining: 0,
          accessEndsAt: snap.trialEndsAt,
        };
      }
      return {
        kind: 'trial',
        isPro: true,
        trialDaysRemaining: Math.max(1, Math.ceil(remainingMs / MS_PER_DAY)),
        accessEndsAt: snap.trialEndsAt,
      };
    }
    case 'ACTIVE':
      return {
        kind: 'active',
        isPro,
        trialDaysRemaining: null,
        accessEndsAt: snap.currentPeriodEnd,
      };
    case 'PAST_DUE':
      return {
        kind: 'past_due',
        isPro,
        trialDaysRemaining: null,
        accessEndsAt: snap.currentPeriodEnd,
      };
    case 'CANCEL_AT_PERIOD_END':
      return {
        kind: 'canceling',
        isPro,
        trialDaysRemaining: null,
        accessEndsAt: snap.currentPeriodEnd,
      };
    case 'CANCELED':
    case 'EXPIRED':
      return { kind: 'canceled', isPro: false, trialDaysRemaining: null, accessEndsAt: null };
  }
}

/** Calcola la data di fine trial a partire dalla data di signup. */
export function computeTrialEndsAt(signupAt: Date, days: number = TRIAL_DAYS): Date {
  return new Date(signupAt.getTime() + days * MS_PER_DAY);
}
