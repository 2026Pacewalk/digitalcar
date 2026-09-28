import { and, eq, inArray, isNull } from "drizzle-orm";
import { notifications, teamNotifications } from "@db/schema";
import { getDb } from "../queries/connection";
import { clip, teamDef, type NotifSeverity } from "@contracts/notifications";
import { allows, type NotifyCategory } from "./notify-prefs";
import { pushToUser } from "./push";

/* Writing notifications. Every new notification goes through here, so each
   one is short, typed from the registry (contracts/notifications.ts) and —
   above all — never the reason the action that caused it fails: these helpers
   log and carry on. (The daily jobs still write their own rows, because those
   rows double as their send-once record; the registry covers their types.) */

type Db = ReturnType<typeof getDb>;

/** Tell one customer or reseller something, in their bell. With `push`, also
    on their phone: "always" for money and orders, or the preference that
    governs it (enquiries, plan, rewards …), which they may have switched off. */
export async function notifyUser(o: {
  userId: number | null | undefined;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  push?: NotifyCategory | "always";
}, db: Db = getDb()): Promise<void> {
  if (!o.userId) return;
  try {
    await db.insert(notifications).values({
      userId: o.userId,
      type: o.type.slice(0, 50),
      title: clip(o.title, 200),
      message: clip(o.message, 500),
      link: o.link ?? null,
    });
  } catch (e) {
    console.error(`[notify] ${o.type} for user ${o.userId} not saved:`, (e as Error).message);
    return;
  }
  if (o.push && (o.push === "always" || await allows(o.userId, o.push))) {
    void pushToUser(o.userId, { title: clip(o.title, 120), body: clip(o.message, 240), data: { type: o.type, link: o.link ?? "" } })
      .catch(() => { /* best effort */ });
  }
}

/** Tell the team. One row per event; who sees it follows its staff module.
    A `dedupeKey` makes a repeat (a replayed webhook, a double click) a no-op. */
export async function notifyTeam(o: {
  type: string;
  title: string;
  message: string;
  link?: string | null;
  entity?: { type: string; id: number } | null;
  dedupeKey?: string | null;
  severity?: NotifSeverity;
}, db: Db = getDb()): Promise<void> {
  try {
    const def = teamDef(o.type);
    await db.insert(teamNotifications).ignore().values({
      type: o.type.slice(0, 50),
      category: def.category,
      module: def.module,
      severity: o.severity ?? def.severity,
      title: clip(o.title, 200),
      message: clip(o.message, 500),
      link: o.link ?? null,
      entityType: o.entity?.type ?? null,
      entityId: o.entity?.id ?? null,
      dedupeKey: o.dedupeKey ? o.dedupeKey.slice(0, 120) : null,
    });
  } catch (e) {
    console.error(`[notify] team ${o.type} not saved:`, (e as Error).message);
  }
}

/** Someone handled it (verified the payment, paid the payout …): the event
    leaves Needs action for the whole team. */
export async function resolveTeam(entityType: string, ids: number | number[], byUserId: number | null | undefined, db: Db = getDb()): Promise<void> {
  const list = (Array.isArray(ids) ? ids : [ids]).filter((n) => Number.isFinite(n) && n > 0);
  if (!list.length) return;
  try {
    await db.update(teamNotifications)
      .set({ resolvedAt: new Date(), resolvedBy: byUserId ?? null })
      .where(and(eq(teamNotifications.entityType, entityType), inArray(teamNotifications.entityId, list), isNull(teamNotifications.resolvedAt)));
  } catch (e) {
    console.error(`[notify] resolve ${entityType} ${list.join(",")} failed:`, (e as Error).message);
  }
}
