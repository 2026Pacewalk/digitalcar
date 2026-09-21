/*
 * "Follow-ups due today" for card owners (email plan item 28).
 * ------------------------------------------------------------------
 * Runs once a day from runDailyEmailJobs. An owner who gave leads a follow-up
 * date gets ONE email on that India day listing them (leadFollowUpsDueEmail).
 * Open leads only — the same rule as lead.followUps: status not converted,
 * not_interested or closed. Overdue leads from earlier days are not repeated;
 * the dashboard already flags those. Only active accounts are emailed.
 *
 * Ledger: a notifications row ls_fu_<YYYYMMDD> per owner (also shows in the
 * bell; ls_* rows survive "clear notifications"). It is removed again if the
 * send fails, so a manual re-run the same day can retry. Never throws.
 */
import { getDb } from "../queries/connection";
import { leads, users, notifications, appSettings } from "@db/schema";
import { and, eq, gte, lt, inArray, notInArray, asc } from "drizzle-orm";
import { sendEmail } from "../lib/mail";
import { leadFollowUpsDueEmail } from "../lib/email-templates";
import { mailable } from "./billing";

type Db = ReturnType<typeof getDb>;
type Email = Parameters<typeof sendEmail>[1];

const DAY = 86_400_000;
const IST = 19_800_000;          // +05:30
const MAX_OWNERS = 300;          // emails per run
const MAX_LEADS = 5000;          // rows read per run
const ITEMS_PER_EMAIL = 10;      // the template lists up to 15; the rest is "+N more"

/** 00:00 IST of the India calendar day that contains `t`. */
const istMidnight = (t: number) => { const d = new Date(t + IST); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST; };

async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

/** Insert today's marker (also the bell notification) if absent. Its id, or null if already claimed. */
async function claim(db: Db, userId: number, type: string, message: string): Promise<number | null> {
  const existing = await db.select({ id: notifications.id }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.type, type))).limit(1);
  if (existing.length) return null;
  const [ins] = await db.insert(notifications).values({ userId, type, title: "Follow-ups due today", message, link: "/dashboard/leads" });
  return Number(ins.insertId);
}

export type DueFollowUps = {
  userId: number; to: string; count: number;
  /** Built only when it is actually sent. */
  render: () => Email;
};

/** Read-only: one entry per active owner with open leads due on today's India date. */
export async function dueLeadFollowUps(db: Db, now = Date.now()): Promise<{ leads: number; due: DueFollowUps[] }> {
  const dayStart = istMidnight(now);
  // Stored as the owner's chosen day at 09:00 their time (Leads.tsx), so an
  // India-day window catches it whatever the hour.
  const rows = await db.select({
    userId: leads.userId, fullName: leads.fullName, email: leads.email, phone: leads.phone,
    company: leads.company, message: leads.message, notes: leads.notes, status: leads.status,
  }).from(leads).where(and(
    gte(leads.followUpDate, new Date(dayStart)),
    lt(leads.followUpDate, new Date(dayStart + DAY)),
    notInArray(leads.status, ["converted", "not_interested", "closed"]),
  )).orderBy(asc(leads.userId), asc(leads.followUpDate)).limit(MAX_LEADS);
  if (!rows.length) return { leads: 0, due: [] };

  const byOwner = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byOwner.get(r.userId);
    if (list) list.push(r); else byOwner.set(r.userId, [r]);
  }
  const people = await db.select({ id: users.id, email: users.email, fullName: users.fullName, status: users.status })
    .from(users).where(inArray(users.id, [...byOwner.keys()]));
  const ownerOf = new Map(people.map((u) => [u.id, u]));

  const due: DueFollowUps[] = [];
  for (const [userId, list] of byOwner) {
    const owner = ownerOf.get(userId);
    if (!owner || owner.status !== "active" || !mailable(owner.email)) continue;
    due.push({
      userId, to: owner.email, count: list.length,
      render: () => leadFollowUpsDueEmail({
        ownerName: owner.fullName,
        items: list.slice(0, ITEMS_PER_EMAIL).map((l) => ({
          leadName: l.fullName, phone: l.phone, email: l.email, note: l.notes,
          status: l.status, company: l.company, message: l.message,
        })),
        total: list.length,
        date: new Date(now),
      }),
    });
  }
  return { leads: rows.length, due };
}

export type LeadFollowUpsResult = {
  enabled: boolean; date: string; leads: number; owners: number; sent: number; failed: number;
  capped?: boolean; error?: string;
};

let running = false; // the scheduler and POST /api/cron/trial-emails share this process

export async function runLeadFollowUps(): Promise<LeadFollowUpsResult> {
  const now = Date.now();
  const ymd = new Date(now + IST).toISOString().slice(0, 10); // India date, "2026-09-21"
  const out: LeadFollowUpsResult = { enabled: true, date: ymd, leads: 0, owners: 0, sent: 0, failed: 0 };
  if (running) return { ...out, error: "already running" };
  running = true;
  try {
    const db = getDb();
    if ((await getSetting(db, "lead_followup_emails_enabled")) === "0") { out.enabled = false; return out; }

    const { leads: found, due } = await dueLeadFollowUps(db, now);
    out.leads = found;
    const key = `ls_fu_${ymd.replace(/-/g, "")}`;
    for (const d of due) {
      if (out.owners >= MAX_OWNERS) { out.capped = true; break; }
      let markerId: number | null = null;
      try {
        markerId = await claim(db, d.userId, key, `${d.count} lead${d.count === 1 ? "" : "s"} to follow up today.`);
        if (!markerId) continue;
        out.owners++;
        const res = await sendEmail(d.to, d.render());
        if (res.ok) { markerId = null; out.sent++; } // delivered — the marker stays
      } catch (e) {
        console.error("[lead-followups] owner", d.userId, "error:", (e as Error).message);
      }
      // Not delivered: drop the marker so a re-run today can try again.
      if (markerId) {
        out.failed++;
        try { await db.delete(notifications).where(eq(notifications.id, markerId)); } catch { /* stays claimed */ }
      }
    }
    return out;
  } catch (e) {
    console.error("[lead-followups] run error:", (e as Error).message);
    return { ...out, error: (e as Error).message };
  } finally {
    running = false;
    console.log(`[lead-followups] ${ymd}: ${out.leads} leads due, ${out.sent} owners emailed, ${out.failed} failed${out.capped ? " (capped)" : ""}${out.enabled ? "" : " (switched off)"}`);
  }
}
