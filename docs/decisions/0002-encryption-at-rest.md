# ADR 0002 — Crittografia at-rest dei dati sanitari

- **Status**: proposed (richiede implementazione prima del lancio pubblico V1)
- **Date**: 2026-04-29
- **Decision makers**: Luciano (PO), Claude
- **Related**: CLAUDE.md ("Vincoli non negoziabili" — GDPR by design)

## Contesto

KetoPath tratta dati di salute soggetti all'**art. 9 GDPR** (categorie particolari di dati personali). Lo scope copre, oggi e a roadmap:

| Tabella                | Campi sensibili                                                                   | Quando arriva |
| ---------------------- | --------------------------------------------------------------------------------- | ------------- |
| `profiles`             | `weight_start_kg`, `weight_current_kg`, `weight_goal_kg`, `age`, `target_date`    | già in schema |
| `weight_entries` (V1)  | `weight`, `measurements` (girovita/fianchi/coscia/braccio), `energy/sleep/hunger` | V1 (PRD §5.2) |
| `progress_photos` (V1) | binari foto utente (Cloudflare R2)                                                | V1            |
| `fast_events` (V1)     | `symptoms[]` (mal di testa, fame, lucidità), durata digiuno                       | V1 (PRD §5.3) |
| `users` / `accounts`   | email, password hash (gestiti da Better Auth — già scrypt)                        | già in schema |

CLAUDE.md include il vincolo "Crittografia at-rest sul DB" come non negoziabile, e l'ADR 0001 (auth) si è basato su Postgres self-hosted in EU come misura primaria. Manca però una decisione strutturata su **quale strato** debba cifrare e con **quale key management**. Questo ADR risolve quella lacuna.

## Opzioni considerate

### A) Crittografia di volume (disco / VM)

- **Cosa cifra**: l'intero filesystem dove vivono i datafile Postgres.
- **Pro**: trasparente, zero codice; copre tutto incluso WAL e backup se anche le stripe di backup sono cifrate.
- **Contro**: protegge solo da furto fisico del disco. Un attaccante con accesso al DB live (SQL injection, credenziali compromesse, dump operatore) legge i dati in chiaro. Insufficiente da solo per art. 9 GDPR — il Garante e l'EDPB (Linee guida 14/2019) chiedono pseudonimizzazione/cifratura dei dati sensibili stessi, non solo dello storage.

### B) Postgres `pgcrypto` (cifratura a livello di colonna gestita dal DB)

- **Cosa cifra**: singole colonne via `pgp_sym_encrypt(value, key)`.
- **Pro**: nativa, ben testata, niente dipendenze applicative.
- **Contro**: la chiave deve essere passata in ogni query, è quindi visibile nei log/`pg_stat_activity`; rompe gli indici classici (servono index su funzioni); il modello Prisma deve usare raw queries per i campi cifrati. Maintenance burden alto.

### C) Cifratura applicativa via `prisma-field-encryption` (raccomandato)

- **Cosa cifra**: campi annotati nello schema Prisma con un commento `/// @encrypted`. La libreria intercetta tutte le `create/update/findX/delete` in middleware Prisma, cifra prima di scrivere e decifra dopo aver letto.
- **Algoritmo**: AES-256-GCM, IV per record, integrity tag. La chiave master è 32 byte derivati da env (`PRISMA_FIELD_ENCRYPTION_KEY`).
- **Pro**:
  - Trasparente al codice applicativo (`prisma.profile.update` continua a funzionare con valori in chiaro lato app).
  - Le chiavi non finiscono mai nel DB né nei log SQL.
  - Supporta **key rotation** con `@encrypted?with=v2` in seconda chiave, per deprecare gradualmente la vecchia.
  - Hash-based search index ausiliario (`@encrypted?mode=strict` + colonna hash) per equality lookups.
- **Contro**:
  - Rompe i range query e gli `ORDER BY` sui campi cifrati — non possiamo fare `WHERE weight > 70`. Mitigazione: lasciare in chiaro i campi su cui DOBBIAMO filtrare per range (es. nessuno per ora; trend del peso si calcola lato app dalla `WeightEntry` cifrata leggendo l'intera serie utente).
  - Non cifra il **filesystem** né i **backup** automaticamente: serve combinare con A) per la difesa fisica.
  - Migrazione dei dati esistenti richiede backfill (oggi è un MVP in dev, l'unico utente reale è il PO — backfill triviale).

### D) Crittografia client-side end-to-end

- **Cosa cifra**: tutto cifrato sul device dell'utente con chiave derivata da password.
- **Pro**: niente accesso del nostro server in chiaro, max privacy.
- **Contro**: non possiamo calcolare BMR/TDEE server-side, impossibile generare piani alimentari personalizzati (la funzionalità centrale del prodotto). Reset password = perdita dati. Fuori scope.

## Decisione

**Adottiamo il pattern C (cifratura applicativa via `prisma-field-encryption`) come strato primario, combinato con A (crittografia di volume) sul Postgres di produzione come difesa in profondità.**

**Algoritmo / KMS:**

- AES-256-GCM, una sola chiave master per ambiente (dev/staging/prod), distinte.
- Storage chiave: variable d'ambiente `PRISMA_FIELD_ENCRYPTION_KEY` in dev/staging; AWS KMS (o equivalente EU — OVH Vault, Scaleway Secret Manager) in produzione, rotazione annuale documentata.
- Niente chiavi nel repository, niente chiavi in `.env.example`, niente nei log.

**Campi da cifrare** (priorità all'implementazione):

| Modello              | Campi                                                            | Note                         |
| -------------------- | ---------------------------------------------------------------- | ---------------------------- |
| `Profile`            | `weightStartKg`, `weightCurrentKg`, `weightGoalKg`, `targetDate` | Decimal → string cifrato     |
| `WeightEntry` (V1)   | `weight`, `measurements`, `energy`, `sleep`, `hunger`, `notes`   | tutto                        |
| `FastEvent` (V1)     | `symptoms`, `notes`                                              | il timer in sé non sensibile |
| `ProgressPhoto` (V1) | URL R2 + chiave di decifratura della foto cifrata                | foto cifrate prima di R2     |

NON cifriamo:

- `users.email` (serve come chiave di login)
- `users.name`, `users.image` (richiesti da Better Auth e dall'UI)
- `profiles.age`, `profiles.gender`, `profiles.heightCm`, `profiles.activityLevel` — non identificativi da soli, e servono per query di aggregazione/statistiche anonime sul prodotto

## Conseguenze

### Positive

- Difesa multistrato: anche con dump del DB live, i campi sanitari restano cifrati senza chiave master.
- Compatibile con Prisma esistente, niente raw SQL.
- Difendibile in audit GDPR: cifratura art. 32 GDPR dimostrata sui dati art. 9.

### Negative

- Niente range query/ordini sui campi cifrati. Le query del trend peso (PRD §9.5) dovranno leggere la serie completa per utente e fare il calcolo lato app.
- La perdita della chiave master = perdita dei dati cifrati. Mitigazione: backup chiave su KMS managed (rischio ridotto), runbook di key recovery scritto.
- Una migrazione futura di provider DB richiederà di portare anche la chiave o di eseguire un re-encrypt.

## Implementazione (da pianificare in ADR/PR successivo)

Roadmap proposta (non in scope per questo ADR):

1. Aggiungere `prisma-field-encryption` come dipendenza di `@ketopath/db`.
2. Definire `PRISMA_FIELD_ENCRYPTION_KEY` in env validation (`@ketopath/db/src/env.ts`).
3. Wrap di `PrismaClient` con `fieldEncryptionExtension()`.
4. Annotare lo schema con i commenti `/// @encrypted` sui campi della tabella precedente.
5. Migrazione: per il MVP locale, fare un backfill via script che rilegge i record esistenti e li riscrive (cifrati al rewrite). Per produzione, script idempotente eseguito una sola volta.
6. Test: unit test che verifichi un round-trip via `prisma.profile.findUnique` ritorni il valore in chiaro; integration test sul DB che mostri il valore cifrato in raw SQL.
7. Aggiornare il runbook di backup: i backup conservano i dati cifrati — la chiave non viene mai inclusa.
8. Disaster recovery: documentare cosa succede se la chiave master è persa.

## Vincoli operativi

- **Mai** committare la chiave master.
- Ogni accesso operatore al DB di produzione deve passare per un bastion con audit trail (out of scope di questo ADR ma pianificato).
- I log applicativi non devono mai contenere il payload deserializzato di campi cifrati. Usare solo l'`id` del record per riferimenti operativi.
- DPIA aggiornata quando introduciamo la cifratura, indicando: scope, algoritmo, gestione chiave, retention dei dati cifrati, processo di key rotation.
