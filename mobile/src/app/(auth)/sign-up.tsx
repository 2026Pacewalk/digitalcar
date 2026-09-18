import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Eye, EyeOff } from "lucide-react-native";
import { AppText, Banner, Button, Field } from "~/components/ui";
import { errorMessage, trpc } from "~/lib/trpc";
import { useAuth } from "~/lib/auth";
import { SITE_URL } from "~/lib/config";
import { markWelcomePending } from "~/lib/welcome";
import { passwordProblem } from "~/lib/password";
import { PasswordChecklist } from "~/components/PasswordChecklist";
import * as haptics from "~/lib/haptics";
import { fonts, space, useTheme } from "~/theme";

/* Create an account without leaving the app. Same rules and the same server
   call as the website's signup: a starter card goes live straight away on the
   30-day free trial, and the welcome guide takes it from there. */

// Every signup carries the free-trial voucher; the server decides what it grants.
const TRIAL_PROMO = "FREE30D";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const mobileDigits = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length > 10 && d.startsWith("91") ? d.slice(-10) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
};

type FieldKey = "fullName" | "email" | "mobile" | "password" | "agreed";

export default function SignUp() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { completeSignIn } = useAuth();
  const params = useLocalSearchParams<{ ref?: string }>();
  const utils = trpc.useUtils();

  const [fullName, setFullName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referral, setReferral] = useState(typeof params.ref === "string" ? params.ref : "");
  const [referralOpen, setReferralOpen] = useState(!!params.ref);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const businessRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // The card link this signup would get, previewed as they type.
  const [linkInput, setLinkInput] = useState({ businessName: "", fullName: "" });
  useEffect(() => {
    const t = setTimeout(() => setLinkInput({ businessName: business.trim(), fullName: fullName.trim() }), 400);
    return () => clearTimeout(t);
  }, [business, fullName]);
  const link = trpc.auth.previewCardLink.useQuery(linkInput, {
    enabled: !!(linkInput.businessName || linkInput.fullName), staleTime: 30_000, retry: false,
  });

  const code = referral.trim();
  const refInfo = trpc.referral.validate.useQuery({ code }, { enabled: code.length >= 2, retry: false, staleTime: 60_000 });

  const register = trpc.auth.register.useMutation();

  const validate = () => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (fullName.trim().length < 2) e.fullName = "Enter your name.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    const md = mobileDigits(mobile);
    if (md && !/^[6-9]\d{9}$/.test(md)) e.mobile = "Enter a 10-digit Indian mobile number.";
    const pw = passwordProblem(password);
    if (pw) e.password = pw;
    if (!agreed) e.agreed = "Accept the Terms and Privacy Policy to continue.";
    return e;
  };

  const submit = async () => {
    if (busy) return;
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { haptics.warning(); return; }

    setBusy(true);
    let created = false;
    try {
      const md = mobileDigits(mobile);
      // Stop before creating anything if the email or mobile already has an account.
      const taken = await utils.auth.checkAvailability.fetch({ email: email.trim(), phone: md || undefined });
      if (taken.email || taken.phone) {
        setErrors(taken.email
          ? { email: "This email already has an account — sign in instead." }
          : { mobile: "This mobile number is registered to another account." });
        haptics.warning();
        return;
      }
      const res = await register.mutateAsync({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: md ? `+91 ${md.slice(0, 5)} ${md.slice(5)}` : undefined,
        role: "customer",
        companyName: business.trim() || undefined,
        referralCode: code && refInfo.data?.valid ? code : undefined,
        promo: TRIAL_PROMO,
      });
      created = true;
      haptics.success();
      await markWelcomePending();
      await completeSignIn(res.token, {
        id: res.user.id, email: res.user.email, fullName: res.user.fullName, role: res.user.role, avatar: res.user.avatar,
      });
    } catch (err) {
      haptics.warning();
      if (created) { setFormError("Your account is ready. Sign in with your email and password to continue."); return; }
      const msg = errorMessage(err, "Couldn't create your account. Please try again.");
      setFormError(/too many|rate limit/i.test(msg) ? "Too many attempts from this connection. Wait a few minutes and try again." : msg);
    } finally {
      setBusy(false);
    }
  };

  const clear = (k: FieldKey) => { if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined })); if (formError) setFormError(null); };
  const toggleAgreed = () => { haptics.tap(); setAgreed((v) => !v); clear("agreed"); };
  const openDoc = (path: string) => void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);
  const cardLink = link.data?.slug ? `digitalcarda.in/${link.data.slug}` : "";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.ground }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: c.hero, paddingTop: insets.top + 28, paddingBottom: 28, paddingHorizontal: space.xl, gap: space.sm }}>
          <AppText variant="display" tone="hero">Your card in two minutes</AppText>
          <AppText tone="heroMuted">Create your account and your digital business card goes live straight away.</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.xs }}>
            <Check color={c.accent} size={16} />
            <AppText variant="label" tone="hero">30 days free · no payment needed</AppText>
          </View>
        </View>

        <View style={{ padding: space.xl, gap: space.lg }}>
          {formError ? <Banner tone="bad" title={formError} /> : null}

          <Field
            label="Your name"
            value={fullName}
            onChangeText={(v) => { setFullName(v); clear("fullName"); }}
            error={errors.fullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => businessRef.current?.focus()}
            placeholder="e.g. Priya Sharma"
          />
          <Field
            ref={businessRef}
            label="Business name (optional)"
            value={business}
            onChangeText={setBusiness}
            autoCapitalize="words"
            autoComplete="organization"
            textContentType="organizationName"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            placeholder="e.g. Sharma Interiors"
            hint={cardLink ? (
              <AppText variant="caption" tone="muted">
                Your card link: <AppText variant="caption" tone="ink" style={{ fontFamily: fonts.semibold }}>{cardLink}</AppText>
              </AppText>
            ) : "Your card link is made from your business name."}
          />
          <Field
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); clear("email"); }}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => mobileRef.current?.focus()}
            placeholder="you@business.com"
          />
          <Field
            ref={mobileRef}
            label="Mobile / WhatsApp (optional)"
            value={mobile}
            onChangeText={(v) => { setMobile(v); clear("mobile"); }}
            error={errors.mobile}
            autoComplete="tel"
            textContentType="telephoneNumber"
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="98765 43210"
            hint="Shown on your card so customers can call or WhatsApp you."
          />
          <View style={{ gap: space.sm }}>
            <Field
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); clear("password"); }}
              error={errors.password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              placeholder="Choose a password"
              right={
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  hitSlop={8} onPress={() => setShowPassword((s) => !s)} style={{ padding: 10 }}>
                  {showPassword ? <EyeOff color={c.muted} size={20} /> : <Eye color={c.muted} size={20} />}
                </Pressable>
              }
            />
            <PasswordChecklist password={password} />
          </View>

          {referralOpen ? (
            <Field
              label="Referral code"
              value={referral}
              onChangeText={setReferral}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Code from the person who invited you"
              hint={code.length < 2 ? undefined : refInfo.isFetching ? "Checking…"
                : refInfo.data?.valid ? `Referred by ${refInfo.data.referrerName || code}`
                : refInfo.data ? "We don't recognise that code — you can still sign up." : undefined}
            />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setReferralOpen(true)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
              <AppText variant="label" tone="accent">Have a referral code?</AppText>
            </Pressable>
          )}

          <View style={{ gap: 6 }}>
            {/* The box is the checkbox; the sentence toggles it too, except its two links. */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="I agree to the Terms and Privacy Policy"
                accessibilityState={{ checked: agreed }}
                aria-checked={agreed}
                hitSlop={10}
                onPress={toggleAgreed}
                style={{
                  width: 24, height: 24, borderRadius: 7, borderWidth: 2, marginTop: 1,
                  borderColor: agreed ? c.accent : errors.agreed ? c.bad : c.rule,
                  backgroundColor: agreed ? c.accent : c.surface, alignItems: "center", justifyContent: "center",
                }}
              >
                {agreed ? <Check color={c.accentInk} size={16} strokeWidth={3} /> : null}
              </Pressable>
              <Text onPress={toggleAgreed} style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: c.ink2 }}>
                I agree to the{" "}
                <Text accessibilityRole="link" onPress={() => openDoc("/terms-of-service")} style={{ color: c.accentText, fontFamily: fonts.semibold }}>Terms</Text>
                {" "}and{" "}
                <Text accessibilityRole="link" onPress={() => openDoc("/privacy")} style={{ color: c.accentText, fontFamily: fonts.semibold }}>Privacy Policy</Text>
              </Text>
            </View>
            {errors.agreed ? <AppText variant="caption" tone="bad">{errors.agreed}</AppText> : null}
          </View>

          <Button title="Create my card" onPress={() => void submit()} loading={busy} />
        </View>

        <View style={{ marginTop: "auto", padding: space.xl, paddingBottom: insets.bottom + space.xl, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
          <AppText tone="muted">Already have an account?</AppText>
          <Link href="/sign-in" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText variant="label" tone="accent">Sign in</AppText>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
