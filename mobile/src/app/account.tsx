import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Eye, EyeOff, Link2, MailCheck, MailWarning } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, Field, Loading, Row, Screen, SectionTitle, SwitchRow } from "~/components/ui";
import { PasswordChecklist } from "~/components/PasswordChecklist";
import { useAuth } from "~/lib/auth";
import { useSnapshot } from "~/lib/card";
import { cardUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { passwordProblem } from "~/lib/password";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

/* The account behind the card: the owner's name and mobile, the sign-in
   email (shown, not changed here — changing the sign-in email goes through
   support, so a lost phone can't be used to take the account), the password,
   and the card's link. */

export default function AccountScreen() {
  const { c } = useTheme();
  const { updateUser } = useAuth();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const verification = trpc.auth.verificationStatus.useQuery();
  const snapshot = useSnapshot();
  const saveProfile = trpc.auth.updateProfile.useMutation();
  const resend = trpc.auth.resendVerification.useMutation();
  const changePassword = trpc.auth.changePassword.useMutation();
  const signOutOthers = trpc.mobile.revokeOtherSessions.useMutation();

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [profileNote, setProfileNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [others, setOthers] = useState(true);
  const [pwNote, setPwNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);

  useEffect(() => {
    if (me.data && name === null) { setName(me.data.fullName ?? ""); setPhone(me.data.phone ?? ""); }
  }, [me.data, name]);

  if (me.isLoading || name === null) return <Loading />;
  const profileDirty = !!me.data && (name.trim() !== (me.data.fullName ?? "") || phone.trim() !== (me.data.phone ?? ""));
  const slug = snapshot.data?.slug;

  const submitProfile = async () => {
    setProfileNote(null);
    if (name.trim().length < 2) { setProfileNote({ tone: "bad", text: "Enter your name." }); return; }
    const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
    try {
      // People can sign in with their mobile, so it can belong to one account only.
      if (digits(phone).length === 10 && digits(phone) !== digits(me.data?.phone ?? "")) {
        const taken = await utils.auth.checkAvailability.fetch({ phone: phone.trim() });
        if (taken.phone) { setProfileNote({ tone: "bad", text: "That mobile number is registered to another account." }); return; }
      }
      const r = await saveProfile.mutateAsync({ fullName: name.trim(), phone: phone.trim() || undefined });
      await updateUser({ fullName: r.fullName });
      await me.refetch();
      haptics.success();
      setProfileNote({ tone: "good", text: "Saved." });
    } catch (e) {
      setProfileNote({ tone: "bad", text: errorMessage(e, "Couldn't save your details.") });
    }
  };

  const submitPassword = async () => {
    setPwNote(null);
    if (!current) { setPwNote({ tone: "bad", text: "Enter your current password." }); return; }
    const problem = passwordProblem(next);
    if (problem) { setPwNote({ tone: "bad", text: problem }); return; }
    if (next === current) { setPwNote({ tone: "bad", text: "Choose a password you haven't used here." }); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      let signedOut = 0;
      if (others) {
        try { signedOut = (await signOutOthers.mutateAsync()).signedOut; } catch { /* the password change still stands */ }
      }
      haptics.success();
      setCurrent(""); setNext("");
      setPwNote({
        tone: "good",
        text: `Password changed.${others ? ` ${signedOut ? `${signedOut} other phone${signedOut === 1 ? "" : "s"} signed out.` : "No other phones were signed in."}` : ""}`,
      });
    } catch (e) {
      haptics.warning();
      setPwNote({ tone: "bad", text: errorMessage(e, "Couldn't change your password.") });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <SectionTitle>Your details</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="Name" value={name} onChangeText={(v) => { setName(v); setProfileNote(null); }} autoCapitalize="words" autoComplete="name" placeholder="Your full name"
            hint="Your account name. The name on your card is set in Edit." />
          <Field label="Mobile" value={phone} onChangeText={(v) => { setPhone(v); setProfileNote(null); }} keyboardType="phone-pad" autoComplete="tel" placeholder="+91 98765 43210" />
          {profileNote ? <Banner tone={profileNote.tone} title={profileNote.text} /> : null}
          <Button size="md" title="Save details" disabled={!profileDirty} loading={saveProfile.isPending} onPress={() => void submitProfile()} />
        </Card>

        <SectionTitle>Sign-in email</SectionTitle>
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            {verification.data?.verified ? <MailCheck color={c.good} size={20} /> : <MailWarning color={c.warn} size={20} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="label" numberOfLines={1}>{me.data?.email}</AppText>
              <AppText variant="caption" tone="muted">{verification.data?.verified ? "Verified" : "Not verified yet"}</AppText>
            </View>
            {verification.data?.verified ? <Chip label="Verified" tone="good" /> : null}
          </View>
          {verification.data && !verification.data.verified ? (
            <>
              {verifyNote ? <Banner tone="info" title={verifyNote} /> : null}
              <Button size="md" kind="secondary" title="Send verification email" loading={resend.isPending}
                onPress={async () => {
                  try {
                    const r = await resend.mutateAsync();
                    setVerifyNote(r.already ? "Your email is already verified." : `Sent to ${r.email}. Open the link in it to verify.`);
                    if (r.already) void verification.refetch();
                  } catch (e) { setVerifyNote(errorMessage(e, "Couldn't send the email. Try again in a moment.")); }
                }} />
            </>
          ) : null}
          <AppText variant="caption" tone="muted">To change the email you sign in with, message support from More → Chat with support.</AppText>
        </Card>

        <SectionTitle>Password</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="Current password" value={current} onChangeText={(v) => { setCurrent(v); setPwNote(null); }} secureTextEntry={!show}
            autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" />
          <View style={{ gap: space.sm }}>
            <Field label="New password" value={next} onChangeText={(v) => { setNext(v); setPwNote(null); }} secureTextEntry={!show}
              autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword"
              right={
                <Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide passwords" : "Show passwords"} hitSlop={8} onPress={() => setShow((s) => !s)} style={{ padding: 10 }}>
                  {show ? <EyeOff color={c.muted} size={20} /> : <Eye color={c.muted} size={20} />}
                </Pressable>
              } />
            <PasswordChecklist password={next} />
          </View>
        </Card>
        <Card padded={false}>
          <SwitchRow first title="Sign out my other phones" subtitle="Anyone using the app on another phone has to sign in again" value={others} onChange={setOthers} />
        </Card>
        {pwNote ? <Banner tone={pwNote.tone} title={pwNote.text} /> : null}
        <Button title="Change password" loading={changePassword.isPending || signOutOthers.isPending} disabled={!current || !next} onPress={() => void submitPassword()} />

        {slug ? (
          <>
            <SectionTitle>Card link</SectionTitle>
            <Card padded={false}>
              <Row first icon={<Link2 color={c.accentText} size={18} />} title={displayUrl(cardUrl(slug))} subtitle="Change the address of your card"
                right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/link")} />
            </Card>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
