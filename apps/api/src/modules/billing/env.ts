import { z } from 'zod';

/**
 * ADR 0004 — env vars Stripe. Tutte opzionali: se mancano, i flussi di
 * billing rispondono 503 (come abbiamo fatto per VAPID in ADR 0003).
 * Questo permette al PO di sviluppare features non-billing senza dover
 * configurare Stripe localmente.
 */
const billingEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_ID_YEARLY: z.string().min(1).optional(),
  // URL di base usato per le redirect post-checkout. Deve coincidere col
  // dominio del frontend (apps/web).
  BILLING_RETURN_URL: z.string().url().optional(),
});

export type BillingEnv = z.infer<typeof billingEnvSchema>;

export function readBillingEnv(source: NodeJS.ProcessEnv = process.env): BillingEnv {
  return billingEnvSchema.parse(source);
}

export const billingEnv: BillingEnv = readBillingEnv();

export function isBillingConfigured(env: BillingEnv = billingEnv): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET &&
    env.STRIPE_PRICE_ID_MONTHLY &&
    env.BILLING_RETURN_URL,
  );
}
