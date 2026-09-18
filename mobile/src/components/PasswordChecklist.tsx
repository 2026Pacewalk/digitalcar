import { View } from "react-native";
import { Check } from "lucide-react-native";
import { AppText } from "~/components/ui";
import { PASSWORD_RULES } from "~/lib/password";
import { radius, useTheme } from "~/theme";

/** The password rules as chips that turn green as each one is met. */
export function PasswordChecklist({ password }: { password: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {PASSWORD_RULES.map((r) => {
        const ok = r.ok(password);
        return (
          <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: ok ? c.goodWash : c.surfaceAlt }}>
            {ok ? <Check color={c.good} size={12} /> : null}
            <AppText variant="caption" tone={ok ? "good" : "muted"} style={{ fontSize: 12, lineHeight: 16 }}>{r.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}
