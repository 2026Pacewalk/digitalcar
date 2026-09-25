import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Banner, Button, Field } from "~/components/ui";
import { errorMessage, trpc } from "~/lib/trpc";
import { useAuth } from "~/lib/auth";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

export default function SignIn() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { completeSignIn } = auth;
  const notice = auth.status === "signedOut" ? auth.notice : undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async ({ token, user }) => {
      if (user.role === "super_admin" || user.role === "staff") {
        setError("This app is for card owners. Admin tools are at digitalcarda.in/admin.");
        haptics.warning();
        return;
      }
      // The app is the card-owner's toolkit; partners have their own portal on the web.
      if (user.role === "reseller") {
        setError("This app is for card owners. Partners manage customers and commission at digitalcarda.in/resellers-login.");
        haptics.warning();
        return;
      }
      haptics.success();
      await completeSignIn(token, { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatar: user.avatar });
    },
    onError: (e) => { haptics.warning(); setError(errorMessage(e, "Couldn't sign in. Please try again.")); },
  });

  const submit = () => {
    setError(null);
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    login.mutate({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.ground }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: c.hero, paddingTop: insets.top + 36, paddingBottom: 36, paddingHorizontal: space.xl, gap: space.md }}>
          <Image source={require("../../../assets/icon.png")} style={{ width: 56, height: 56, borderRadius: 14 }} />
          <AppText variant="display" tone="hero">Welcome back</AppText>
          <AppText tone="heroMuted">Sign in to share your card, see who viewed it and reply to enquiries.</AppText>
        </View>

        <View style={{ padding: space.xl, gap: space.lg }}>
          {error ? <Banner tone="bad" title={error} /> : notice ? <Banner tone="info" title={notice} /> : null}
          <Field
            label="Email, card address or mobile"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="you@business.com"
          />
          <Field
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            placeholder="Your password"
          />
          <Button title="Sign in" onPress={submit} loading={login.isPending} />
          <Link href="/forgot-password" asChild>
            <Pressable accessibilityRole="link" style={{ alignSelf: "center", padding: space.sm }}>
              <AppText variant="label" tone="accent">Forgot password?</AppText>
            </Pressable>
          </Link>
        </View>

        <View style={{ marginTop: "auto", padding: space.xl, paddingBottom: insets.bottom + space.xl, alignItems: "center", gap: space.sm }}>
          <AppText tone="muted">New to DigitalCarda?</AppText>
          <Button
            kind="secondary"
            title="Create your free card"
            onPress={() => router.push("/sign-up")}
            style={{ alignSelf: "stretch" }}
          />
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>30 days free · no payment needed</AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
