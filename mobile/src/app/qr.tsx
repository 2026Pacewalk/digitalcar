import { useEffect } from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import * as Brightness from "expo-brightness";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { AppText, Avatar } from "~/components/ui";
import { imageOf, useSnapshot } from "~/lib/card";
import { cardUrl, qrUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import { brand, fonts, space } from "~/theme";

/* Full-screen QR for showing across a table. Always white for the best scan,
   whatever the phone's theme, with the screen turned up while it's open. */
export default function QrScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mine = trpc.publish.mine.useQuery();
  const snapshot = useSnapshot();
  const customer = snapshot.data?.data.customer;

  useEffect(() => {
    if (Platform.OS === "web") return;
    // App-level brightness: no permission needed on either platform.
    let previous: number | null = null;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch { /* brightness control unavailable */ }
    })();
    return () => {
      if (Platform.OS === "android") void Brightness.restoreSystemBrightnessAsync().catch(() => {});
      else if (previous != null) void Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);

  const slug = mine.data?.slug;
  const size = Math.min(width - 72, 340);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: space.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF1F5", alignItems: "center", justifyContent: "center" }}>
          <X color={brand.navy} size={22} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl, paddingHorizontal: space.xl }}>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Avatar uri={imageOf(customer?.photo) || imageOf(customer?.logo)} name={String(customer?.name || "")} size={64} />
          <AppText variant="title" style={{ color: brand.navy, textAlign: "center" }}>{String(customer?.name || "")}</AppText>
          {customer?.designation || customer?.company_name ? (
            <AppText style={{ color: "#475569", textAlign: "center" }}>
              {[customer?.designation, customer?.company_name].filter(Boolean).join(" · ")}
            </AppText>
          ) : null}
        </View>

        {slug ? (
          <QRCode value={qrUrl(mine.data?.publicId, slug)} size={size} color={brand.navy} backgroundColor="#FFFFFF" ecl="M" />
        ) : (
          <AppText style={{ color: "#475569" }}>Publish your card to get its QR code.</AppText>
        )}

        {slug ? (
          <View style={{ alignItems: "center", gap: 4 }}>
            <AppText style={{ color: brand.navy, fontFamily: fonts.semibold }}>Scan to save my contact</AppText>
            <AppText variant="caption" style={{ color: "#64748B" }}>{displayUrl(cardUrl(slug))}</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
