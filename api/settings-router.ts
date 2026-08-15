import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { sendEmail, smtpConfigured, ownerAddress } from "./lib/mail";
import { smtpTestEmail, marketingIntroEmail } from "./lib/email-templates";

const settingsStore: Record<string, Record<string, unknown>> = {
  general: {
    platformName: "DigitalCarda",
    platformUrl: "https://digitalcarda.com",
    supportEmail: "hello@digitalcarda.in",
    defaultLanguage: "en",
    defaultCurrency: "USD",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    maintenanceMode: false,
  },
  branding: {
    primaryColor: "#D4AF37",
    darkThemeColor: "#081828",
    lightThemeColor: "#FFFFFF",
    footerText: "Powered by DigitalCarda",
  },
  seo: {
    metaTitle: "DigitalCarda - Create Your Digital Business Card",
    metaDescription: "Create stunning digital business cards and smart microsites with DigitalCarda.",
  },
  ai: {
    provider: "openai",
    model: "gpt-4",
    maxTokens: 500,
    temperature: 0.7,
    enabled: true,
    creditCost: 1,
  },
};

export const settingsRouter = createRouter({
  get: adminQuery
    .input(z.object({ section: z.string() }))
    .query(({ input }) => {
      return settingsStore[input.section] || {};
    }),

  update: adminQuery
    .input(
      z.object({
        section: z.string(),
        values: z.record(z.string(), z.any()),
      })
    )
    .mutation(({ input }) => {
      settingsStore[input.section] = {
        ...settingsStore[input.section],
        ...input.values,
      };
      return { success: true };
    }),

  // Admin: is SMTP configured on the server? (read-only — SMTP lives in the
  // server .env, never the DB). No secrets are returned.
  smtpStatus: adminQuery.query(() => ({
    configured: smtpConfigured(),
    host: process.env.SMTP_HOST || null,
    from: process.env.MAIL_FROM || process.env.SMTP_USER || null,
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

  getPublic: publicQuery.query(() => {
    return {
      platformName: (settingsStore.general?.platformName as string) || "DigitalCarda",
      logoUrl: (settingsStore.branding?.logoUrl as string) || null,
      primaryColor: (settingsStore.branding?.primaryColor as string) || "#D4AF37",
      faviconUrl: (settingsStore.branding?.faviconUrl as string) || null,
    };
  }),
});
