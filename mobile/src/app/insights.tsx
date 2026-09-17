import { useState } from "react";
import { View } from "react-native";
import { AppText, Card, Chip, EmptyState, Loading, Screen, SectionTitle } from "~/components/ui";
import { compact } from "~/lib/format";
import { groupedActions, totalActions } from "~/lib/insights";
import { trpc } from "~/lib/trpc";
import { space, useTheme } from "~/theme";

export default function Insights() {
  const { c } = useTheme();
  const [range, setRange] = useState<"7" | "30" | "all">("30");
  const stats = trpc.publish.myStats.useQuery();
  const [refreshing, setRefreshing] = useState(false);

  if (stats.isLoading) return <Loading />;
  const d = stats.data;
  if (!d?.slug) return <Screen><EmptyState title="No insights yet" body="Publish your card and share it — views and taps show up here." /></Screen>;

  const daily = "daily" in d ? d.daily ?? [] : [];
  const last7 = daily.slice(-7);
  const views = range === "7" ? last7.reduce((n, x) => n + x.views, 0)
    : range === "30" ? daily.reduce((n, x) => n + x.views, 0)
    : Number(d.total.view ?? 0);
  // Per-type counts exist for 30 days and all time; the 7-day view uses 30.
  const counts: Record<string, number> = range === "all" ? d.total : d.last30;
  const bars = range === "7" ? last7 : daily;
  const peak = Math.max(1, ...bars.map((x) => x.views));
  const actions = groupedActions(counts);
  const maxAction = Math.max(1, ...actions.map((a) => a.n));

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await stats.refetch(); } finally { setRefreshing(false); } }}>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Chip label="7 days" selected={range === "7"} onPress={() => setRange("7")} />
        <Chip label="30 days" selected={range === "30"} onPress={() => setRange("30")} />
        <Chip label="All time" selected={range === "all"} onPress={() => setRange("all")} />
      </View>

      <View style={{ flexDirection: "row", gap: space.md }}>
        <Card style={{ flex: 1 }}><AppText variant="display">{compact(views)}</AppText><AppText variant="caption" tone="muted">Card views</AppText></Card>
        <Card style={{ flex: 1 }}><AppText variant="display">{compact(totalActions(counts))}</AppText><AppText variant="caption" tone="muted">Visitor actions{range === "7" ? " · 30 days" : ""}</AppText></Card>
      </View>

      {range !== "all" && bars.length ? (
        <>
          <SectionTitle>Views per day</SectionTitle>
          <Card>
            <View accessibilityLabel={`Views per day, highest ${peak}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: range === "7" ? 10 : 3, height: 120 }}>
              {bars.map((x) => (
                <View key={x.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  {range === "7" ? <AppText variant="caption" tone="muted">{x.views}</AppText> : null}
                  <View style={{ width: "100%", height: Math.max(3, (x.views / peak) * (range === "7" ? 90 : 110)), borderRadius: 3, backgroundColor: x.views ? c.accent : c.surfaceAlt }} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.sm }}>
              <AppText variant="caption" tone="muted">{shortDate(bars[0].date)}</AppText>
              <AppText variant="caption" tone="muted">Today</AppText>
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle>What visitors did{range === "7" ? " · last 30 days" : ""}</SectionTitle>
      <Card style={{ gap: space.md }}>
        {actions.length ? actions.map((a) => (
          <View key={a.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="label">{a.label}</AppText>
              <AppText variant="label" tone="ink2">{compact(a.n)}</AppText>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt }}>
              <View style={{ height: 6, borderRadius: 3, width: `${(a.n / maxAction) * 100}%`, backgroundColor: c.accent }} />
            </View>
          </View>
        )) : <AppText tone="muted">No taps yet in this period. Share your card to get people calling and messaging you.</AppText>}
      </Card>
    </Screen>
  );
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
