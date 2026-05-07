# KetoPath

> Web app responsive multi-utente per la gestione personalizzata di chetogenica e digiuno intermittente, con piani alimentari adattivi, tracking peso/progressi, gestione del digiuno e lista della spesa automatica.

Questo file viene letto automaticamente da Claude Code a ogni sessione. Tienilo aggiornato con le decisioni architetturali e di prodotto.

---

## Vision

Trasformare la chetogenica e il digiuno intermittente da diete temporanee a stili di vita strutturati, accompagnando ogni utente dalla prima settimana di adattamento al mantenimento per la vita.

Il documento di prodotto completo è in `docs/PRD_KetoPath.docx`. Quando devi prendere decisioni di prodotto non banali, leggilo prima di proporre soluzioni.

---

## Tech stack

**Frontend**
- Next.js 14 (App Router) + TypeScript strict mode
- Tailwind CSS + shadcn/ui per i componenti
- TanStack Query per data fetching client-side
- Zustand per stato globale leggero
- Zod per validazione form e tipi runtime

**Backend**
- Node.js + Fastify + TypeScript
- Prisma come ORM
- Auth gestita via Better Auth, self-hostata su Postgres EU (vedi `docs/decisions/0001-auth-provider.md`)

**Database & infrastruttura**
- PostgreSQL 15+ come DB principale
- Redis per cache, sessioni e queue di job
- Cloudflare R2 per storage foto progress
- SendGrid per email transazionali
- Firebase Cloud Messaging per push web

**Hosting & DevOps**
- Vercel per il frontend Next.js
- Render o Fly.io per il backend Fastify
- GitHub Actions per CI/CD
- PostHog (self-hosted) per analytics
- Sentry per error tracking

---

## Repository structure

```
ketopath/
├── apps/
│   ├── web/              # Next.js frontend (App Router)
│   └── api/              # Fastify backend
├── packages/
│   ├── db/               # Prisma schema, client, migrations
│   ├── shared/           # Tipi TS, utility e logica di dominio condivisa
│   └── ui/               # Componenti UI riusabili (estensione shadcn/ui)
├── docs/
│   ├── PRD_KetoPath.docx
│   └── decisions/        # ADR (Architecture Decision Records)
├── .github/workflows/
└── CLAUDE.md             # questo file
```

Usa un monorepo con pnpm workspaces o Turborepo. Tutto in TypeScript.

---

## Convenzioni di codice

- **TypeScript strict mode** sempre. Mai `any` senza commento `// eslint-disable-next-line` motivato.
- **File**: `kebab-case.tsx` per i moduli, `PascalCase.tsx` per i componenti React esposti.
- **Componenti React**: function components + hooks, no class components.
- **Naming**:
  - Variabili e funzioni: `camelCase`
  - Componenti, tipi e interfacce: `PascalCase`
  - Costanti globali: `SCREAMING_SNAKE_CASE`
- **Commit message**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ecc.).
- **Linting**: ESLint + Prettier, formattazione automatica al pre-commit con husky + lint-staged.
- **Test**: Vitest per unit test, Playwright per E2E. Coverage minima 70% sui moduli di dominio (calcoli BMR, macros, fasi).

---

## Pattern di codice da preferire

- **Server Components** di default in Next.js; `"use client"` solo dove serve interattività.
- **Server Actions** per mutazioni semplici di form, API routes per logica più complessa.
- **Suspense + Error Boundary** per ogni feature.
- **Form**: React Hook Form + Zod resolver. Mai validazione manuale.
- **Date**: usa `date-fns`. Mai `Date.parse` o stringhe ad-hoc.
- **DB queries**: Prisma client. Niente raw SQL se non strettamente necessario, e in quel caso commenta perché.
- **Optimistic updates** per le azioni utente frequenti (segnare un pasto come consumato, spuntare un articolo della lista spesa).

---

## Conoscenza di dominio

Il dominio dell'app ha alcuni concetti chiave che devi conoscere prima di scrivere codice:

- **3 Fasi del percorso utente**:
  - `INTENSIVE` (giorni 1-30/45) — deficit calorico aggressivo, IF stretto
  - `TRANSITION` (giorni 31-90) — reverse dieting, calorie in salita
  - `MAINTENANCE` (per sempre) — 14:10, regola 80/20, soglia di allarme
- **Calcolo calorie** con formula Mifflin-St Jeor:
  - Uomini: `BMR = 10 × peso(kg) + 6.25 × altezza(cm) − 5 × età + 5`
  - Donne: `BMR = 10 × peso(kg) + 6.25 × altezza(cm) − 5 × età − 161`
  - TDEE = BMR × fattore attività (1.2 / 1.375 / 1.55 / 1.725)
- **Macros target per fase**:
  - Carboidrati netti: 5-10% in Phase 1, sale in Phase 2-3
  - Proteine: 1.5-1.8 g/kg di peso ideale
  - Grassi: il resto
- **Protocolli di digiuno**: enum `FASTING_PROTOCOL = 14_10 | 16_8 | 18_6 | 20_4 | ESE_24 | FIVE_TWO`
- **Esclusioni alimentari**: ogni `Ingredient` ha `exclusion_groups` (es. `lactose`, `fish`, `nuts`); ogni `Recipe` eredita le esclusioni dai suoi ingredienti

Quando implementi una nuova funzionalità, mappa sempre prima a quale fase appartiene e quali macros/vincoli rispetta.

---

## Comandi comuni

```bash
# Sviluppo
pnpm dev                  # Avvia frontend + backend in parallelo
pnpm dev:web              # Solo Next.js
pnpm dev:api              # Solo Fastify

# Build & deploy
pnpm build                # Build di tutti i package
pnpm start                # Avvia in production mode

# Database
pnpm db:migrate           # prisma migrate dev
pnpm db:studio            # Apre Prisma Studio
pnpm db:seed              # Popola DB con dati di test

# Quality
pnpm lint                 # ESLint
pnpm format               # Prettier
pnpm typecheck            # tsc --noEmit
pnpm test                 # Vitest
pnpm test:e2e             # Playwright
```

---

## Vincoli non negoziabili

- **Lingua UI di default: italiano**. Tutti i testi user-facing in italiano. Predisporre i18n con `next-intl` per l'eventuale internazionalizzazione futura.
- **Mobile-first responsive**: ogni pagina deve essere progettata e testata prima a 375px di larghezza.
- **GDPR by design**: i dati di salute (peso, misure, foto, sintomi) rientrano nell'art. 9 GDPR. Crittografia at-rest sul DB, niente log dei dati sanitari, consenso esplicito.
- **Disclaimer medico** sempre visibile in onboarding, nelle pagine di calcolo calorico e nelle pagine di tracking. Testo da concordare con un medico advisor.
- **Privacy first**: niente tracking di terze parti senza consenso, no Google Analytics di default. Se proprio servono analytics, usa PostHog self-hosted con cookie-less mode.
- **Accessibilità WCAG 2.1 AA**: tutto il contenuto navigabile da tastiera, contrasto colori sufficiente, alt text sulle immagini, semantica HTML corretta.

---

## Cosa NON fare mai

- Salvare password in chiaro o reimplementare l'hashing manualmente (Better Auth gestisce hashing scrypt, sessioni e flussi OAuth — non riscriverli).
- Loggare dati di salute fuori dal DB cifrato.
- Usare `eval()` o `new Function()` con input utente.
- Disabilitare feature di sicurezza (CSP, CORS, rate limiting) per "comodità di sviluppo".
- Fare claim medici sui prodotti o suggerire farmaci/integratori specifici.
- Esportare dati utente in chiaro senza autenticazione e log dell'export.
- Fare commit di file `.env`, chiavi API, dump di database.
- Usare librerie deprecate o senza manutenzione attiva (controlla l'ultimo commit prima di aggiungere una dipendenza).

---

## Workflow consigliato per Claude Code

Quando ti chiedo una nuova funzionalità, segui questo flusso:

1. **Domanda di chiarimento** se il task non è completamente specificato.
2. **Lettura preventiva**: leggi i file pertinenti prima di proporre modifiche, non scrivere codice "alla cieca".
3. **Plan mode** per task non banali: presentami un piano in 5-10 punti prima di toccare il codice.
4. **Implementazione progressiva**: feature piccole, commit frequenti, ogni commit verde (lint + test passano).
5. **Diff esplicito**: mostrami sempre i diff prima di applicare modifiche a file critici (`prisma/schema.prisma`, `package.json`, file di config).
6. **Test**: per ogni nuova logica di dominio (calcoli macros, fasi, vincoli) scrivi anche unit test.
7. **Documentazione**: aggiorna il README e questo CLAUDE.md quando introduci pattern nuovi o cambi decisioni architetturali.

---

## Decisioni architetturali aperte (da prendere insieme)

Queste decisioni non sono ancora finalizzate. Se le tocchi, aprire un ADR in `docs/decisions/`.

- [x] ~~Stripe vs Lemon Squeezy per il payment provider~~ → Stripe + free 30gg → Pro (vedi `docs/decisions/0004-payment-provider.md`)
- [ ] PostHog self-hosted vs Mixpanel per analytics di prodotto
- [ ] Render vs Fly.io vs AWS ECS per l'hosting backend
- [ ] Strategia di seeding del database ricette (manuale vs scraping autorizzato vs LLM-assisted)
- [ ] Localizzazione: i18n da subito o solo italiano per MVP?
- [ ] App mobile nativa post-MVP: React Native o Expo?

---

## Riferimenti

- PRD completo: `docs/PRD_KetoPath.docx`
- Documentazione Next.js: https://nextjs.org/docs
- Documentazione Prisma: https://www.prisma.io/docs
- Documentazione Better Auth: https://better-auth.com/docs
- shadcn/ui: https://ui.shadcn.com
- GDPR e dati sanitari: https://www.garanteprivacy.it/

---

*Ultimo aggiornamento: aprile 2026. Modifica questo file ogni volta che cambia una decisione architetturale o un pattern di codice.*
