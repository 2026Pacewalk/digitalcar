import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, resellerProfiles, referrals, notifications, cards, publishedCards, cardTrials, appSettings } from "@db/schema";
import { eq, like } from "drizzle-orm";
import { slugTakenByOther } from "./publish-router";
import { createToken, createResetToken, verifyResetToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import { welcomeEmail, passwordChangedEmail, passwordResetEmail, newSignupAdminEmail, referralSignupAdminEmail } from "./lib/email-templates";
import { enforceRateLimit, clientIp } from "./lib/rate-limit";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

// Strong-password rule for new/changed passwords (signup, reset, change).
// Login is deliberately NOT gated by this so legacy accounts still work.
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

/* On signup, give every new account its OWN live card URL + start the trial, so
   the card link is never empty and never falls back to a leftover/other slug.
   Best-effort: any failure here must never block registration. */
async function provisionStarterCard(
  db: ReturnType<typeof getDb>,
  user: { id: number; email: string; fullName: string; phone: string | null },
  companyName?: string,
): Promise<string | null> {
  try {
    // Unique, name-based slug (e.g. "Taniya Xtreme" -> taniya-xtreme, then -2, -3…).
    const base = (user.fullName || user.email.split("@")[0])
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "card";
    let slug = base;
    for (let n = 2; await slugTakenByOther(db, slug, user.id, 1); n++) {
      slug = n > 40 ? `${base}-${nanoid(4).toLowerCase()}` : `${base}-${n}`;
      if (n > 40) break;
    }
    // A simple starter card — they fill in the details from the dashboard.
    const starter = {
      customer: {
        id: user.id, name: user.fullName, slug, username: slug,
        email: user.email, mobile1: user.phone || "", company_name: companyName || "",
        designation: "", nature: "", about_us: "", theme: 1, color: "#F7B31C", color2: "",
      },
      products: [], gallery: [], videos: [], offers: [], qrcodes: [], reviews: [],
    };
    await db.insert(publishedCards).values({ userId: user.id, cardId: 1, slug, publicId: nanoid(10), data: starter });
    // Start the trial (admin-configurable, default 30 days) so the card is live now.
    const daysRow = await db.select().from(appSettings).where(eq(appSettings.key, "trial_days"));
    const days = Number(daysRow[0]?.value) || 30;
    const now = new Date();
    await db.insert(cardTrials).values({
      userId: user.id, status: "active", startedAt: now, publishedAt: now,
      endsAt: new Date(now.getTime() + days * 86_400_000),
    });
    return slug;
  } catch { return null; }
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
        role: z.enum(["reseller", "customer"]).default("customer"),
        companyName: z.string().optional(),
        referralCode: z.string().optional(),
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

      // Welcome email to the new user + new-signup alert to the owner (non-blocking).
      void sendEmail(insertedUser.email, welcomeEmail({ name: insertedUser.fullName, role: insertedUser.role }));
      void sendEmail(ownerAddress(), newSignupAdminEmail({ name: insertedUser.fullName, email: insertedUser.email, role: insertedUser.role, phone: insertedUser.phone }));

      // Create reseller profile if registering as reseller
      if (input.role === "reseller" && input.companyName) {
        await db.insert(resellerProfiles).values({
          userId: insertedUser.id,
          companyName: input.companyName,
          commissionRate: "10.00",
        });
      }

      // Apply referral (Refer & Earn) — both the referrer and this new user get a discount
      if (input.referralCode) {
        try {
          const referrer = await db.query.users.findFirst({
            where: eq(users.referralCode, input.referralCode.toUpperCase()),
          });
          if (referrer && referrer.id !== insertedUser.id) {
            await db.update(users).set({ referredById: referrer.id }).where(eq(users.id, insertedUser.id));
            // Reward is credited later by an admin once this user buys a paid plan.
            await db.insert(referrals).values({
              referrerId: referrer.id,
              refereeId: insertedUser.id,
              refereeEmail: insertedUser.email,
              code: input.referralCode.toUpperCase(),
              status: "joined",
            });
            // Tell the referrer someone joined with their link
            await db.insert(notifications).values({
              userId: referrer.id,
              type: "referral_joined",
              title: "New referral signup 🎉",
              message: `${insertedUser.fullName} just joined with your referral link. You'll earn cash when they upgrade to a paid plan.`,
              link: "/dashboard/refer",
            });
            // Alert the owner about the referral signup (non-blocking).
            void sendEmail(ownerAddress(), referralSignupAdminEmail({ newUserName: insertedUser.fullName, newUserEmail: insertedUser.email, referrerName: referrer.fullName, code: input.referralCode.toUpperCase() }));
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

      // Give the new account its own live card URL + start the trial.
      await provisionStarterCard(db, insertedUser, input.companyName);

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
      enforceRateLimit(`login:${ip}`, 8, 60_000);
      const idKey = String(input.email || "").toLowerCase().trim();
      if (idKey) enforceRateLimit(`login-id:${idKey}`, 10, 300_000);
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
            isValid = true;
            try {
              const rehash = await bcrypt.hash(typed, 12);
              await db.update(users).set({ password: rehash }).where(eq(users.id, user.id));
            } catch { /* self-heal is best-effort; login still succeeds */ }
          }
        }
      }

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      if (user.status === "suspended") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Account suspended. Contact support.",
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

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

      await db
        .update(users)
        .set({
          fullName: input.fullName,
          phone: input.phone || null,
          ...(email ? { email } : {}),
        })
        .where(eq(users.id, ctx.user.id));

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
        const link = `${PUBLIC_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
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
});
