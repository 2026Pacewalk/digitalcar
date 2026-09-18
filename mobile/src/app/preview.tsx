import { createElement, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, RotateCw } from "lucide-react-native";
import { Banner, Loading } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { API_URL, cardUrl } from "~/lib/config";
import { space, useTheme } from "~/theme";

/* The live card, exactly as visitors see it. Edits in the app are saved to the
   live card straight away, so this is the real thing, not a mock-up. The
   `preview=app` flag keeps the owner's own looks out of their view count. */

export default function PreviewScreen() {
  const { c } = useTheme();
  const snapshot = useSnapshot();
  const [reloads, setReloads] = useState(0);
  const [loading, setLoading] = useState(true);

  if (snapshot.isLoading) return <Loading />;
  const slug = snapshot.data?.slug;
  if (!slug) {
    return <View style={{ flex: 1, padding: space.lg, backgroundColor: c.ground }}><Banner tone="info" title="Publish your card first" body="Your card isn't live yet." /></View>;
  }

  // A fresh address after every save (and on reload) so the latest version shows.
  const version = encodeURIComponent(snapshot.data?.updatedAt ?? "");
  // The card as the server this app talks to renders it (the live site in production).
  const uri = `${API_URL}/${slug}?preview=app&v=${version}-${reloads}`;

  const headerRight = () => (
    <View style={{ flexDirection: "row", gap: space.lg, alignItems: "center" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload" hitSlop={10} onPress={() => { setLoading(true); setReloads((n) => n + 1); }}>
        <RotateCw color={c.ink} size={20} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open in browser" hitSlop={10} onPress={() => void WebBrowser.openBrowserAsync(cardUrl(slug))}>
        <ExternalLink color={c.ink} size={20} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <Stack.Screen options={{ title: "Preview", headerRight }} />
      {Platform.OS === "web"
        // react-native-webview is native-only; the web build shows the same page in a frame.
        ? createElement("iframe", { key: uri, src: uri, title: "Card preview", onLoad: () => setLoading(false), style: { flex: 1, border: 0, width: "100%", height: "100%" } })
        : (
          <WebView
            key={uri}
            source={{ uri }}
            onLoadEnd={() => setLoading(false)}
            style={{ flex: 1, backgroundColor: c.ground }}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            // The card itself stays here; its buttons (WhatsApp, maps, websites) open in their own apps.
            onShouldStartLoadWithRequest={(req) => {
              if (!req.isTopFrame || req.url.startsWith(API_URL) || /^(about|data|blob):/i.test(req.url)) return true;
              void Linking.openURL(req.url).catch(() => undefined);
              return false;
            }}
          />
        )}
      {loading ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : null}
    </View>
  );
}
