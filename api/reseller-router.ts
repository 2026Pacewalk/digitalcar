import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { createRouter, publicQuery, adminQuery, superAdminQuery, resellerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  resellerApplications, users, resellerProfiles, resellerAccounts, resellerCommissions,
  walletTransactions, withdrawalRequests, resellerAssignments, paymentOrders, subscriptions,
  subscriptionPackages, referrals, notifications, publishedCards, accountDeletionRequests,
} from "@db/schema";
import { eq, and, desc, sql, inArray, isNull, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createResetToken, createToken } from "./lib/jwt";
import { provisionStarterCard } from "./auth-router";
import { recordActivity } from "./lib/staff-access";
import { sendEmail, ownerAddress } from "./lib/mail";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { affectedRows } from "./lib/wallet";
import {
  resellerApplicationAdminEmail, resellerApplicationReceivedEmail,
  resellerApprovedEmail, resellerApprovedExistingEmail, resellerRejectedEmail, resellerLoginDetailsEmail,
  passwordChangedEmail, resellerCustomerLinkedEmail,
} from "./lib/email-templates";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

type Db = ReturnType<typeof getDb>;
const num = (v: unknown) => Number(v ?? 0) || 0;

/** The reseller login linked to a ledger row, or a clear error for the admin. */
async function linkedLogin(db: Db, accountId: number) {
  const acc = await db.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.id, accountId) });
  if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller not found." });
  if (!acc.resellerUserId) throw new TRPCError({ code: "BAD_REQUEST", message: `${acc.name} has no login yet — give them one first.` });
  const user = await db.query.users.findFirst({ where: eq(users.id, acc.resellerUserId) });
  if (!user || user.role !== "reseller") throw new TRPCError({ code: "NOT_FOUND", message: `${acc.name}'s linked account isn't a reseller login.` });
  return { acc, user };
}

/** A 60-minute, single-use set-password link that lands on the partner sign-in.
    Keyed to the current password hash, so it dies once a password is saved. */
async function setPasswordLink(user: { id: number; password: string }) {
  const token = await createResetToken(user.id, (user.password || "").slice(-12));
  return `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}&for=partner`;
}

/** Why this customer can't be put in a reseller's account (null = they can). */
async function customerBlock(db: Db, cust: { id: number; status: string; email: string }): Promise<string | null> {
  if (cust.status === "inactive") return "This account is closed.";
  if (/@deleted\.digitalcarda\.in$/i.test(cust.email)) return "This account was erased.";
  const [leaving] = await db.select({ id: accountDeletionRequests.id }).from(accountDeletionRequests)
    .where(and(eq(accountDeletionRequests.userId, cust.id), eq(accountDeletionRequests.status, "pending"))).limit(1);
  return leaving ? "This customer has asked for their account to be deleted." : null;
}

/** Resellers a customer can be put with: an active ledger account with an
    active reseller login (commission needs a login to pay into). */
async function pickableResellers(db: Db) {
  const accs = await db.select({
    accountId: resellerAccounts.id, name: resellerAccounts.name, company: resellerAccounts.company, userId: resellerAccounts.resellerUserId,
  }).from(resellerAccounts).where(and(eq(resellerAccounts.active, true), isNotNull(resellerAccounts.resellerUserId)));
  const ids = accs.map((a) => Number(a.userId));
  if (!ids.length) return [];
  const [logins, profiles, counts] = await Promise.all([
    db.select({ id: users.id, email: users.email, role: users.role, status: users.status, lastLoginAt: users.lastLoginAt }).from(users).where(inArray(users.id, ids)),
    db.select({ userId: resellerProfiles.userId, rate: resellerProfiles.commissionRate }).from(resellerProfiles).where(inArray(resellerProfiles.userId, ids)),
    db.select({ r: users.resellerId, n: sql<number>`count(*)` }).from(users)
      .where(and(inArray(users.resellerId, ids), eq(users.role, "customer"))).groupBy(users.resellerId),
  ]);
  return accs.flatMap((a) => {
    const u = logins.find((l) => l.id === Number(a.userId));
    if (!u || u.role !== "reseller" || u.status !== "active") return [];
    return [{
      accountId: a.accountId, userId: u.id, name: a.name, company: a.company, email: u.email,
      rate: num(profiles.find((p) => p.userId === u.id)?.rate ?? 10),
      customers: Number(counts.find((c) => Number(c.r) === u.id)?.n || 0),
      invited: !u.lastLoginAt,
    }];
  }).sort((x, y) => x.name.localeCompare(y.name));
}

/** A reseller login's display name: their ledger account name when they have one. */
async function resellerLabel(db: Db, userId: number) {
  const acc = await db.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.resellerUserId, userId) });
  if (acc) return { userId, accountId: acc.id, name: acc.name, company: acc.company };
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { fullName: true } });
  return { userId, accountId: null, name: u?.fullName || `#${userId}`, company: null };
}

/** users.id → name (a reseller's ledger name wins), for the link history. */
async function nameMap(db: Db, ids: (number | null)[]) {
  const want = [...new Set(ids.filter((x): x is number => !!x))];
  const out = new Map<number, string>();
  if (!want.length) return out;
  for (const u of await db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, want))) out.set(u.id, u.name);
  for (const a of await db.select({ uid: resellerAccounts.resellerUserId, name: resellerAccounts.name }).from(resellerAccounts).where(inArray(resellerAccounts.resellerUserId, want))) {
    if (a.uid) out.set(Number(a.uid), a.name);
  }
  return out;
}

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
    // &for=partner: once the password is saved, that page sends them to the partner sign-in.
    const link = `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}&for=partner`;
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

  /* ── Admin: act on a reseller's login ─────────────────────────────────────
     The admin list is keyed by the ledger row (reseller_accounts); these act on
     the login linked to it. */

  // See the partner portal exactly as the reseller does. Super admin only, never
  // staff: a reseller session can request a payout to any UPI ID. Short-lived,
  // so it can't turn into a standing second key to their account.
  loginAs: superAdminQuery
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = await linkedLogin(getDb(), input.accountId);
      if (user.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${user.fullName}'s login is deactivated — reactivate it first.` });
      }
      const token = await createToken({ userId: user.id, email: user.email, role: user.role }, { expiresIn: "2h" });
      // Super-admin-only procedures skip the staff activity middleware, so these
      // three sensitive ones are recorded by hand.
      recordActivity({ actor: ctx.user, module: "resellers", action: "Signed in as a reseller", target: user.email, req: ctx.req });
      return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
    }),

  // Deactivate or reactivate a reseller. Deactivating stops sign-in at once —
  // api/context.ts re-checks the account on every request, so an open session
  // loses access on its next click — and marks the ledger row inactive. Their
  // customers, cards and ledger history are untouched.
  setActive: adminQuery
    .input(z.object({ accountId: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const acc = await db.query.resellerAccounts.findFirst({ where: eq(resellerAccounts.id, input.accountId) });
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "Reseller not found." });
      const user = acc.resellerUserId
        ? await db.query.users.findFirst({ where: eq(users.id, acc.resellerUserId) })
        : undefined;
      if (input.active && user && user.status === "inactive") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${acc.name}'s login was closed (account deletion), so it can't be reactivated here. Give them a new login instead.` });
      }
      await db.transaction(async (tx) => {
        await tx.update(resellerAccounts).set({ active: input.active }).where(eq(resellerAccounts.id, acc.id));
        // Only ever flip active <-> suspended. An "inactive" account was closed
        // (deletion request), and reactivating a reseller must not reopen it.
        if (user && user.role === "reseller" && user.status !== "inactive") {
          const status = input.active ? "active" : "suspended";
          await tx.update(users).set({ status }).where(eq(users.id, user.id));
          await tx.update(resellerProfiles).set({ status }).where(eq(resellerProfiles.userId, user.id));
        }
      });
      return { ok: true, hadLogin: !!user };
    }),

  // Email the reseller their sign-in details, with a fresh set-password link —
  // for a lost welcome email, an expired link, or a login made while email was down.
  sendLoginEmail: adminQuery
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { acc, user } = await linkedLogin(db, input.accountId);
      if (user.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${user.fullName}'s login is deactivated — reactivate it before sending sign-in details.` });
      }
      const profile = await db.query.resellerProfiles.findFirst({ where: eq(resellerProfiles.userId, user.id) });
      const r = await sendEmail(user.email, resellerLoginDetailsEmail({
        name: user.fullName, link: await setPasswordLink(user), email: user.email,
        companyName: profile?.companyName || acc.company, commissionRate: profile?.commissionRate ?? acc.commissionRate,
        approvedAt: profile?.createdAt ?? user.createdAt, signedInBefore: !!user.lastLoginAt,
      }));
      return { ok: r.ok, sentTo: user.email, error: r.ok ? undefined : r.error || "The email could not be sent." };
    }),

  // Set a new password for the admin to hand over (Share → "Include the
  // password"). Super admin only — the password is a key to their payouts. The
  // reseller is emailed that our team changed it, and the shared message asks
  // them to change it after signing in. Only the bcrypt hash is stored.
  setPassword: superAdminQuery
    .input(z.object({
      accountId: z.number().int().positive(),
      password: z.string()
        .min(8, "Password must be at least 8 characters").max(200)
        .regex(/[A-Z]/, "Password must include an uppercase letter")
        .regex(/[a-z]/, "Password must include a lowercase letter")
        .regex(/\d/, "Password must include a number")
        .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { user } = await linkedLogin(db, input.accountId);
      if (user.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${user.fullName}'s login is deactivated — reactivate it first.` });
      }
      await db.update(users).set({ password: await bcrypt.hash(input.password, 12) }).where(eq(users.id, user.id));
      recordActivity({ actor: ctx.user, module: "resellers", action: "Set a reseller's password", target: user.email, req: ctx.req });
      void sendEmail(user.email, passwordChangedEmail({ name: user.fullName, byTeam: true, at: new Date() }));
      return { ok: true };
    }),

  // A set-password link to paste into WhatsApp yourself. Super admin only:
  // whoever holds the link can choose this reseller's password.
  passwordLink: superAdminQuery
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = await linkedLogin(getDb(), input.accountId);
      if (user.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${user.fullName}'s login is deactivated — reactivate it first.` });
      }
      recordActivity({ actor: ctx.user, module: "resellers", action: "Made a reseller set-password link", target: user.email, req: ctx.req });
      return { link: await setPasswordLink(user), minutes: 60 };
    }),

  /* ── Admin: put an existing customer in a reseller's account ──────────────
     For a customer the reseller brought in by word of mouth who signed up on
     their own. Super admin only: it decides who is paid commission.
     - The reseller earns on plan payments verified from now on (commission is
       worked out at verification, api/payment-router.ts), never on past ones.
     - They see the customer in My Customers, and the customer's payments from
       the link date only (api/lib/reseller-links.ts) — read-only, no card access.
     - Every link, move and removal is kept in reseller_assignments. */

  // The resellers a customer can be put with (active, with a login).
  assignTargets: superAdminQuery.query(async () => pickableResellers(getDb())),

  // Everything the admin needs to decide, before linking.
  assignPreview: superAdminQuery
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = getDb();
      const cust = await db.query.users.findFirst({ where: eq(users.email, input.email.trim().toLowerCase()) });
      if (!cust) return { ok: false as const, reason: "no_account" as const };
      if (cust.role !== "customer") return { ok: false as const, reason: "not_customer" as const };
      const blocked = await customerBlock(db, cust);

      const [paid] = await db.select({ n: sql<number>`count(*)`, total: sql<string>`coalesce(sum(${paymentOrders.amount}), 0)` })
        .from(paymentOrders).where(and(eq(paymentOrders.userId, cust.id), eq(paymentOrders.status, "verified")));
      const [pending] = await db.select({ n: sql<number>`count(*)` })
        .from(paymentOrders).where(and(eq(paymentOrders.userId, cust.id), eq(paymentOrders.status, "pending")));
      const [plan] = await db.select({ name: subscriptionPackages.name, until: subscriptions.currentPeriodEnd })
        .from(subscriptions).innerJoin(subscriptionPackages, eq(subscriptionPackages.id, subscriptions.packageId))
        .where(and(eq(subscriptions.userId, cust.id), eq(subscriptions.status, "active"), sql`(${subscriptions.currentPeriodEnd} IS NULL OR ${subscriptions.currentPeriodEnd} > NOW())`))
        .orderBy(desc(subscriptions.createdAt)).limit(1);

      // Referred by another customer: their first paid plan pays the referral
      // reward as well as the reseller's commission.
      let referral: { by: string; rewarded: boolean } | null = null;
      if (cust.referredById) {
        const by = await db.query.users.findFirst({ where: eq(users.id, cust.referredById), columns: { fullName: true } });
        const [r] = await db.select({ status: referrals.status }).from(referrals)
          .where(and(eq(referrals.referrerId, cust.referredById), eq(referrals.refereeId, cust.id))).limit(1);
        referral = { by: by?.fullName || "another customer", rewarded: r?.status === "rewarded" };
      }

      const current = cust.resellerId ? await resellerLabel(db, cust.resellerId) : null;
      const history = await db.select().from(resellerAssignments)
        .where(eq(resellerAssignments.customerUserId, cust.id)).orderBy(desc(resellerAssignments.createdAt)).limit(5);
      const names = await nameMap(db, history.flatMap((h) => [h.fromResellerId, h.toResellerId, h.assignedBy]));

      return {
        ok: true as const,
        blocked,
        customer: {
          userId: cust.id, name: cust.fullName, email: cust.email, phone: cust.phone,
          status: cust.status, joinedAt: cust.createdAt,
          plan: plan ? { name: plan.name, until: plan.until } : null,
        },
        current,
        paid: { count: Number(paid?.n || 0), total: num(paid?.total) },
        pending: Number(pending?.n || 0),
        referral,
        history: history.map((h) => ({
          at: h.createdAt,
          from: h.fromResellerId ? names.get(h.fromResellerId) ?? `#${h.fromResellerId}` : null,
          to: h.toResellerId ? names.get(h.toResellerId) ?? `#${h.toResellerId}` : null,
          by: h.assignedBy ? names.get(h.assignedBy) ?? null : null,
          note: h.note,
        })),
      };
    }),

  // Link, move or remove. `expectFrom` is the reseller (users.id) the admin was
  // looking at, so two people changing it at once can't overwrite each other.
  assignCustomer: superAdminQuery
    .input(z.object({
      email: z.string().email(),
      accountId: z.number().int().positive().nullable(),     // null = remove the link
      expectFrom: z.number().int().positive().nullable(),
      note: z.string().trim().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const cust = await db.query.users.findFirst({ where: eq(users.email, input.email.trim().toLowerCase()) });
      if (!cust) return { ok: false as const, reason: "no_account" as const };
      if (cust.role !== "customer") throw new TRPCError({ code: "BAD_REQUEST", message: "Only customer accounts can be put in a reseller's account." });
      const why = await customerBlock(db, cust);
      if (why && input.accountId) throw new TRPCError({ code: "BAD_REQUEST", message: why });

      let target: Awaited<ReturnType<typeof linkedLogin>> | null = null;
      if (input.accountId) {
        target = await linkedLogin(db, input.accountId);
        if (!target.acc.active || target.user.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${target.acc.name} is deactivated — reactivate them in Resellers first.` });
        }
        if (target.user.id === cust.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A reseller can't be their own customer." });
      }
      const to = target?.user.id ?? null;
      const from = cust.resellerId ?? null;
      if (from !== input.expectFrom) {
        throw new TRPCError({ code: "CONFLICT", message: "This customer's reseller was just changed by someone else. Close this and open it again." });
      }
      if (from === to) return { ok: true as const, unchanged: true, resellerUserId: to, resellerAccountId: target?.acc.id ?? null, resellerName: target?.acc.name ?? null, emailed: false };

      const note = input.note?.trim() || null;
      const done = await db.transaction(async (tx) => {
        const res = await tx.update(users).set({ resellerId: to })
          .where(and(eq(users.id, cust.id), from === null ? isNull(users.resellerId) : eq(users.resellerId, from)));
        if (affectedRows(res) !== 1) return false;
        await tx.insert(resellerAssignments).values({ customerUserId: cust.id, fromResellerId: from, toResellerId: to, assignedBy: ctx.user.id, note });
        return true;
      });
      if (!done) throw new TRPCError({ code: "CONFLICT", message: "This customer's reseller was just changed by someone else. Close this and open it again." });

      const fromName = from ? (await resellerLabel(db, from))?.name ?? `#${from}` : null;
      const action = !to ? "Removed a customer's reseller" : from ? "Moved a customer to another reseller" : "Put a customer in a reseller's account";
      recordActivity({
        actor: ctx.user, module: "customers", action, target: cust.email, req: ctx.req,
        summary: `${fromName ?? "No reseller"} → ${target?.acc.name ?? "No reseller"}${note ? ` · ${note}` : ""}`,
      });

      // Tell the reseller who now has them: in the portal and by email.
      let emailed = false;
      if (target) {
        try {
          await db.insert(notifications).values({
            userId: target.user.id, type: "reseller_customer_linked",
            title: "New customer in your account",
            message: `${cust.fullName} is now your customer. You earn commission on their plan payments from today.`,
            link: "/reseller/customers",
          });
          const profile = await db.query.resellerProfiles.findFirst({ where: eq(resellerProfiles.userId, target.user.id), columns: { commissionRate: true } });
          const pub = await db.select({ data: publishedCards.data }).from(publishedCards).where(eq(publishedCards.userId, cust.id)).limit(1);
          const card = ((pub[0]?.data as { customer?: Record<string, unknown> })?.customer) || {};
          const res = await sendEmail(target.user.email, resellerCustomerLinkedEmail({
            name: target.user.fullName, customerName: cust.fullName,
            business: typeof card.company_name === "string" ? card.company_name : null,
            rate: profile?.commissionRate ?? null, linkedAt: new Date(),
          }));
          emailed = res.ok;
        } catch (e) {
          console.error("[reseller] link notice not sent:", (e as Error).message);
        }
      }
      return { ok: true as const, unchanged: false, resellerUserId: to, resellerAccountId: target?.acc.id ?? null, resellerName: target?.acc.name ?? null, emailed };
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
      const fullName = input.fullName.trim();
      const phone = input.phone?.trim() || null;
      const [ins] = await db.insert(users).values({
        email, password, fullName, phone,
        role: "customer", status: "active", resellerId: ctx.user.id,
      }).$returningId();
      await db.update(resellerProfiles)
        .set({ totalCustomers: sql`${resellerProfiles.totalCustomers} + 1` })
        .where(eq(resellerProfiles.userId, ctx.user.id));
      // A live card and trial, exactly as a normal signup gets — on the admin's
      // default template. It used to create the account only, so the customer
      // had no card and no link ("/" in Admin → Customers).
      const starter = await provisionStarterCard(db, { id: ins.id, email, fullName, phone });
      return { ok: true, id: ins.id, slug: starter?.slug ?? null };
    }),
});
