# ADR 0001 — Auth provider

- **Status**: accepted
- **Date**: 2026-04-29
- **Decision makers**: Luciano (PO), Claude
- **Supersedes**: scelta iniziale Clerk in `CLAUDE.md`

## Contesto

KetoPath è una web app che tratta dati di salute (peso, misure, foto progress, sintomi) — categoria particolare di dati personali ex art. 9 GDPR. Inoltre l'app, per posizionamento commerciale, è destinata **esclusivamente al mercato italiano/europeo**.

La scelta iniziale in `CLAUDE.md` era Clerk, ma:

1. **Schrems II**: Clerk è un SaaS USA. Anche con DPA + SCC, il transfer di dati personali (soprattutto sanitari) verso gli USA è una zona grigia per il Garante italiano. Un eventuale incidente o un'ispezione non avrebbe una difesa pulita.
2. **Costo**: oltre 10k MAU il prezzo scala in modo non banale per un MVP a budget contenuto (PRD §16.3).
3. **Vendor lock-in**: spostarsi da Clerk dopo l'integrazione è oneroso (sessions, password reset, OAuth tutto sul loro storage).

## Decisione

Adottare **[Better Auth](https://better-auth.com)** come libreria di autenticazione self-hostata, con i seguenti vincoli e configurazione:

- **Storage**: tabelle `User`, `Session`, `Account`, `Verification` nello stesso Postgres del resto dell'app, gestito da `@ketopath/db` (Prisma).
- **Residenza dati**: ovunque ospiteremo Postgres, deve essere in regione **EU**. Per l'MVP: locale (Mac); per la produzione (Render/Fly.io): regione EU obbligatoria.
- **Metodi di autenticazione**:
  - Email + password (hashing scrypt gestito da Better Auth)
  - Google OAuth (Schrems II non rilevante perché l'utente sceglie attivamente di delegare a Google)
- **Email verification**: disattivata per MVP per non bloccare onboarding/test; verrà attivata prima del lancio pubblico (V1) insieme a SendGrid.
- **MFA**: posticipata a V1.

## Conseguenze

### Positive

- Tutti i dati personali (incluse credenziali in formato hash) restano nel database controllato da noi. Difendibile in audit GDPR.
- Zero costi ricorrenti su un servizio esterno per auth.
- Nessun vendor lock-in: se Better Auth diventa irraggiungibile, possiamo sostituirla con altra libreria mantenendo lo schema.
- Stack 100% TypeScript, integrazione naturale con Next.js (App Router) e Fastify.

### Negative

- **Responsabilità di sicurezza più alta**: dobbiamo aggiornare la libreria con regolarità, monitorare le advisories, gestire il `BETTER_AUTH_SECRET` come segreto critico.
- **Funzionalità da costruire**: alcune feature che Clerk dava out-of-the-box (UI sign-in pre-fatto, gestione MFA hardware, dashboard utenti) richiedono codice nostro.
- **Maturità libreria**: Better Auth è progetto giovane (2024+), meno battle-tested rispetto a Auth.js o Clerk. Mitigazione: review delle release, smoke test E2E sul flusso auth, fallback a Auth.js se la libreria viene abbandonata.

## Alternative considerate

| Opzione                             | Motivo del NO                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clerk                               | Transfer USA — Schrems II problematico per dati sanitari italiani                                                                                           |
| Auth0                               | Costoso oltre 7k MAU; stesso problema USA di Clerk                                                                                                          |
| Supabase Auth (cloud)               | EU regions ok ma vendor SaaS aggiuntivo che non serve                                                                                                       |
| Supabase Auth (self-hosted, GoTrue) | Overhead operativo (Docker, configurazione separata) non giustificato per MVP                                                                               |
| Auth.js (NextAuth.js)               | Tecnicamente valido, più maturo, ma API meno pulita e integrazione Fastify-side scomoda (è Next.js-first); preferito Better Auth per coerenza tra web e api |
| Lucia                               | Deprecata a marzo 2025                                                                                                                                      |
| Keycloak                            | Overkill — JVM, ops dedicato, target enterprise                                                                                                             |
| Ory Kratos                          | Buona alternativa EU-native (Germania), ma overhead operativo simile a Supabase self-hosted; rivalutabile se Better Auth diventasse insostenibile           |

## Implementazione

Tracciata in 6 fasi:

- **Fase 0** (questo ADR + aggiornamento `CLAUDE.md`)
- **Fase 1**: schema Prisma + migrazione `add_auth_tables`
- **Fase 2**: pacchetto `@ketopath/auth` con istanza Better Auth condivisa
- **Fase 3**: integrazione Next.js (handler, client, pagine sign-in/sign-up)
- **Fase 4**: integrazione Fastify (plugin di sessione, endpoint `GET /me`)
- **Fase 5**: test unit + E2E sign-up/sign-in
- **Configurazione OAuth Google**: a fine progetto, quando il PO fornirà le credenziali

## Vincoli operativi da rispettare

- `BETTER_AUTH_SECRET` deve essere identico tra `apps/web` e `apps/api` (è la chiave di firma della session).
- `BETTER_AUTH_SECRET` non va mai committato; va caricato via env in produzione (Vercel + Render secrets).
- Lo schema delle tabelle auth segue la convenzione Better Auth — non rinominare colonne arbitrariamente per non rompere la libreria al prossimo upgrade.
- Tutti i test E2E che toccano l'auth devono usare account creati nel test stesso (no fixture utenti reali).
