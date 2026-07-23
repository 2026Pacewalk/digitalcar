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
import { leadNotificationEmail } from "./email-templates";

export const ownerAddress = () => process.env.LEAD_NOTIFY_TO || "hellopacewalk@gmail.com";

/** Send a rendered Email template to a recipient. Never throws. */
export async function sendEmail(to: string | undefined | null, email: Email, replyTo?: string | null): Promise<void> {
  try {
    if (!to) return;
    const t = transport();
    if (!t) return;
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await t.sendMail({ from, to, replyTo: replyTo || undefined, subject: email.subject, text: email.text, html: email.html });
    console.log(`[mail] "${email.subject}" sent to ${to}`);
  } catch (e) {
    console.error(`[mail] failed to send "${email.subject}":`, (e as Error).message);
  }
}

export interface LeadEmail {
  name: string;
  email?: string | null;
  contact?: string | null;
  message?: string | null;
  slug?: string | null;
  cardName?: string | null;
}

/** Email the site owner about a new lead. Never throws. */
export async function sendLeadNotification(lead: LeadEmail): Promise<void> {
  await sendEmail(ownerAddress(), leadNotificationEmail(lead), lead.email);
}
