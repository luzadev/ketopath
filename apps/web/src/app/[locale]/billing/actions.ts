'use server';

import type { ProDerivedKind, SubscriptionStatus } from '@ketopath/shared';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export interface BillingStatus {
  subscription: {
    status: SubscriptionStatus;
    trialEndsAt: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    interval: 'MONTH' | 'YEAR' | null;
    stripePriceId: string | null;
  } | null;
  derived: {
    kind: ProDerivedKind;
    isPro: boolean;
    trialDaysRemaining: number | null;
    accessEndsAt: string | null;
  };
  configured: boolean;
}

export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  const res = await fetch(`${API_URL}/me/billing/status`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as BillingStatus;
}

export async function startCheckout(
  interval: 'MONTH' | 'YEAR',
): Promise<{ url: string } | { error: string }> {
  const res = await fetch(`${API_URL}/me/billing/checkout`, {
    method: 'POST',
    headers: {
      cookie: cookieHeader(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ interval }),
    cache: 'no-store',
  });
  if (res.status === 503) return { error: 'billing_not_configured' };
  if (!res.ok) return { error: `api_error_${res.status}` };
  return (await res.json()) as { url: string };
}

export async function openCustomerPortal(): Promise<{ url: string } | { error: string }> {
  const res = await fetch(`${API_URL}/me/billing/portal`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (res.status === 409) return { error: 'no_stripe_customer' };
  if (res.status === 503) return { error: 'billing_not_configured' };
  if (!res.ok) return { error: `api_error_${res.status}` };
  return (await res.json()) as { url: string };
}
