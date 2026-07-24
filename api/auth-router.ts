import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, resellerProfiles, referrals, notifications, cards } from "@db/schema";
import { eq, like } from "drizzle-orm";
import { createToken, createResetToken, verifyResetToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import { welcomeEmail, passwordChangedEmail, passwordResetEmail, newSignupAdminEmail, referralSignupAdminEmail } from "./lib/email-templates";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

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
        password: z.string().min(6),
        fullName: z.string().min(2),
        phone: z.string().optional(),
        role: z.enum(["reseller", "customer"]).default("customer"),
        companyName: z.string().optional(),
        referralCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
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

  login: publicQuery
    .input(
      z.object({
        // Email, username, card slug, or mobile — resolved to the account below.
        email: z.string().min(1),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
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
        newPassword: z.string().min(6),
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
      const token = await createToken({ userId: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
    }),

  // ── Forgot password: email a reset link ──
  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
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
    .input(z.object({ token: z.string().min(10), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
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
