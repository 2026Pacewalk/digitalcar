import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bulkOrderRequests } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { sendEmail, ownerAddress } from "./lib/mail";
import { bulkOrderAdminEmail, bulkOrderReceivedEmail } from "./lib/email-templates";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";

const createInput = z.object({
  company: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  quantity: z.number().int().min(1).max(100000),
  pricePerCard: z.number().nonnegative().default(0),
  totalEstimate: z.number().nonnegative().default(0),
  packageName: z.string().max(50).optional(),
  note: z.string().max(2000).optional(),
});

// The email field is free text (a guest can type anything, even a list), so it
// is only mailed or used as reply-to when it is one real-looking address.
function validEmail(s?: string): string | null {
  const v = (s || "").trim();
  return v && z.email().safeParse(v).success ? v : null;
}

// An identical re-submit (a retry after a network error) still saves a row, as
// before, but the requester gets one confirmation, not one per attempt.
const CONFIRM_WINDOW_MS = 10 * 60_000;
const recentConfirmations = new Map<string, number>();
function firstConfirmation(key: string): boolean {
  const now = Date.now();
  for (const [k, at] of recentConfirmations) if (now - at > CONFIRM_WINDOW_MS) recentConfirmations.delete(k);
  if (recentConfirmations.has(key)) return false;
  recentConfirmations.set(key, now);
  return true;
}

/* The team alert and the requester's confirmation. Best-effort and never
   awaited by the mutation: the request is already saved. */
async function notifyBulkOrder(input: z.infer<typeof createInput>, userId: number | null, requestId: number | null): Promise<void> {
  const email = validEmail(input.email);
  await sendEmail(ownerAddress(), bulkOrderAdminEmail({
    company: input.company, contactName: input.contactName, phone: input.phone, email: input.email,
    quantity: input.quantity, pricePerCard: input.pricePerCard, totalEstimate: input.totalEstimate,
    packageName: input.packageName, note: input.note, userId,
  }), email);
  if (!email || !firstConfirmation(`${email.toLowerCase()}|${input.quantity}|${input.packageName || ""}`)) return;
  // Per recipient, whatever the sender's IP: at most 2 confirmations a day to
  // one address, so the form can't be used to mail-bomb someone else.
  try { enforceRateLimit(`bulk-confirm:${email.toLowerCase()}`, 2, 86_400_000); } catch { return; }
  // No note here: this goes to whatever address was typed, so it never carries their free text.
  await sendEmail(email, bulkOrderReceivedEmail({
    name: input.contactName, company: input.company, quantity: input.quantity,
    packageName: input.packageName, pricePerCard: input.pricePerCard, estimate: input.totalEstimate,
    phone: input.phone, requestId,
  }), ownerAddress());
}

/* Bulk-order requests — a user (or guest) asks to buy a bulk-card bundle. No
   upfront payment: the request is saved and emailed to the team, who follow up
   with an invoice (matches the public bulk-cards model). */
export const bulkOrderRouter = createRouter({
  // Public so both logged-in users and guests can request; captures userId when signed in.
  create: publicQuery
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      if (!input.phone && !input.email) {
        return { ok: false, error: "Add a phone or email so we can reach you." };
      }
      // Public, and it emails the address typed in, so cap how often one
      // visitor can submit. Far above what a real buyer ever needs.
      enforceRateLimit(`bulk-order:${clientIp(ctx.req)}`, 5, 10 * 60_000);
      const db = getDb();
      const userId = (ctx.user?.id as number | undefined) ?? null;
      const [saved] = await db.insert(bulkOrderRequests).values({
        userId,
        company: input.company || null,
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        quantity: input.quantity,
        pricePerCard: String(input.pricePerCard),
        totalEstimate: String(input.totalEstimate),
        packageName: input.packageName || null,
        note: input.note || null,
      });
      // Notify the team and the requester (best-effort — the request is already saved).
      void notifyBulkOrder(input, userId, Number(saved?.insertId) || null).catch(() => {});
      return { ok: true };
    }),

  // Admin: how many requests are still 'new' (for the sidebar badge).
  newCount: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ id: bulkOrderRequests.id }).from(bulkOrderRequests).where(eq(bulkOrderRequests.status, "new"));
    return { count: rows.length };
  }),

  // Admin: the request pipeline.
  list: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(bulkOrderRequests).orderBy(desc(bulkOrderRequests.createdAt)).limit(500);
  }),

  // Admin: move a request along the pipeline.
  setStatus: adminQuery
    .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "won", "lost"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bulkOrderRequests).set({ status: input.status }).where(eq(bulkOrderRequests.id, input.id));
      return { ok: true };
    }),
});
