import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, referrals, notifications, cards, publishedCards, cardTrials, appSettings, products } from "@db/schema";
import { getDefaultDesign } from "./template-router";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { slugTakenByOther } from "./publish-router";
import { resolveReferrer } from "./referral-router";
import { createToken, createResetToken, verifyResetToken, createVerifyToken, verifyVerifyToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import {
  welcomeEmail, passwordChangedEmail, passwordResetEmail, newSignupAdminEmail, referralSignupAdminEmail, verifyEmailAddressEmail,
  emailChangedEmail, referralJoinedEmail,
} from "./lib/email-templates";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";
import { ipAllowed, loadSettings } from "./lib/app-settings";
import { verifyGoogleIdToken } from "./lib/google-auth";
import { TRIAL_COUPON_CODE, evaluateTrialCoupon, recordTrialRedemption } from "./lib/coupons";
import { randomBytes } from "crypto";
import { edgeGeo, parseUa } from "./lib/analytics";
import { mergedCustomerCount } from "./admin-router";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

// Strong-password rule for new/changed passwords (signup, reset, change).
// Login is deliberately NOT gated by this so legacy accounts still work.
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

/* The handle a new card's URL is built from: the BUSINESS name first (that is
   what the signup form tells people, and what they print), then the person's
   name, then the email's local part. Kept identical to the browser's
   slugifyUsername() so the link previewed while typing is the link created. */
export function cardSlugBase(companyName?: string | null, fullName?: string | null, email?: string | null): string {
  const src = String(companyName || "").trim() || String(fullName || "").trim() || String(email || "").split("@")[0];
  return src.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "card";
}

/* First free card URL for a base: base, base-2, base-3… as seen by an account
   that owns nothing yet (ownerUserId 0 / no email → every existing holder,
   legacy or new, counts as "someone else"). */
async function firstFreeCardSlug(
  db: ReturnType<typeof getDb>, base: string, ownerUserId = 0, ownerEmail?: string, maxTries = 40,
): Promise<string> {
  let slug = base;
  for (let n = 2; await slugTakenByOther(db, slug, ownerUserId, 1, ownerEmail); n++) {
    if (n > maxTries) return `${base}-${nanoid(4).toLowerCase()}`;
    slug = `${base}-${n}`;
  }
  return slug;
}

/* What a visitor chose BEFORE signing up — a template/product design, a colour,
   an AI Card Generator draft — so the starter card is created that way.

   The published snapshot is the card's primary copy (the dashboard re-pulls it
   on every load), so seeding these only in the browser meant they were wiped on
   the first refresh: a customer who picked "Coral" or generated a card with AI
   landed back on the plain gold default. Everything here is optional, strictly
   typed and length-capped; it only ever shapes the new account's OWN card. */
const HEX = /^#[0-9a-fA-F]{6}$/;
const starterCardInput = z.object({
  theme: z.number().int().min(1).max(500).optional(),
  color: z.string().regex(HEX).optional(),
  color2: z.union([z.string().regex(HEX), z.literal("")]).optional(),
  product_id: z.number().int().positive().optional(),
  product_slug: z.string().max(191).optional(),
  designation: z.string().max(191).optional(),
  about: z.string().max(4000).optional(),
  specialities: z.string().max(2000).optional(),
  social_title: z.string().max(300).optional(),
  seo_title: z.string().max(191).optional(),
  seo_description: z.string().max(500).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
}).strict();
type StarterCard = z.infer<typeof starterCardInput>;

/* On signup, give every new account its OWN live card URL + start the trial, so
   the card link is never empty and never falls back to a leftover/other slug.
   Best-effort: any failure here must never block registration. */
export async function provisionStarterCard(
  db: ReturnType<typeof getDb>,
  user: { id: number; email: string; fullName: string; phone: string | null },
  companyName?: string,
  promo?: string,
  card?: StarterCard,
): Promise<{ slug: string; trial: { days: number; endsAt: Date; voucher: string | null } } | null> {
  try {
    // Unique slug from the business name (e.g. "Sharma Sweets" -> sharma-sweets,
    // then -2, -3…). It used to be built from the PERSON's name while the form
    // and the dashboard used the business name, so the live link and the link
    // the owner saw in their dashboard silently disagreed.
    const base = cardSlugBase(companyName, user.fullName, user.email);
    const slug = await firstFreeCardSlug(db, base, user.id, user.email);
    // A simple starter card — they fill in the details from the dashboard. It
    // starts on the admin's default template (Admin → Templates ★); a design the
    // visitor picked before signing up (a product, a gallery link, an AI draft)
    // still wins, with that template's own colours if they didn't pick any.
    const design = card?.theme ? { theme: card.theme, color: "#F7B31C", color2: "" } : await getDefaultDesign(db);
    const starter = {
      customer: {
        id: user.id, name: user.fullName, slug, username: slug,
        email: user.email, mobile1: user.phone || "", company_name: companyName || "",
        designation: "", nature: "", about_us: "", theme: design.theme, color: design.color, color2: design.color2,
        // The design / content chosen before signup. Identity fields above
        // (id, name, slug, email, phone, company) are never overridden by it.
        ...(card || {}),
        ...(card?.about ? { about_on: 1 } : {}),
      },
      products: [], gallery: [], videos: [], offers: [], qrcodes: [], reviews: [],
    };
    await db.insert(publishedCards).values({ userId: user.id, cardId: 1, slug, publicId: nanoid(10), data: starter });
    // Start the trial (admin-configurable, default 30 days) so the card is live now.
    const daysRow = await db.select().from(appSettings).where(eq(appSettings.key, "trial_days"));
    const days = Number(daysRow[0]?.value) || 30;
    const now = new Date();

    /* The free-trial voucher (FREE30D). It is validated HERE, on the server —
       a code from the browser can never change the trial length or the price.
       A code that doesn't check out is simply not recorded: the 30-day trial
       still starts, because a promo must never block someone signing up. */
    let voucher: { couponId: number; code: string } | null = null;
    try {
      const check = await evaluateTrialCoupon(db, promo || TRIAL_COUPON_CODE, { userId: user.id, now });
      if (check.ok) voucher = { couponId: check.couponId, code: check.code };
      else console.log(`[trial] voucher not applied for user ${user.id}: ${check.reason}`);
    } catch (e) { console.error("[trial] voucher check failed:", (e as Error).message); }

    const endsAt = new Date(now.getTime() + days * 86_400_000);
    await db.insert(cardTrials).values({
      userId: user.id, status: "active", startedAt: now, publishedAt: now,
      endsAt,
      couponCode: voucher?.code ?? null,
      activationSource: voucher ? "signup_voucher" : "signup",
    });
    if (voucher) {
      try { await recordTrialRedemption(db, { couponId: voucher.couponId, userId: user.id }); }
      catch (e) { console.error("[trial] voucher record failed:", (e as Error).message); }
    }
    return { slug, trial: { days, endsAt, voucher: voucher?.code ?? null } };
  } catch { return null; }
}

/* The owner's new-signup alert, with everything worth knowing about the person
   in one place: how and where they signed up, what they picked first, their new
   card and trial, and how busy signups are. Every lookup is best-effort — a
   missing detail just leaves that line out, and nothing here can fail a signup. */
async function alertOwnerOfSignup(
  db: ReturnType<typeof getDb>,
  user: typeof users.$inferSelect,
  info: {
    method: "email" | "google";
    req?: Request;
    companyName?: string;
    card?: StarterCard;
    starter: Awaited<ReturnType<typeof provisionStarterCard>>;
    referral: { name: string; code: string } | null;
  },
): Promise<void> {
  const header = (n: string) => info.req?.headers.get(n) ?? null;

  // Coarse place from the Cloudflare edge headers (never an IP lookup).
  let place: string | null = null;
  try {
    const { city, country } = edgeGeo(header);
    let region = header("cf-region") || "";
    try { region = decodeURIComponent(region); } catch { /* keep as sent */ }
    let countryName = country || "";
    try { if (country) countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country; } catch { /* the code is fine */ }
    place = [city, region && region !== city ? region : "", countryName].filter(Boolean).join(", ").slice(0, 120) || null;
  } catch { place = null; }

  // The phone app's requests carry the network library's user agent, not a
  // browser's: okhttp on Android, CFNetwork/Darwin on iOS.
  let device: string | null = null;
  const ua = header("user-agent");
  if (ua && /okhttp/i.test(ua)) device = "DigitalCarda app · Android";
  else if (ua && /CFNetwork|Darwin/i.test(ua)) device = "DigitalCarda app · iOS";
  else if (ua) {
    const u = parseUa(ua);
    const desktopOs = ["Windows", "macOS", "Linux", "ChromeOS"].includes(u.os);
    const kind = u.device === "mobile" ? "Phone" : u.device === "tablet" ? "Tablet" : desktopOs ? "Computer" : "";
    device = [kind, u.os, u.browser].filter((b) => b && b !== "Other").join(" · ") || null;
  }

  // The page the signup form was on (this site only), e.g. /signup?product=…
  let page: string | null = null;
  try {
    const ref = header("referer");
    if (ref) {
      const url = new URL(ref);
      if (/(^|\.)digitalcarda\.in$|^localhost$|^127\.0\.0\.1$/.test(url.hostname)) page = (url.pathname + url.search).slice(0, 140);
    }
  } catch { page = null; }

  // The template they chose before signing up.
  let template: { name: string; image: string | null; url: string } | null = null;
  try {
    const c = info.card;
    const where = c?.product_id ? eq(products.id, c.product_id)
      : c?.product_slug ? eq(products.slug, c.product_slug)
      : c?.theme ? eq(products.styleNumber, c.theme)
      : null;
    if (where) {
      const [row] = await db.select({ name: products.name, slug: products.slug, images: products.images }).from(products).where(where).limit(1);
      if (row) {
        const imgs = Array.isArray(row.images) ? (row.images as unknown[]).map(String) : [];
        // PNG/JPG first: Outlook and older mail apps don't show WebP.
        const img = imgs.find((i) => /\.(png|jpe?g)$/i.test(i)) || imgs[0] || null;
        template = {
          name: row.name,
          image: img ? (/^https?:\/\//i.test(img) ? img : `https://digitalcarda.in${img.startsWith("/") ? "" : "/"}${img}`) : null,
          url: `https://digitalcarda.in/digital-business-cards-templates/${encodeURIComponent(row.slug)}`,
        };
      }
    }
  } catch { template = null; }

  // Signups today / this month, by the India calendar. The day and month starts
  // are worked out here as epoch seconds and compared with UNIX_TIMESTAMP(),
  // which is the stored instant whatever the MySQL session's time zone is.
  // The all-time total is the same merged figure the admin Dashboard shows.
  let counts: { today: number; month: number; total: number } | null = null;
  try {
    const IST_OFFSET = 19_800; // +05:30 in seconds
    const ist = new Date(Date.now() + IST_OFFSET * 1000);
    const dayStart = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) / 1000 - IST_OFFSET;
    const monthStart = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) / 1000 - IST_OFFSET;
    const [c] = await db.select({
      today: sql<string>`COALESCE(SUM(UNIX_TIMESTAMP(${users.createdAt}) >= ${dayStart}), 0)`,
      month: sql<string>`COALESCE(SUM(UNIX_TIMESTAMP(${users.createdAt}) >= ${monthStart}), 0)`,
    }).from(users).where(eq(users.role, "customer"));
    const { total } = await mergedCustomerCount(db);
    if (c) counts = { today: Number(c.today) || 0, month: Number(c.month) || 0, total };
  } catch { counts = null; }

  await sendEmail(ownerAddress(), newSignupAdminEmail({
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    photo: user.avatar,
    method: info.method,
    emailVerified: !!user.emailVerified,
    business: info.companyName?.trim() || null,
    slug: info.starter?.slug ?? null,
    trial: info.starter?.trial ?? null,
    template,
    colour: info.card?.color ?? null,
    aiDraft: !!info.card?.about,
    referral: info.referral,
    place,
    device,
    page,
    counts,
  }));
}

/* Email the referrer that someone joined with their link. The percentages are
   the admin's Refer & Earn settings, read the same way (and with the same 15%
   defaults) as referral-router.ts and payment-router.ts. A referrer whose own
   account isn't active (suspended, or waiting to be erased) isn't emailed. */
async function tellReferrerOfSignup(
  db: ReturnType<typeof getDb>,
  referrer: { email: string; fullName: string; status: string },
  friendName: string,
  code: string,
): Promise<void> {
  if (referrer.status !== "active") return;
  const rows = await db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings)
    .where(inArray(appSettings.key, ["referral_commission_percent", "referral_discount_percent"]));
  const percent = (key: string) => {
    const row = rows.find((r) => r.key === key);
    const val = row ? Number(row.value) : 15;
    return Number.isFinite(val) ? val : 15;
  };
  await sendEmail(referrer.email, referralJoinedEmail({
    name: referrer.fullName,
    friendName,
    code,
    commissionPercent: percent("referral_commission_percent"),
    discountPercent: percent("referral_discount_percent"),
    joinedAt: new Date(),
  }));
}

/* After the sign-in email really changed: a confirm link to the NEW address,
   then a security notice to the OLD one (the standard account-takeover path,
   so the rightful owner hears about it). The notice only says a link was sent
   when that send actually went out. Capped per account, so switching the
   address back and forth can't be used to flood an inbox with our emails. */
async function notifyEmailChange(
  user: { id: number; fullName: string },
  oldEmail: string,
  newEmail: string,
): Promise<void> {
  try { enforceRateLimit(`email-change-mail:${user.id}`, 5, 3_600_000); } catch { return; }
  const at = new Date();
  let verificationSent = false;
  try {
    const token = await createVerifyToken(user.id, newEmail);
    const link = `${PUBLIC_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    verificationSent = (await sendEmail(newEmail, verifyEmailAddressEmail({ name: user.fullName, link, email: newEmail, purpose: "changed" }))).ok;
  } catch { verificationSent = false; }
  // The old address no longer maps to this account, so tag the log row with it.
  await sendEmail(oldEmail, { ...emailChangedEmail({ name: user.fullName, oldEmail, newEmail, at, verificationSent }), userId: user.id });
}

/* Everything a brand-new account gets, whichever way it signed up (email or
   Google): welcome emails, the owner alert, referral linking, the welcome
   notification, and its own live card with the trial started. */
async function welcomeNewAccount(
  db: ReturnType<typeof getDb>,
  insertedUser: typeof users.$inferSelect,
  opts: { referralCode?: string; companyName?: string; promo?: string; verifyEmail: boolean; card?: StarterCard; method: "email" | "google"; req?: Request },
): Promise<string | null> {
  // An email-verification link when the address isn't already verified —
  // non-blocking. The welcome email and the owner's alert go at the end, once
  // the card, trial and referral they describe exist.
  if (opts.verifyEmail) {
    const vtoken = await createVerifyToken(insertedUser.id, insertedUser.email);
    const vlink = `${PUBLIC_BASE_URL}/verify-email?token=${encodeURIComponent(vtoken)}`;
    void sendEmail(insertedUser.email, verifyEmailAddressEmail({ name: insertedUser.fullName, link: vlink, email: insertedUser.email, purpose: "signup" }));
  }
  let referral: { name: string; code: string } | null = null;

  // (No reseller branch here: public signup creates customers only. Reseller
  // profiles are created by reseller.approve / user.createReseller.)

  // Apply referral (Refer & Earn) — both the referrer and this new user get a discount
  if (opts.referralCode) {
    // A code is either the referrer card slug or their older DC... code, and
    // resolveReferrer knows both - so ?ref=social-theory credits the right
    // person instead of silently crediting nobody.
    const code = opts.referralCode.trim();
    try {
      const referrer = await resolveReferrer(db, code);
      if (referrer && referrer.id !== insertedUser.id) {
        referral = { name: referrer.fullName, code };
        await db.update(users).set({ referredById: referrer.id }).where(eq(users.id, insertedUser.id));
        // Reward is credited later by an admin once this user buys a paid plan.
        await db.insert(referrals).values({
          referrerId: referrer.id,
          refereeId: insertedUser.id,
          refereeEmail: insertedUser.email,
          code,
          status: "joined",
        });
        // Email the referrer too (non-blocking; its lookups can't fail the signup).
        void tellReferrerOfSignup(db, referrer, insertedUser.fullName, code)
          .catch((e) => console.error("[signup] referrer email failed:", (e as Error).message));
        // Tell the referrer someone joined with their link
        await db.insert(notifications).values({
          userId: referrer.id,
          type: "referral_joined",
          title: "New referral signup 🎉",
          message: `${insertedUser.fullName} just joined with your referral link. You'll earn cash when they upgrade to a paid plan.`,
          link: "/dashboard/refer",
        });
        // Alert the owner about the referral signup (non-blocking).
        void sendEmail(ownerAddress(), referralSignupAdminEmail({ newUserName: insertedUser.fullName, newUserEmail: insertedUser.email, referrerName: referrer.fullName, code }));
      }
    } catch { /* referral linking is best-effort */ }
  }

  // Welcome message in the new user's bell
  try {
    await db.insert(notifications).values({
      userId: insertedUser.id,
      type: "welcome",
      title: "Welcome to DigitalCarda 👋",
      message: "Your account is ready. Complete your card profile to start getting enquiries.",
      link: "/dashboard/home",
    });
  } catch { /* non-critical */ }

  // Give the new account its own live card URL + start the trial. The slug is
  // returned so the browser seeds the SAME link the server just published.
  const starter = await provisionStarterCard(db, insertedUser, opts.companyName, opts.promo, opts.card);
  // Welcome email (non-blocking), sent now so it can carry the live card link and
  // the trial's length and end date. With no starter card it's a plain welcome.
  void sendEmail(insertedUser.email, welcomeEmail({
    name: insertedUser.fullName, role: insertedUser.role,
    slug: starter?.slug ?? null, companyName: opts.companyName ?? null, trial: starter?.trial ?? null,
  }));
  void alertOwnerOfSignup(db, insertedUser, {
    method: opts.method, req: opts.req, companyName: opts.companyName, card: opts.card, starter, referral,
  }).catch((e) => console.error("[signup] owner alert failed:", (e as Error).message));
  return starter?.slug ?? null;
}

/* Legacy-auth bridge: the old site stored plaintext passwords (some with stray
   trailing/leading spaces), and the DB import either hashed them verbatim or fell
   back to a default. So a customer typing their real password can fail the bcrypt
   check. This returns the plaintext password(s) the old export had for an email,
   so login can verify against them (trimmed) and self-heal the stored hash. */
async function legacyPasswordsFor(email: string): Promise<string[]> {
  const { readFile } = await import("node:fs/promises");
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(await readFile(p, "utf8")) as { email?: string; password?: unknown }[];
      return rows
        .filter((x) => String(x.email || "").toLowerCase().trim() === email)
        .map((x) => String(x.password ?? ""))
        .filter((s) => s.trim().length > 0);
    } catch { /* file not at this path — try the next */ }
  }
  return [];
}

async function readLegacyCustomers(): Promise<Record<string, unknown>[]> {
  const { readFile } = await import("node:fs/promises");
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try { return JSON.parse(await readFile(p, "utf8")); } catch { /* try next */ }
  }
  return [];
}

/* Which of email / phone / username are already taken by ANY profile — checking
   the live DB users AND the legacy customers export. Used to keep signups (and
   profile edits) unique so two accounts can never share an identifier. */
async function findTaken(fields: { email?: string; phone?: string; username?: string }) {
  const db = getDb();
  const email = fields.email?.toLowerCase().trim() || "";
  const digits = fields.phone ? fields.phone.replace(/\D/g, "") : "";
  const last10 = digits.length >= 10 ? digits.slice(-10) : "";
  const uname = fields.username?.toLowerCase().trim() || "";
  const taken = { email: false, phone: false, username: false };

  if (email) {
    const u = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (u) taken.email = true;
  }
  if (last10) {
    const u = await db.query.users.findFirst({ where: like(users.phone, `%${last10}`) });
    if (u) taken.phone = true;
  }

  if ((email && !taken.email) || (last10 && !taken.phone) || uname) {
    for (const r of await readLegacyCustomers()) {
      if (email && !taken.email && String(r.email || "").toLowerCase().trim() === email) taken.email = true;
      if (last10 && !taken.phone) {
        const m1 = String(r.mobile1 || "").replace(/\D/g, "");
        const m2 = String(r.mobile2 || "").replace(/\D/g, "");
        if ((m1 && m1.endsWith(last10)) || (m2 && m2.endsWith(last10))) taken.phone = true;
      }
      if (uname && !taken.username &&
        (String(r.username || "").toLowerCase().trim() === uname || String(r.slug || "").toLowerCase().trim() === uname)) {
        taken.username = true;
      }
    }
  }
  return taken;
}

/* Resolve a login identifier (email, username, card slug, or mobile) to the
   account's canonical email via the legacy export, so customers can sign in with
   any of them. The DB `users` table only has email + phone, so username/slug and
   most phone variants are matched here. */
async function legacyEmailFor(idLc: string, digits: string): Promise<string | null> {
  const last10 = digits.length >= 10 ? digits.slice(-10) : "";
  const { readFile } = await import("node:fs/promises");
  for (const p of ["./dist/public/customers.json", "./public/customers.json"]) {
    try {
      const rows = JSON.parse(await readFile(p, "utf8")) as Record<string, unknown>[];
      const match = rows.find((r) => {
        const email = String(r.email || "").toLowerCase().trim();
        const uname = String(r.username || "").toLowerCase().trim();
        const slug = String(r.slug || "").toLowerCase().trim();
        if (idLc && (email === idLc || uname === idLc || slug === idLc)) return true;
        if (last10) {
          const m1 = String(r.mobile1 || "").replace(/\D/g, "");
          const m2 = String(r.mobile2 || "").replace(/\D/g, "");
          if ((m1 && m1.endsWith(last10)) || (m2 && m2.endsWith(last10))) return true;
        }
        return false;
      });
      return match ? String(match.email || "").toLowerCase().trim() || null : null;
    } catch { /* file not at this path — try the next */ }
  }
  return null;
}

/* Find the DB user for a typed identifier: email, then phone (last 10 digits),
   then the legacy username/slug/mobile → email lookup. */
async function resolveLoginUser(db: ReturnType<typeof getDb>, identifier: string) {
  const idLc = identifier.toLowerCase().trim();
  const digits = identifier.replace(/\D/g, "");

  let user = await db.query.users.findFirst({ where: eq(users.email, idLc) });
  if (user) return user;

  if (digits.length >= 10) {
    user = await db.query.users.findFirst({ where: like(users.phone, `%${digits.slice(-10)}`) });
    if (user) return user;
  }

  const email = await legacyEmailFor(idLc, digits);
  if (email) {
    user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (user) return user;
  }
  return null;
}

export const authRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: strongPassword,
        fullName: z.string().min(2),
        phone: z.string().optional(),
        // Public signup can ONLY create a customer. Reseller accounts come from
        // the application + admin-approval flow (reseller.submitApplication →
        // reseller.approve) or user.createReseller; accepting "reseller" here let
        // any anonymous caller self-approve into a commission-earning account.
        role: z.literal("customer").default("customer"),
        companyName: z.string().optional(),
        referralCode: z.string().optional(),
        // Free-trial voucher (FREE30D). Only a record — the server decides the
        // trial length, and an unknown code is ignored, never an error.
        promo: z.string().max(40).optional(),
        card: starterCardInput.optional().catch(undefined),
      })
    )
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`register:${clientIp(ctx.req)}`, 5, 300_000);
      const db = getDb();
      const email = input.email.toLowerCase().trim();

      // Email and mobile must be unique across every profile (DB + legacy data).
      const taken = await findTaken({ email, phone: input.phone });
      if (taken.email) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered. Try signing in instead." });
      }
      if (taken.phone) {
        throw new TRPCError({ code: "CONFLICT", message: "This mobile number is already registered to another account." });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      const [user] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          fullName: input.fullName,
          phone: input.phone || null,
          role: input.role,
          status: "active",
          // New accounts start unverified — they get a verification email below.
          emailVerified: false,
        });

      const insertedUser = await db.query.users.findFirst({
        where: eq(users.id, user.insertId),
      });

      if (!insertedUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      const cardSlug = await welcomeNewAccount(db, insertedUser, {
        referralCode: input.referralCode, companyName: input.companyName, promo: input.promo, verifyEmail: true, card: input.card,
        method: "email", req: ctx.req,
      });

      const token = await createToken({
        userId: insertedUser.id,
        email: insertedUser.email,
        role: insertedUser.role,
      });

      return {
        user: {
          id: insertedUser.id,
          email: insertedUser.email,
          fullName: insertedUser.fullName,
          role: insertedUser.role,
          status: insertedUser.status,
          avatar: insertedUser.avatar,
        },
        token,
        cardSlug,
      };
    }),

  // Live uniqueness check for the signup / edit forms — is this email / mobile /
  // username already taken by another profile?
  checkAvailability: publicQuery
    .input(z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      username: z.string().optional(),
    }))
    .query(async ({ input }) => findTaken(input)),

  /* The card link a signup WOULD get, previewed live as the visitor types their
     business name. Runs the exact rules provisionStarterCard uses (business name
     first, then -2, -3… on a clash), so what the form shows is what is created.
     Nothing is reserved — two people racing for one name both see it free, and
     registration then hands the second one the next suffix. Card URLs are public
     by nature, so answering "is this taken" leaks nothing; it is still
     rate-limited so it can't be used to hammer the database. */
  previewCardLink: publicQuery
    .input(z.object({ businessName: z.string().max(120).optional(), fullName: z.string().max(120).optional() }))
    .query(async ({ ctx, input }) => {
      enforceRateLimit(`card-link:${clientIp(ctx.req)}`, 60, 60_000);
      const base = cardSlugBase(input.businessName, input.fullName, "");
      if (base === "card" && !String(input.businessName || input.fullName || "").trim()) {
        return { base: "", slug: "", available: true };
      }
      const slug = await firstFreeCardSlug(getDb(), base, 0, undefined, 12);
      return { base, slug, available: slug === base };
    }),

  // Is "Continue with Google" switched on? The Client ID is public by design —
  // Google's button embeds it in every page that shows it — so the browser
  // reads it from here and no rebuild is needed when it's set or changed.
  googleConfig: publicQuery.query(() => ({ clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null })),

  /* Sign in or sign up with Google. The browser gets an ID token from Google
     Identity Services and posts it here; nothing about the person is trusted
     until that token verifies (api/lib/google-auth.ts).
       · An account with that email already exists → signed in. Google has
         verified the address, so the account's email is marked verified too.
       · No account → a customer account is created exactly as email signup
         creates one (starter card, trial, referral, welcome emails), with a
         random password the person never sees; "Forgot password" sets a real
         one if they ever want to sign in with email.
     Administrator accounts are refused: they sign in with a password on the
     admin portal. */
  google: publicQuery
    .input(z.object({
      credential: z.string().min(20).max(4096),
      referralCode: z.string().max(50).optional(),
      companyName: z.string().max(255).optional(),
      promo: z.string().max(40).optional(),
      card: starterCardInput.optional().catch(undefined),
      // The partner sign-in page: sign in an existing account, never create a
      // new (customer) one for an email nobody has registered.
      existingOnly: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`google:${clientIp(ctx.req)}`, 10, 60_000);
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      if (!clientId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google sign-in isn't available yet. Please use email." });
      }

      let profile;
      try {
        profile = await verifyGoogleIdToken(input.credential, clientId);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "We couldn't verify your Google sign-in. Please try again." });
      }

      const db = getDb();
      let user = await db.query.users.findFirst({ where: eq(users.email, profile.email) });
      let created = false;
      let cardSlug: string | null = null;

      if (user) {
        if (user.role === "super_admin" || user.role === "staff") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Administrator accounts sign in with a password on the admin portal." });
        }
        // Same rule as password login: only an active account may sign in.
        if (user.status !== "active") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: user.status === "suspended"
              ? "Account suspended. Contact support."
              : "This account has been deactivated. Contact support to restore it.",
          });
        }
        await db.update(users).set({
          lastLoginAt: new Date(),
          ...(user.emailVerified ? {} : { emailVerified: true, emailVerifiedAt: new Date() }),
          ...(!user.avatar && profile.picture ? { avatar: profile.picture } : {}),
        }).where(eq(users.id, user.id));
      } else if (input.existingOnly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "There's no DigitalCarda partner account for this Google email. Sign in with the email we set you up with, or apply to become a partner.",
        });
      } else {
        // An email that exists only in the pre-migration customer list belongs
        // to an existing card — never create a second, empty identity for it.
        const taken = await findTaken({ email: profile.email });
        if (taken.email) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email already belongs to a DigitalCarda card. Sign in with your password, or contact support.",
          });
        }
        const [inserted] = await db.insert(users).values({
          email: profile.email,
          password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
          fullName: profile.name,
          avatar: profile.picture,
          role: "customer",
          status: "active",
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        });
        user = await db.query.users.findFirst({ where: eq(users.id, inserted.insertId) });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        created = true;
        cardSlug = await welcomeNewAccount(db, user, {
          referralCode: input.referralCode, companyName: input.companyName, promo: input.promo, verifyEmail: false, card: input.card,
          method: "google", req: ctx.req,
        });
      }

      const token = await createToken({ userId: user.id, email: user.email, role: user.role });
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
        },
        token,
        created,
        cardSlug,
      };
    }),

  login: publicQuery
    .input(
      z.object({
        // Email, username, card slug, or mobile — resolved to the account below.
        email: z.string().min(1),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = clientIp(ctx.req);
      const sec = (await loadSettings()).security;
      enforceRateLimit(`login:${ip}`, sec.attemptsPerIp, 60_000);
      const idKey = String(input.email || "").toLowerCase().trim();
      if (idKey) enforceRateLimit(`login-id:${idKey}`, sec.attemptsPerAccount, 300_000);
      const db = getDb();

      const user = await resolveLoginUser(db, input.email);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      let isValid = await bcrypt.compare(input.password, user.password);

      // Legacy-auth bridge: if the hash doesn't match, accept the real password
      // from the old export (compared trimmed), then re-hash the clean password
      // so future logins work directly against the DB.
      if (!isValid) {
        const typed = input.password.trim();
        if (typed.length > 0) {
          const legacy = await legacyPasswordsFor(user.email);
          if (legacy.some((pw) => pw.trim() === typed)) {
            // The bridge exists ONLY to heal import-time whitespace, so it must
            // apply while the account is still on the password the import set.
            // Once the customer has chosen their own password the stored hash no
            // longer matches any legacy string — and the old export password (a
            // file that has circulated in builds) must stop working, or it would
            // be a permanent second credential that silently reverts their new
            // password on use.
            let stillOnImportPassword = false;
            for (const pw of legacy) {
              if (await bcrypt.compare(pw, user.password)) { stillOnImportPassword = true; break; }
            }
            if (!stillOnImportPassword) {
              // Accounts imported without a legacy password got this default.
              stillOnImportPassword = await bcrypt.compare("changeme123", user.password);
            }
            if (stillOnImportPassword) {
              isValid = true;
              try {
                const rehash = await bcrypt.hash(typed, 12);
                await db.update(users).set({ password: rehash }).where(eq(users.id, user.id));
              } catch { /* self-heal is best-effort; login still succeeds */ }
            }
          }
        }
      }

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Only an ACTIVE account may sign in. context.ts refuses API access to any
      // non-active account, so letting an "inactive" (deactivated / soft-deleted)
      // account log in would hand it a token and then 401 every request — a dead
      // session that looks like the app is broken. Fail here with a clear reason.
      if (user.status !== "active") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: user.status === "suspended"
            ? "Account suspended. Contact support."
            : "This account has been deactivated. Contact support to restore it.",
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
      if (user.role === "staff" || user.role === "super_admin") {
        const { recordActivity } = await import("./lib/staff-access");
        recordActivity({ actor: user, module: null, action: "Signed in", req: ctx.req });
      }

      // The admin portal may be limited to office IPs. An empty list allows any.
      if ((user.role === "super_admin" || user.role === "staff") && sec.adminIpAllowlist.length && !ipAllowed(ip, sec.adminIpAllowlist)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "The admin portal is limited to approved locations. Ask the super admin to add this network." });
      }
      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }, user.role === "super_admin" || user.role === "staff" ? { expiresIn: `${sec.adminSessionDays}d` } : {});

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
        },
        token,
      };
    }),

  me: authedQuery.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      fullName: ctx.user.fullName,
      role: ctx.user.role,
      status: ctx.user.status,
      avatar: ctx.user.avatar,
      phone: ctx.user.phone,
    };
  }),

  logout: authedQuery.mutation(() => {
    return { success: true };
  }),

  /* Delete the account from the website (/account/delete) — for people
     without the app, as Google Play requires. Same rules as the app's
     More → Delete account: password confirmed, switched off at once, erased
     after the grace period (api/lib/account-deletion.ts). */
  requestAccountDeletion: authedQuery
    .input(z.object({ password: z.string().min(1).max(200), reason: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`web-delete:${ctx.user.id}`, 5, 15 * 60_000);
      if (ctx.user.role !== "customer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Reseller and admin accounts are closed by our team — please contact support." });
      }
      if (!(await bcrypt.compare(input.password, ctx.user.password))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That password isn't right. Enter the password you sign in with." });
      }
      const { requestAccountDeletion } = await import("./lib/account-deletion");
      const { scheduledFor } = await requestAccountDeletion(getDb(), ctx.user, { reason: input.reason, source: "web" });
      return { ok: true as const, scheduledFor };
    }),

  changePassword: authedQuery
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: strongPassword,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 12);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, ctx.user.id));

      // Security notice (non-blocking).
      void sendEmail(user.email, passwordChangedEmail({ name: user.fullName }));

      return { success: true };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        fullName: z.string().min(2).max(120),
        phone: z.string().max(30).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const email = input.email?.toLowerCase().trim();

      // Email is the sign-in identity — must stay unique across accounts.
      if (email) {
        const clash = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (clash && clash.id !== ctx.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That email is already used by another account.",
          });
        }
      }

      // The profile page sends the email on every save, so only a different
      // address is a real change of sign-in email.
      const oldEmail = ctx.user.email;
      let emailChanged = false;
      if (email && email !== oldEmail.toLowerCase().trim()) {
        // Guarded on the old address, so a double-submit changes (and emails)
        // once. Nobody has confirmed the new address yet, so it starts
        // unverified — emailVerified only drives the "verify your email"
        // prompts and the owner's signup alert; it never gates sign-in.
        const res = await db
          .update(users)
          .set({ fullName: input.fullName, phone: input.phone || null, email, emailVerified: false, emailVerifiedAt: null })
          .where(and(eq(users.id, ctx.user.id), eq(users.email, oldEmail)));
        const affected = (res as unknown as { affectedRows?: number }[])?.[0]?.affectedRows
          ?? (res as unknown as { affectedRows?: number })?.affectedRows ?? 0;
        emailChanged = affected > 0;
      }
      if (!emailChanged) {
        await db
          .update(users)
          .set({
            fullName: input.fullName,
            phone: input.phone || null,
            ...(email ? { email } : {}),
          })
          .where(eq(users.id, ctx.user.id));
      }
      if (email && emailChanged) {
        void notifyEmailChange({ id: ctx.user.id, fullName: ctx.user.fullName }, oldEmail, email)
          .catch((e) => console.error("[profile] email-change notices failed:", (e as Error).message));
      }

      return {
        success: true,
        fullName: input.fullName,
        phone: input.phone || "",
        email: email || ctx.user.email,
      };
    }),

  // ── Admin: impersonate a customer ("login as client") with a REAL token, so
  //    authed features (Refer & Earn, analytics, leads…) work during preview ──
  impersonate: adminQuery
    .input(z.object({ email: z.string().email().optional(), slug: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Match by email first; if that misses (the legacy card data and the
      // imported user rows don't always share an email), resolve via the card's slug.
      let user = input.email
        ? await db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase().trim()) })
        : undefined;
      if (!user && input.slug) {
        const card = await db.query.cards.findFirst({ where: eq(cards.slug, input.slug.toLowerCase().trim()) });
        if (card) user = await db.query.users.findFirst({ where: eq(users.id, card.userId) });
      }
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "No matching account" });
      // Never impersonate a non-customer. Legacy card records sometimes carry the
      // owner/admin's email as a placeholder — matching one must NOT hand out an
      // admin/reseller token, or every link/QR in the session resolves to the
      // admin's own card (the "sees Shekhar's card" bug).
      if (user.role !== "customer") throw new TRPCError({ code: "NOT_FOUND", message: "No matching customer account" });
      const token = await createToken({ userId: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
    }),

  // ── Forgot password: email a reset link ──
  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`pwreset:${clientIp(ctx.req)}`, 4, 300_000);
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (user) {
        const token = await createResetToken(user.id, user.password.slice(-12));
        // A partner's reset ends on the partner sign-in page (ResetPassword.tsx reads for=partner).
        const link = `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}${user.role === "reseller" ? "&for=partner" : ""}`;
        void sendEmail(user.email, passwordResetEmail({ name: user.fullName, link }));
      }
      // Always succeed — never reveal whether an email is registered.
      return { ok: true };
    }),

  // ── Forgot password: set a new password with the emailed token ──
  resetPassword: publicQuery
    .input(z.object({ token: z.string().min(10), newPassword: strongPassword }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`pwreset-confirm:${clientIp(ctx.req)}`, 10, 300_000);
      const data = await verifyResetToken(input.token);
      if (!data) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
      // Hash snippet must still match — a used/old link is rejected.
      if (!user || user.password.slice(-12) !== data.ph) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has already been used. Please request a new one." });
      }
      const hashedPassword = await bcrypt.hash(input.newPassword, 12);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
      void sendEmail(user.email, passwordChangedEmail({ name: user.fullName }));
      return { ok: true };
    }),

  // ── Email verification: current status (drives the dashboard banner) ──
  verificationStatus: authedQuery.query(async ({ ctx }) => ({
    verified: !!ctx.user.emailVerified,
    email: ctx.user.email,
  })),

  // ── Email verification: (re)send the branded verification link ──
  resendVerification: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.emailVerified) return { ok: true, already: true, email: ctx.user.email };
    enforceRateLimit(`emailverify:${ctx.user.id}`, 4, 300_000);
    const token = await createVerifyToken(ctx.user.id, ctx.user.email);
    const link = `${PUBLIC_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const res = await sendEmail(ctx.user.email, verifyEmailAddressEmail({ name: ctx.user.fullName, link, email: ctx.user.email, purpose: "resend" }));
    if (!res.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: res.error === "SMTP not configured"
          ? "Email delivery isn't configured yet. Please contact support."
          : "We couldn't send the email just now — please try again in a moment.",
      });
    }
    return { ok: true, email: ctx.user.email };
  }),

  // ── Email verification: confirm the emailed token (public — no session yet) ──
  verifyEmail: publicQuery
    .input(z.object({ token: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`emailverify-confirm:${clientIp(ctx.req)}`, 20, 300_000);
      const data = await verifyVerifyToken(input.token);
      if (!data) throw new TRPCError({ code: "BAD_REQUEST", message: "This verification link is invalid or has expired. Please request a new one from your dashboard." });
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
      if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "We couldn't find that account." });
      const already = !!user.emailVerified;
      if (!already) {
        // A link sent to an earlier address must not confirm the one the account
        // uses now (updateProfile resets the flag when the sign-in email changes).
        if (data.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This link was sent to an earlier email address. Please request a new one from your dashboard." });
        }
        await db.update(users).set({ emailVerified: true, emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
      }
      return { ok: true, already, email: user.email };
    }),
});
