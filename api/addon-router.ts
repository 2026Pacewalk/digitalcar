import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cardAddons, razorpayFulfilments } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { resolveRazorpay } from "./payment-router";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder, type RazorpayOrderFull } from "./lib/razorpay";
import { notifyUser, notifyTeam } from "./lib/notify";
import { CURRENCIES, toMinor, formatMoney, type Currency } from "@contracts/money";
import { getFxConfig, priceKey, resolveCheckoutCurrency, isInvalidCurrencyError, USD_UNAVAILABLE_MESSAGE } from "./lib/fx";
import { priceIn, moneyNotes, checkPaidItem } from "./lib/usd-checkout";
import { edgeGeo } from "./lib/analytics";

/* Card add-ons — ID Card & Membership Card. Paid extras ON TOP of the plan.
   ₹299/year each; on a monthly plan the price is that ÷12. Self-contained so
   the subscription checkout is never touched. While USD is on, a buyer can pay
   the $ price instead (./lib/fx: the ₹ price ÷ the admin's rate, or an override). */

export const ADDON_YEARLY = 299;
export const ADDON_MONTHLY = Math.round((ADDON_YEARLY / 12) * 100) / 100; // 24.92
type AddonType = "id_card" | "membership";
const ADDONS: { type: AddonType; name: string; style: number; desc: string }[] = [
  { type: "id_card", name: "ID Card", style: 49, desc: "A professional employee ID card design for your team." },
  { type: "membership", name: "Membership Card", style: 50, desc: "A premium membership / loyalty card design." },
];
const amountRupees = (cycle: "monthly" | "yearly") => (cycle === "monthly" ? ADDON_MONTHLY : ADDON_YEARLY);
const periodEnd = (cycle: "monthly" | "yearly") => {
  const d = new Date();
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1); else d.setFullYear(d.getFullYear() + 1);
  return d;
};

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Grant (or renew) an add-on for a user. Idempotent per (user, type). */
async function grantAddon(db: Tx, userId: number, type: AddonType, cycle: "monthly" | "yearly") {
  const owner = and(eq(cardAddons.userId, userId), eq(cardAddons.type, type));
  const existing = await db.select().from(cardAddons).where(owner);
  if (existing[0]) {
    await db.update(cardAddons).set({ status: "active", billingCycle: cycle, currentPeriodEnd: periodEnd(cycle) }).where(owner);
  } else {
    await db.insert(cardAddons).values({ userId, type, billingCycle: cycle, status: "active", currentPeriodEnd: periodEnd(cycle) });
  }
}

/** Grant the add-on a paid Razorpay order was for. Shared by the in-browser
    verify and the Razorpay webhook, so a tab closed after paying still gets
    the add-on, and the two together grant it once.
    The caller has already proven the payment genuine (checkout or webhook
    signature). The add-on and cycle come from `gatewayOrder`'s server-written
    notes — a valid signature proves a payment is real, not WHICH add-on was
    paid for — so a ₹24.92 monthly ID-card payment can't be redeemed as a ₹299
    yearly membership. Throws a TRPCError when the order doesn't check out.
    `granted` is false when this order was already fulfilled. */
export async function fulfilAddonPayment(
  db: Db,
  { userId, razorpayOrderId, paymentId, gatewayOrder }: { userId: number; razorpayOrderId: string; paymentId: string; gatewayOrder: RazorpayOrderFull },
): Promise<{ granted: boolean }> {
  const notes = gatewayOrder.notes || {};
  if (String(notes.userId || "") !== String(userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This payment belongs to another account." });
  }
  const nt = notes.addonType;
  const nc = notes.billingCycle;
  const paidType = (nt === "id_card" || nt === "membership") ? nt : null;
  const paidCycle = (nc === "monthly" || nc === "yearly") ? nc : null;
  if (!paidType || !paidCycle) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This order is missing its add-on details. Contact support." });
  }
  // A ₹ order must pay exactly the ₹ price, as always; a $ order the $ price.
  const money = checkPaidItem(gatewayOrder, { key: priceKey.addon(paidCycle), inr: amountRupees(paidCycle) }, await getFxConfig(db),
    "The paid amount doesn't match this add-on. Contact support with your payment ID.");
  const paidLabel = formatMoney(money.amount, money.currency);

  // Idempotent per Razorpay order: claim it in the ledger and grant in one
  // transaction. A second verify or webhook for the same order finds the row
  // (or waits on the first one's insert) and grants nothing; if the grant
  // fails, the claim rolls back with it so a retry can still grant. The row
  // also records what was paid, for the admin dashboard's revenue — in ₹, as
  // that ledger is read (a $ sale stores its rupee equivalent, like the domain
  // add-on); on an INR order fxRate is 1, so the figure is exactly as before.
  return db.transaction(async (tx) => {
    const claim = await tx.insert(razorpayFulfilments).ignore()
      .values({ razorpayOrderId, kind: "card_addon", userId, razorpayPaymentId: paymentId, amount: (money.amount * money.fxRate).toFixed(2) });
    const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
      ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
    if (affected === 0) return { granted: false };
    await grantAddon(tx, userId, paidType, paidCycle);
    return { granted: true };
  }).then((r) => {
    if (r.granted) {
      const name = ADDONS.find((a) => a.type === paidType)?.name ?? "Add-on";
      // In the currency it was paid in. ₹299 / ₹24.92 format identically to the
      // old `₹${amount}`, so an INR sale reads exactly as it always has.
      void notifyUser({ userId, type: "addon_active", title: `${name} is active`, message: `Paid ${paidLabel} (${paidCycle}). It's ready in your dashboard.`, link: "/dashboard" });
      void notifyTeam({ type: "addon_sale", title: `Online payment · ${paidLabel} for ${name}`, message: `Account #${userId} · ${paidCycle} · ${paymentId}`, link: "/admin/customers", subjectUserId: userId, dedupeKey: `sale:${paymentId}` });
    }
    return r;
  });
}

export const addonRouter = createRouter({
  // The add-on catalogue + prices (yearly, and the monthly split). In $ only when
  // asked for AND USD can be charged right now; `currency` says which these are.
  pricing: authedQuery
    .input(z.object({ currency: z.enum(CURRENCIES).optional() }).optional())
    .query(async ({ input }) => {
      if (input?.currency === "USD") {
        const db = getDb();
        const cfg = await getFxConfig(db);
        if (cfg.enabled && (await resolveRazorpay(db)).enabled) {
          return {
            yearly: priceIn("USD", priceKey.addon("yearly"), ADDON_YEARLY, cfg),
            monthly: priceIn("USD", priceKey.addon("monthly"), ADDON_MONTHLY, cfg),
            currency: "USD" as Currency,
            addons: ADDONS,
          };
        }
      }
      return { yearly: ADDON_YEARLY, monthly: ADDON_MONTHLY, currency: "INR" as Currency, addons: ADDONS };
    }),

  // What the signed-in user already owns (active add-ons).
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(cardAddons).where(eq(cardAddons.userId, ctx.user.id));
    return rows.filter((r) => r.status === "active");
  }),

  // Start a Razorpay order for an add-on purchase. The browser only picks ₹ or $;
  // the price is decided here, and $ is refused while USD is switched off.
  razorpayCreateOrder: authedQuery
    .input(z.object({
      type: z.enum(["id_card", "membership"]), billingCycle: z.enum(["monthly", "yearly"]),
      currency: z.enum(CURRENCIES).default("INR"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      if (!cr.enabled) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online payments are not enabled." });
      const meta = ADDONS.find((a) => a.type === input.type)!;
      const cfg = await getFxConfig(db);
      // No upgrade credit on an add-on, so no currency lock: only "is USD on?".
      const currency = resolveCheckoutCurrency({ requested: input.currency, usdEnabled: cfg.enabled, lockedTo: null });
      const price = priceIn(currency, priceKey.addon(input.billingCycle), amountRupees(input.billingCycle), cfg);
      let order;
      try {
        order = await createRazorpayOrder({
          amount: toMinor(price), currency,
          receipt: `dcaddon_${ctx.user.id}_${Date.now()}`.slice(0, 40),
          notes: {
            userId: String(ctx.user.id), addonType: input.type, billingCycle: input.billingCycle, name: meta.name,
            ...moneyNotes(currency, cfg, edgeGeo((h) => ctx.req.headers.get(h)).country, toMinor(price)),
          },
        }, cr);
      } catch (e) {
        // International payments are off on the Razorpay account.
        if (currency === "USD" && isInvalidCurrencyError(e)) {
          console.error("[addon] Razorpay rejected a USD order:", (e as Error).message);
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: USD_UNAVAILABLE_MESSAGE });
        }
        throw e;
      }
      return { keyId: cr.keyId, orderId: order.id, amount: order.amount, currency: order.currency, name: meta.name };
    }),

  // Verify the Razorpay signature and grant the add-on. Amount is server-side.
  razorpayVerify: authedQuery
    .input(z.object({
      razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1),
      type: z.enum(["id_card", "membership"]), billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      const ok = verifyRazorpaySignature({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.razorpaySignature }, cr.keySecret);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed." });

      // What was bought is read from the gateway's order, not from the input.
      let order;
      try {
        order = await fetchRazorpayOrder(input.razorpayOrderId, cr);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not confirm this payment with the gateway. If you were charged, contact support." });
      }
      await fulfilAddonPayment(db, {
        userId: ctx.user.id,
        razorpayOrderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        gatewayOrder: order,
      });
      return { ok: true };
    }),
});
