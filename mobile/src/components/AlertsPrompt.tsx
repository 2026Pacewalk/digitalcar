import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { BellRing, X } from "lucide-react-native";
import { AppText, Button, Card } from "~/components/ui";
import { enablePush, pushState } from "~/lib/push";
import { getItem, setItem } from "~/lib/secureStorage";
import { space, useTheme } from "~/theme";

const DISMISSED_KEY = "dc_alerts_prompt_dismissed";

/* Asks for notification permission with the reason up front, on Home — not in
   a cold system prompt at first launch. Hidden once allowed or dismissed. */
export function AlertsPrompt() {
  const { c } = useTheme();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [state, dismissed] = await Promise.all([pushState(), getItem(DISMISSED_KEY)]);
      if (!cancelled) setVisible(state === "undetermined" && !dismissed);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  const dismiss = () => { setVisible(false); void setItem(DISMISSED_KEY, "1"); };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentWash, alignItems: "center", justifyContent: "center" }}>
          <BellRing color={c.accentText} size={20} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">Know the moment someone enquires</AppText>
          <AppText variant="caption" tone="muted">{note ?? "Get a notification with their message, then call or WhatsApp them in one tap."}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" hitSlop={10} onPress={dismiss}>
          <X color={c.muted} size={18} />
        </Pressable>
      </View>
      <Button size="md" title="Turn on enquiry alerts" loading={busy} onPress={async () => {
        setBusy(true);
        try {
          const r = await enablePush();
          if (r.ok) { setVisible(false); return; }
          setNote(r.message);
          if (r.reason === "denied") void setItem(DISMISSED_KEY, "1");
        } finally { setBusy(false); }
      }} />
    </Card>
  );
}
