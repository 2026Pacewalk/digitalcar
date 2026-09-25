import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { createRouter, publicQuery, adminQuery, resellerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  resellerApplications, users, resellerProfiles, resellerAccounts, resellerCommissions,
  walletTransactions, withdrawalRequests,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createResetToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { affectedRows } from "./lib/wallet";
import {
  resellerApplicationAdminEmail, resellerApplicationReceivedEmail,
  resellerApprovedEmail, resellerApprovedExistingEmail, resellerRejectedEmail,
} from "./lib/email-templates";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

type Db = ReturnType<typeof getDb>;
const num = (v: unknown) => Number(v ?? 0) || 0;

/* ── Making someone a reseller ─────────────────────────────────────────────
   This is the only code that creates a reseller login. Approving an
   application and giving an offline partner a login both come here, so there
   is one set of rules:

   - the commission rate is the one the admin chose, never a default;
   - every reseller has a ledger account (reseller_accounts) — the admin's book
     of their offline orders and payments — linked to their login;
   - a team account (admin/staff) can never be turned into a reseller, because
     the role change would silently take away its admin access. */
async function grantResellerLogin(db: Db, o: {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  commissionRate: number;
  /** Link this existing ledger account; otherwise reuse theirs or open one. */
  accountId: number | null;
  /** They never applied — the welcome email says they were set up, not approved. */
  invited: boolean;
}): Promise<{ userId: number; accountId: number; isNew: boolean }> {
  const email = o.email.trim().toLowerCase();
  const fullName = o.fullName.trim();
  const company = o.companyName?.trim() || fullName;
  const rate = o.commissionRate.toFixed(2);

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing && (existing.role === "super_admin" || existing.role === "staff")) {
    throw new TRPCError({ code: "CONFLICT", message: "That email belongs to a team account on this platform, so it can't be a reseller login." });
  }
  // One login per ledger account, and one ledger account per login.
  if (existing && o.accountId) {
    const other = await db.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.resellerUserId, existing.id) });
    if (other && other.id !== o.accountId) {
      throw new TRPCError({ code: "CONFLICT", message: `${email} is already the login for another reseller (${other.name}).` });
    }
  }
  // Hash outside the transaction — it is slow and would hold the row locks.
  const randomHash = existing ? null : await bcrypt.hash(nanoid(24), 12);

  const result = await db.transaction(async (tx) => {
    let userId: number;
    if (existing) {
      userId = existing.id;
      if (existing.role !== "reseller") await tx.update(users).set({ role: "reseller" }).where(eq(users.id, userId));
    } else {
      const [ins] = await tx.insert(users).values({
        email, password: randomHash!, fullName, phone: o.phone, role: "reseller", status: "active",
      });
      userId = Number(ins.insertId);
    }

    await tx.insert(resellerProfiles).values({ userId, companyName: company, commissionRate: rate, status: "active" })
      .onDuplicateKeyUpdate({ set: { status: "active", companyName: company, commissionRate: rate } });

    let accountId: number;
    const linked = await tx.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.resellerUserId, userId) });
    if (o.accountId) {
      await tx.update(resellerAccounts).set({ resellerUserId: userId, email, commissionRate: rate })
        .where(eq(resellerAccounts.id, o.accountId));
      accountId = o.accountId;
    } else if (linked) {
      await tx.update(resellerAccounts).set({ commissionRate: rate }).where(eq(resellerAccounts.id, linked.id));
      accountId = linked.id;
    } else {
      const [acc] = await tx.insert(resellerAccounts).values({
        name: fullName, company: o.companyName?.trim() || null, phone: o.phone, email,
        resellerUserId: userId, commissionRate: rate,
      });
      accountId = Number(acc.insertId);
    }
    return { userId, accountId };
  });

  // After commit, so a failed send can never roll the account back.
  if (existing) {
    void sendEmail(email, resellerApprovedExistingEmail({ name: fullName, email, companyName: company, commissionRate: rate }));
  } else {
    const token = await createResetToken(result.userId, (randomHash || "").slice(-12));
    const link = `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    void sendEmail(email, resellerApprovedEmail({ name: fullName, link, email, companyName: company, commissionRate: rate, invited: o.invited }));
  }
  return { ...result, isNew: !existing };
}

const profileInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  gstin: z.string().trim().max(20).regex(/^$|^[0-9A-Z]{15}$/i, "A GSTIN is 15 letters and numbers").optional(),
  payoutMethod: z.enum(["bank", "upi"]).nullable().optional(),
  payoutUpi: z.string().trim().max(120).optional(),
  payoutAccountName: z.string().trim().max(160).optional(),
  payoutAccountNumber: z.string().trim().max(40).regex(/^$|^[0-9]{6,20}$/, "Account numbers are 6–20 digits").optional(),
  payoutIfsc: z.string().trim().max(20).regex(/^$|^[A-Z]{4}0[A-Z0-9]{6}$/i, "An IFSC looks like HDFC0001234").optional(),
});

const blank = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

export const resellerRouter = createRouter({
  // ── Public: apply to become a reseller ──
  submitApplication: publicQuery
    .input(z.object({
      fullName: z.string().min(2).max(120),
      email: z.string().email(),
      phone: z.string().max(30).optional(),
      companyName: z.string().max(160).optional(),
      message: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Public and it sends two emails — keep it from being used as a mailer.
      enforceRateLimit(`reseller-apply:${clientIp(ctx.req)}`, 5, 60 * 60_000);
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const existing = await db.query.resellerApplications.findFirst({
        where: and(eq(resellerApplications.email, email), eq(resellerApplications.status, "pending")),
      });
      if (!existing) {
        await db.insert(resellerApplications).values({
          fullName: input.fullName.trim(), email,
          phone: input.phone?.trim() || null,
          companyName: input.companyName?.trim() || null,
          message: input.message?.trim() || null,
        });
      }
      void sendEmail(ownerAddress(), resellerApplicationAdminEmail({ name: input.fullName, email, phone: input.phone, companyName: input.companyName, message: input.message }));
      void sendEmail(email, resellerApplicationReceivedEmail({ name: input.fullName }));
      return { ok: true };
    }),

  // ── Admin: applications ──
  list: adminQuery.query(async () => {
    const db = getDb();
    return db.query.resellerApplications.findMany({ orderBy: [desc(resellerApplications.createdAt)], limit: 300 });
  }),

  approve: adminQuery
    .input(z.object({
      id: z.number(),
      note: z.string().optional(),
      commissionRate: z.number().min(0).max(100).default(20),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const app = await db.query.resellerApplications.findFirst({ where: eq(resellerApplications.id, input.id) });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      // Claim it, so a double-click can't create the account twice.
      const claimed = await db.update(resellerApplications)
        .set({ status: "approved", adminNote: input.note?.trim() || null, reviewedAt: new Date() })
        .where(and(eq(resellerApplications.id, app.id), eq(resellerApplications.status, "pending")));
      if (affectedRows(claimed) === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      try {
        const r = await grantResellerLogin(db, {
          fullName: app.fullName, email: app.email, phone: app.phone, companyName: app.companyName,
          commissionRate: input.commissionRate, accountId: null, invited: false,
        });
        await db.update(resellerApplications).set({ userId: r.userId }).where(eq(resellerApplications.id, app.id));
        return { ok: true, isNew: r.isNew };
      } catch (e) {
        // Put it back so the admin can fix the problem and approve again.
        await db.update(resellerApplications).set({ status: "pending", reviewedAt: null }).where(eq(resellerApplications.id, app.id));
        throw e;
      }
    }),

  reject: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const app = await db.query.resellerApplications.findFirst({ where: eq(resellerApplications.id, input.id) });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const claimed = await db.update(resellerApplications)
        .set({ status: "rejected", adminNote: input.note?.trim() || null, reviewedAt: new Date() })
        .where(and(eq(resellerApplications.id, app.id), eq(resellerApplications.status, "pending")));
      if (affectedRows(claimed) === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      void sendEmail(app.email, resellerRejectedEmail({ name: app.fullName, note: input.note?.trim() }));
      return { ok: true };
    }),

  // ── Admin: give an offline partner (a ledger account) their own login ──
  grantLogin: adminQuery
    .input(z.object({
      accountId: z.number().int().positive(),
      // Only needed when the account has no email on file yet.
      email: z.string().trim().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const acc = await db.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.id, input.accountId) });
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller not found." });
      if (acc.resellerUserId) throw new TRPCError({ code: "BAD_REQUEST", message: `${acc.name} already has a login.` });
      const email = input.email || acc.email;
      if (!email || !z.string().email().safeParse(email).success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Add ${acc.name}'s email address first — a login can't exist without one.` });
      }
      const r = await grantResellerLogin(db, {
        fullName: acc.name, email, phone: acc.phone, companyName: acc.company,
        commissionRate: num(acc.commissionRate), accountId: acc.id, invited: true,
      });
      return { ok: true, isNew: r.isNew, userId: r.userId };
    }),

  // ── Reseller: their own profile ──
  me: resellerQuery.query(async ({ ctx }) => {
    if (ctx.user.role !== "reseller") throw new TRPCError({ code: "FORBIDDEN" });
    const db = getDb();
    const profile = await db.query.resellerProfiles.findFirst({ where: eq(resellerProfiles.userId, ctx.user.id) });
    const me = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: { fullName: true, email: true, phone: true, createdAt: true, lastLoginAt: true, walletBalance: true },
    });
    return {
      fullName: me?.fullName ?? "",
      email: me?.email ?? "",
      phone: me?.phone ?? "",
      memberSince: me?.createdAt ?? null,
      lastLoginAt: me?.lastLoginAt ?? null,
      walletBalance: num(me?.walletBalance),
      companyName: profile?.companyName ?? "",
      commissionRate: num(profile?.commissionRate),
      status: profile?.status ?? "active",
      whatsapp: profile?.whatsapp ?? "",
      address: profile?.address ?? "",
      gstin: profile?.gstin ?? "",
      payoutMethod: profile?.payoutMethod ?? null,
      payoutUpi: profile?.payoutUpi ?? "",
      payoutAccountName: profile?.payoutAccountName ?? "",
      payoutAccountNumber: profile?.payoutAccountNumber ?? "",
      payoutIfsc: profile?.payoutIfsc ?? "",
    };
  }),

  saveProfile: resellerQuery.input(profileInput).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "reseller") throw new TRPCError({ code: "FORBIDDEN" });
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.update(users).set({ fullName: input.fullName, phone: blank(input.phone) }).where(eq(users.id, ctx.user.id));
      await tx.update(resellerProfiles).set({
        companyName: input.companyName,
        whatsapp: blank(input.whatsapp),
        address: blank(input.address),
        gstin: blank(input.gstin)?.toUpperCase() ?? null,
        payoutMethod: input.payoutMethod ?? null,
        payoutUpi: blank(input.payoutUpi),
        payoutAccountName: blank(input.payoutAccountName),
        payoutAccountNumber: blank(input.payoutAccountNumber),
        payoutIfsc: blank(input.payoutIfsc)?.toUpperCase() ?? null,
      }).where(eq(resellerProfiles.userId, ctx.user.id));
      // Keep the admin's ledger in step with what the partner says about themselves.
      await tx.update(resellerAccounts).set({ name: input.fullName, company: input.companyName, phone: blank(input.phone) })
        .where(eq(resellerAccounts.resellerUserId, ctx.user.id));
    });
    return { ok: true };
  }),

  // ── Reseller: what they've earned, and what's been paid out ──
  earnings: resellerQuery.query(async ({ ctx }) => {
    if (ctx.user.role !== "reseller") throw new TRPCError({ code: "FORBIDDEN" });
    const db = getDb();
    const me = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id), columns: { walletBalance: true } });
    const commissions = await db.select({
      id: resellerCommissions.id,
      createdAt: resellerCommissions.createdAt,
      customerName: users.fullName,
      orderAmount: resellerCommissions.orderAmount,
      rate: resellerCommissions.rate,
      amount: resellerCommissions.amount,
    }).from(resellerCommissions)
      .leftJoin(users, eq(users.id, resellerCommissions.customerUserId))
      .where(eq(resellerCommissions.resellerUserId, ctx.user.id))
      .orderBy(desc(resellerCommissions.createdAt))
      .limit(500);
    const payouts = await db.select({
      id: withdrawalRequests.id, createdAt: withdrawalRequests.createdAt, amount: withdrawalRequests.amount,
      method: withdrawalRequests.method, status: withdrawalRequests.status,
      reference: withdrawalRequests.reference, adminNote: withdrawalRequests.adminNote, processedAt: withdrawalRequests.processedAt,
    }).from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, ctx.user.id))
      .orderBy(desc(withdrawalRequests.createdAt))
      .limit(200);
    const [totals] = await db.select({
      earned: sql<string>`coalesce(sum(case when ${walletTransactions.type} = 'commission' then ${walletTransactions.amount} else 0 end), 0)`,
    }).from(walletTransactions).where(eq(walletTransactions.userId, ctx.user.id));
    const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + num(p.amount), 0);
    const inFlight = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + num(p.amount), 0);
    return {
      walletBalance: num(me?.walletBalance),
      totalEarned: num(totals?.earned),
      paidOut,
      inFlight,
      commissions: commissions.map((c) => ({ ...c, orderAmount: num(c.orderAmount), rate: num(c.rate), amount: num(c.amount), customerName: c.customerName ?? "A customer" })),
      payouts: payouts.map((p) => ({ ...p, amount: num(p.amount) })),
    };
  }),

  // ─── Reseller creates a customer under their account ───
  // The one place users.resellerId is written, which is what links a
  // customer's paid plan to this reseller's commission.
  createCustomer: resellerQuery
    .input(z.object({
      fullName: z.string().min(1), email: z.string().email(),
      phone: z.string().optional(), password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "reseller") throw new TRPCError({ code: "FORBIDDEN" });
      const db = getDb();
      const email = input.email.trim().toLowerCase();
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "That email is already registered." });
      const password = await bcrypt.hash(input.password, 12);
      const [ins] = await db.insert(users).values({
        email, password, fullName: input.fullName.trim(), phone: input.phone?.trim() || null,
        role: "customer", status: "active", resellerId: ctx.user.id,
      }).$returningId();
      await db.update(resellerProfiles)
        .set({ totalCustomers: sql`${resellerProfiles.totalCustomers} + 1` })
        .where(eq(resellerProfiles.userId, ctx.user.id));
      return { ok: true, id: ins.id };
    }),
});
