import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, resellerProfiles, referrals, notifications } from "@db/schema";
import { eq } from "drizzle-orm";
import { createToken, createResetToken, verifyResetToken } from "./lib/jwt";
import { sendEmail, ownerAddress } from "./lib/mail";
import { welcomeEmail, passwordChangedEmail, passwordResetEmail, newSignupAdminEmail, referralSignupAdminEmail } from "./lib/email-templates";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://digitalcarda.in";

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
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.password);

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
