/*
 * Trial FOMO emailer. Meant to be run once a day (see /api/cron/trial-emails).
 * Scans trial subscriptions and emails users whose trial is ending or has ended.
 *
 * De-duplication uses the notifications table as a ledger: a marker row
 * (type "trial_email_ending" / "trial_email_ended") is written the first time
 * each email is sent, so a user gets at most one of each — resilient to the
 * job running multiple times or missing a day.
 */
import { getDb } from "../queries/connection";
import { subscriptions, users, notifications } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "../lib/mail";
import { trialEndingEmail, trialEndedEmail } from "../lib/email-templates";

const DAY = 86_400_000;
const ENDING = "trial_email_ending";
const ENDED = "trial_email_ended";

/** Insert the ledger marker if absent. Returns true if this is the first time. */
async function claim(db: ReturnType<typeof getDb>, userId: number, type: string, title: string, message: string): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(eq(notifications.userId, userId), eq(notifications.type, type)),
  });
  if (existing) return false;
  await db.insert(notifications).values({ userId, type, title, message, link: "/dashboard/subscription" });
  return true;
}

export async function runTrialEmails(): Promise<{ scanned: number; ending: number; ended: number }> {
  const db = getDb();
  const now = Date.now();
  const trials = await db.query.subscriptions.findMany({ where: eq(subscriptions.status, "trial") });

  let ending = 0, ended = 0;
  for (const s of trials) {
    const end = s.trialEndsAt || s.currentPeriodEnd;
    if (!end) continue;
    const daysLeft = Math.ceil((new Date(end).getTime() - now) / DAY);

    if (daysLeft <= 0) {
      if (await claim(db, s.userId, ENDED, "Your trial has ended", "Your card is paused — upgrade to bring it back online.")) {
        const u = await db.query.users.findFirst({ where: eq(users.id, s.userId), columns: { email: true, fullName: true } });
        if (u?.email) { await sendEmail(u.email, trialEndedEmail({ name: u.fullName })); ended++; }
      }
    } else if (daysLeft <= 3) {
      if (await claim(db, s.userId, ENDING, "Trial ending soon", `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — upgrade to keep your card live.`)) {
        const u = await db.query.users.findFirst({ where: eq(users.id, s.userId), columns: { email: true, fullName: true } });
        if (u?.email) { await sendEmail(u.email, trialEndingEmail({ name: u.fullName, daysLeft })); ending++; }
      }
    }
  }
  return { scanned: trials.length, ending, ended };
}
