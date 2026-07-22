import { z } from "zod";
import { nanoid } from "nanoid";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  users, referrals, walletTransactions, withdrawalRequests, appSettings,
  subscriptions, subscriptionPackages, notifications,
} from "@db/schema";
import { eq, desc, and, gt, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const COMMISSION_KEY = "referral_commission_percent";
const DISCOUNT_KEY = "referral_discount_percent";
const DEFAULT_COMMISSION = 15; // % the referrer earns on a paid conversion
const DEFAULT_DISCOUNT = 15;   // % the referred user saves on their first paid plan

const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => v.toFixed(2);

/** Read an admin-configured percentage setting. */
async function getPercent(db: ReturnType<typeof getDb>, key: string, def: number): Promise<number> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  const val = row ? Number(row.value) : def;
  return Number.isFinite(val) ? val : def;
}
const getCommissionPercent = (db: ReturnType<typeof getDb>) => getPercent(db, COMMISSION_KEY, DEFAULT_COMMISSION);
const getDiscountPercent = (db: ReturnType<typeof getDb>) => getPercent(db, DISCOUNT_KEY, DEFAULT_DISCOUNT);

/** Apply a signed amount to a user's wallet and record a statement line. */
async function applyWallet(
  db: ReturnType<typeof getDb>,
  userId: number,
  amount: number, // positive = credit, negative = debit
  opts: {
    type: "reward" | "withdrawal" | "adjustment";
    status?: "pending" | "completed" | "reversed";
    referralId?: number;
    withdrawalId?: number;
    note?: string;
  }
): Promise<number> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { walletBalance: true } });
  const current = n(user?.walletBalance);
  const next = Math.round((current + amount) * 100) / 100;
  await db.update(users).set({ walletBalance: money(next) }).where(eq(users.id, userId));
  await db.insert(walletTransactions).values({
    userId,
    type: opts.type,
    amount: money(amount),
    balanceAfter: money(next),
    status: opts.status ?? "completed",
    referralId: opts.referralId ?? null,
    withdrawalId: opts.withdrawalId ?? null,
    note: opts.note ?? null,
  });
  return next;
}

export const referralRouter = createRouter({
  // ─── Customer: my referral program summary + wallet snapshot ───
  myProgram: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    let code = ctx.user.referralCode;
    if (!code) {
      code = ("DC" + nanoid(6)).toUpperCase();
      await db.update(users).set({ referralCode: code }).where(eq(users.id, ctx.user.id));
    }
    const rows = await db.query.referrals.findMany({ where: eq(referrals.referrerId, ctx.user.id) });
    const rewarded = rows.filter((r) => r.status === "rewarded").length;
    const joined = rows.filter((r) => r.status !== "pending").length;

    const me = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id), columns: { walletBalance: true } });
    const totalEarned = rows.reduce((s, r) => s + n(r.rewardAmount), 0);
    const pendingPayouts = await db.query.withdrawalRequests.findMany({
      where: and(eq(withdrawalRequests.userId, ctx.user.id), eq(withdrawalRequests.status, "pending")),
    });
    const pendingAmount = pendingPayouts.reduce((s, w) => s + n(w.amount), 0);

    return {
      code,
      commissionPercent: await getCommissionPercent(db),
      discountPercent: await getDiscountPercent(db),
      stats: { invited: rows.length, joined, rewarded },
      wallet: {
        balance: n(me?.walletBalance),
        totalEarned,
        pendingPayout: pendingAmount,
      },
    };
  }),

  // ─── The signed-in user's referral discount (for the plans page) ───
  myDiscount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const percent = await getDiscountPercent(db);
    if (!ctx.user.referredById) return { eligible: false, percent };
    // The discount is one-time — only until they buy their first paid plan.
    const paid = await db.query.subscriptions.findFirst({
      where: and(eq(subscriptions.userId, ctx.user.id), gt(subscriptions.amount, "0")),
    });
    return { eligible: !paid, percent };
  }),

  // ─── Customer: everyone I referred ───
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.referrals.findMany({
      where: eq(referrals.referrerId, ctx.user.id),
      orderBy: [desc(referrals.createdAt)],
    });
  }),

  // ─── Customer: wallet balance + statement ───
  wallet: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const me = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id), columns: { walletBalance: true } });
    const txns = await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.userId, ctx.user.id),
      orderBy: [desc(walletTransactions.createdAt)],
      limit: 100,
    });
    return { balance: n(me?.walletBalance), transactions: txns };
  }),

  // ─── Customer: my payout requests ───
  withdrawals: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.userId, ctx.user.id),
      orderBy: [desc(withdrawalRequests.createdAt)],
    });
  }),

  // ─── Customer: request a payout to bank / UPI ───
  requestWithdrawal: authedQuery
    .input(
      z.object({
        amount: z.number().positive(),
        method: z.enum(["bank", "upi"]),
        destination: z.string().min(3), // UPI id or account number
        accountName: z.string().optional(),
        ifsc: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const me = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id), columns: { walletBalance: true } });
      const balance = n(me?.walletBalance);
      if (input.amount > balance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Amount exceeds your wallet balance" });
      }
      if (input.amount < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum payout is ₹1" });
      }
      const [ins] = await db.insert(withdrawalRequests).values({
        userId: ctx.user.id,
        amount: money(input.amount),
        method: input.method,
        destination: input.destination.trim(),
        accountName: input.accountName?.trim() || null,
        ifsc: input.ifsc?.trim() || null,
        status: "pending",
      });
      // Hold the funds immediately so the balance can't be double-spent.
      await applyWallet(db, ctx.user.id, -input.amount, {
        type: "withdrawal",
        status: "pending",
        withdrawalId: ins.insertId,
        note: `Payout request via ${input.method.toUpperCase()}`,
      });
      return { ok: true, id: ins.insertId };
    }),

  // ─── Public: current referral rates (for the marketing page) ───
  publicRates: publicQuery.query(async () => {
    const db = getDb();
    return {
      commissionPercent: await getCommissionPercent(db),
      discountPercent: await getDiscountPercent(db),
    };
  }),

  // ─── Public: validate a code on the signup page ───
  validate: publicQuery
    .input(z.object({ code: z.string().min(2) }))
    .query(async ({ input }) => {
      const db = getDb();
      const referrer = await db.query.users.findFirst({ where: eq(users.referralCode, input.code.toUpperCase()) });
      return { valid: !!referrer, referrerName: referrer?.fullName ?? null, discountPercent: await getDiscountPercent(db) };
    }),

  // ─── Public: record a referral (fallback path) ───
  record: publicQuery
    .input(z.object({ code: z.string().min(2), refereeEmail: z.string().email().optional(), refereeId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const referrer = await db.query.users.findFirst({ where: eq(users.referralCode, input.code.toUpperCase()) });
      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code" });
      await db.insert(referrals).values({
        referrerId: referrer.id,
        refereeId: input.refereeId ?? null,
        refereeEmail: input.refereeEmail ?? null,
        code: input.code.toUpperCase(),
        status: input.refereeId ? "joined" : "pending",
      });
      return { ok: true, referrerId: referrer.id };
    }),

  // ═══════════════════ ADMIN ═══════════════════

  // Referral rate settings (commission + referee discount)
  getConfig: adminQuery.query(async () => {
    const db = getDb();
    return {
      commissionPercent: await getCommissionPercent(db),
      discountPercent: await getDiscountPercent(db),
    };
  }),

  setConfig: adminQuery
    .input(z.object({
      commissionPercent: z.number().min(0).max(100).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const upsert = async (key: string, value: number) => {
        await db
          .insert(appSettings)
          .values({ key, value: String(value) })
          .onDuplicateKeyUpdate({ set: { value: String(value) } });
      };
      if (input.commissionPercent !== undefined) await upsert(COMMISSION_KEY, input.commissionPercent);
      if (input.discountPercent !== undefined) await upsert(DISCOUNT_KEY, input.discountPercent);
      return { ok: true };
    }),

  // All referrals, enriched with referrer/referee + paid-plan eligibility
  adminList: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.referrals.findMany({ orderBy: [desc(referrals.createdAt)] });
    const commission = await getCommissionPercent(db);

    const userIds = [
      ...new Set(rows.flatMap((r) => [r.referrerId, r.refereeId].filter((x): x is number => !!x))),
    ];
    const userList = userIds.length
      ? await db.query.users.findMany({ where: inArray(users.id, userIds), columns: { id: true, fullName: true, email: true } })
      : [];
    const userMap = new Map(userList.map((u) => [u.id, u]));

    const refereeIds = [...new Set(rows.map((r) => r.refereeId).filter((x): x is number => !!x))];
    const subs = refereeIds.length
      ? await db.query.subscriptions.findMany({
          where: and(inArray(subscriptions.userId, refereeIds), gt(subscriptions.amount, "0")),
          with: { package: true },
        })
      : [];
    // earliest paid subscription per referee = the conversion the commission is based on
    const subMap = new Map<number, (typeof subs)[number]>();
    for (const s of subs) {
      const prev = subMap.get(s.userId);
      if (!prev || new Date(s.createdAt) < new Date(prev.createdAt)) subMap.set(s.userId, s);
    }

    return rows.map((r) => {
      const referrer = userMap.get(r.referrerId);
      const referee = r.refereeId ? userMap.get(r.refereeId) : undefined;
      const sub = r.refereeId ? subMap.get(r.refereeId) : undefined;
      const planAmount = n(sub?.amount);
      const suggestedReward = Math.round(planAmount * commission) / 100;
      return {
        id: r.id,
        status: r.status,
        code: r.code,
        rewardAmount: n(r.rewardAmount),
        rewardedAt: r.rewardedAt,
        createdAt: r.createdAt,
        referrer: referrer ? { id: referrer.id, name: referrer.fullName, email: referrer.email } : null,
        referee: referee
          ? { id: referee.id, name: referee.fullName, email: referee.email }
          : r.refereeEmail
          ? { id: null, name: null, email: r.refereeEmail }
          : null,
        hasPaidPlan: !!sub,
        planName: sub?.package?.name ?? null,
        planAmount,
        suggestedReward,
        commissionPercent: commission,
      };
    });
  }),

  // Admin credits the referrer's wallet for a paid-plan referral
  creditReward: adminQuery
    .input(z.object({ referralId: z.number(), amount: z.number().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const ref = await db.query.referrals.findFirst({ where: eq(referrals.id, input.referralId) });
      if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found" });
      if (ref.status === "rewarded") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This referral has already been rewarded" });
      }
      await db
        .update(referrals)
        .set({ status: "rewarded", rewardAmount: money(input.amount), rewardedAt: new Date() })
        .where(eq(referrals.id, input.referralId));
      await applyWallet(db, ref.referrerId, input.amount, {
        type: "reward",
        referralId: ref.id,
        note: "Referral reward — paid-plan conversion",
      });
      await db.insert(notifications).values({
        userId: ref.referrerId,
        type: "referral_reward",
        title: "Referral reward credited 🎉",
        message: `₹${money(input.amount)} has been added to your wallet for a successful referral.`,
        link: "/dashboard/refer",
      });
      return { ok: true };
    }),

  // All payout requests for the admin queue
  adminWithdrawals: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.withdrawalRequests.findMany({ orderBy: [desc(withdrawalRequests.createdAt)] });
    const userIds = [...new Set(rows.map((w) => w.userId))];
    const userList = userIds.length
      ? await db.query.users.findMany({ where: inArray(users.id, userIds), columns: { id: true, fullName: true, email: true, walletBalance: true } })
      : [];
    const userMap = new Map(userList.map((u) => [u.id, u]));
    return rows.map((w) => ({
      ...w,
      amount: n(w.amount),
      user: userMap.get(w.userId)
        ? { name: userMap.get(w.userId)!.fullName, email: userMap.get(w.userId)!.email, balance: n(userMap.get(w.userId)!.walletBalance) }
        : null,
    }));
  }),

  // Admin marks a payout as paid (funds were already held on request)
  payWithdrawal: adminQuery
    .input(z.object({ id: z.number(), reference: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const wr = await db.query.withdrawalRequests.findFirst({ where: eq(withdrawalRequests.id, input.id) });
      if (!wr) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (wr.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await db
        .update(withdrawalRequests)
        .set({ status: "paid", reference: input.reference?.trim() || null, processedAt: new Date() })
        .where(eq(withdrawalRequests.id, input.id));
      // settle the held transaction
      await db
        .update(walletTransactions)
        .set({ status: "completed", note: `Payout paid${input.reference ? ` · ref ${input.reference}` : ""}` })
        .where(and(eq(walletTransactions.withdrawalId, input.id), eq(walletTransactions.type, "withdrawal")));
      await db.insert(notifications).values({
        userId: wr.userId,
        type: "payout_paid",
        title: "Payout sent ✅",
        message: `Your payout of ₹${money(n(wr.amount))} has been paid via ${wr.method.toUpperCase()}.`,
        link: "/dashboard/refer",
      });
      return { ok: true };
    }),

  // Admin rejects a payout — funds are returned to the wallet
  rejectWithdrawal: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const wr = await db.query.withdrawalRequests.findFirst({ where: eq(withdrawalRequests.id, input.id) });
      if (!wr) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (wr.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await db
        .update(withdrawalRequests)
        .set({ status: "rejected", adminNote: input.note?.trim() || null, processedAt: new Date() })
        .where(eq(withdrawalRequests.id, input.id));
      await db
        .update(walletTransactions)
        .set({ status: "reversed" })
        .where(and(eq(walletTransactions.withdrawalId, input.id), eq(walletTransactions.type, "withdrawal")));
      // refund the held amount back to the wallet
      await applyWallet(db, wr.userId, n(wr.amount), {
        type: "adjustment",
        withdrawalId: wr.id,
        note: `Payout rejected — amount refunded${input.note ? `: ${input.note}` : ""}`,
      });
      await db.insert(notifications).values({
        userId: wr.userId,
        type: "payout_rejected",
        title: "Payout request declined",
        message: `Your payout of ₹${money(n(wr.amount))} was declined and refunded to your wallet.`,
        link: "/dashboard/refer",
      });
      return { ok: true };
    }),
});
