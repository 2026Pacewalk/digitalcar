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

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c));

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
  try {
    const t = transport();
    if (!t) return;
    const to = process.env.LEAD_NOTIFY_TO || "hellopacewalk@gmail.com";
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const cardLabel = lead.cardName || lead.slug || "your card";
    const rows: [string, string][] = [
      ["Name", lead.name || "—"],
      ["Email", lead.email || "—"],
      ["Phone", lead.contact || "—"],
      ["Message", lead.message || "—"],
      ["Card", lead.slug ? `digitalcarda.in/c/${lead.slug}` : "—"],
    ];
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#0F172A;margin:0 0 4px">New lead from ${esc(String(cardLabel))}</h2>
        <p style="color:#64748B;margin:0 0 16px">Someone submitted an enquiry on your digital card.</p>
        <table style="border-collapse:collapse;width:100%">
          ${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;background:#F8FAFC;font-weight:bold;color:#334155;width:120px">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9;color:#0F172A">${esc(String(v))}</td></tr>`).join("")}
        </table>
      </div>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    await t.sendMail({
      from,
      to,
      replyTo: lead.email || undefined,
      subject: `New lead: ${lead.name || "Enquiry"} — ${cardLabel}`,
      text,
      html,
    });
    console.log(`[mail] lead notification sent to ${to}`);
  } catch (e) {
    console.error("[mail] failed to send lead notification:", (e as Error).message);
  }
}
