import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { deleteItem, getItem, setItem } from "./secureStorage";
import { currentSession, freshAccessToken, rpc } from "./session";

/* Phone notifications:
     · push "New enquiry" alerts sent by the server, and
     · local follow-up reminders the owner sets on a lead.
   Push needs the installed app (a development or store build) with an Expo
   project id; Expo Go can still show local reminders. */

const PUSH_TOKEN_KEY = "dc_push_token";
const isWeb = Platform.OS === "web";

export type PushState = "granted" | "denied" | "undetermined" | "unsupported";
export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "needs-build" | "error"; message: string };

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("leads", {
    name: "New enquiries",
    description: "When a customer sends an enquiry from your card",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#F7B31C",
  });
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Follow-up reminders",
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync("default", {
    name: "Updates",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function pushState(): Promise<PushState> {
  if (isWeb || !Device.isDevice) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

async function askPermission(): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.status === "granted";
}

const projectId = () =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

/** Asks for permission (if needed) and registers this phone for enquiry alerts. */
export async function enablePush(): Promise<EnableResult> {
  if (isWeb) return { ok: false, reason: "unsupported", message: "Alerts work in the phone app." };
  if (!Device.isDevice) return { ok: false, reason: "unsupported", message: "Alerts need a real phone, not a simulator." };
  if (!(await askPermission())) {
    return { ok: false, reason: "denied", message: "Notifications are turned off for DigitalCarda. Turn them on in your phone's Settings." };
  }
  const id = projectId();
  if (!id) return { ok: false, reason: "needs-build", message: "Enquiry alerts start working in the installed DigitalCarda app." };
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const access = await freshAccessToken();
    await rpc("mobile.registerDevice", { token, platform: Platform.OS === "ios" ? "ios" : "android" }, access);
    await setItem(PUSH_TOKEN_KEY, token);
    return { ok: true };
  } catch (e) {
    const msg = String((e as Error)?.message || "");
    if (/Expo Go|not supported|development build/i.test(msg)) {
      return { ok: false, reason: "needs-build", message: "Enquiry alerts start working in the installed DigitalCarda app." };
    }
    return { ok: false, reason: "error", message: "Couldn't turn on alerts. Check your connection and try again." };
  }
}

/** Re-registers quietly on launch when permission was already given (tokens can change). */
export async function refreshPushRegistration() {
  if ((await pushState()) === "granted" && currentSession()) await enablePush().catch(() => {});
}

/** On sign-out: stop alerts for this phone. */
export async function forgetPushRegistration(accessToken: string | null) {
  const token = await getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  await deleteItem(PUSH_TOKEN_KEY);
  if (accessToken) await rpc("mobile.unregisterDevice", { token }, accessToken).catch(() => {});
}

/* ── Opening the app from a notification ─────────────────────────────── */

type NotificationData = { type?: string; leadId?: number | null };

export function useNotificationRouting(enabled: boolean) {
  const last = isWeb ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!enabled || !last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = last.notification.request.content.data as NotificationData;
    if (data?.type === "lead" || data?.type === "followup") {
      if (data.leadId) router.push({ pathname: "/lead/[id]", params: { id: String(data.leadId) } });
      else router.push("/leads");
    }
  }, [enabled, last]);
}

/* ── Follow-up reminders (local, on this phone) ─────────────────────── */

const reminderId = (leadId: number) => `followup-${leadId}`;

export async function scheduleFollowUp(lead: { id: number; fullName: string; message?: string | null }, at: Date): Promise<boolean> {
  if (isWeb || at.getTime() <= Date.now()) return false;
  if (!(await askPermission())) return false;
  await Notifications.cancelScheduledNotificationAsync(reminderId(lead.id)).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(lead.id),
    content: {
      title: `Follow up with ${lead.fullName}`,
      body: lead.message ? lead.message.slice(0, 120) : "Tap to call or message them.",
      data: { type: "followup", leadId: lead.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: "reminders" },
  });
  return true;
}

export async function cancelFollowUp(leadId: number) {
  if (isWeb) return;
  await Notifications.cancelScheduledNotificationAsync(reminderId(leadId)).catch(() => {});
}
