import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { sendEmail, smtpConfigured, ownerAddress, mailMode, mailFrom, fromAlignment, PLATFORM_EMAIL } from "./lib/mail";
import { smtpTestEmail, marketingIntroEmail } from "./lib/email-templates";
import { ipAllowed, loadSettings, publicSettings, saveSettings } from "./lib/app-settings";
import { clientIp } from "./lib/rate-limit";
import { ALERT_KINDS, isEmail, isIpOrCidr } from "@contracts/settings";

/* Platform settings. Every value here is read by something: the mailer, the
   website's contact details, the sign-in limits, or new-customer defaults
   (api/lib/app-settings.ts). SMTP credentials are NOT here — they stay in the
   server's .env, and this page only reports their status. */

const alertKeys = ALERT_KINDS.map((a) => a.key) as [string, ...string[]];

const business = z.object({
  brandName: z.string().trim().min(1).max(60),
  supportEmail: z.string().trim().email().max(120),
  supportPhone: z.string().trim().max(30),
  whatsappNumber: z.string().trim().max(20).regex(/^[0-9]*$/, "Digits only, with the country code (e.g. 919517722444)"),
  legalName: z.string().trim().max(120),
  address: z.string().trim().max(300),
  gstin: z.string().trim().max(20),
});

const alerts = z.object({
  recipients: z.array(z.string().trim()).max(10),
  enabled: z.record(z.enum(alertKeys), z.boolean()),
});

const email = z.object({
  fromName: z.string().trim().max(60),
  replyTo: z.union([z.string().trim().email().max(120), z.literal("")]),
});

const security = z.object({
  attemptsPerIp: z.number().int().min(3).max(60),
  attemptsPerAccount: z.number().int().min(3).max(60),
  adminSessionDays: z.number().int().min(1).max(90),
  adminIpAllowlist: z.array(z.string().trim()).max(20),
});

export const settingsRouter = createRouter({
  /** Everything the Settings page shows (no secrets). */
  all: adminQuery.query(async ({ ctx }) => {
    const s = await loadSettings(true);
    return {
      ...s,
      /** Read-only context the page displays so nobody has to guess. */
      env: {
        yourIp: clientIp(ctx.req),
        platformEmail: PLATFORM_EMAIL,
        leadNotifyTo: process.env.LEAD_NOTIFY_TO || null,
        mailFrom: mailFrom(),
        adminLoginPath: process.env.VITE_ADMIN_LOGIN_SLUG || "control-signin",
      },
    };
  }),

  save: adminQuery
    .input(z.discriminatedUnion("section", [
      z.object({ section: z.literal("business"), values: business }),
      z.object({ section: z.literal("alerts"), values: alerts }),
      z.object({ section: z.literal("email"), values: email }),
      z.object({ section: z.literal("security"), values: security }),
    ]))
    .mutation(async ({ ctx, input }) => {
      if (input.section === "alerts") {
        const bad = input.values.recipients.find((r) => r && !isEmail(r));
        if (bad) throw new TRPCError({ code: "BAD_REQUEST", message: `"${bad}" isn't a valid email address.` });
      }
      if (input.section === "security") {
        const list = input.values.adminIpAllowlist.filter(Boolean);
        const bad = list.find((v) => !isIpOrCidr(v));
        if (bad) throw new TRPCError({ code: "BAD_REQUEST", message: `"${bad}" isn't an IP address or range (e.g. 49.36.1.20 or 49.36.0.0/16).` });
        // Saving a list that leaves you out would lock you out of the portal on
        // your next sign-in, with no way back except editing the database.
        const you = clientIp(ctx.req);
        if (list.length && !ipAllowed(you, list)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Add your own address (${you}) to the list first, or you'll be locked out of the admin portal.` });
        }
      }
      const saved = await saveSettings(input.section, input.values as Record<string, unknown>);
      // Pages are cached with the contact details baked in — drop that cache so
      // the very next visitor sees the new ones.
      if (input.section === "business") {
        const { clearHtmlCache } = await import("./lib/vite");
        clearHtmlCache();
      }
      return { ok: true as const, settings: saved };
    }),

  // Admin: is SMTP configured on the server? (read-only — SMTP lives in the
  // server .env, never the DB). No secrets are returned.
  smtpStatus: adminQuery.query(() => ({
    configured: smtpConfigured(),
    // "live" real SMTP · "preview" dev capture mailbox · "none" nothing goes out
    mode: smtpConfigured() ? "live" as const : mailMode(),
    host: process.env.SMTP_HOST || null,
    from: smtpConfigured() ? mailFrom() : null,
    // Sending as one domain through another provider's SMTP silently lands in spam
    misaligned: smtpConfigured() && !fromAlignment().aligned ? fromAlignment() : null,
    notifyTo: ownerAddress(),
  })),

  // Admin: send a test email and report whether it actually went out.
  sendTestEmail: adminQuery
    .input(z.object({ to: z.string().email().optional() }))
    .mutation(async ({ input }) => {
      const to = input.to || ownerAddress();
      const r = await sendEmail(to, smtpTestEmail({ to }));
      return { ...r, to };
    }),

  // Admin: send the cold-outreach / marketing intro email to one recipient (for
  // one-off prospecting or previewing it in your own inbox). For bulk campaigns,
  // use the same template HTML in ZeptoMail's campaign tool instead.
  sendMarketingEmail: adminQuery
    .input(z.object({ to: z.string().email(), name: z.string().optional(), businessName: z.string().optional() }))
    .mutation(async ({ input }) => {
      const r = await sendEmail(input.to, marketingIntroEmail({ name: input.name, businessName: input.businessName }));
      return { ...r, to: input.to };
    }),

  /** Contact details the website shows (footer, menus, WhatsApp buttons). */
  getPublic: publicQuery.query(async () => {
    await loadSettings();
    return publicSettings();
  }),
});
