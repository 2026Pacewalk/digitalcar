import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/*
 * Lightweight, env-driven mailer. Works with any SMTP provider:
 *   Gmail App Password → SMTP_HOST=smtp.gmail.com SMTP_PORT=465
 *   Zoho              → SMTP_HOST=smtp.zoho.in   SMTP_PORT=465
 * Required env: SMTP_HOST, SMTP_USER, SMTP_PASS.
 * Optional:     SMTP_PORT (default 465), MAIL_FROM (default hello@digitalcarda.in),
 *               LEAD_NOTIFY_TO (default hello@digitalcarda.in).
 *
 * If SMTP isn't configured, mail is skipped (logged) — it never throws, so it
 * can't break lead capture.
 */
let cached: Transporter | null | undefined; // undefined = not yet built, null = unconfigured

/** How mail is being delivered right now — reported on the admin Settings page.
    "preview" is the local-development capture described below. */
export type MailMode = "live" | "preview" | "none";
let mode: MailMode = "none";
export const mailMode = () => mode;

function transport(): Transporter | null {
  if (cached !== undefined) return cached;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Only alarming in production. Locally it is the expected default, and the
    // preview mailbox below takes over.
    if (process.env.NODE_ENV === "production") {
      console.warn("[mail] SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS) — emails skipped.");
    } else {
      console.log("[mail] no SMTP credentials — using a dev preview mailbox (nothing reaches real inboxes).");
    }
    cached = null;
    mode = "none";
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
  mode = "live";
  return cached;
}

/* ── Local development: capture instead of send ───────────────────────────
   A dev box with no SMTP credentials used to just drop every email, so the
   whole flow was untestable locally. It now falls back to a throwaway
   Ethereal mailbox: the message is fully delivered there and we print a
   preview URL, but it reaches nobody's real inbox.

   That last part is the point. Putting the production Gmail App Password on a
   laptop would mean one stray click in the Share modal really emails a real
   customer. Never active in production — there, missing SMTP stays an error
   worth shouting about. */
let devTransport: Promise<Transporter | null> | null = null;

function previewTransport(): Promise<Transporter | null> {
  if (devTransport) return devTransport;
  devTransport = (async () => {
    try {
      const acct = await nodemailer.createTestAccount();
      const t = nodemailer.createTransport({
        host: acct.smtp.host, port: acct.smtp.port, secure: acct.smtp.secure,
        auth: { user: acct.user, pass: acct.pass },
      });
      mode = "preview";
      console.log(`[mail] dev preview mailbox ready (${acct.user}) — emails are captured, not delivered.`);
      return t;
    } catch (e) {
      // Offline, or Ethereal is down. Behave exactly as before.
      console.warn("[mail] could not open a dev preview mailbox:", (e as Error).message);
      return null;
    }
  })();
  return devTransport;
}

import type { Email } from "./email-templates";
import { leadNotificationEmail, hotLeadEmail } from "./email-templates";
import { classifyLeadSmart } from "./lead-intel";

// The platform's own email — used as the default sender and the fallback address
// for owner/admin alerts. Override per-environment with MAIL_FROM / LEAD_NOTIFY_TO.
export const PLATFORM_EMAIL = "hello@digitalcarda.in";

export const ownerAddress = () => process.env.LEAD_NOTIFY_TO || PLATFORM_EMAIL;

/** Send a rendered Email template to a recipient. Never throws — returns a
    status so callers (e.g. the admin test tool) can report success/failure.
    Existing callers that ignore the return value are unaffected. */
export async function sendEmail(to: string | undefined | null, email: Email, replyTo?: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!to) return { ok: false, error: "No recipient" };
    // Real SMTP when it is configured; outside production, a capture mailbox
    // rather than silently dropping the mail.
    const t = transport() ?? (process.env.NODE_ENV === "production" ? null : await previewTransport());
    if (!t) { void logEmail(to, email, replyTo, "skipped", "SMTP not configured"); return { ok: false, error: "SMTP not configured" }; }
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || `DigitalCarda <${PLATFORM_EMAIL}>`;
    const info = await t.sendMail({ from, to, replyTo: replyTo || undefined, subject: email.subject, text: email.text, html: email.html });
    const captured = mode === "preview";
    const preview = captured ? nodemailer.getTestMessageUrl(info) || null : null;
    console.log(`[mail] "${email.subject}" ${captured ? "captured for" : "sent to"} ${to}${preview ? ` — open it: ${preview}` : ""}`);
    // Logged as "skipped", because the log answers one question — did the
    // customer get it? In dev capture mode the honest answer is no.
    void logEmail(to, email, replyTo, captured ? "skipped" : "sent",
      captured ? "Captured in the dev preview mailbox — not delivered" : null);
    return { ok: true };
  } catch (e) {
    const why = (e as Error).message;
    console.error(`[mail] failed to send "${email.subject}":`, why);
    if (to) void logEmail(to, email, replyTo, "failed", why);
    return { ok: false, error: why };
  }
}

/* Record the send so the super-admin can answer "did they get it?".
   Fire-and-forget and swallowed: a logging problem must never turn into a
   failed email. Only the envelope is stored, never the body — welcome mails
   carry a plaintext password. */
async function logEmail(
  to: string, email: Email, replyTo: string | null | undefined,
  status: "sent" | "failed" | "skipped", error: string | null,
): Promise<void> {
  try {
    const [{ getDb }, { emailLogs, users }, { eq }] = await Promise.all([
      import("../queries/connection"),
      import("@db/schema"),
      import("drizzle-orm"),
    ]);
    const db = getDb();
    const addr = to.toLowerCase().trim().slice(0, 255);
    const owner = await db.query.users.findFirst({ where: eq(users.email, addr), columns: { id: true } });
    await db.insert(emailLogs).values({
      toEmail: addr,
      subject: String(email.subject || "").slice(0, 300),
      kind: email.kind ? String(email.kind).slice(0, 64) : null,
      replyTo: replyTo ? String(replyTo).slice(0, 255) : null,
      status,
      error: error ? error.slice(0, 500) : null,
      userId: owner?.id ?? null,
    });
  } catch { /* logging is best-effort by design */ }
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
