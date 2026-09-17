import { Tabs } from "expo-router";
import { Home, LayoutGrid, Mail, QrCode, WandSparkles } from "lucide-react-native";
import { fonts, useTheme } from "~/theme";
import { trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";

/* The same five tabs as the mobile website: Home · Edit · Share · Leads · More. */
export default function TabsLayout() {
  const { c } = useTheme();
  const { data: leadStats } = trpc.lead.stats.useQuery(undefined, { refetchInterval: 60_000 });
  const newLeads = leadStats?.new ?? 0;

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.rule },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: c.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="edit" options={{ title: "Edit", tabBarIcon: ({ color, size }) => <WandSparkles color={color} size={size} /> }} />
      <Tabs.Screen name="share" options={{ title: "Share", tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} /> }} />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
          tabBarBadge: newLeads > 0 ? (newLeads > 99 ? "99+" : newLeads) : undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentInk, fontFamily: fonts.semibold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }} />
    </Tabs>
  );
}
