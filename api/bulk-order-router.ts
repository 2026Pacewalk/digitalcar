import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bulkOrderRequests } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { sendEmail, ownerAddress } from "./lib/mail";

/* Bulk-order requests — a user (or guest) asks to buy a bulk-card bundle. No
   upfront payment: the request is saved and emailed to the team, who follow up
   with an invoice (matches the public bulk-cards model). */
export const bulkOrderRouter = createRouter({
  // Public so both logged-in users and guests can request; captures userId when signed in.
  create: publicQuery
    .input(z.object({
      company: z.string().max(255).optional(),
      contactName: z.string().max(255).optional(),
      phone: z.string().max(50).optional(),
      email: z.string().max(255).optional(),
      quantity: z.number().int().min(1).max(100000),
      pricePerCard: z.number().nonnegative().default(0),
      totalEstimate: z.number().nonnegative().default(0),
      packageName: z.string().max(50).optional(),
      note: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.phone && !input.email) {
        return { ok: false, error: "Add a phone or email so we can reach you." };
      }
      const db = getDb();
      const userId = (ctx.user?.id as number | undefined) ?? null;
      await db.insert(bulkOrderRequests).values({
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
      // Notify the team (best-effort — the request is already saved).
      const inr = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
      const lines = [
        `Company: ${input.company || "-"}`,
        `Contact: ${input.contactName || "-"}`,
        `Phone: ${input.phone || "-"}`,
        `Email: ${input.email || "-"}`,
        `Bundle: ${input.packageName || "Custom"}`,
        `Quantity: ${input.quantity} cards`,
        `Per card: ${inr(input.pricePerCard)}`,
        `Estimated total: ${inr(input.totalEstimate)}`,
        input.note ? `Note: ${input.note}` : "",
        userId ? `From logged-in user #${userId}` : "From a guest",
      ].filter(Boolean);
      void sendEmail(ownerAddress(), {
        subject: `New bulk-card request — ${input.quantity} cards${input.company ? ` (${input.company})` : ""}`,
        text: lines.join("\n"),
        html: `<h2>New bulk-card request</h2><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`,
      }, input.email || null);
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
