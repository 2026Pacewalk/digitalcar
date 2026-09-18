import { Alert, Linking, Platform, Pressable, Share, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { BarChart3, Bell, BellRing, ChevronRight, CreditCard, ExternalLink, Gift, Globe, LogOut, MessageCircle, Moon, Nfc, PenLine, Smartphone, UserRound, UserX } from "lucide-react-native";
import { AppText, Avatar, Card, Chip, Row, Screen, SectionTitle, Segmented } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { SITE_URL, SUPPORT_WHATSAPP } from "~/lib/config";
import { useOpenDashboard } from "~/lib/web";
import { dateLabel } from "~/lib/format";
import { useAuth } from "~/lib/auth";
import { trpc } from "~/lib/trpc";
import { enablePush, pushState, type PushState } from "~/lib/push";
import { space, useAppearance, useTheme, type Appearance } from "~/theme";

export default function MoreScreen() {
  const { c } = useTheme();
  const { appearance, setAppearance } = useAppearance();
  const openDashboard = useOpenDashboard();
  const { user, signOut } = useAuth();
  const snapshot = useSnapshot();
  const mine = trpc.publish.mine.useQuery();
  const sub = trpc.subscription.mySubscription.useQuery();
  const trial = trpc.trial.me.useQuery();
  const unread = trpc.notification.unreadCount.useQuery();
  const customer = snapshot.data?.data.customer;
  const slug = mine.data?.slug;

  const [alerts, setAlerts] = useState<PushState | null>(null);
  const [alertNote, setAlertNote] = useState<string | null>(null);
  useEffect(() => { void pushState().then(setAlerts); }, []);
  const turnOnAlerts = async () => {
    const r = await enablePush();
    setAlertNote(r.ok ? "Enquiry alerts are on for this phone." : r.message);
    setAlerts(await pushState());
  };

  const chevron = <ChevronRight color={c.muted} size={18} />;
  const external = <ExternalLink color={c.muted} size={16} />;
  // Website pages open already signed in (see lib/web.ts).
  const web = (path: `/dashboard${string}`) => void openDashboard(path);

  const planName = sub.data?.package && typeof sub.data.package === "object" && "name" in sub.data.package ? String(sub.data.package.name) : "";
  // A trial started at sign-up has no subscription row, so it's read from the trial itself.
  const trialLive = trial.data?.status === "active" || trial.data?.status === "expiring_soon";
  const planLine = sub.data?.isActive && sub.data.packageId !== 7
    ? `${planName || "Plan"} · valid till ${dateLabel(sub.data.currentPeriodEnd)}`
    : trialLive
      ? `Free trial · ${trial.data?.daysLeft ?? 0} day${trial.data?.daysLeft === 1 ? "" : "s"} left`
      : sub.data ? `${planName || "Plan"} · expired` : "No active plan";

  const confirmSignOut = () => {
    if (Platform.OS === "web") { if (globalThis.confirm?.("Sign out of DigitalCarda on this device?")) void signOut(); return; }
    Alert.alert("Sign out?", "You can sign back in any time with your email and password.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const referral = async () => {
    if (!slug) return;
    try {
      await Share.share({ message: `I use DigitalCarda for my digital business card. Get 30 days free with my code ${slug}:\n${SITE_URL}/signup?ref=${encodeURIComponent(slug)}` });
    } catch { /* dismissed */ }
  };

  return (
    <Screen edgesTop>
      <AppText variant="title">More</AppText>

      <Pressable accessibilityRole="button" accessibilityLabel="Account and password" onPress={() => router.push("/account")}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Avatar uri={imageOf(customer?.photo) || imageOf(customer?.logo)} name={user?.fullName} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="heading" numberOfLines={1}>{user?.fullName || "My account"}</AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>{user?.email}</AppText>
          </View>
          {chevron}
        </Card>
      </Pressable>

      <SectionTitle>Grow</SectionTitle>
      <Card padded={false}>
        <Row first icon={<BarChart3 color={c.accentText} size={18} />} title="Insights" subtitle="Views, taps and where visitors come from" right={chevron} onPress={() => router.push("/insights")} />
        {alerts && alerts !== "unsupported" ? (
          <Row icon={<BellRing color={c.accentText} size={18} />} title="Enquiry alerts" subtitle={alertNote ?? (alerts === "granted" ? "On for this phone" : alerts === "denied" ? "Off — allow notifications in Settings" : "Get a notification the moment someone enquires")} right={alerts === "granted" ? <Chip label="On" tone="good" /> : chevron} onPress={turnOnAlerts} />
        ) : null}
        <Row icon={<Bell color={c.accentText} size={18} />} title="Notifications" right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{unread.data?.count ? <Chip label={String(unread.data.count)} tone="accent" /> : null}{chevron}</View>} onPress={() => router.push("/notifications")} />
        <Row icon={<Gift color={c.accentText} size={18} />} title="Refer & earn" subtitle={slug ? `Your code: ${slug}` : "Publish your card to get your code"} right={chevron} onPress={referral} />
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card padded={false}>
        <Row first icon={<CreditCard color={c.accentText} size={18} />} title="Plan" subtitle={planLine} right={chevron} onPress={() => router.push("/plan")} />
        <Row icon={<UserRound color={c.accentText} size={18} />} title="Account & password" subtitle="Your details, password and card link" right={chevron} onPress={() => router.push("/account")} />
        <Row icon={<Smartphone color={c.accentText} size={18} />} title="Signed-in devices" subtitle="See and sign out phones" right={chevron} onPress={() => router.push("/devices")} />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Moon color={c.accentText} size={18} />
          <AppText variant="label" style={{ flex: 1 }}>Light or dark</AppText>
        </View>
        <Segmented<Appearance> value={appearance} onChange={setAppearance} options={[
          { value: "system", label: "Phone setting" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" },
        ]} />
      </Card>

      <SectionTitle>On the website</SectionTitle>
      <Card padded={false}>
        <Row first icon={<Nfc color={c.accentText} size={18} />} title="NFC card & standee" subtitle="Order a tap-to-share card" right={external} onPress={() => web("/dashboard/nfc")} />
        <Row icon={<PenLine color={c.accentText} size={18} />} title="Email signature" subtitle="Your card in every email" right={external} onPress={() => web("/dashboard/signature")} />
        <Row icon={<Globe color={c.accentText} size={18} />} title="Full dashboard" subtitle="Every setting — opens signed in" right={external} onPress={() => web("/dashboard")} />
      </Card>

      <SectionTitle>Help</SectionTitle>
      <Card padded={false}>
        <Row first icon={<MessageCircle color={c.good} size={18} />} tint={c.goodWash} title="Chat with support" subtitle="WhatsApp, Mon–Sat" right={chevron}
          onPress={() => void Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi DigitalCarda, I need help with the app")}`)} />
        <Row icon={<LogOut color={c.bad} size={18} />} tint={c.badWash} title="Sign out" onPress={confirmSignOut} />
        <Row icon={<UserX color={c.bad} size={18} />} tint={c.badWash} title="Delete account" subtitle="Takes your card offline and erases your data" right={chevron} onPress={() => router.push("/delete-account")} />
      </Card>

      <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
        DigitalCarda {Constants.expoConfig?.version ?? ""} · digitalcarda.in
      </AppText>
    </Screen>
  );
}
