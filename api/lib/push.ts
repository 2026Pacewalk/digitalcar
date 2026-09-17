/* Push notifications to the DigitalCarda mobile app, through Expo's push
 * service (it relays to Apple and Google). Best-effort by design: a push that
 * fails must never fail the action that triggered it — the enquiry is already
 * stored and the email alert still goes out.
 *
 * Tokens that Expo reports as no longer registered (app uninstalled, sign-out
 * on a reset phone) are disabled so we stop sending to them.
 *
 * Optional: EXPO_ACCESS_TOKEN, when "enhanced push security" is turned on for
 * the Expo project. */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { pushTokens } from "@db/schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export const isExpoPushToken = (t: string) => EXPO_TOKEN.test(t);

export type PushMessage = {
  title: string;
  body: string;
  /** Delivered to the app on tap, e.g. { type: "lead", leadId: 42 }. */
  data?: Record<string, unknown>;
  /** Android notification channel created by the app ("leads", "default"). */
  channelId?: string;
};

type Ticket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

/** Sends to every active app install of one user. Returns how many were accepted. */
export async function pushToUser(userId: number, msg: PushMessage): Promise<number> {
  try {
    const db = getDb();
    const rows = await db.select({ id: pushTokens.id, token: pushTokens.token })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), isNull(pushTokens.disabledAt)));
    if (!rows.length) return 0;

    const messages = rows.map((r) => ({
      to: r.token,
      title: msg.title.slice(0, 120),
      body: msg.body.slice(0, 240),
      data: msg.data ?? {},
      sound: "default",
      priority: "high",
      channelId: msg.channelId ?? "default",
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[push] Expo push service returned ${res.status}`);
      return 0;
    }
    const json = (await res.json()) as { data?: Ticket[] };
    const tickets = json.data ?? [];

    // Tickets come back in the same order as the messages.
    const gone = rows.filter((_, i) => tickets[i]?.status === "error" && tickets[i]?.details?.error === "DeviceNotRegistered").map((r) => r.id);
    if (gone.length) {
      await db.update(pushTokens).set({ disabledAt: new Date() }).where(inArray(pushTokens.id, gone));
    }
    const accepted = tickets.filter((t) => t.status === "ok").length;
    const failed = tickets.filter((t) => t.status === "error");
    if (failed.length) console.warn(`[push] ${failed.length} of ${tickets.length} not accepted: ${failed.map((t) => t.details?.error || t.message).join(", ")}`);
    return accepted;
  } catch (e) {
    console.error("[push] send failed:", (e as Error).message);
    return 0;
  }
}
