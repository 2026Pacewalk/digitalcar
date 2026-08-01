# Custom Domains

Serve any customer's (or white-label reseller's) card on their own domain —
e.g. `card.acme.com` shows that customer's DigitalCarda card, over HTTPS.

The app resolves the incoming `Host:` header → the card and renders it. SSL for
each custom domain is handled by **Cloudflare for SaaS** (the recommended path,
since digitalcarda.in already sits behind Cloudflare). A manual DNS-TXT fallback
works when Cloudflare isn't configured.

---

## Setup: Cloudflare for SaaS (recommended)

No VPS/nginx changes. Cloudflare issues & renews SSL per custom hostname and
proxies it to your existing origin (nginx → app).

### 1. In the Cloudflare dashboard (one-time)

1. **SSL/TLS → Custom Hostnames → Enable Cloudflare for SaaS.**
2. **Set a Fallback Origin.** Create a proxied (orange-cloud) DNS record for a
   hostname on your zone that points to the server, e.g.
   `ssl.digitalcarda.in → <your origin>` (A/CNAME, proxied), and set it as the
   Custom Hostnames **fallback origin**. This is the hostname customers CNAME to.
3. **Create an API token** (My Profile → API Tokens → Create Token):
   - Permissions: **Zone → SSL and Certificates → Edit** (add **Zone → Zone → Read**).
   - Zone Resources: **Include → Specific zone → digitalcarda.in**.
   - Copy the token.
4. Note your **Zone ID** (zone Overview page, right sidebar).

### 2. On the VPS — add three env vars to the prod `.env`, then restart

```bash
# /var/www/digitalcarda/.env   (or wherever the app's .env lives)
CLOUDFLARE_API_TOKEN=<the token from step 3>
CLOUDFLARE_ZONE_ID=<your zone id>
CF_SAAS_FALLBACK=ssl.digitalcarda.in     # the fallback hostname from step 2

# then reload the app so it picks up the new env
pm2 restart digitalcarda --update-env
```

That's it. The app auto-detects the token and switches from manual mode to
Cloudflare mode. Nothing about nginx changes.

### 3. Using it

1. **Admin → Custom Domains** (or the customer's **Dashboard → Custom Domain**):
   add the domain. The app registers it as a Cloudflare Custom Hostname and shows
   the exact DNS records to add.
2. The customer adds those records at their DNS provider (a CNAME to
   `ssl.digitalcarda.in`, plus any ownership TXT shown).
3. Cloudflare validates and issues the SSL automatically. Click **Verify** (or
   just reload the list) — once Cloudflare reports the cert active, the domain
   flips to **active** and the card serves on it over HTTPS.

To revoke: **Remove** the domain (deletes the Cloudflare Custom Hostname too).

---

## Fallback: manual mode (no Cloudflare API)

If the CF env vars are absent, the module runs in manual mode:

1. `mysql <db> < db/add-custom-domains.sql` — or it's auto-created on boot.
2. Customer adds `CNAME <domain> → cname.digitalcarda.in` (ops must point that
   A record at the origin) and a `TXT _digitalcarda.<domain> → <token>`.
3. **Verify** checks the TXT and marks the domain active. (SSL for the domain
   must be terminated by whatever proxy you run — this mode assumes you handle
   that, e.g. Caddy on-demand TLS.)

The Caddy on-demand-TLS `ask` endpoint (`GET /api/tls/check?domain=`) is still
available for that path — it returns 200 only for active domains.

---

## Notes

- Custom domains never shadow `digitalcarda.in` — the resolver rejects our own
  root and subdomains.
- The `custom_domains` table is created automatically at app boot
  (`CREATE TABLE IF NOT EXISTS`, additive), so no manual migration is required.
- Serving resolves the domain → the owner's published card snapshot, so the
  card's normal `digitalcarda.in/<slug>` URL and permanent QR are unchanged.
