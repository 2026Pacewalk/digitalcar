import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { resellerApplications, users, resellerProfiles } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createResetToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import {
  resellerApplicationAdminEmail, resellerApplicationReceivedEmail,
  resellerApprovedEmail, resellerApprovedExistingEmail, resellerRejectedEmail,
} from "./lib/email-templates";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

export const resellerRouter = createRouter({
  // ── Public: apply to become a reseller ──
  apply: publicQuery
    .input(z.object({
      fullName: z.string().min(2).max(120),
      email: z.string().email(),
      phone: z.string().max(30).optional(),
      companyName: z.string().max(160).optional(),
      message: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
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

  // ── Admin: list applications ──
  list: adminQuery.query(async () => {
    const db = getDb();
    return db.query.resellerApplications.findMany({ orderBy: [desc(resellerApplications.createdAt)], limit: 300 });
  }),

  // ── Admin: approve → create/upgrade a reseller account ──
  approve: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const app = await db.query.resellerApplications.findFirst({ where: eq(resellerApplications.id, input.id) });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (app.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });

      const email = app.email.toLowerCase();
      let user = await db.query.users.findFirst({ where: eq(users.email, email) });
      let isNew = false;

      if (user) {
        if (user.role !== "reseller") {
          await db.update(users).set({ role: "reseller" }).where(eq(users.id, user.id));
        }
      } else {
        const randomHash = await bcrypt.hash(nanoid(24), 12);
        const [ins] = await db.insert(users).values({
          email, password: randomHash, fullName: app.fullName,
          phone: app.phone || null, role: "reseller", status: "active",
        });
        user = await db.query.users.findFirst({ where: eq(users.id, ins.insertId) });
        isNew = true;
      }
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create reseller" });

      await db.insert(resellerProfiles).values({
        userId: user.id, companyName: app.companyName || app.fullName, commissionRate: "10.00", status: "active",
      }).onDuplicateKeyUpdate({ set: { status: "active", companyName: app.companyName || app.fullName } });

      await db.update(resellerApplications).set({
        status: "approved", userId: user.id, adminNote: input.note?.trim() || null, reviewedAt: new Date(),
      }).where(eq(resellerApplications.id, app.id));

      if (isNew) {
        const token = await createResetToken(user.id, (user.password || "").slice(-12));
        const link = `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
        void sendEmail(email, resellerApprovedEmail({ name: app.fullName, link }));
      } else {
        void sendEmail(email, resellerApprovedExistingEmail({ name: app.fullName }));
      }
      return { ok: true, isNew };
    }),

  // ── Admin: reject ──
  reject: adminQuery
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const app = await db.query.resellerApplications.findFirst({ where: eq(resellerApplications.id, input.id) });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (app.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Already processed" });
      await db.update(resellerApplications).set({
        status: "rejected", adminNote: input.note?.trim() || null, reviewedAt: new Date(),
      }).where(eq(resellerApplications.id, app.id));
      void sendEmail(app.email, resellerRejectedEmail({ name: app.fullName, note: input.note?.trim() }));
      return { ok: true };
    }),
});
