import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BellOff } from "lucide-react-native";
import { AppText, EmptyState, Loading } from "~/components/ui";
import { SITE_URL } from "~/lib/config";
import { timeAgo } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import { useOpenDashboard } from "~/lib/web";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* Web dashboard links that have a screen in the app; the rest open the
   website already signed in. */
function openLink(link: string | null, openDashboard: (path: `/dashboard${string}`) => Promise<void>) {
  if (!link) return;
  if (link.startsWith("/dashboard/leads") || link.startsWith("/dashboard/enquiry")) { router.push("/leads"); return; }
  if (link.startsWith("/dashboard/analytics")) { router.push("/insights"); return; }
  if (link.startsWith("/dashboard/subscription") || link.startsWith("/dashboard/billing")) { router.push("/plan"); return; }
  if (link.startsWith("/dashboard/build")) { router.push("/edit"); return; }
  if (link === "/dashboard" || link.startsWith("/dashboard?")) { router.push("/"); return; }
  if (link.startsWith("/dashboard")) { void openDashboard(link as `/dashboard${string}`); return; }
  void WebBrowser.openBrowserAsync(link.startsWith("http") ? link : `${SITE_URL}${link}`);
}

export default function Notifications() {
  const { c } = useTheme();
  const openDashboard = useOpenDashboard();
  const utils = trpc.useUtils();
  const list = trpc.notification.list.useQuery({ limit: 50 });
  const markRead = trpc.notification.markRead.useMutation({ onSuccess: () => void utils.notification.invalidate() });
  const markAll = trpc.notification.markAllRead.useMutation({ onSuccess: () => { haptics.success(); void utils.notification.invalidate(); } });
  const [refreshing, setRefreshing] = useState(false);

  if (list.isLoading) return <Loading />;
  const items = list.data ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <>
      <Stack.Screen options={{
        headerRight: () => hasUnread ? (
          <Pressable accessibilityRole="button" onPress={() => markAll.mutate()} hitSlop={10}>
            <AppText variant="label" tone="accent">Mark all read</AppText>
          </Pressable>
        ) : null,
      }} />
      <FlatList
        style={{ backgroundColor: c.ground }}
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accent} colors={[c.accent]} onRefresh={async () => { setRefreshing(true); try { await list.refetch(); } finally { setRefreshing(false); } }} />}
        ListEmptyComponent={<EmptyState icon={<BellOff color={c.muted} size={32} />} title="You're all caught up" body="Enquiries, rewards and plan reminders appear here." />}
        renderItem={({ item: n }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => { haptics.tap(); if (!n.isRead) markRead.mutate({ id: n.id }); openLink(n.link, openDashboard); }}
            style={({ pressed }) => ({
              flexDirection: "row", gap: space.md, padding: space.lg, borderRadius: radius.lg,
              backgroundColor: pressed ? c.surfaceAlt : c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule,
            })}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.isRead ? "transparent" : c.accent }} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label" tone={n.isRead ? "ink2" : "ink"}>{n.title}</AppText>
              <AppText variant="caption" tone="muted">{n.message}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{timeAgo(n.createdAt)}</AppText>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}
