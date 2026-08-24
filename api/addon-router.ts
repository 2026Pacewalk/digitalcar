import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cardAddons } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { resolveRazorpay } from "./payment-router";
import { createRazorpayOrder, verifyRazorpaySignature } from "./lib/razorpay";

/* Card add-ons — ID Card & Membership Card. Paid extras ON TOP of the plan.
   ₹299/year each; on a monthly plan the price is that ÷12. Self-contained so
   the subscription checkout is never touched. */

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

/** Grant (or renew) an add-on for a user. Idempotent per (user, type). */
async function grantAddon(db: ReturnType<typeof getDb>, userId: number, type: AddonType, cycle: "monthly" | "yearly") {
  const owner = and(eq(cardAddons.userId, userId), eq(cardAddons.type, type));
  const existing = await db.select().from(cardAddons).where(owner);
  if (existing[0]) {
    await db.update(cardAddons).set({ status: "active", billingCycle: cycle, currentPeriodEnd: periodEnd(cycle) }).where(owner);
  } else {
    await db.insert(cardAddons).values({ userId, type, billingCycle: cycle, status: "active", currentPeriodEnd: periodEnd(cycle) });
  }
}

export const addonRouter = createRouter({
  // The add-on catalogue + prices (yearly, and the monthly split).
  pricing: authedQuery.query(() => ({
    yearly: ADDON_YEARLY,
    monthly: ADDON_MONTHLY,
    addons: ADDONS,
  })),

  // What the signed-in user already owns (active add-ons).
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(cardAddons).where(eq(cardAddons.userId, ctx.user.id));
    return rows.filter((r) => r.status === "active");
  }),

  // Start a Razorpay order for an add-on purchase.
  razorpayCreateOrder: authedQuery
    .input(z.object({ type: z.enum(["id_card", "membership"]), billingCycle: z.enum(["monthly", "yearly"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cr = await resolveRazorpay(db);
      if (!cr.enabled) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online payments are not enabled." });
      const meta = ADDONS.find((a) => a.type === input.type)!;
      const amountPaise = Math.round(amountRupees(input.billingCycle) * 100);
      const order = await createRazorpayOrder({
        amount: amountPaise, currency: "INR",
        receipt: `dcaddon_${ctx.user.id}_${Date.now()}`.slice(0, 40),
        notes: { userId: String(ctx.user.id), addonType: input.type, billingCycle: input.billingCycle, name: meta.name },
      }, cr);
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
      await grantAddon(db, ctx.user.id, input.type, input.billingCycle);
      return { ok: true };
    }),
});
