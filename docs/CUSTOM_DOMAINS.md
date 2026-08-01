# Custom Domains

Serve any customer's (or white-label reseller's) card on their own domain —
e.g. `card.acme.com` shows that customer's DigitalCarda card, over HTTPS.

## How it works

1. **Admin / reseller / customer adds a domain** (Admin → Custom Domains, or the
   customer's dashboard). A row is created in `custom_domains` (status `pending`)
   with a verify token.
2. **The customer points DNS**:
   - `CNAME  card.acme.com → cname.digitalcarda.in`  (apex domains: use an A record to the server IP instead)
   - `TXT    _digitalcarda.card.acme.com → <verify token>`  (proves ownership)
3. **Verify** — the app checks the TXT record and flips the domain to `active`.
4. **Caddy** (reverse proxy) issues a free Let's Encrypt certificate the first
   time the domain is hit, gated by our `ask` endpoint so certs are only issued
   for registered active domains.
5. The app resolves the incoming `Host:` → the card's slug and renders it.

Nothing about the card, its normal `digitalcarda.in/<slug>` URL, or its permanent
QR ever changes.

## One-time server setup (VPS)

### 1. Apply the DB migration (additive, safe)

```bash
mysql <database> < db/add-custom-domains.sql
```

### 2. DNS: create the CNAME target

Add an **A record** for `cname.digitalcarda.in → <your VPS IP>`. Customers point
their `CNAME` at this hostname. (You can use any hostname; if you change it,
update `CNAME_TARGET` in `api/domain-router.ts`.)

### 3. Put Caddy in front of the app (on-demand TLS)

Install Caddy and use this `Caddyfile` (the app runs on `localhost:3000`):

```caddyfile
{
    # Only issue certificates for domains the app approves (active custom domains).
    on_demand_tls {
        ask http://localhost:3000/api/tls/check
    }
}

# The main app + www.
digitalcarda.in, www.digitalcarda.in {
    reverse_proxy localhost:3000
}

# The CNAME target customers point at (kept on our own cert).
cname.digitalcarda.in {
    reverse_proxy localhost:3000
}

# Every other hostname = a customer custom domain. Caddy fetches a cert
# on-demand (gated by the ask endpoint) and proxies to the app, which resolves
# the Host header to the right card.
https:// {
    tls {
        on_demand
    }
    reverse_proxy localhost:3000
}
```

Reload Caddy: `caddy reload` (or `systemctl reload caddy`).

That's it. When a customer's domain is `active` and pointed at the server, the
first HTTPS request auto-provisions a certificate and the card loads.

## Notes

- The `ask` endpoint (`GET /api/tls/check?domain=`) returns 200 only for
  `active` custom domains (and our own hostnames), so nobody can force cert
  issuance by pointing a random domain at the server.
- Custom domains never shadow `digitalcarda.in` — the resolver rejects our own
  root and subdomains.
- To revoke: set the domain to `disabled` or remove it in Admin → Custom Domains.
