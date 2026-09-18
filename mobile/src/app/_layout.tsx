import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { createQueryClient, createTrpcClient, trpc } from "~/lib/trpc";
import { AuthProvider, useAuth } from "~/lib/auth";
import { refreshPushRegistration, useNotificationRouting } from "~/lib/push";
import { SITE_URL } from "~/lib/config";
import { AppText, Button } from "~/components/ui";
import { AppearanceProvider, fonts, space, useTheme } from "~/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(createTrpcClient);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator ready={fontsLoaded || !!fontError} />
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

/** "1.2.10" vs "1.2.9" — numeric, part by part. */
const olderThan = (a: string, b: string) => {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
};

function RootNavigator({ ready }: { ready: boolean }) {
  const { status } = useAuth();
  const { c, isDark } = useTheme();
  const config = trpc.mobile.config.useQuery(undefined, { staleTime: 6 * 60 * 60 * 1000, retry: false });
  const settled = ready && status !== "loading";
  const signedIn = status === "signedIn";

  useEffect(() => { if (settled) void SplashScreen.hideAsync(); }, [settled]);
  useEffect(() => { if (signedIn) void refreshPushRegistration(); }, [signedIn]);
  useNotificationRouting(settled && signedIn);

  if (!settled) return null;

  const version = Constants.expoConfig?.version ?? "0.0.0";
  if (config.data && olderThan(version, config.data.minVersion)) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, justifyContent: "center", padding: space.xl, gap: space.lg }}>
        <AppText variant="display">Time to update</AppText>
        <AppText tone="muted">This version of DigitalCarda ({version}) no longer works with your account. Update to the latest version to keep going — your card and leads are safe.</AppText>
        <Button title="Update DigitalCarda" onPress={() => void Linking.openURL(SITE_URL)} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.ground },
          headerTintColor: c.ink,
          headerTitleStyle: { fontFamily: fonts.heading },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.ground },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="qr" options={{ presentation: "fullScreenModal", headerShown: false, animation: "fade" }} />
          <Stack.Screen name="lead/[id]" options={{ title: "Enquiry" }} />
          <Stack.Screen name="insights" options={{ title: "Insights" }} />
          <Stack.Screen name="designs" options={{ title: "Designs" }} />
          <Stack.Screen name="card/services" options={{ title: "Services & offers" }} />
          <Stack.Screen name="card/service/[id]" options={{ title: "Service" }} />
          <Stack.Screen name="card/media" options={{ title: "Photos & videos" }} />
          <Stack.Screen name="card/payments" options={{ title: "Payments" }} />
          <Stack.Screen name="card/social" options={{ title: "Social links & reviews" }} />
          <Stack.Screen name="card/sections" options={{ title: "Sections on your card" }} />
          <Stack.Screen name="preview" options={{ title: "Preview" }} />
          <Stack.Screen name="card/link" options={{ title: "Card link" }} />
          <Stack.Screen name="card/ai" options={{ title: "Write with AI" }} />
          <Stack.Screen name="account" options={{ title: "Account & password" }} />
          <Stack.Screen name="plan" options={{ title: "Your plan" }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="devices" options={{ title: "Signed-in devices" }} />
          <Stack.Screen name="delete-account" options={{ title: "Delete account" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
