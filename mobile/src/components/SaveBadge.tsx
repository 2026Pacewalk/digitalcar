import { ActivityIndicator, View } from "react-native";
import { Check, CloudOff } from "lucide-react-native";
import { AppText } from "~/components/ui";
import type { SaveState } from "~/lib/useCardFields";
import { useTheme } from "~/theme";

/** "Saving… / Saved / Not saved" beside a screen title. */
export function SaveBadge({ state }: { state: SaveState }) {
  const { c } = useTheme();
  if (state === "saving" || state === "pending") {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ActivityIndicator size="small" color={c.muted} /><AppText variant="caption" tone="muted">Saving…</AppText></View>;
  }
  if (state === "saved") return <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Check color={c.good} size={16} /><AppText variant="caption" tone="good">Saved</AppText></View>;
  if (state === "error") return <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><CloudOff color={c.bad} size={16} /><AppText variant="caption" tone="bad">Not saved</AppText></View>;
  return null;
}
