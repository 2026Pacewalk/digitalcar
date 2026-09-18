import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus, Trash2 } from "lucide-react-native";
import { AppText } from "~/components/ui";
import { pickCardImage, type ImageKind, type PickSource } from "~/lib/images";
import { imageOf } from "~/lib/card";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/** Asks where the picture should come from; the web preview goes straight to files. */
export function chooseSource(title: string, pick: (source: PickSource) => void) {
  if (Platform.OS === "web") { pick("library"); return; }
  Alert.alert(title, undefined, [
    { text: "Choose from photos", onPress: () => pick("library") },
    { text: "Take a photo", onPress: () => pick("camera") },
    { text: "Cancel", style: "cancel" },
  ]);
}

/* One picture on a card item — a service photo, a payment QR — with add,
   change and remove. The parent decides when it is saved. */
export function ImageField({ value, onChange, kind, label, size = 148, onError }: {
  value: string; onChange: (dataUrl: string) => void; kind: ImageKind; label: string; size?: number;
  onError?: (message: string) => void;
}) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const uri = imageOf(value);

  const pick = (source: PickSource) => {
    void (async () => {
      setBusy(true);
      try {
        const r = await pickCardImage(kind, source);
        if (r.ok) { haptics.tap(); onChange(r.dataUrl); }
        else if (r.reason !== "cancelled") onError?.(r.message ?? "Couldn't use that image.");
      } finally { setBusy(false); }
    })();
  };

  return (
    <View style={{ alignItems: "center", gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? `Change ${label}` : `Add ${label}`}
        onPress={() => chooseSource(uri ? `Change ${label}` : `Add ${label}`, pick)}
        style={{
          width: size, height: size, borderRadius: radius.lg, overflow: "hidden",
          borderWidth: uri ? 0 : 1.5, borderStyle: "dashed", borderColor: c.rule,
          backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center",
        }}
      >
        {uri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit={kind === "qr" ? "contain" : "cover"} /> : (
          <View style={{ alignItems: "center", gap: 6, paddingHorizontal: space.md }}>
            <ImagePlus color={c.accentText} size={26} />
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>Add {label}</AppText>
          </View>
        )}
        {busy ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.35)" }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </Pressable>
      {uri ? (
        <View style={{ flexDirection: "row", gap: space.lg }}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => chooseSource(`Change ${label}`, pick)}>
            <AppText variant="label" tone="accent">Change</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={8} onPress={() => onChange("")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Trash2 color={c.bad} size={14} />
            <AppText variant="label" tone="bad">Remove</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
