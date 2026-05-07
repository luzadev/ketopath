// eslint-disable-next-line import/no-named-as-default
import Stripe from 'stripe';

import { billingEnv } from './env.js';

/**
 * Singleton Stripe client. Costruito lazy: se `STRIPE_SECRET_KEY` non è
 * configurato (es. in CI / sviluppo locale senza account Stripe), `getStripe`
 * lancia. Le route che dipendono da Stripe rispondono 503 prima di chiamare.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!billingEnv.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY non configurata');
  }
  _stripe = new Stripe(billingEnv.STRIPE_SECRET_KEY, {
    // Pin esplicito: niente sorprese quando Stripe rilascia una nuova
    // apiVersion. Aggiornare insieme allo `stripe` package.
    apiVersion: '2025-09-30.clover',
    typescript: true,
    appInfo: { name: 'KetoPath', version: '0.0.0' },
  });
  return _stripe;
}
