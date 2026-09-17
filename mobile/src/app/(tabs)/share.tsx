import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import QRCode from "react-native-qrcode-svg";
import { Check, Copy, ExternalLink, Maximize2, MessageCircle, Share2 } from "lucide-react-native";
import { AppText, Button, Card, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { cardUrl, qrUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { shareCard, shareOnWhatsApp } from "~/lib/share";
import { trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { brand, radius, space, useTheme } from "~/theme";

export default function ShareScreen() {
  const { c } = useTheme();
  const mine = trpc.publish.mine.useQuery();
  const snapshot = useSnapshot();
  const [copied, setCopied] = useState(false);

  if (mine.isLoading) return <Loading />;
  const slug = mine.data?.slug;
  const name = String(snapshot.data?.data.customer?.name || "");

  if (!slug) {
    return (
      <Screen edgesTop>
        <AppText variant="title">Share</AppText>
        <Card><AppText tone="muted">Publish your card first — its QR code and share link appear here.</AppText></Card>
      </Screen>
    );
  }

  const link = cardUrl(slug);
  const copy = async () => {
    await Clipboard.setStringAsync(link);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen edgesTop>
      <AppText variant="title">Share</AppText>

      <Pressable accessibilityRole="button" accessibilityLabel="Show QR code full screen" onPress={() => { haptics.tap(); router.push("/qr"); }}>
        <Card style={{ alignItems: "center", gap: space.md, paddingVertical: space.xl }}>
          <View style={{ padding: 14, backgroundColor: "#FFFFFF", borderRadius: radius.lg }}>
            <QRCode value={qrUrl(mine.data?.publicId, slug)} size={196} color={brand.navy} backgroundColor="#FFFFFF" ecl="M" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Maximize2 color={c.accentText} size={15} />
            <AppText variant="label" tone="accent">Tap to show full screen</AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>Scanning opens your card. This QR keeps working even if you change your card address.</AppText>
        </Card>
      </Pressable>

      <Card padded={false}>
        <Row
          first
          icon={copied ? <Check color={c.good} size={18} /> : <Copy color={c.accentText} size={18} />}
          title={displayUrl(link)}
          subtitle={copied ? "Copied" : "Tap to copy your card link"}
          onPress={copy}
        />
      </Card>

      <View style={{ gap: space.sm }}>
        <Button title="Send on WhatsApp" onPress={() => void shareOnWhatsApp(slug, name)} icon={<MessageCircle color={c.accentInk} size={20} />} />
        <Button kind="secondary" title="More ways to share" onPress={() => void shareCard(slug, name)} icon={<Share2 color={c.ink} size={20} />} />
      </View>

      <SectionTitle>Your card</SectionTitle>
      <Card padded={false}>
        <Row first icon={<ExternalLink color={c.accentText} size={18} />} title="Open my card" subtitle="See exactly what visitors see" onPress={() => void WebBrowser.openBrowserAsync(link)} />
      </Card>
    </Screen>
  );
}
