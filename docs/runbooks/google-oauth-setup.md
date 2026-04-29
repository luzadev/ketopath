# Runbook — Configurazione Google OAuth

Procedura per abilitare il login "Continua con Google" su KetoPath.

## Prerequisiti

- Account Google con accesso a [Google Cloud Console](https://console.cloud.google.com/)
- Un dominio o un set di redirect URI di sviluppo

## Passo 1 — Creare il progetto Google Cloud

1. Apri https://console.cloud.google.com/
2. In alto a sinistra, dropdown progetto → **New Project**
3. Nome progetto: `KetoPath` (o nome interno equivalente)
4. Crea — il progetto diventa attivo automaticamente

## Passo 2 — Configurare l'OAuth consent screen

1. Dal menu laterale: **APIs & Services → OAuth consent screen**
2. Tipo utente: **External** (necessario per consentire login a chiunque, non solo al tuo workspace Google)
3. Compila:
   - **App name**: KetoPath
   - **User support email**: la tua email
   - **App logo**: opzionale per ora, obbligatorio per la pubblicazione
   - **App domain** → Application home page: `https://ketopath.it` (placeholder per dev)
   - **Authorized domains**: aggiungi `ketopath.it` e qualunque dominio di produzione
   - **Developer contact email**: la tua email
4. **Save and continue**
5. **Scopes**: aggiungi `email`, `profile`, `openid` (sono i tre default per OAuth 2.0)
6. **Save and continue**
7. **Test users**: aggiungi le email di chi farà i test fino al go-live (massimo 100)
8. **Save and continue** → **Back to dashboard**

> Finché lo stato è "Testing" solo i test users possono accedere. Dopo il lancio
> pubblico, sottoponi l'app a verifica Google (se chiedi scope sensibili, può
> richiedere settimane). Per `email/profile/openid` la verifica è automatica.

## Passo 3 — Creare le credenziali OAuth

1. Menu laterale: **APIs & Services → Credentials**
2. **Create credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `KetoPath Web Client`
5. **Authorized redirect URIs** — aggiungi tutte le seguenti:
   - `http://localhost:3000/api/auth/callback/google` (sviluppo locale)
   - `https://staging.ketopath.it/api/auth/callback/google` (staging, se previsto)
   - `https://app.ketopath.it/api/auth/callback/google` (produzione)
6. **Create**
7. Copia **Client ID** e **Client Secret** dalla dialog che appare. Il secret
   non sarà più recuperabile dopo questa schermata — se lo perdi devi rigenerarlo.

## Passo 4 — Iniettare le credenziali nei `.env`

Aggiungi le seguenti righe a **entrambi** i file (devono essere identici):

`apps/web/.env`:

```env
GOOGLE_CLIENT_ID=il-client-id-copiato.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=il-client-secret-copiato
```

`apps/api/.env`:

```env
GOOGLE_CLIENT_ID=il-client-id-copiato.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=il-client-secret-copiato
```

> I file `.env` non vanno mai committati. Sono già in `.gitignore`.

## Passo 5 — Riavviare i dev server

```bash
pnpm dev:web   # in un terminale
pnpm dev:api   # in un altro
```

L'istanza Better Auth in `@ketopath/auth` rileva automaticamente la presenza
delle env vars e attiva il provider. La costante `enabledSocialProviders`
diventa `['google']` e il bottone "Continua con Google" appare nelle pagine
sign-in/sign-up.

## Passo 6 — Verifica

1. Apri http://localhost:3000/sign-up nel browser
2. Verifica che il bottone "Continua con Google" sia visibile
3. Cliccalo → vieni reindirizzato a `accounts.google.com`
4. Scegli un account dalla lista test users
5. Autorizza l'app
6. Vieni reindirizzato a http://localhost:3000/ con l'utente loggato
7. Tabella `users` in Postgres ha una nuova riga; tabella `accounts` ha una riga
   con `provider_id = 'google'` e `account_id = <google sub>`.

## Troubleshooting

- **Error: redirect_uri_mismatch**: il redirect URI nei tuoi `.env` non
  corrisponde esattamente a quelli configurati in Google Cloud. Includere
  protocollo, hostname, porta e path: `http://localhost:3000/api/auth/callback/google`.
- **Error: access_denied**: l'utente non è nei "test users" della consent
  screen. Aggiungilo dalla dashboard.
- **Bottone non visibile**: `enabledSocialProviders` valuta entrambe le env
  vars al boot. Controlla che il server sia stato riavviato dopo aver scritto
  i `.env`.
- **Sessione non condivisa tra web e api**: `BETTER_AUTH_SECRET` deve essere
  identico in entrambi i `.env`. Cambiarlo invalida tutte le sessioni esistenti.

## Produzione

Per il deploy:

- Imposta `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` come secrets in Vercel
  (web) e Render/Fly.io (api).
- `BETTER_AUTH_URL` deve essere l'URL pubblico del web (es. `https://app.ketopath.it`).
- Aggiungi i redirect URI di produzione in Google Cloud Console **prima** del
  deploy, altrimenti il primo login fallirà.
- Pubblica la consent screen quando l'app è pronta per uscire dalla modalità Testing.
