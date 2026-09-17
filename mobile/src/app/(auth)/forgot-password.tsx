import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { AppText, Banner, Button, Field } from "~/components/ui";
import { errorMessage, trpc } from "~/lib/trpc";
import { space, useTheme } from "~/theme";

export default function ForgotPassword() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter the email you signed up with."); return; }
    reset.mutate({ email: email.trim() });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + space.sm, paddingHorizontal: space.xl, gap: space.lg }}>
      <Button kind="ghost" size="md" title="Back" icon={<ChevronLeft color={c.accentText} size={20} />} onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
      <AppText variant="title">Reset your password</AppText>
      {sent ? (
        <Banner tone="good" title="Check your email" body={`If ${email.trim()} has an account, a reset link is on its way. Open it on this phone to choose a new password.`} />
      ) : (
        <>
          <AppText tone="muted">We'll email you a link to choose a new password.</AppText>
          {error ? <Banner tone="bad" title={error} /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@business.com" returnKeyType="send" onSubmitEditing={submit} />
          <Button title="Send reset link" onPress={submit} loading={reset.isPending} />
        </>
      )}
    </View>
  );
}
