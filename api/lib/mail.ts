import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/*
 * Lightweight, env-driven mailer. Works with any SMTP provider:
 *   Gmail App Password → SMTP_HOST=smtp.gmail.com SMTP_PORT=465
 *   Zoho              → SMTP_HOST=smtp.zoho.in   SMTP_PORT=465
 * Required env: SMTP_HOST, SMTP_USER, SMTP_PASS.
 * Optional:     SMTP_PORT (default 465), MAIL_FROM (default SMTP_USER),
 *               LEAD_NOTIFY_TO (default hellopacewalk@gmail.com).
 *
 * If SMTP isn't configured, mail is skipped (logged) — it never throws, so it
 * can't break lead capture.
 */
let cached: Transporter | null | undefined; // undefined = not yet built, null = unconfigured

function transport(): Transporter | null {
  if (cached !== undefined) return cached;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[mail] SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS) — emails skipped.");
    cached = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    // Gmail displays App Passwords with spaces — strip them so either form works.
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, "") },
  });
  return cached;
}

import type { Email } from "./email-templates";
import { leadNotificationEmail, hotLeadEmail } from "./email-templates";
import { classifyLeadSmart } from "./lead-intel";

export const ownerAddress = () => process.env.LEAD_NOTIFY_TO || "hellopacewalk@gmail.com";

/** Send a rendered Email template to a recipient. Never throws — returns a
    status so callers (e.g. the admin test tool) can report success/failure.
    Existing callers that ignore the return value are unaffected. */
export async function sendEmail(to: string | undefined | null, email: Email, replyTo?: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!to) return { ok: false, error: "No recipient" };
    const t = transport();
    if (!t) return { ok: false, error: "SMTP not configured" };
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await t.sendMail({ from, to, replyTo: replyTo || undefined, subject: email.subject, text: email.text, html: email.html });
    console.log(`[mail] "${email.subject}" sent to ${to}`);
    return { ok: true };
  } catch (e) {
    console.error(`[mail] failed to send "${email.subject}":`, (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

/** True when the three required SMTP env vars are present. */
export const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export interface LeadEmail {
  name: string;
  email?: string | null;
  contact?: string | null;
  message?: string | null;
  slug?: string | null;
  cardName?: string | null;
}

/**
 * Smartly notify the owner about a new lead:
 *   important → 🔥 Hot lead email (immediate priority)
 *   normal    → standard lead email
 *   spam      → suppressed (no email)
 * Uses AI when ANTHROPIC_API_KEY is set, else deterministic rules. Never throws.
 * Returns the category so callers can store it.
 */
export async function sendLeadNotification(lead: LeadEmail): Promise<"important" | "normal" | "spam"> {
  try {
    const v = await classifyLeadSmart({ name: lead.name, email: lead.email, contact: lead.contact, description: lead.message, uname: lead.slug });
    if (v.category === "spam") {
      console.log(`[mail] lead from "${lead.name}" classified spam (${v.via}) — owner alert suppressed`);
      return "spam";
    }
    await sendEmail(ownerAddress(), v.category === "important" ? hotLeadEmail({ ...lead, name: lead.name }) : leadNotificationEmail(lead), lead.email);
    return v.category;
  } catch (e) {
    // On any classification error, fall back to a normal alert.
    console.error("[mail] lead classify failed, sending normal alert:", (e as Error).message);
    await sendEmail(ownerAddress(), leadNotificationEmail(lead), lead.email);
    return "normal";
  }
}
