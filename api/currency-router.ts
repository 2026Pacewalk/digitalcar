import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appSettings, subscriptionPackages } from "@db/schema";
import { eq } from "drizzle-orm";
import type { CurrencyContext } from "@contracts/money";
import { resolveRazorpay } from "./payment-router";
import { ADDON_YEARLY, ADDON_MONTHLY } from "./addon-router";
import { DOMAIN_ADDON_PRICE } from "./domain-router";
import { edgeGeo } from "./lib/analytics";
import { env } from "./lib/env";
import { clientIp } from "./lib/rate-limit";
import { sendEmail, ownerAddress } from "./lib/mail";
import { paymentSettingsChangedAdminEmail } from "./lib/email-templates";
import { FX_KEYS, DEFAULT_RATE, FX_RATE_MIN, FX_RATE_MAX, getFxConfig } from "./lib/fx";
import { currencyContext, contextCountry, usdAdminRows, parseRate, parseOverrides, fxChangedKeys, probeUsd } from "./lib/usd-checkout";

/* ₹ / $ for visitors, and the admin's USD settings (app_settings, see ./lib/fx).

   USD is off until the super-admin turns it on here, and turning it on first
   proves Razorpay accepts a USD order. While it is off, context says "₹, no $
   prices" to everyone and every checkout is ₹ exactly as before. */

type Db = ReturnType<typeof getDb>;

const ADDON_INR = { yearly: ADDON_YEARLY, monthly: ADDON_MONTHLY };

async function setSetting(db: Db, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

/* The same security email payment.setConfig / setRazorpayConfig send: the rate
   and the $ switch decide what customers are charged. Key names only, never
   values. Non-blocking, and never fails the save it reports on. */
function alertOwner(ctx: { user: { fullName: string; email: string }; req: Request }, changedKeys: string[]) {
  try {
    const ip = clientIp(ctx.req);
    void sendEmail(ownerAddress(), paymentSettingsChangedAdminEmail({
      changedKeys, who: `${ctx.user.fullName} (${ctx.user.email})`, ip: ip === "unknown" ? null : ip,
    }));
  } catch { /* non-critical */ }
}

/** Everything the admin's USD card shows. */
async function adminView(db: Db) {
  const [cfg, cr, pkgs] = await Promise.all([
    getFxConfig(db),
    resolveRazorpay(db),
    db.query.subscriptionPackages.findMany({ orderBy: [subscriptionPackages.displayOrder] }),
  ]);
  return {
    enabled: cfg.enabled,
    /** ₹ per $1. */
    rate: cfg.rate,
    overrides: cfg.overrides,
    defaultRate: DEFAULT_RATE,
    rateMin: FX_RATE_MIN,
    rateMax: FX_RATE_MAX,
    /** USD needs Razorpay: while it's off, $ is never offered even if enabled. */
    razorpayEnabled: cr.enabled,
    razorpayMode: cr.mode,
    usdAvailable: cfg.enabled && cr.enabled,
    rows: usdAdminRows(pkgs, ADDON_INR, DOMAIN_ADDON_PRICE, cfg),
  };
}

export const currencyRouter = createRouter({
  // ── PUBLIC: which currency to show this visitor, and the $ list prices ──
  // Called by the browser after the page mounts (src/hooks/useCurrency.ts), never
  // during the server render, so cached HTML stays ₹ for everyone.
  context: publicQuery
    .input(z.object({ devCountry: z.string().max(8).optional() }).optional())
    .query(async ({ ctx, input }): Promise<CurrencyContext> => {
      // The answer depends on the visitor's country: no browser, nginx or edge caching.
      ctx.resHeaders.set("Cache-Control", "private, no-store");
      // Country code only, never an IP or city.
      const country = contextCountry(edgeGeo((h) => ctx.req.headers.get(h)).country, input?.devCountry, env.isProduction);
      const db = getDb();
      const cfg = await getFxConfig(db);
      // While USD is off that one read is all: ₹, no $ prices.
      const usdOn = cfg.enabled && (await resolveRazorpay(db)).enabled;
      const pkgs = usdOn
        ? await db.query.subscriptionPackages.findMany({ where: eq(subscriptionPackages.isActive, true) })
        : [];
      return currencyContext({ country, cfg, razorpayEnabled: usdOn, pkgs, addonInr: ADDON_INR, domainInr: DOMAIN_ADDON_PRICE });
    }),

  // ── SUPER-ADMIN: the USD settings and the full price table ──
  adminGet: adminQuery.query(async () => adminView(getDb())),

  // Save any of: the switch, the rate (₹ per $1), the overrides (whole dollars by
  // price key; the map REPLACES the saved one, so leave a key out to go back to
  // the computed price). Turning USD on first asks Razorpay for a $1 test order
  // and refuses the whole save if it can't be made.
  adminSet: adminQuery
    .input(z.object({
      enabled: z.boolean().optional(),
      rate: z.number().optional(),
      overrides: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rate = input.rate === undefined ? undefined : parseRate(input.rate);
      const overrides = input.overrides === undefined ? undefined : parseOverrides(input.overrides);
      const before = await getFxConfig(db);

      if (input.enabled && !before.enabled) {
        const cr = await resolveRazorpay(db);
        if (!cr.enabled) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Turn on Razorpay online checkout first: US dollars are charged by card through Razorpay." });
        }
        const probe = await probeUsd(cr);
        if (!probe.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: probe.message ?? "Razorpay rejected USD." });
      }

      if (rate !== undefined) await setSetting(db, FX_KEYS.rate, String(rate));
      if (overrides !== undefined) await setSetting(db, FX_KEYS.overrides, JSON.stringify(overrides));
      // The switch goes last, so $ never goes live before its rate and prices are saved.
      if (input.enabled !== undefined) await setSetting(db, FX_KEYS.enabled, input.enabled ? "true" : "false");

      const changed = fxChangedKeys(before, await getFxConfig(db));
      // The $ switch is baked into every cached page (window.__dcSettings.usd,
      // which decides whether the browser asks for currency.context at all) —
      // drop that cache so the very next visitor sees the new answer.
      if (input.enabled !== undefined && input.enabled !== before.enabled) {
        const { clearHtmlCache } = await import("./lib/vite");
        clearHtmlCache();
      }
      if (changed.length) alertOwner(ctx, changed);
      return adminView(db);
    }),

  // "Check with Razorpay": can this account take a USD order right now? Saves
  // nothing; the $1 test order is never paid.
  adminCheck: adminQuery.mutation(async () => {
    const cr = await resolveRazorpay(getDb());
    if (!cr.enabled) {
      return { ok: false, message: "Razorpay online checkout is off. Turn it on first.", mode: cr.mode };
    }
    return { ...(await probeUsd(cr)), mode: cr.mode };
  }),
});
