# ADR 0004 — Payment provider e modello di abbonamento

- **Status**: accepted
- **Date**: 2026-05-07
- **Decision makers**: Luciano (PO), Claude
- **Supersedes**: scelta aperta in `CLAUDE.md` ("Stripe vs Lemon Squeezy")

## Contesto

KetoPath chiude il primo ciclo di feature MVP (onboarding, piani settimanali, tracking, digiuno, lista spesa, achievement). Per portare l'app sul mercato serve un sistema di monetizzazione.

Tre vincoli forti dal contesto del progetto:

1. **Mercato target IT/EU**: tutti gli utenti pagano in EUR e devono ricevere fatture / scontrini compatibili con la normativa fiscale italiana.
2. **GDPR / dati di salute (art. 9)**: il provider può vedere solo email, nome, dati di pagamento. Non deve mai accedere a peso, foto, sintomi.
3. **Operatori limitati**: il PO è un singolo developer, non vuole mettere su una struttura amministrativa per gestire IVA EU OSS, fatturazione elettronica, regolarizzazioni.

## Decisione

### Provider: Stripe (con Stripe Tax + Customer Portal)

- **Stripe** come gateway di pagamento e gestore abbonamenti.
- **Stripe Tax** abilitato per il calcolo automatico di IVA EU (0,5% del fatturato per il servizio di Stripe Tax).
- **Stripe Customer Portal** per la gestione self-service di abbonamento e fatture (l'utente cambia piano, aggiorna carta, cancella, scarica fatture in autonomia).
- **Stripe Checkout** (hosted) per il primo upgrade — niente form di pagamento custom, riduce il perimetro PCI.

### Modello di abbonamento: free 30 giorni → Pro (no carta richiesta)

- **Trial di 30 giorni gratuiti** dalla data di registrazione, **senza carta richiesta**. Allinea il momento del paywall alla fine della fase INTENSIVE (PRD §5.1) — quando l'utente ha già visto i primi risultati, ha accumulato dati storici e ha alta motivazione a continuare.
- **Stato `TRIALING`** nel DB durante i primi 30 giorni; nessuna interazione con Stripe finché l'utente non avvia il checkout.
- **Allo scadere del trial**: l'utente passa a `EXPIRED`. L'app non viene "spenta": modalità sola-lettura (vedi sezione "Gating").
- **Piano Pro**: `€9,90/mese` o `€89/anno` (≈25% sconto pagando 12 mesi). I `priceId` sono in env, non hard-coded.
- **Cancellazione**: gestita interamente via Customer Portal. Lo stato in DB è `CANCEL_AT_PERIOD_END` finché la subscription non scade davvero, poi `CANCELED`.

### Gating

| Area                        | Trial | Pro | Expired (post-trial / scaduto)  |
| --------------------------- | ----- | --- | ------------------------------- |
| Profilo, prefs              | ✅    | ✅  | ✅ (lettura + modifica)         |
| Storico tracking            | ✅    | ✅  | ✅ (lettura)                    |
| Storico piani               | ✅    | ✅  | ✅ (lettura)                    |
| Lista spesa                 | ✅    | ✅  | ✅ (lettura, archiviata)        |
| **Generazione nuovo piano** | ✅    | ✅  | ❌ (paywall)                    |
| **Nuova pesata / check-in** | ✅    | ✅  | ❌ (paywall)                    |
| **Foto progress**           | ✅    | ✅  | ❌ (paywall)                    |
| **Avvio digiuno**           | ✅    | ✅  | ❌ (paywall)                    |
| **Export PDF**              | ✅    | ✅  | ❌ (paywall)                    |
| **Achievements**            | ✅    | ✅  | ✅ (lettura, no nuovi sblocchi) |

L'utente Expired non perde dati — può accedere allo storico e riattivare l'abbonamento in qualsiasi momento. Le rotte/azioni gated rispondono `402 payment_required` lato API e mostrano un componente `<Paywall/>` lato web.

## Conseguenze

### Positive

- **IVA UE gestita**: con Stripe Tax l'IVA viene calcolata automaticamente sulla base del paese del cliente; le fatture le emette Stripe (per il Tax-ID) o le emettiamo noi a partire dai dati raccolti — il PO non deve registrarsi al MOSS.
- **Customer Portal pronto**: zero codice per upgrade/downgrade/cancel/aggiorna carta — tutto delegato all'UI Stripe.
- **Fee EU competitivo**: 1,5% + €0,25 per transazione SEPA/EU, contro il ≈5%+€0,50 di Lemon Squeezy. Su €10/mese, Stripe è ≈ €0,40 di fee, LS sarebbe ≈ €1,00.
- **Webhook pattern noto**: pattern molto documentato, libreria `stripe-node` mantenuta e tipata.
- **Trial nativo**: `subscription.trial_end` di Stripe è perfetto per gestire il free 30gg quando l'utente passa al pagato (carta inserita, trial conta come parte della sub).

### Negative

- **PO è "merchant of record"**: a differenza di Lemon Squeezy, Stripe non si interpone — il PO deve avere partita IVA italiana e dichiarare correttamente i ricavi. Sopra €10k/anno serve la registrazione MOSS o Stripe Tax (IVA OSS) — gestibile, ma non zero-effort.
- **Webhook = stato di verità**: tutta la logica di subscription deve passare dal webhook firmato (`stripe-signature` HMAC). Se il webhook fallisce, lo stato in DB diverge.
- **Vendor lock-in moderato**: lo stato `subscriptions` resta in DB nostro, ma `customerId` e `subscriptionId` sono Stripe-specifici. Cambiare provider richiede re-onboarding dei clienti.

## Alternative considerate

| Opzione       | Motivo del NO                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lemon Squeezy | MoR comodo per IVA, ma fee 3-4× superiore. Su volumi MVP la differenza è gestibile, ma scala male appena cresci. Tenuta come backup se Stripe diventasse problematico. |
| Paddle        | Anche MoR, simile a LS. Setup più burocratico e UX di checkout meno polished. Niente vantaggio sostanziale rispetto a LS.                                              |
| GoCardless    | Solo SEPA, niente carte → friction sul cliente medio italiano che paga con carta. Ottimo per B2B, non per consumer.                                                    |
| Mollie        | Buon player EU, ma ecosistema npm molto più piccolo e tooling meno maturo (no portal cliente equivalente). Ha senso solo se IVA Stripe diventasse problematica.        |
| Crypto-only   | Off-topic per il segmento — bassa adozione tra il target keto/wellness IT.                                                                                             |

### Modelli di gating considerati

| Modello                | Motivo della scelta                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free 30gg → Pro** ✅ | Allinea il paywall al punto di massima adesione (fine Phase 1 = utente ha già visto risultati). Lock-in psicologico: 30gg di dati storici creano dipendenza positiva. |
| Freemium con limiti    | Più complesso da bilanciare (cosa free, cosa Pro), aggiunge debito di prodotto in ogni feature. Rinviato a v2 se serve acquisition organica.                          |
| Trial 14gg             | Mismatch col dominio — l'adattamento keto dura 2-3 settimane, 14 giorni sono pochi per vedere risultati e converti in modo informato.                                 |
| Pay-from-day-1         | Friction massima all'ingresso, riduce drasticamente l'acquisition.                                                                                                    |

## Implementazione

Tracciata in 6 fasi (questo ADR copre la fase 0):

- **Fase 0** (questo ADR + aggiornamento `CLAUDE.md`)
- **Fase 1**: schema Prisma + migration `add_subscriptions`
- **Fase 2**: modulo `@ketopath/api/billing` (env, service, routes checkout/portal/status, webhook firmato)
- **Fase 3**: helper `isProActive(userId)` lato shared + middleware paywall sulle rotte/azioni gated
- **Fase 4**: pagina `/billing` (stato, scadenza, link upgrade/portal), banner trial in dashboard, componente `<Paywall/>`
- **Fase 5**: test unit (`isProActive`, evaluator stato), test integrazione webhook
- **Fase 6**: configurazione live — Stripe account + Stripe Tax + price IDs in env, deploy webhook su URL stabile

## Vincoli operativi da rispettare

- **Webhook = source of truth**: ogni mutazione di stato subscription DEVE passare dal webhook. Niente "fai-da-te" lato frontend dopo il checkout — si redirige a una pagina "in elaborazione" e si attende il webhook.
- **Firma webhook obbligatoria**: il body raw del webhook va verificato con `stripe.webhooks.constructEvent(rawBody, signature, secret)`. Mai accettare un evento senza firma valida.
- **Idempotenza**: il webhook può ricevere lo stesso evento più volte (Stripe ritenta in caso di 5xx). Ogni handler deve essere idempotente — la chiave naturale `event.id` deve essere registrata in DB per scartare i duplicati (tabella `BillingWebhookEvent`).
- **Niente PII oltre il necessario**: a Stripe inviamo solo `email` e `userId` come `metadata`. **Mai** weight, foto, sintomi, achievements.
- **Trial senza carta**: il trial di 30gg è puramente lato DB (status `TRIALING`, `trialEndsAt`). Nessuna interazione con Stripe finché l'utente non clicca "Upgrade" volontariamente.
- **`STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`**: caricati solo lato `apps/api` (mai `apps/web`). Il frontend riceve un `client secret` solo dal backend.
- **PCI scope minimo**: usiamo solo Stripe Checkout hosted — nessun campo carta passa mai per i nostri server.
