import { Alert, Linking, Platform, Share, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { BarChart3, Bell, BellRing, ChevronRight, CreditCard, Gift, Globe, LogOut, MessageCircle, Nfc, PenLine, Smartphone, UserX } from "lucide-react-native";
import { AppText, Avatar, Card, Chip, Row, Screen, SectionTitle } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { SITE_URL, SUPPORT_WHATSAPP } from "~/lib/config";
import { dateLabel } from "~/lib/format";
import { useAuth } from "~/lib/auth";
import { trpc } from "~/lib/trpc";
import { enablePush, pushState, type PushState } from "~/lib/push";
import { space, useTheme } from "~/theme";

export default function MoreScreen() {
  const { c } = useTheme();
  const { user, signOut } = useAuth();
  const snapshot = useSnapshot();
  const mine = trpc.publish.mine.useQuery();
  const sub = trpc.subscription.mySubscription.useQuery();
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
  const web = (path: string) => void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);

  const planName = sub.data?.package && typeof sub.data.package === "object" && "name" in sub.data.package ? String(sub.data.package.name) : "";
  const planLine = sub.data
    ? `${planName || "Plan"} · ${sub.data.isActive ? `valid till ${dateLabel(sub.data.currentPeriodEnd)}` : "expired"}`
    : "No active plan";

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

      <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar uri={imageOf(customer?.photo) || imageOf(customer?.logo)} name={user?.fullName} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="heading" numberOfLines={1}>{user?.fullName || "My account"}</AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>{user?.email}</AppText>
        </View>
      </Card>

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
        <Row first icon={<CreditCard color={c.accentText} size={18} />} title="Plan" subtitle={planLine} right={chevron} onPress={() => web("/dashboard/subscription")} />
        <Row icon={<PenLine color={c.accentText} size={18} />} title="Email signature" subtitle="On digitalcarda.in" right={chevron} onPress={() => web("/dashboard/signature")} />
        <Row icon={<Nfc color={c.accentText} size={18} />} title="NFC card & standee" subtitle="On digitalcarda.in" right={chevron} onPress={() => web("/dashboard/nfc")} />
        <Row icon={<Globe color={c.accentText} size={18} />} title="Open full dashboard" subtitle="Every setting, on the website" right={chevron} onPress={() => web("/dashboard")} />
        <Row icon={<Smartphone color={c.accentText} size={18} />} title="Signed-in devices" subtitle="See and sign out phones" right={chevron} onPress={() => router.push("/devices")} />
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
