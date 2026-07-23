# DigitalCarda — Deploy & "push + publish"

Auto-deploy: **every push to `main` or `feature/refer-earn-wallet` deploys to the VPS**
via GitHub Actions → SSH → `deploy.sh`. So *"push + publish" just means push* — the
server pulls, builds, and restarts itself.

- **Server:** `root@163.227.92.219 -p 22587`
- **Domain:** `digitalcarda.in` (Cloudflare, proxied) → nginx → Node app on `127.0.0.1:3000`
- **App dir on server:** `/var/www/digitalcarda`

---

## A. One-time server setup (run these on the VPS, once)

> Prereqs already on the box: Node 20+, MySQL 8, nginx, and PM2 (`npm i -g pm2`).

```bash
# 1) Get the code
sudo mkdir -p /var/www/digitalcarda && sudo chown -R $USER /var/www/digitalcarda
git clone https://github.com/2026Pacewalk/digitalcar.git /var/www/digitalcarda
cd /var/www/digitalcarda
git checkout feature/refer-earn-wallet     # or main

# 2) Create the database + user
sudo mysql -e "CREATE DATABASE IF NOT EXISTS digitalcarda CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'digitalcarda'@'127.0.0.1' IDENTIFIED BY 'STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON digitalcarda.* TO 'digitalcarda'@'127.0.0.1'; FLUSH PRIVILEGES;"

# 3) Environment
cp .env.production.example .env
nano .env      # fill DATABASE_URL, JWT_SECRET (openssl rand -hex 48),
               # and APP_ID/APP_SECRET/VITE_APP_ID/KIMI_*/VITE_KIMI_* from your local .env

# 4) Install, build, create tables, seed once
npm ci
npm run build
npm run db:push                 # create all tables from the schema
npx tsx db/seed.ts              # admin/demo/reseller users, packages, templates
npx tsx db/import-customers.ts  # import all 506 old-site customers (real passwords)

# 5) Start under PM2 + boot on reboot
mkdir -p /var/log/digitalcarda
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # run the command it prints

# 6) nginx
sudo cp deploy/nginx-digitalcarda.conf /etc/nginx/sites-available/digitalcarda
sudo ln -sf /etc/nginx/sites-available/digitalcarda /etc/nginx/sites-enabled/digitalcarda
sudo nginx -t && sudo systemctl reload nginx
```

**Cloudflare:** point `digitalcarda.in` (A record) at `163.227.92.219`, proxied (orange
cloud). SSL/TLS mode: **Flexible** works immediately with the HTTP-only nginx config.
For **Full (Strict)** — recommended — create a Cloudflare *Origin Certificate*, install it,
and add a `listen 443 ssl;` server block (mirror the `location /` from the sample).

---

## B. One-time GitHub setup (for auto-deploy)

1. Generate an SSH key **for CI → server** (locally):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N "" -C "gh-actions-digitalcarda"
   ```
2. Add the **public** key to the server: append `deploy_key.pub` to
   `/root/.ssh/authorized_keys` on the VPS.
3. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   | Secret | Value |
   |--------|-------|
   | `SSH_HOST` | `163.227.92.219` |
   | `SSH_PORT` | `22587` |
   | `SSH_USER` | `root` |
   | `SSH_KEY`  | contents of the **private** `deploy_key` file |
4. Delete the local `deploy_key`/`deploy_key.pub` after copying.

Done. From now on, **every push auto-deploys**.

---

## C. Day-to-day

- **Deploy new changes:** just `git push` (Actions does the rest). Watch it under the
  repo's **Actions** tab.
- **Manual deploy / redeploy:** repo → Actions → *Deploy to VPS* → *Run workflow*,
  or on the server: `bash /var/www/digitalcarda/deploy.sh feature/refer-earn-wallet`.
- **After a DB schema change:** `deploy.sh` does **not** touch the DB (protects prod
  data). Run on the server manually: `npm run db:push`.
- **Logs:** `pm2 logs digitalcarda` · **status:** `pm2 status`.
- **Rollback:** `cd /var/www/digitalcarda && git reset --hard <good-commit> && npm ci && npm run build && pm2 reload ecosystem.config.cjs`.
