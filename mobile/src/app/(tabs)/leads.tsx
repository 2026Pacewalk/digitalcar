import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download, Inbox, Search } from "lucide-react-native";
import { AppText, Chip, EmptyState, Loading } from "~/components/ui";
import { stageLabel, stageTone } from "~/lib/leads";
import { timeAgo } from "~/lib/format";
import { errorMessage, trpc } from "~/lib/trpc";
import { shareLeadsCsv } from "~/lib/leadExport";
import * as haptics from "~/lib/haptics";
import { fonts, radius, space, useTheme } from "~/theme";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "follow_up", label: "Follow-up" },
  { id: "contacted", label: "Contacted" },
  { id: "converted", label: "Won" },
] as const;

export default function LeadsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const utils = trpc.useUtils();
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const stats = trpc.lead.stats.useQuery();
  const list = trpc.lead.list.useQuery({ status: filter, search: search || undefined, limit: 100 });
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); try { await Promise.all([list.refetch(), stats.refetch()]); } finally { setRefreshing(false); } };

  // The enquiries on screen (this filter and search), as a spreadsheet.
  const exportLeads = async () => {
    setExporting(true);
    setExportNote(null);
    try {
      const all = await utils.lead.list.fetch({ status: filter, search: search || undefined, limit: 1000 });
      if (!all.leads.length) { setExportNote("No enquiries to export here."); return; }
      const r = await shareLeadsCsv(all.leads);
      if (!r.ok) setExportNote(r.message); else haptics.success();
    } catch (e) {
      setExportNote(errorMessage(e, "Couldn't export. Try again."));
    } finally {
      setExporting(false);
    }
  };

  const counts: Record<string, number | undefined> = { all: stats.data?.total, new: stats.data?.new, follow_up: stats.data?.followUp, converted: stats.data?.converted };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <AppText variant="title">Leads</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
            {stats.data?.followUpsDue ? <AppText variant="label" tone="accent">{stats.data.followUpsDue} follow-up{stats.data.followUpsDue === 1 ? "" : "s"} due</AppText> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Export these enquiries as a spreadsheet" hitSlop={10} disabled={exporting} onPress={() => void exportLeads()}>
              {exporting ? <ActivityIndicator size="small" color={c.muted} /> : <Download color={c.ink} size={20} />}
            </Pressable>
          </View>
        </View>
        {exportNote ? <AppText variant="caption" tone="bad">{exportNote}</AppText> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.rule, paddingHorizontal: space.md, height: 46 }}>
          <Search color={c.muted} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, phone, email, company"
            placeholderTextColor={c.muted}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, color: c.ink, fontFamily: fonts.body, fontSize: 16 }}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md }} style={{ flexGrow: 0 }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={counts[f.id] != null ? `${f.label} ${counts[f.id]}` : f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {list.isLoading ? <Loading /> : (
        <FlatList
          data={list.data?.leads ?? []}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon={<Inbox color={c.muted} size={34} />}
              title={search ? "No matching enquiries" : filter === "all" ? "No enquiries yet" : "Nothing here"}
              body={search ? "Try a different name, number or email." : filter === "all" ? "When someone sends an enquiry from your card, it appears here." : "Enquiries with this status appear here."}
            />
          }
          renderItem={({ item: l }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => { haptics.tap(); router.push({ pathname: "/lead/[id]", params: { id: String(l.id) } }); }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? c.surfaceAlt : c.surface, borderRadius: radius.lg, padding: space.lg, gap: 6,
                borderWidth: StyleSheet.hairlineWidth, borderColor: c.rule,
                borderLeftWidth: l.status === "new" ? 3 : StyleSheet.hairlineWidth, borderLeftColor: l.status === "new" ? c.accent : c.rule,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{l.fullName}</AppText>
                <AppText variant="caption" tone="muted">{timeAgo(l.createdAt)}</AppText>
              </View>
              {l.message ? <AppText variant="caption" tone="ink2" numberOfLines={2}>{l.message}</AppText> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Chip label={stageLabel(l.status)} tone={stageTone(l.status)} />
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{[l.phone, l.company].filter(Boolean).join(" · ")}</AppText>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
