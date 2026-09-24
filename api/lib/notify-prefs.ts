/* What each owner wants to hear about, and on which occasions we may write or
 * push to them. One switch covers both channels: turning "tips" off stops the
 * tip emails and the tip pushes, which is what the switch says it does.
 *
 * Never governed by this: account and security mail (password, email change,
 * deletion), payment receipts, and anything sent to the DigitalCarda team.
 *
 * A missing row means everything is on, and so does any database trouble —
 * a preference lookup must never be the reason an enquiry alert is lost.
 */
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { notificationPrefs } from "@db/schema";

export const NOTIFY_CATEGORIES = ["enquiries", "followUps", "plan", "rewards", "tips"] as const;
export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];
export type NotifyPrefs = Record<NotifyCategory, boolean>;

export const ALL_ON: NotifyPrefs = { enquiries: true, followUps: true, plan: true, rewards: true, tips: true };

/** What each switch covers, for the app and for anyone reading this later. */
export const CATEGORY_LABELS: Record<NotifyCategory, string> = {
  enquiries: "New enquiries",
  followUps: "Follow-up reminders",
  plan: "Plan and trial reminders",
  rewards: "Referral rewards and payouts",
  tips: "Tips and product news",
};

const row = (r: { enquiries: boolean; followUps: boolean; plan: boolean; rewards: boolean; tips: boolean }): NotifyPrefs =>
  ({ enquiries: !!r.enquiries, followUps: !!r.followUps, plan: !!r.plan, rewards: !!r.rewards, tips: !!r.tips });

/** One owner's switches. Everything on if they've never changed them. */
export async function getPrefs(userId: number): Promise<NotifyPrefs> {
  try {
    const rows = await getDb().select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1);
    return rows[0] ? row(rows[0]) : { ...ALL_ON };
  } catch {
    return { ...ALL_ON };
  }
}

/** May we tell this owner about `category`? */
export async function allows(userId: number, category: NotifyCategory): Promise<boolean> {
  const prefs = await getPrefs(userId);
  return prefs[category];
}

/** The ones among `userIds` who still want `category` — for the daily jobs,
    which decide for hundreds of owners at once. */
export async function allowedUsers(userIds: number[], category: NotifyCategory): Promise<Set<number>> {
  const all = new Set(userIds);
  if (!userIds.length) return all;
  try {
    const rows = await getDb().select().from(notificationPrefs).where(inArray(notificationPrefs.userId, userIds));
    for (const r of rows) if (!row(r)[category]) all.delete(r.userId);
    return all;
  } catch {
    return all;
  }
}

/** Writes the switches the owner changed, leaving the rest as they are.
    One statement, so two switches flicked in the same breath can't collide on
    the row (read-then-insert made the second one fail with a duplicate key). */
export async function setPrefs(userId: number, patch: Partial<NotifyPrefs>): Promise<NotifyPrefs> {
  const changed: Partial<NotifyPrefs> = {};
  for (const key of NOTIFY_CATEGORIES) if (patch[key] !== undefined) changed[key] = !!patch[key];
  if (Object.keys(changed).length) {
    await getDb().insert(notificationPrefs)
      .values({ userId, ...ALL_ON, ...changed })
      .onDuplicateKeyUpdate({ set: changed });
  }
  return getPrefs(userId);
}
