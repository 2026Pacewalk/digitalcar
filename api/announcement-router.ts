import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { announcements, coupons } from "@db/schema";

/* Offer announcements — the popup a super-admin runs for a festival sale, a
   coupon, or a "sale starting soon" teaser. Shown on the public site, in the
   dashboard, or both, between its show-from and show-until dates. */

export type PublicAnnouncement = {
  id: number;
  version: number;
  title: string;
  message: string | null;
  kind: "offer" | "teaser" | "info";
  theme: "diwali" | "holi" | "newyear" | "festive" | "brand" | "dark";
  badge: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  countdownTo: Date | null;
  coupon: {
    code: string; discountType: "percent" | "flat"; discountValue: number; maxDiscount: number | null;
    minAmount: number | null; validUntil: Date | null; description: string | null;
  } | null;
};

// Every public page asks for the current announcement, so answers are cached
// briefly per audience rather than hitting the database on each page view.
const cache = new Map<string, { at: number; value: PublicAnnouncement | null }>();
const TTL = 60_000;
const clearCache = () => cache.clear();

const annInput = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().max(500).optional(),
  kind: z.enum(["offer", "teaser", "info"]),
  theme: z.enum(["diwali", "holi", "newyear", "festive", "brand", "dark"]),
  badge: z.string().trim().max(40).optional(),
  couponId: z.number().int().positive().nullable().optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.string().trim().max(255)
    .refine((u) => !u || u.startsWith("/") || /^https:\/\//i.test(u), "Use a site path like /pricing or a full https:// link")
    .optional(),
  showFrom: z.coerce.date().nullable().optional(),
  showUntil: z.coerce.date().nullable().optional(),
  countdownTo: z.coerce.date().nullable().optional(),
  audience: z.enum(["public", "dashboard", "both"]),
  active: z.boolean().default(true),
});

export const announcementRouter = createRouter({
  current: publicQuery
    .input(z.object({ audience: z.enum(["public", "dashboard"]) }))
    .query(async ({ input }): Promise<PublicAnnouncement | null> => {
      const hit = cache.get(input.audience);
      if (hit && Date.now() - hit.at < TTL) return hit.value;

      let value: PublicAnnouncement | null = null;
      try {
        const db = getDb();
        const now = new Date();
        const rows = await db.select().from(announcements)
          .where(eq(announcements.active, true)).orderBy(desc(announcements.updatedAt)).limit(20);
        const live = rows.find((a) =>
          (a.audience === "both" || a.audience === input.audience) &&
          (!a.showFrom || a.showFrom <= now) &&
          (!a.showUntil || a.showUntil >= now));
        if (live) {
          let coupon: PublicAnnouncement["coupon"] = null;
          if (live.couponId) {
            const [c] = await db.select().from(coupons).where(eq(coupons.id, live.couponId)).limit(1);
            // Only advertise a code that would actually work today.
            if (c && c.active && (!c.validUntil || c.validUntil >= now)) {
              coupon = {
                code: c.code, discountType: c.discountType, discountValue: Number(c.discountValue),
                maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
                minAmount: c.minAmount ? Number(c.minAmount) : null,
                validUntil: c.validUntil, description: c.description,
              };
            }
          }
          value = {
            id: live.id,
            version: new Date(live.updatedAt).getTime(),
            title: live.title,
            message: live.message,
            kind: live.kind,
            theme: live.theme,
            badge: live.badge,
            ctaLabel: live.ctaLabel,
            ctaUrl: live.ctaUrl,
            countdownTo: live.countdownTo,
            coupon,
          };
        }
      } catch {
        value = null;
      }
      cache.set(input.audience, { at: Date.now(), value });
      return value;
    }),

  list: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(announcements).orderBy(desc(announcements.updatedAt));
    const couponRows = await db.select({
      id: coupons.id, code: coupons.code, active: coupons.active, discountType: coupons.discountType,
      discountValue: coupons.discountValue, maxDiscount: coupons.maxDiscount, minAmount: coupons.minAmount, validUntil: coupons.validUntil,
    }).from(coupons).orderBy(desc(coupons.createdAt));
    return {
      announcements: rows,
      coupons: couponRows.map((c) => ({
        ...c,
        discountValue: Number(c.discountValue),
        maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
        minAmount: c.minAmount ? Number(c.minAmount) : null,
      })),
    };
  }),

  save: adminQuery.input(annInput).mutation(async ({ input }) => {
    const db = getDb();
    const values = {
      title: input.title,
      message: input.message || null,
      kind: input.kind,
      theme: input.theme,
      badge: input.badge || null,
      couponId: input.couponId ?? null,
      ctaLabel: input.ctaLabel || null,
      ctaUrl: input.ctaUrl || null,
      showFrom: input.showFrom ?? null,
      showUntil: input.showUntil ?? null,
      countdownTo: input.countdownTo ?? null,
      audience: input.audience,
      active: input.active,
    };
    let id = input.id;
    if (id) await db.update(announcements).set(values).where(eq(announcements.id, id));
    else {
      const [res] = await db.insert(announcements).values(values);
      id = Number(res.insertId);
    }
    clearCache();
    return { ok: true, id };
  }),

  setActive: adminQuery
    .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await getDb().update(announcements).set({ active: input.active }).where(eq(announcements.id, input.id));
      clearCache();
      return { ok: true };
    }),

  remove: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await getDb().delete(announcements).where(eq(announcements.id, input.id));
    clearCache();
    return { ok: true };
  }),
});
