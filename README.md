# KetoPath

Web app responsive multi-utente per la gestione personalizzata di chetogenica e digiuno intermittente.

> Vedi `CLAUDE.md` per le convenzioni di progetto e `docs/PRD_KetoPath.docx` per il PRD completo.

## Prerequisiti

- Node.js `>=20.11` (vedi `.nvmrc`)
- pnpm `>=9` (`corepack enable && corepack prepare pnpm@latest --activate`)

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
```

## Struttura del monorepo

```
apps/
  web/              # Next.js 14 frontend (da scaffoldare)
  api/              # Fastify backend (da scaffoldare)
packages/
  shared/           # Tipi e utility di dominio
  ui/               # Componenti UI riusabili
  db/               # Prisma client (da scaffoldare)
  tsconfig/         # tsconfig presets condivisi
  eslint-config/    # ESLint config condivisa
docs/
  PRD_KetoPath.docx
```

## Script disponibili

- `pnpm dev` — avvia tutte le app in parallelo
- `pnpm dev:web` / `pnpm dev:api` — avvia singola app
- `pnpm build` — build di produzione
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm typecheck` — `tsc -b` su tutto il monorepo
- `pnpm test` — Vitest (unit test)
- `pnpm test:e2e` — Playwright (E2E)
