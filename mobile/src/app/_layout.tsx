import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { createQueryClient, createTrpcClient, trpc } from "~/lib/trpc";
import { AuthProvider, useAuth } from "~/lib/auth";
import { fonts, useTheme } from "~/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(createTrpcClient);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator ready={fontsLoaded || !!fontError} />
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { status } = useAuth();
  const { c, isDark } = useTheme();
  const settled = ready && status !== "loading";

  useEffect(() => { if (settled) void SplashScreen.hideAsync(); }, [settled]);
  if (!settled) return null;

  const signedIn = status === "signedIn";
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
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
