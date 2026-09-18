import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, like, or } from "drizzle-orm";
import {
  accountDeletionRequests, analyticsEvents, appSessions, appSettings, cardBlocks, cardEvents, cards, cardTrials,
  companies, companyMembers, customDomains, emailLogs, leads, mediaLibrary, notifications, publishedCards,
  pushTokens, subscriptions, users,
} from "@db/schema";
import type { getDb } from "../queries/connection";
import { forgetSession } from "../context";

/* Finishing an account-deletion request (asked for in the app; see
   mobile.requestAccountDeletion). What an owner put on their card and what
   their visitors sent them is erased. What the business must keep by law —
   payments, invoices, subscriptions, orders, referral and wallet ledgers — is
   kept, attached to an account row that no longer says who it was.

   Erased: published cards (with their photos, which live inside the card),
   legacy block cards, enquiries, notifications, media records, custom domains,
   team membership, app sessions and push tokens, email-log rows, card visit
   stats. Subscriptions stop auto-renewing. The user row is kept for the
   ledgers, but its email, name, phone, avatar, password and referral code are
   replaced, and it stays inactive. */

type Db = ReturnType<typeof getDb>;

export const erasedEmail = (userId: number) => `deleted-user-${userId}@deleted.digitalcarda.in`;

async function hideFromAdminLists(db: Db, userId: number, legacyIds: string[]) {
  const add = async (key: string, values: string[]) => {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
    let cur: unknown[] = [];
    try { cur = rows[0]?.value ? JSON.parse(rows[0].value) : []; } catch { cur = []; }
    const set = new Set((Array.isArray(cur) ? cur : []).map(String));
    values.forEach((v) => set.add(v));
    const value = JSON.stringify(key === "hidden_app_users" ? [...set].map(Number) : [...set]);
    await db.insert(appSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
  };
  await add("hidden_app_users", [String(userId)]);
  if (legacyIds.length) await add("hidden_customers", legacyIds);
}

export async function completeAccountDeletion(
  db: Db,
  requestId: number,
  opts: { early?: boolean; legacyCustomers: () => { id?: unknown; email?: string }[]; legacySlugs: () => Set<string> },
) {
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, requestId)).limit(1);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "That request no longer exists." });
  if (request.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: `This request is already ${request.status}.` });
  if (new Date(request.scheduledFor).getTime() > Date.now() && !opts.early) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The 30-day window hasn't ended yet." });
  }

  const userId = request.userId;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "The account no longer exists." });
  if (user.role !== "customer") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only customer accounts can be erased here. Close reseller and admin accounts by hand." });
  }
  const runsCompany = await db.select({ id: companies.id }).from(companies).where(eq(companies.adminUserId, userId)).limit(1);
  if (runsCompany[0]) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This account administers a company. Hand the company to another admin first." });
  }

  const originalEmail = user.email.toLowerCase().trim();
  const published = await db.select({ slug: publishedCards.slug }).from(publishedCards).where(eq(publishedCards.userId, userId));
  const blockCards = await db.select({ id: cards.id }).from(cards).where(eq(cards.userId, userId));
  const cardIds = blockCards.map((c) => Number(c.id));
  // Visit stats are keyed by slug. Never touch a slug a legacy card also uses —
  // those stats belong to the legacy owner.
  const legacy = opts.legacySlugs();
  const slugs = published.map((p) => p.slug.toLowerCase()).filter((s) => s && !legacy.has(s));
  const sessions = await db.select({ id: appSessions.id }).from(appSessions).where(eq(appSessions.userId, userId));
  const legacyIds = opts.legacyCustomers()
    .filter((r) => String(r.email || "").toLowerCase().trim() === originalEmail && r.id != null)
    .map((r) => String(r.id));
  const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const counts = { cards: published.length, leads: 0 };
  await db.transaction(async (tx) => {
    const leadRows = await tx.select({ id: leads.id }).from(leads).where(eq(leads.userId, userId));
    counts.leads = leadRows.length;

    await tx.delete(publishedCards).where(eq(publishedCards.userId, userId));
    if (cardIds.length) {
      await tx.delete(cardBlocks).where(inArray(cardBlocks.cardId, cardIds));
      await tx.delete(analyticsEvents).where(inArray(analyticsEvents.cardId, cardIds));
      await tx.delete(cards).where(eq(cards.userId, userId));
    }
    if (slugs.length) await tx.delete(cardEvents).where(inArray(cardEvents.slug, slugs));
    await tx.delete(leads).where(eq(leads.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(mediaLibrary).where(eq(mediaLibrary.userId, userId));
    await tx.delete(customDomains).where(eq(customDomains.userId, userId));
    await tx.delete(companyMembers).where(eq(companyMembers.userId, userId));
    await tx.delete(appSessions).where(eq(appSessions.userId, userId));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, userId));
    // Rows sent to them, and notices that name them (e.g. the deletion request itself).
    const likeEmail = `%${originalEmail.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    await tx.delete(emailLogs).where(or(eq(emailLogs.userId, userId), eq(emailLogs.toEmail, originalEmail), like(emailLogs.subject, likeEmail)));
    await tx.update(cardTrials).set({ status: "cancelled" }).where(eq(cardTrials.userId, userId));
    // The subscription rows stay for the books, but nothing renews for an account that is gone.
    await tx.update(subscriptions).set({ autoRenew: false }).where(eq(subscriptions.userId, userId));

    await tx.update(users).set({
      email: erasedEmail(userId),
      fullName: "Deleted account",
      phone: null,
      avatar: null,
      password: unusablePassword,
      referralCode: null,
      status: "inactive",
      emailVerified: false,
    }).where(eq(users.id, userId));

    // Any other open request for the same account is settled by this one, and
    // no request row — earlier cancelled ones included — keeps their email or reason.
    await tx.update(accountDeletionRequests).set({ status: "completed", completedAt: new Date() })
      .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "pending")));
    await tx.update(accountDeletionRequests).set({ email: erasedEmail(userId), reason: null })
      .where(eq(accountDeletionRequests.userId, userId));
  });

  sessions.forEach((s) => forgetSession(Number(s.id)));
  await hideFromAdminLists(db, userId, legacyIds);
  return { ok: true as const, userId, ...counts };
}

/** Keeps the account: the request is closed, and an account the request
    switched off is switched back on. Its card shows again at once; the owner
    signs back in (every session was ended when they asked). */
export async function cancelAccountDeletion(db: Db, requestId: number) {
  const [request] = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, requestId)).limit(1);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "That request no longer exists." });
  if (request.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: `This request is already ${request.status}.` });
  await db.update(accountDeletionRequests).set({ status: "cancelled" })
    .where(and(eq(accountDeletionRequests.userId, request.userId), eq(accountDeletionRequests.status, "pending")));
  // Only undo what the request did — never lift a suspension.
  await db.update(users).set({ status: "active" }).where(and(eq(users.id, request.userId), eq(users.status, "inactive")));
  return { ok: true as const };
}
