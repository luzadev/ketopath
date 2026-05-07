import { z } from 'zod';

/**
 * ADR 0004 — env vars Stripe. Tutte opzionali: se mancano (o sono stringhe
 * vuote), i flussi di billing rispondono 503 (come per VAPID in ADR 0003).
 * Questo permette al PO di sviluppare/deployare features non-billing senza
 * configurare Stripe.
 *
 * `emptyAsUndefined`: una env file scritta come `STRIPE_SECRET_KEY=` viene
 * letta da Node come stringa vuota; la trattiamo equivalente a `undefined`.
 */
const emptyAsUndefined = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const billingEnvSchema = z.object({
  STRIPE_SECRET_KEY: emptyAsUndefined,
  STRIPE_WEBHOOK_SECRET: emptyAsUndefined,
  STRIPE_PRICE_ID_MONTHLY: emptyAsUndefined,
  STRIPE_PRICE_ID_YEARLY: emptyAsUndefined,
  // URL di base usato per le redirect post-checkout. Deve coincidere col
  // dominio del frontend (apps/web). Non valida l'URL se è stringa vuota.
  BILLING_RETURN_URL: emptyAsUndefined.pipe(z.string().url().optional()),
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
