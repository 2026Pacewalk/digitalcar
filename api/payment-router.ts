import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  paymentOrders, appSettings, subscriptionPackages, subscriptions, users, notifications, cardTrials, funnelEvents, resellerProfiles,
  referrals, walletTransactions,
} from "@db/schema";
import { eq, desc, and, gt, ne, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail, ownerAddress } from "./lib/mail";
import { paymentSubmittedEmail, paymentToVerifyAdminEmail, paymentVerifiedEmail, paymentRejectedEmail, referralRewardEmail } from "./lib/email-templates";
import { getUpgradeOfferPercent } from "./lib/pricing";

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
  packageId: number, cycle: "monthly" | "yearly", wantsOffer: boolean
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
  // The offer percentage is server-controlled; the client may only request it.
  const offer = wantsOffer ? await getUpgradeOfferPercent(db) : 0;
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
    .input(z.object({ packageId: z.number(), billingCycle: z.enum(["monthly", "yearly"]), wantsOffer: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { pkg, base, charged, isUpgrade } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false);
      return { planName: pkg.name, base, amount: charged, isUpgrade };
    }),

  // ─── User submits proof of a manual payment → pending order ───
  createOrder: authedQuery
    .input(z.object({
      packageId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
      method: z.enum(["upi", "bank"]),
      reference: z.string().min(3),
      wantsOffer: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Block a second pending order
      const pending = await db.query.paymentOrders.findFirst({
        where: and(eq(paymentOrders.userId, ctx.user.id), eq(paymentOrders.status, "pending")),
      });
      if (pending) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a payment awaiting verification." });

      const { pkg, charged } = await computeAmount(db, ctx.user, input.packageId, input.billingCycle, input.wantsOffer ?? false);
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

      // Email the buyer (receipt) and the owner (to verify). Non-blocking.
      const pay = { planName: pkg.name, amount: charged, reference: input.reference.trim(), method: input.method };
      void sendEmail(ctx.user.email, paymentSubmittedEmail({ name: ctx.user.fullName, ...pay }));
      void sendEmail(ownerAddress(), paymentToVerifyAdminEmail({ name: ctx.user.fullName, email: ctx.user.email, ...pay }));

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

      const now = new Date();
      // Atomically claim the order: the WHERE status='pending' guard means only one
      // of two concurrent verifies wins, preventing double-activation + double
      // commission credit (Phase 31 TOCTOU). If nothing was updated, someone else won.
      const claim = await db.update(paymentOrders).set({ status: "verified", verifiedAt: now })
        .where(and(eq(paymentOrders.id, order.id), eq(paymentOrders.status, "pending")));
      const affected = (claim as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
        ?? (claim as unknown as { affectedRows?: number })?.affectedRows ?? 0;
      if (!affected) throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });

      const pkg = await db.query.subscriptionPackages.findFirst({ where: eq(subscriptionPackages.id, order.packageId) });
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

      // The trial has converted to a paid plan — reflect it in the trial engine
      // so the lifecycle banner stops and the card stays live past trial end.
      await db.update(cardTrials).set({ status: "converted" }).where(eq(cardTrials.userId, order.userId));
      db.insert(funnelEvents).values({ stage: "payment", userId: order.userId }).catch(() => {}); // funnel: paid

      // Reseller commission: if this buyer belongs to a reseller, credit them (§55).
      try {
        const rc = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { resellerId: true, fullName: true } });
        if (rc?.resellerId) {
          const profile = await db.query.resellerProfiles.findFirst({ where: eq(resellerProfiles.userId, rc.resellerId) });
          const rate = Number(profile?.commissionRate ?? 10);
          const commission = money((n(order.amount) * rate) / 100);
          await db.update(resellerProfiles).set({
            totalEarnings: sql`${resellerProfiles.totalEarnings} + ${commission}`,
            pendingPayout: sql`${resellerProfiles.pendingPayout} + ${commission}`,
          }).where(eq(resellerProfiles.userId, rc.resellerId));
          await db.insert(notifications).values({
            userId: rc.resellerId, type: "reseller_commission", title: "Commission earned 💰",
            message: `${rc.fullName} activated a plan — ₹${commission} added to your pending payout.`, link: "/reseller",
          });
        }
      } catch { /* non-critical */ }

      // Notify the buyer
      await db.insert(notifications).values({
        userId: order.userId,
        type: "payment_verified",
        title: "Payment verified — plan active 🎉",
        message: `Your ${order.planName || "plan"} is now active. Your card is live and all features are unlocked.`,
        link: "/dashboard",
      });

      // Email the buyer a confirmation + invoice (non-blocking).
      try {
        const buyerUser = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { email: true, fullName: true } });
        const invoiceNo = `DC-${String(order.id).padStart(5, "0")}-${periodEnd.getFullYear()}`;
        const validTill = periodEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        void sendEmail(buyerUser?.email, paymentVerifiedEmail({
          name: buyerUser?.fullName, planName: order.planName || pkg?.name || "Plan",
          amount: n(order.amount), billingCycle: order.billingCycle, invoiceNo, validTill,
        }));
      } catch { /* non-critical */ }

      // Auto-credit the referrer's wallet on this genuine (admin-verified) paid
      // conversion — completes the Refer & Earn growth loop without manual admin
      // action (Phase 29). Idempotent: only an un-rewarded referral is credited.
      try {
        const buyer = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { referredById: true, fullName: true } });
        if (buyer?.referredById) {
          const ref = await db.query.referrals.findFirst({
            where: and(eq(referrals.refereeId, order.userId), ne(referrals.status, "rewarded")),
          });
          if (ref) {
            const pctRow = await db.query.appSettings.findFirst({ where: eq(appSettings.key, "referral_commission_percent") });
            const pct = pctRow ? Number(pctRow.value) : 15;
            const reward = money((n(order.amount) * (Number.isFinite(pct) ? pct : 15)) / 100);
            await db.update(referrals).set({ status: "rewarded", rewardAmount: reward, rewardedAt: now }).where(eq(referrals.id, ref.id));
            const rr = await db.query.users.findFirst({ where: eq(users.id, buyer.referredById), columns: { walletBalance: true } });
            const nextBal = money(n(rr?.walletBalance) + n(reward));
            await db.update(users).set({ walletBalance: nextBal }).where(eq(users.id, buyer.referredById));
            await db.insert(walletTransactions).values({
              userId: buyer.referredById, type: "reward", amount: reward, balanceAfter: nextBal,
              status: "completed", referralId: ref.id, note: "Referral reward — paid conversion",
            });
            await db.insert(notifications).values({
              userId: buyer.referredById, type: "referral_reward", title: "Referral reward credited 🎉",
              message: `${buyer.fullName} went paid — ₹${reward} added to your wallet.`, link: "/dashboard/refer",
            });
            const rrUser = await db.query.users.findFirst({ where: eq(users.id, buyer.referredById), columns: { email: true, fullName: true } });
            void sendEmail(rrUser?.email, referralRewardEmail({ name: rrUser?.fullName, refereeName: buyer.fullName, amount: reward, balance: nextBal }));
          }
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

      // Email the buyer (non-blocking).
      try {
        const buyerUser = await db.query.users.findFirst({ where: eq(users.id, order.userId), columns: { email: true, fullName: true } });
        void sendEmail(buyerUser?.email, paymentRejectedEmail({ name: buyerUser?.fullName, planName: order.planName || "plan", note: input.note?.trim() }));
      } catch { /* non-critical */ }

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
