import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  paymentOrders, appSettings, subscriptionPackages, subscriptions, users, notifications,
} from "@db/schema";
import { eq, desc, and, gt, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => v.toFixed(2);

const PAY_KEYS = [
  "pay_upi_id", "pay_upi_name", "pay_upi_qr",
  "pay_bank_name", "pay_bank_account", "pay_bank_ifsc", "pay_bank_holder", "pay_note",
] as const;

async function getSettings(db: ReturnType<typeof getDb>) {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, [...PAY_KEYS]) });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    upiId: map.pay_upi_id ?? "", upiName: map.pay_upi_name ?? "DigitalCarda", upiQr: map.pay_upi_qr ?? "",
    bankName: map.pay_bank_name ?? "", bankAccount: map.pay_bank_account ?? "", bankIfsc: map.pay_bank_ifsc ?? "",
    bankHolder: map.pay_bank_holder ?? "", note: map.pay_note ?? "",
  };
}
async function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

/* Amount the user should pay for a package (mirrors subscribe pricing:
   referral discount on first paid plan, upgrade credit, limited-time offer). */
async function computeAmount(
  db: ReturnType<typeof getDb>,
  user: { id: number; referredById: number | null },
  packageId: number, cycle: "monthly" | "yearly", offerPercent: number
) {
  const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, packageId) });
  if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const base = n(cycle === "yearly" ? pkg.yearlyPrice : pkg.monthlyPrice);
  const existingPaid = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, user.id), gt(subscriptions.amount, "0")),
    orderBy: [desc(subscriptions.createdAt)],
  });
  let charged: number, discountPct = 0;
  if (!existingPaid) {
    if (user.referredById) {
      const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "referral_discount_percent") });
      discountPct = row ? n(row.value) : 15;
    }
    charged = round2(base * (1 - discountPct / 100));
  } else {
    charged = Math.max(0, round2(base - n(existingPaid.amount)));
  }
  const offer = offerPercent > 0 && offerPercent <= 50 ? offerPercent : 0;
  if (offer) charged = round2(charged * (1 - offer / 100));
  return { pkg, base, charged, isUpgrade: !!existingPaid };
}

export const paymentRouter = createRouter({
  // ─── Where to pay (UPI id / QR / bank), shown to the user ───
  instructions: authedQuery.query(async () => {
    const db = getDb();
    return getSettings(db);
  }),

  // Amount preview for a plan before paying
  quote: authedQuery
    .input(z.object({ packageId: z.number(), billingCycle: z.enum(["monthly", "yearly"]), offerPercent: z.number().min(0).max(50).optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { pkg, base, charged, isUpgrade } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.offerPercent ?? 0);
      return { planName: pkg.name, base, amount: charged, isUpgrade };
    }),

  // ─── User submits proof of a manual payment → pending order ───
  createOrder: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      method: z.enum(["upi", "bank"]),
      reference: z.string().min(3),
      offerPercent: z.number().min(0).max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Block a second pending order
      const pending = await db.query.paymentOrders.findFirst({
        where: and(eq(paymentOrders.userId, ctx.user.id), eq(paymentOrders.status, "pending")),
      });
      if (pending) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a payment awaiting verification." });

      const { pkg, charged } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.offerPercent ?? 0);
      const [ins] = await db.insert(paymentOrders).values({
        userId: ctx.user.id,
        packageId: input.packageId,
        planName: pkg.name,
        billingCycle: input.billingCycle,
        amount: money(charged),
        method: input.method,
        reference: input.reference.trim(),
        status: "pending",
      });
      await db.insert(notifications).values({
        userId: ctx.user.id,
        type: "payment_pending",
        title: "Payment submitted ⏳",
        message: `We received your ${pkg.name} payment reference. Your plan activates once our team verifies it.`,
        link: "/dashboard/subscription",
      });
      return { ok: true, id: ins.insertId, amount: charged };
    }),

  // User's payment orders
  myOrders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.paymentOrders.findMany({
      where: eq(paymentOrders.userId, ctx.user.id),
      orderBy: [desc(paymentOrders.createdAt)],
      limit: 20,
    });
  }),

  // ═══════════════════ ADMIN ═══════════════════

  adminOrders: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.paymentOrders.findMany({ orderBy: [desc(paymentOrders.createdAt)], limit: 200 });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const list = userIds.length
      ? await db.query.users.findMany({ where: inArray(users.id, userIds), columns: { id: true, fullName: true, email: true } })
      : [];
    const map = new Map(list.map((u) => [u.id, u]));
    return rows.map((r) => ({
      ...r, amount: n(r.amount),
      user: map.get(r.userId) ? { name: map.get(r.userId)!.fullName, email: map.get(r.userId)!.email } : null,
    }));
  }),

  // Verify a payment → activate the subscription (card goes live)
  verifyOrder: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const order = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.id, input.id) });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });

      const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, order.packageId) });
      const now = new Date();
      const periodEnd = new Date(now);
      if (order.billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Activate a paid subscription for the user
      await db.insert(subscriptions).values({
        userId: order.userId,
        packageId: order.packageId,
        status: "active",
        billingCycle: order.billingCycle,
        amount: money(n(order.amount)),
        currency: "INR",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentGateway: "manual",
      });
      await db.update(paymentOrders).set({ status: "verified", verifiedAt: now }).where(eq(paymentOrders.id, order.id));

      // Notify the buyer
      await db.insert(notifications).values({
        userId: order.userId,
        type: "payment_verified",
        title: "Payment verified — plan active 🎉",
        message: `Your ${order.planName || "plan"} is now active. Your card is live and all features are unlocked.`,
        link: "/dashboard",
      });

      // If this is their first paid plan, flag the referrer's reward opportunity
      try {
        const buyer = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { referredById: true, fullName: true } });
        if (buyer?.referredById) {
          await db.insert(notifications).values({
            userId: buyer.referredById,
            type: "referral_reward",
            title: "Your referral upgraded 💰",
            message: `${buyer.fullName} just went paid. Your referral commission is ready to be credited.`,
            link: "/dashboard/refer",
          });
        }
      } catch { /* non-critical */ }

      return { ok: true };
    }),

  // Reject a payment order
  rejectOrder: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const order = await db.query.paymentOrders.findFirst({ where: eq(paymentOrders.id, input.id) });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await db.update(paymentOrders).set({ status: "rejected", adminNote: input.note?.trim() || null, verifiedAt: new Date() }).where(eq(paymentOrders.id, order.id));
      await db.insert(notifications).values({
        userId: order.userId,
        type: "payment_rejected",
        title: "Payment could not be verified",
        message: `We couldn't verify your ${order.planName || "plan"} payment${input.note ? `: ${input.note}` : ""}. Please check the reference and try again.`,
        link: "/dashboard/subscription",
      });
      return { ok: true };
    }),

  // Platform payment settings (UPI / QR / bank)
  getConfig: adminQuery.query(async () => {
    const db = getDb();
    return getSettings(db);
  }),
  setConfig: adminQuery
    .input(z.object({
      upiId: z.string().optional(), upiName: z.string().optional(), upiQr: z.string().optional(),
      bankName: z.string().optional(), bankAccount: z.string().optional(), bankIfsc: z.string().optional(),
      bankHolder: z.string().optional(), note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const map: Record<string, string | undefined> = {
        pay_upi_id: input.upiId, pay_upi_name: input.upiName, pay_upi_qr: input.upiQr,
        pay_bank_name: input.bankName, pay_bank_account: input.bankAccount, pay_bank_ifsc: input.bankIfsc,
        pay_bank_holder: input.bankHolder, pay_note: input.note,
      };
      for (const [k, v] of Object.entries(map)) if (v !== undefined) await setSetting(db, k, v);
      return { ok: true };
    }),
});
