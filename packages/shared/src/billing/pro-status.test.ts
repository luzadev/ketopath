import { describe, expect, it } from 'vitest';

import {
  computeTrialEndsAt,
  deriveProStatus,
  isProActive,
  TRIAL_DAYS,
  type SubscriptionSnapshot,
} from './pro-status.js';

const NOW = new Date('2026-05-07T12:00:00Z');

function snap(partial: Partial<SubscriptionSnapshot>): SubscriptionSnapshot {
  return {
    status: 'TRIALING',
    trialEndsAt: new Date('2026-06-01T00:00:00Z'),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...partial,
  };
}

describe('isProActive', () => {
  it('false se snap è null (nessuna subscription)', () => {
    expect(isProActive(null, NOW)).toBe(false);
  });

  it('TRIALING valido finché trialEndsAt è nel futuro', () => {
    expect(isProActive(snap({ status: 'TRIALING' }), NOW)).toBe(true);
  });

  it('TRIALING con trialEndsAt passato → false (cron in ritardo)', () => {
    expect(
      isProActive(snap({ status: 'TRIALING', trialEndsAt: new Date('2026-05-01') }), NOW),
    ).toBe(false);
  });

  it('ACTIVE sempre true', () => {
    expect(isProActive(snap({ status: 'ACTIVE' }), NOW)).toBe(true);
  });

  it('PAST_DUE = true (manteniamo accesso durante dunning Stripe)', () => {
    expect(isProActive(snap({ status: 'PAST_DUE' }), NOW)).toBe(true);
  });

  it('CANCEL_AT_PERIOD_END = true finché currentPeriodEnd è nel futuro', () => {
    expect(
      isProActive(
        snap({ status: 'CANCEL_AT_PERIOD_END', currentPeriodEnd: new Date('2026-06-01') }),
        NOW,
      ),
    ).toBe(true);
  });

  it('CANCEL_AT_PERIOD_END con periodo già scaduto → false', () => {
    expect(
      isProActive(
        snap({ status: 'CANCEL_AT_PERIOD_END', currentPeriodEnd: new Date('2026-05-01') }),
        NOW,
      ),
    ).toBe(false);
  });

  it('CANCELED, EXPIRED → false', () => {
    expect(isProActive(snap({ status: 'CANCELED' }), NOW)).toBe(false);
    expect(isProActive(snap({ status: 'EXPIRED' }), NOW)).toBe(false);
  });
});

describe('deriveProStatus', () => {
  it('no subscription → kind no_subscription, isPro false', () => {
    expect(deriveProStatus(null, NOW).kind).toBe('no_subscription');
  });

  it('trial in corso → trialDaysRemaining = ceil giorni mancanti', () => {
    const s = deriveProStatus(snap({ trialEndsAt: new Date('2026-05-10T12:00:00Z') }), NOW);
    expect(s.kind).toBe('trial');
    expect(s.isPro).toBe(true);
    expect(s.trialDaysRemaining).toBe(3);
  });

  it('trial scaduto ma DB ancora TRIALING → kind trial_expired', () => {
    const s = deriveProStatus(
      snap({ status: 'TRIALING', trialEndsAt: new Date('2026-05-01') }),
      NOW,
    );
    expect(s.kind).toBe('trial_expired');
    expect(s.isPro).toBe(false);
    expect(s.trialDaysRemaining).toBe(0);
  });

  it('cancel_at_period_end → kind canceling con accessEndsAt valorizzato', () => {
    const end = new Date('2026-06-01');
    const s = deriveProStatus(snap({ status: 'CANCEL_AT_PERIOD_END', currentPeriodEnd: end }), NOW);
    expect(s.kind).toBe('canceling');
    expect(s.accessEndsAt).toEqual(end);
  });
});

describe('computeTrialEndsAt', () => {
  it('default 30 giorni dalla signup', () => {
    const signup = new Date('2026-05-07T00:00:00Z');
    const end = computeTrialEndsAt(signup);
    expect(end.toISOString()).toBe('2026-06-06T00:00:00.000Z');
  });

  it('TRIAL_DAYS = 30', () => {
    expect(TRIAL_DAYS).toBe(30);
  });
});
