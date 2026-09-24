import { useEffect, useState } from "react";
import { AppState, Linking, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { BellRing } from "lucide-react-native";
import { AppText, Banner, Button, Card, Loading, Screen, SectionTitle, SwitchRow } from "~/components/ui";
import { enablePush, pushState, type PushState } from "~/lib/push";
import { errorMessage, trpc } from "~/lib/trpc";
import { space, useTheme } from "~/theme";

/* Alerts: whether this phone may show notifications at all, and what we may
   tell the owner about. The switches are kept on the server, so the same
   choice governs the push on the phone and the email in the inbox, on every
   device. The bell inside the app always keeps everything. */

type Prefs = { enquiries: boolean; followUps: boolean; plan: boolean; rewards: boolean; tips: boolean };
type Key = keyof Prefs;

const SWITCHES: { key: Key; title: string; subtitle: string }[] = [
  { key: "enquiries", title: "New enquiries", subtitle: "The moment someone enquires from your card" },
  { key: "followUps", title: "Follow-up reminders", subtitle: "When a lead you set a date for is due" },
  { key: "plan", title: "Plan and trial", subtitle: "Before your trial or plan ends" },
  { key: "rewards", title: "Referral rewards", subtitle: "When a friend you referred goes paid" },
  { key: "tips", title: "Tips and product news", subtitle: "Occasional ideas for getting more from your card" },
];

export default function AlertsScreen() {
  const { c } = useTheme();
  const utils = trpc.useUtils();
  const prefs = trpc.notification.prefs.useQuery();
  const save = trpc.notification.setPrefs.useMutation();
  const [error, setError] = useState<string | null>(null);

  // Whether the phone itself allows notifications — re-checked when the owner
  // comes back from the phone's Settings.
  const [phone, setPhone] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const check = () => { void pushState().then(setPhone); };
    check();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    setNote(r.ok ? "Alerts are on for this phone." : r.message);
    setPhone(await pushState());
  };

  const set = (key: Key, next: boolean) => {
    const current = prefs.data;
    if (!current) return;
    setError(null);
    // Show the switch moved straight away; put it back if the save fails.
    utils.notification.prefs.setData(undefined, { ...current, [key]: next });
    save.mutate({ [key]: next }, {
      // Only this switch comes from the answer: another one flicked at the same
      // time may still be on its way, and its reply carries the older value.
      onSuccess: (saved) => utils.notification.prefs.setData(undefined, (prev) => ({ ...(prev ?? saved), [key]: saved[key] })),
      onError: (e) => { utils.notification.prefs.setData(undefined, current); setError(errorMessage(e)); },
    });
  };

  if (prefs.isLoading) return <Loading />;

  const p = prefs.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Alerts" }} />

      {error ? <Banner tone="bad" title={error} /> : null}

      {phone && phone !== "granted" ? (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <BellRing color={c.accentText} size={20} />
            <AppText variant="label" style={{ flex: 1 }}>
              {phone === "unsupported" ? "Alerts work in the phone app" : "Notifications are off on this phone"}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted">
            {phone === "unsupported"
              ? "Install DigitalCarda on your phone to get an alert the moment someone enquires. Your choices below still apply to our emails."
              : phone === "denied"
                ? "Your phone is blocking DigitalCarda notifications. Turn them on in Settings and enquiries will reach you the moment they arrive."
                : "Turn them on and an enquiry from your card reaches you straight away."}
          </AppText>
          {note ? <AppText variant="caption" tone={note.startsWith("Alerts are on") ? "good" : "bad"}>{note}</AppText> : null}
          {phone === "denied" ? (
            <Button kind="secondary" title="Open phone settings" onPress={() => void Linking.openSettings()} />
          ) : phone === "undetermined" ? (
            <Button title="Turn on alerts" loading={busy} onPress={() => void turnOn()} />
          ) : null}
        </Card>
      ) : null}

      <SectionTitle>Tell me about</SectionTitle>
      <Card padded={false}>
        {SWITCHES.map((s, i) => (
          <SwitchRow
            key={s.key}
            first={i === 0}
            title={s.title}
            subtitle={s.subtitle}
            value={p ? p[s.key] : true}
            disabled={!p}
            onChange={(next) => set(s.key, next)}
          />
        ))}
      </Card>
      <AppText variant="caption" tone="muted">
        Each switch covers both the alert on your phone and the email — and every phone you&apos;re signed in on.
        Messages about your account, your password and your payments always arrive.
        {Platform.OS === "web" ? "" : " Everything is still listed in the app under Notifications."}
      </AppText>
    </Screen>
  );
}
