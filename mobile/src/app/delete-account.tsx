import { useState } from "react";
import { Alert, Linking, Platform, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { AppText, Banner, Button, Card, Field, Screen } from "~/components/ui";
import { SUPPORT_WHATSAPP } from "~/lib/config";
import { dateLabel } from "~/lib/format";
import { useAuth } from "~/lib/auth";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

/* Account deletion, as both app stores require. Says plainly what happens,
   asks for the password, then signs out. */
export default function DeleteAccount() {
  const { c } = useTheme();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const request = trpc.mobile.requestAccountDeletion.useMutation({
    onSuccess: async (res) => {
      haptics.success();
      await signOut(`Your account deletion is scheduled for ${dateLabel(res.scheduledFor)}. Changed your mind? Message support before then.`);
    },
    onError: (e) => { haptics.warning(); setError(errorMessage(e)); },
  });

  const submit = () => {
    setError(null);
    if (!password) { setError("Enter your password to confirm."); return; }
    const go = () => request.mutate({ password, reason: reason.trim() || undefined });
    const title = "Delete your account?";
    const body = "Your card goes offline right away and you'll be signed out on every device.";
    if (Platform.OS === "web") { if (globalThis.confirm?.(`${title} ${body}`)) go(); return; }
    Alert.alert(title, body, [{ text: "Keep my account", style: "cancel" }, { text: "Delete", style: "destructive", onPress: go }]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <CircleAlert color={c.bad} size={28} />
        <AppText variant="title" style={{ flex: 1 }}>Delete {user?.email ? "this account" : "your account"}</AppText>
      </View>

      <Card style={{ gap: space.md }}>
        <AppText variant="label">What happens</AppText>
        <Point text="Your digital card goes offline immediately. Anyone opening your link or QR sees that it isn't available." />
        <Point text="You're signed out of the app on every device, and can't sign in again." />
        <Point text="After 30 days your account, card, enquiries and saved details are permanently deleted." />
      </Card>

      <Banner tone="info" title="Changed your mind?" body="Message support within 30 days and we'll restore your account and card." action={
        <Button size="md" kind="ghost" title="Chat on WhatsApp" style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
          onPress={() => void Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi DigitalCarda, I'd like to talk about deleting my account")}`)} />
      } />

      {error ? <Banner tone="bad" title={error} /> : null}

      <Card style={{ gap: space.lg }}>
        <Field label="Why are you leaving? (optional)" value={reason} onChangeText={setReason} multiline placeholder="It helps us improve" maxLength={500} />
        <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" placeholder="Confirm it's you" returnKeyType="done" onSubmitEditing={submit} />
        <Button kind="danger" title="Delete my account" onPress={submit} loading={request.isPending} />
      </Card>
    </Screen>
  );
}

function Point({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.muted, marginTop: 8 }} />
      <AppText tone="ink2" style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}
