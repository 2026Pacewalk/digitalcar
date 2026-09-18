import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, Copy } from "lucide-react-native";
import { AppText, Button, Card, Loading } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { cardUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { shareCard } from "~/lib/share";
import { useAuth } from "~/lib/auth";
import { trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* The first screen after creating an account in the app. The starter card is
   already live; this walks the owner through the four things that make it
   theirs, in the order that matters, and each step opens the screen for it. */

export default function WelcomeScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const snapshot = useSnapshot();
  const trial = trpc.trial.me.useQuery();

  if (snapshot.isLoading) return <Loading />;

  const snap = snapshot.data;
  const customer = snap?.data.customer;
  const slug = snap?.slug ?? "";
  const name = String(customer?.name || user?.fullName || "");
  const str = (v: unknown) => String(v ?? "").trim();

  const steps = [
    {
      title: "Add your photo or logo",
      body: "Cards with a face or logo get saved and remembered.",
      done: !!(imageOf(customer?.photo) || imageOf(customer?.logo)),
      go: () => router.push("/edit"),
    },
    {
      title: "Add your role and WhatsApp number",
      body: "Visitors see what you do and can message you in one tap.",
      done: !!(str(customer?.designation) && str(customer?.mobile1)),
      go: () => router.push("/edit"),
    },
    {
      title: "Pick a design",
      body: "Dozens of looks — change it any time.",
      done: false,
      go: () => router.push("/designs"),
    },
    {
      title: "Share your card",
      body: "Send it on WhatsApp or show your QR code.",
      done: false,
      go: () => { if (slug) void shareCard(slug, name); },
    },
  ];

  const finish = () => { if (router.canGoBack()) router.back(); else router.replace("/"); };
  const days = trial.data && (trial.data.status === "active" || trial.data.status === "expiring_soon") ? trial.data.daysLeft : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <View style={{ backgroundColor: c.hero, paddingTop: insets.top + space.xl, paddingBottom: space.xl, paddingHorizontal: space.xl, gap: space.sm }}>
        <AppText variant="overline" tone="heroMuted">Welcome to DigitalCarda</AppText>
        <AppText variant="display" tone="hero">Your card is live</AppText>
        {slug ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Copy card link"
            onPress={async () => { await Clipboard.setStringAsync(cardUrl(slug)); haptics.success(); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
            <AppText variant="label" tone="hero">{displayUrl(cardUrl(slug))}</AppText>
            <Copy color={c.heroMuted} size={15} />
          </Pressable>
        ) : null}
        <AppText tone="heroMuted">
          {days != null ? `Free for the next ${days} day${days === 1 ? "" : "s"}. ` : ""}Four quick steps make it yours.
        </AppText>
      </View>

      <View style={{ flex: 1, padding: space.lg, gap: space.lg }}>
        <Card padded={false}>
          {steps.map((s, i) => (
            <Pressable
              key={s.title}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}: ${s.title}${s.done ? ", done" : ""}`}
              onPress={() => { haptics.tap(); s.go(); }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg,
                borderTopWidth: i ? 1 : 0, borderColor: c.rule, backgroundColor: pressed ? c.surfaceAlt : "transparent",
              })}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
                backgroundColor: s.done ? c.good : c.accentWash,
              }}>
                {s.done ? <Check color="#fff" size={16} strokeWidth={3} /> : <AppText variant="label" tone="accent">{i + 1}</AppText>}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label" tone={s.done ? "muted" : "ink"}>{s.title}</AppText>
                <AppText variant="caption" tone="muted">{s.body}</AppText>
              </View>
              <ChevronRight color={c.muted} size={18} />
            </Pressable>
          ))}
        </Card>
      </View>

      <View style={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg, gap: space.sm }}>
        <Button title={steps[0].done ? "Add your details" : "Start with your photo"} onPress={() => (steps[0].done ? steps[1] : steps[0]).go()} />
        <Button kind="ghost" title="I'll do this later" onPress={finish} />
      </View>
    </View>
  );
}
