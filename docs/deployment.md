# Deploy KetoPath su VPS Virtualmin

> Runbook per il deploy di KetoPath su un VPS Linux con Virtualmin (CentOS/Debian/Ubuntu). Coperto: preparazione server, PostgreSQL, deploy app (frontend + backend), reverse proxy + SSL, Stripe webhook, backup, troubleshooting.
>
> Target: dominio `lamiadieta.luzaonline.net` (frontend) e sottodominio `api.lamiadieta.luzaonline.net` (backend).
>
> Tempo stimato: 30-45 minuti se tutto fila, 1-2 ore con i primi inciampi.

---

## 0. Convenzioni

Tutti i blocchi `bash` si lanciano via SSH come utente con `sudo` (di norma `root`, oppure il tuo utente di Virtualmin). Per l'utente di runtime dell'applicazione useremo l'utente già esistente del dominio, **`lamiadieta`**, con home `/home/lamiadieta`.

I comandi marcati con `# come root` vanno lanciati con privilegi di root (via `sudo` o `su -`). Quelli marcati con `# come lamiadieta` da:

```bash
sudo -u lamiadieta -i
```

Il **`<PASSWORD_DB>`** è la password del DB Postgres che genererai al passaggio §2 — non è la password MariaDB esistente. La password di MariaDB esposta in chat **deve essere ruotata** dal pannello Virtualmin **prima di proseguire**.

---

## 1. Preparazione server

### 1.1 Verifica OS e installa pacchetti base

```bash
# come root
cat /etc/os-release       # verifica distribuzione (Ubuntu/Debian/CentOS/AlmaLinux)
uname -a                  # kernel
df -h                     # spazio disco — KetoPath chiede ~2 GB inclusi node_modules
free -h                   # RAM — minimo 2 GB consigliato
```

Pacchetti che ci servono (Debian/Ubuntu):

```bash
# come root
apt update
apt install -y curl git build-essential ca-certificates gnupg ufw
```

CentOS/AlmaLinux:

```bash
# come root
dnf install -y curl git gcc gcc-c++ make ca-certificates
```

### 1.2 Installa Node.js 20

```bash
# come root
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verifica
node --version    # v20.x.x
npm --version
```

Su CentOS:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
```

### 1.3 Installa pnpm

```bash
# come root
npm install -g pnpm@9
pnpm --version    # 9.x
```

### 1.4 Installa PostgreSQL 15+

Debian/Ubuntu:

```bash
# come root
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt update
apt install -y postgresql-15

systemctl enable --now postgresql
systemctl status postgresql    # active (running)
```

CentOS/AlmaLinux:

```bash
# come root
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
dnf -qy module disable postgresql
dnf install -y postgresql15-server postgresql15-contrib
/usr/pgsql-15/bin/postgresql-15-setup initdb
systemctl enable --now postgresql-15
```

### 1.5 Installa PM2 (process manager)

```bash
# come root
npm install -g pm2

# Configura PM2 per partire al boot come utente lamiadieta
pm2 startup systemd -u lamiadieta --hp /home/lamiadieta
# (esegui il comando suggerito dall'output, ti dirà esattamente quale)
```

### 1.6 Firewall

```bash
# come root  (Debian/Ubuntu)
ufw allow 22/tcp           # SSH
ufw allow 80/tcp           # HTTP (Let's Encrypt challenge)
ufw allow 443/tcp          # HTTPS
ufw --force enable
ufw status
```

CentOS:

```bash
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

**Critico**: Postgres NON deve essere esposto. Resta in bind `127.0.0.1`. Ne riparliamo al §2.3.

---

## 2. Setup PostgreSQL

### 2.1 Genera una password robusta

```bash
# come root
openssl rand -base64 32
# Copia l'output: questa sarà <PASSWORD_DB>
```

Salva la password in un password manager. **Non incollarla in chat.**

### 2.2 Crea utente e database

```bash
# come root
sudo -u postgres psql <<EOF
CREATE USER ketopath WITH PASSWORD '<PASSWORD_DB>';
CREATE DATABASE ketopath OWNER ketopath;
GRANT ALL PRIVILEGES ON DATABASE ketopath TO ketopath;
EOF
```

### 2.3 Verifica bind locale (no esposizione esterna)

```bash
# come root
grep listen_addresses /etc/postgresql/15/main/postgresql.conf
# Deve essere:  listen_addresses = 'localhost'  (o non valorizzato)
```

Se è `'*'` o un indirizzo pubblico, correggilo:

```bash
sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" /etc/postgresql/15/main/postgresql.conf
systemctl restart postgresql
```

Test connessione:

```bash
psql "postgresql://ketopath:<PASSWORD_DB>@127.0.0.1:5432/ketopath" -c '\l'
# Deve listare i database, niente errori.
```

### 2.4 Backup automatico (cron giornaliero)

```bash
# come root
mkdir -p /var/backups/postgres
chown postgres:postgres /var/backups/postgres

cat > /etc/cron.daily/postgres-ketopath-backup <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
sudo -u postgres pg_dump ketopath | gzip > /var/backups/postgres/ketopath-$DATE.sql.gz
find /var/backups/postgres -name "ketopath-*.sql.gz" -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/postgres-ketopath-backup
```

(Tiene 14 giorni di backup giornalieri. Per backup off-site valuta dopo: rclone su Cloudflare R2, S3, ecc.)

---

## 3. Setup utente applicativo

```bash
# come root
sudo -u lamiadieta -i

# Da qui in poi siamo "come lamiadieta"
mkdir -p ~/apps
cd ~/apps
```

### 3.1 SSH key per GitHub

Se il repo è privato:

```bash
# come lamiadieta
ssh-keygen -t ed25519 -C "lamiadieta@luzaonline" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
# Copia l'output → GitHub → Settings → SSH and GPG keys → New SSH key
```

### 3.2 Clone del repo

```bash
# come lamiadieta
cd ~/apps
git clone git@github.com:<your-user>/DietApp.git ketopath
# oppure HTTPS se il repo è pubblico:
# git clone https://github.com/<your-user>/DietApp.git ketopath

cd ketopath
git checkout main
```

### 3.3 Install dipendenze

```bash
# come lamiadieta
cd ~/apps/ketopath
pnpm install --frozen-lockfile
# (può richiedere 2-3 minuti la prima volta)
```

---

## 4. Configurazione env

### 4.1 Genera segreti

```bash
# come lamiadieta
# Better Auth secret (32+ char):
openssl rand -base64 32

# Prisma field encryption key (vedi ADR 0002):
node -e "console.log('k1.aesgcm256.'+require('crypto').generateKeySync('aes',{length:256}).export().toString('base64url'))"

# VAPID per Web Push:
cd ~/apps/ketopath/apps/api
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Annota i tre output: `<BETTER_AUTH_SECRET>`, `<PRISMA_KEY>`, `<VAPID_PUBLIC>`, `<VAPID_PRIVATE>`.

### 4.2 Crea `apps/api/.env`

```bash
# come lamiadieta
cd ~/apps/ketopath/apps/api
cp .env.example .env
nano .env       # o vim
```

Compila i valori reali:

```ini
NODE_ENV=production
PORT=4000
HOST=127.0.0.1
LOG_LEVEL=info

CORS_ORIGINS=https://lamiadieta.luzaonline.net

DATABASE_URL=postgresql://ketopath:<PASSWORD_DB>@127.0.0.1:5432/ketopath

PRISMA_FIELD_ENCRYPTION_KEY=<PRISMA_KEY>

BETTER_AUTH_SECRET=<BETTER_AUTH_SECRET>
BETTER_AUTH_URL=https://lamiadieta.luzaonline.net

# Sentry (opzionale)
# SENTRY_DSN=

VAPID_PUBLIC_KEY=<VAPID_PUBLIC>
VAPID_PRIVATE_KEY=<VAPID_PRIVATE>
VAPID_SUBJECT=mailto:tuo@email.it

# Stripe (test mode all'inizio — vedi §7)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
BILLING_RETURN_URL=https://lamiadieta.luzaonline.net
```

### 4.3 Crea `apps/web/.env`

```bash
# come lamiadieta
cd ~/apps/ketopath/apps/web
cat > .env <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://ketopath:<PASSWORD_DB>@127.0.0.1:5432/ketopath
PRISMA_FIELD_ENCRYPTION_KEY=<PRISMA_KEY>
BETTER_AUTH_SECRET=<BETTER_AUTH_SECRET>
BETTER_AUTH_URL=https://lamiadieta.luzaonline.net
API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<VAPID_PUBLIC>
EOF
```

### 4.4 Crea `packages/db/.env`

Prisma legge da qui durante le migration.

```bash
# come lamiadieta
cd ~/apps/ketopath/packages/db
cat > .env <<EOF
DATABASE_URL=postgresql://ketopath:<PASSWORD_DB>@127.0.0.1:5432/ketopath
PRISMA_FIELD_ENCRYPTION_KEY=<PRISMA_KEY>
EOF
```

### 4.5 Permessi restrittivi sui file env

```bash
# come lamiadieta
cd ~/apps/ketopath
chmod 600 apps/api/.env apps/web/.env packages/db/.env
```

---

## 5. Migration + build + start

### 5.1 Applica le migration al DB

```bash
# come lamiadieta
cd ~/apps/ketopath
pnpm --filter @ketopath/db exec prisma migrate deploy
# Output atteso: "16 migrations found ... applied"
```

### 5.2 Seed dei dati iniziali (ricette, ingredienti)

```bash
# come lamiadieta
cd ~/apps/ketopath
pnpm db:seed
# Output: "[seed] inserted 96 recipes, 220 ingredients, ..."
```

### 5.3 Build

```bash
# come lamiadieta
cd ~/apps/ketopath
pnpm -r build
# Compila packages, apps/api, apps/web. Richiede 1-3 min.
```

### 5.4 Smoke test manuale (prima di PM2)

```bash
# come lamiadieta
cd ~/apps/ketopath/apps/api
node --env-file=.env dist/server.js &
sleep 2
curl -s http://127.0.0.1:4000/health    # {"status":"ok"}
kill %1
```

```bash
cd ~/apps/ketopath/apps/web
pnpm start &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000  # 200 o 307 (redirect locale)
kill %1
```

Se entrambi rispondono ok → tutto pronto per PM2.

---

## 6. Process manager (PM2)

Crea il file di configurazione PM2:

```bash
# come lamiadieta
cd ~/apps/ketopath
cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: 'ketopath-api',
      cwd: '/home/lamiadieta/apps/ketopath/apps/api',
      script: 'dist/server.js',
      node_args: '--env-file=.env',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      time: true,
    },
    {
      name: 'ketopath-web',
      cwd: '/home/lamiadieta/apps/ketopath/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '768M',
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};
EOF

pm2 start ecosystem.config.cjs
pm2 save                           # rendi persistente al reboot
pm2 status                         # entrambi "online"
pm2 logs                           # log live, Ctrl-C per uscire
```

Verifica:

```bash
curl -s http://127.0.0.1:4000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```

---

## 7. Reverse proxy + SSL (via Virtualmin)

Virtualmin gestisce Apache (più raramente nginx). I passaggi sono concettualmente identici per entrambi.

### 7.1 Crea il sottodominio per l'API

In Virtualmin:

1. **Servers** → seleziona `lamiadieta.luzaonline.net`
2. **Create Sub-Server** (o "Create Server") → `api.lamiadieta.luzaonline.net`
3. Tipo: "Sub-server" sotto `lamiadieta.luzaonline.net`
4. Crea senza opzioni speciali (niente PHP, niente database, niente FTP)

### 7.2 Configura Apache come reverse proxy

Per il sottodominio API. Da Virtualmin:

1. Nuovo sottodominio `api.lamiadieta.luzaonline.net` → **Services** → **Configure Website** (o "Apache Webserver")
2. Aggiungi le direttive proxy nel virtual host. Da SSH puoi anche modificare direttamente:

```bash
# come root
nano /etc/apache2/sites-enabled/api.lamiadieta.luzaonline.net.conf
```

Aggiungi nel `<VirtualHost *:80>` e nel `<VirtualHost *:443>` (se già creato):

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:4000/
ProxyPassReverse / http://127.0.0.1:4000/

# Webhook Stripe ha bisogno del raw body — disattiva eventuali filtri
<Location /webhooks/stripe>
    SetEnv proxy-sendchunked 1
</Location>
```

Stessa operazione per il dominio principale `lamiadieta.luzaonline.net`, che fa da proxy verso `:3000`:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/

# WebSocket support per Next.js dev/HMR (anche in prod per fast refresh sui server actions)
RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]
```

Abilita i moduli proxy se non lo sono già:

```bash
# come root
a2enmod proxy proxy_http proxy_wstunnel rewrite headers
systemctl reload apache2
```

### 7.3 SSL Let's Encrypt

In Virtualmin:

1. **Server `lamiadieta.luzaonline.net`** → **Server Configuration** → **SSL Certificate** → **Let's Encrypt** → "Request Certificate"
2. Stesso passo per `api.lamiadieta.luzaonline.net`

Dopo il rilascio, Virtualmin aggiorna automaticamente i virtual host con le direttive `SSLCertificateFile` ecc.

### 7.4 Forza HTTPS

Nel virtual host HTTP (porta 80), aggiungi:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^/?(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

### 7.5 Verifica finale

```bash
curl -s -I https://lamiadieta.luzaonline.net
# 200 OK, server: Apache, x-powered-by: Next.js

curl -s https://api.lamiadieta.luzaonline.net/health
# {"status":"ok"}
```

---

## 8. Configurazione Stripe webhook

### 8.1 Account Stripe (vedi §1-§4 della guida Stripe in chat)

Dashboard → Test mode → Developers → API keys → copia `sk_test_...`

### 8.2 Crea i prezzi

Dashboard → Products → Add product "KetoPath Pro" con due Prices:

- €9,90 / mese (recurring)
- €89 / anno (recurring)

Copia i due `price_...`.

### 8.3 Webhook su URL pubblico

Dashboard → Developers → Webhooks → Add endpoint:

- **Endpoint URL**: `https://api.lamiadieta.luzaonline.net/webhooks/stripe`
- **Events to send**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_failed`

Dopo la creazione, sul dettaglio del webhook → **Signing secret** → "Reveal" → copia `whsec_...`.

### 8.4 Aggiorna `apps/api/.env` e riavvia

```bash
# come lamiadieta
nano ~/apps/ketopath/apps/api/.env
# Compila:
#   STRIPE_SECRET_KEY=sk_test_...
#   STRIPE_WEBHOOK_SECRET=whsec_...
#   STRIPE_PRICE_ID_MONTHLY=price_...
#   STRIPE_PRICE_ID_YEARLY=price_...

pm2 restart ketopath-api
pm2 logs ketopath-api --lines 30
```

### 8.5 Test del webhook

Dal dashboard Stripe → il tuo webhook → "Send test webhook" → seleziona `customer.subscription.created` → Send.

In `pm2 logs ketopath-api` dovresti vedere `200 OK` per la richiesta. Se vedi `400 invalid_signature`: il secret nell'env è sbagliato o il body è stato manipolato dal proxy (controlla §7.2).

---

## 9. Operazioni quotidiane

### Aggiornare il codice

```bash
# come lamiadieta
cd ~/apps/ketopath
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @ketopath/db exec prisma migrate deploy
pnpm -r build
pm2 restart all
```

### Vedere i log

```bash
pm2 logs                           # tutti
pm2 logs ketopath-api              # solo API
pm2 logs ketopath-web --lines 100  # ultime 100 righe del web
```

### Restart di un singolo processo

```bash
pm2 restart ketopath-api
pm2 restart ketopath-web
```

### Stato e metriche

```bash
pm2 status                         # CPU/RAM dei processi
pm2 monit                          # dashboard interattiva
```

### Backup manuale on-demand

```bash
sudo -u postgres pg_dump ketopath | gzip > ~/ketopath-$(date +%Y%m%d).sql.gz
```

### Restore di un backup

```bash
gunzip -c ~/ketopath-YYYYMMDD.sql.gz | sudo -u postgres psql ketopath
```

---

## 10. Troubleshooting

### Il backend riparte in loop

```bash
pm2 logs ketopath-api --lines 200
```

Cause comuni:

- `.env` mancante o malformato → 500 al primo request
- DB non raggiungibile → `Error: Can't reach database server`
- `BETTER_AUTH_SECRET` < 32 char → Zod throw al boot

### `bad gateway` (502/504) dal browser

Il proxy Apache risponde ma il backend Node non c'è.

```bash
pm2 status                         # ketopath-* deve essere "online"
ss -ltn | grep -E '3000|4000'      # porte in ascolto
```

### `cookie not set` / login non persiste

`BETTER_AUTH_URL` deve essere **identico** in `apps/api/.env` e `apps/web/.env`, e il dominio dei cookie deve coincidere col dominio servito (HTTPS, no trailing slash).

### Webhook Stripe risponde 400 `invalid_signature`

Il body del webhook è stato modificato dal proxy. Su Apache, evita compressione/buffering per quel path:

```apache
<Location /webhooks/stripe>
    RequestHeader unset Accept-Encoding
    SetEnv no-gzip 1
    SetEnv proxy-sendchunked 1
</Location>
```

### Performance lenta

Per un MVP single-VPS è atteso. Quando l'utenza cresce:

- `pm2 reload all` (zero-downtime restart)
- `pg_stat_statements` per le query lente
- Redis (richiesto per cache/queue dal CLAUDE.md, oggi non strettamente necessario)
- Splittare frontend e backend su due macchine + DB managed

---

## 11. Checklist finale

- [ ] OS aggiornato, firewall attivo, solo 22/80/443 esposte
- [ ] PostgreSQL 15+ in bind localhost, password robusta, backup giornaliero attivo
- [ ] Utente `lamiadieta` ha clonato il repo, install + build OK
- [ ] `.env` di api/web/db con valori reali, permessi 600
- [ ] PM2 avvia entrambi i processi, `pm2 save` eseguito
- [ ] Sottodominio `api.lamiadieta.luzaonline.net` creato e con SSL
- [ ] Apache fa proxy verso `:3000` (web) e `:4000` (api)
- [ ] HTTP forzato a HTTPS
- [ ] Stripe webhook puntato all'URL pubblico, `whsec_` in env, test webhook = 200
- [ ] Smoke test end-to-end: signup → onboarding → genera piano → vai su /billing → checkout test card → "Abbonamento attivo"

---

## 12. Note di sicurezza ricorrenti

- **Mai** committare `.env` o file `.env.local` — `.gitignore` li copre già, ma verifica con `git status` prima di ogni `git add`.
- **Mai** mostrare la password DB / il `BETTER_AUTH_SECRET` / le chiavi Stripe in log applicativi o tracker errori (Sentry maschera per default ma controlla).
- Ruota `BETTER_AUTH_SECRET` ogni 12 mesi — invaliderà tutte le sessioni esistenti, gli utenti dovranno rifare login.
- Aggiornamenti di sicurezza OS: `apt update && apt upgrade` settimanale, kernel update mensile (con reboot pianificato).
- Stripe webhook secret: ruotalo se sospetti compromissione → dashboard Stripe → endpoint → "Roll secret" → aggiorna env → `pm2 restart`.
