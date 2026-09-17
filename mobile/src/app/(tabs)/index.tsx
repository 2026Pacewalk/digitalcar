import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Bell, ChevronRight, Copy, Eye, PenLine, QrCode, Share2, Sparkles } from "lucide-react-native";
import { ActionTile, AppText, Avatar, Banner, Button, Card, Chip, EmptyState, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { completeness, imageOf, useRefreshCard, useSnapshot } from "~/lib/card";
import { cardUrl, SITE_URL } from "~/lib/config";
import { compact, dateLabel, displayUrl, firstName, timeAgo } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import { useAuth } from "~/lib/auth";
import { shareCard } from "~/lib/share";
import { totalActions } from "~/lib/insights";
import * as haptics from "~/lib/haptics";
import { AlertsPrompt } from "~/components/AlertsPrompt";
import { radius, space, useTheme } from "~/theme";

export default function HomeScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRefreshCard();

  const snapshot = useSnapshot();
  const mine = trpc.publish.mine.useQuery();
  const stats = trpc.publish.myStats.useQuery();
  const sub = trpc.subscription.mySubscription.useQuery();
  const trial = trpc.trial.me.useQuery();
  const leadStats = trpc.lead.stats.useQuery();
  const recent = trpc.lead.list.useQuery({ limit: 3 });
  const unread = trpc.notification.unreadCount.useQuery(undefined, { refetchInterval: 60_000 });

  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };

  if (snapshot.isLoading || mine.isLoading) return <Loading />;

  const snap = snapshot.data;
  const customer = snap?.data.customer;
  const slug = mine.data?.slug || snap?.slug || "";
  const name = String(customer?.name || user?.fullName || "");
  const role = [customer?.designation, customer?.company_name].map((v) => String(v || "").trim()).filter(Boolean).join(" · ");
  const photo = imageOf(customer?.photo) || imageOf(customer?.logo);
  const score = completeness(snap);

  const views30 = Number(stats.data?.last30?.view ?? 0);
  const taps30 = totalActions(stats.data?.last30);
  const daily = stats.data && "daily" in stats.data ? stats.data.daily ?? [] : [];
  const peak = Math.max(1, ...daily.map((d) => d.views));

  const plan = planStatus(sub.data, trial.data);

  return (
    <Screen edgesTop refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">Namaste{firstName(name) ? `, ${firstName(name)}` : ""}</AppText>
          <AppText variant="title">Your card</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => { haptics.tap(); router.push("/notifications"); }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.rule }}>
          <Bell color={c.ink} size={20} />
          {(unread.data?.count ?? 0) > 0 ? <View style={{ position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: c.accent, borderWidth: 1.5, borderColor: c.surface }} /> : null}
        </Pressable>
      </View>

      {!slug ? (
        <Card>
          <EmptyState
            icon={<Sparkles color={c.accentText} size={32} />}
            title="Let's publish your card"
            body="Your account doesn't have a published card yet. Create it on the website in about five minutes — it appears here as soon as it's live."
            action={<Button title="Create my card" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/dashboard/build`)} />}
          />
        </Card>
      ) : (
        <>
          {/* Card at a glance */}
          <View style={{ backgroundColor: c.hero, borderRadius: radius.xl, padding: space.lg, gap: space.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar uri={photo} name={name} size={58} ring={c.accent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="heading" tone="hero" numberOfLines={1}>{name || "Your name"}</AppText>
                {role ? <AppText variant="caption" tone="heroMuted" numberOfLines={1}>{role}</AppText> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: plan.live ? "#4ADE80" : "#F87171" }} />
                  <AppText variant="caption" tone="heroMuted">{plan.live ? "Live" : "Paused"} · {displayUrl(cardUrl(slug))}</AppText>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Copy card link" hitSlop={10}
                onPress={async () => { await Clipboard.setStringAsync(cardUrl(slug)); haptics.success(); }}>
                <Copy color={c.heroMuted} size={20} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <ActionTile onHero icon={<Eye color={c.accent} size={20} />} label="View" onPress={() => void WebBrowser.openBrowserAsync(cardUrl(slug))} />
              <ActionTile onHero icon={<PenLine color={c.accent} size={20} />} label="Edit" onPress={() => router.push("/edit")} />
              <ActionTile onHero icon={<Share2 color={c.accent} size={20} />} label="Share" onPress={() => void shareCard(slug, name)} />
              <ActionTile onHero icon={<QrCode color={c.accent} size={20} />} label="QR" onPress={() => router.push("/qr")} />
            </View>
          </View>

          {plan.banner ? <Banner tone={plan.banner.tone} title={plan.banner.title} body={plan.banner.body} /> : null}

          <AlertsPrompt />

          {/* Last 30 days */}
          <SectionTitle action={<Pressable onPress={() => router.push("/insights")} hitSlop={8}><AppText variant="label" tone="accent">Insights</AppText></Pressable>}>Last 30 days</SectionTitle>
          <Card>
            <View style={{ flexDirection: "row" }}>
              <Stat label="Views" value={compact(views30)} />
              <Stat label="Visitor actions" value={compact(taps30)} />
              <Stat label="New enquiries" value={compact(leadStats.data?.new ?? 0)} />
            </View>
            {daily.length ? (
              <View accessibilityLabel={`Daily views for the last 30 days, peak ${peak}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 44, marginTop: space.lg }}>
                {daily.map((d) => (
                  <View key={d.date} style={{ flex: 1, height: Math.max(3, (d.views / peak) * 44), borderRadius: 2, backgroundColor: d.views ? c.accent : c.surfaceAlt }} />
                ))}
              </View>
            ) : null}
          </Card>

          {/* Next step */}
          {score.next ? (
            <>
              <SectionTitle>Finish your card · {score.percent}%</SectionTitle>
              <Card padded={false}>
                <View style={{ height: 4, backgroundColor: c.surfaceAlt }}>
                  <View style={{ height: 4, width: `${score.percent}%`, backgroundColor: c.accent }} />
                </View>
                <Row
                  first
                  icon={<Sparkles color={c.accentText} size={18} />}
                  title={score.next.label}
                  subtitle={score.next.hint}
                  right={<ChevronRight color={c.muted} size={18} />}
                  onPress={() => score.next!.inApp ? router.push("/edit") : void WebBrowser.openBrowserAsync(`${SITE_URL}/dashboard/build`)}
                />
              </Card>
            </>
          ) : null}

          {/* Latest enquiries */}
          <SectionTitle action={<Pressable onPress={() => router.push("/leads")} hitSlop={8}><AppText variant="label" tone="accent">All leads</AppText></Pressable>}>Latest enquiries</SectionTitle>
          <Card padded={false}>
            {recent.data?.leads.length ? recent.data.leads.map((l, i) => (
              <Row
                key={l.id}
                first={i === 0}
                title={l.fullName}
                subtitle={l.message || l.phone || l.email || ""}
                right={<View style={{ alignItems: "flex-end", gap: 4 }}>
                  <AppText variant="caption" tone="muted">{timeAgo(l.createdAt)}</AppText>
                  {l.status === "new" ? <Chip label="New" tone="accent" /> : null}
                </View>}
                onPress={() => router.push({ pathname: "/lead/[id]", params: { id: String(l.id) } })}
              />
            )) : (
              <View style={{ padding: space.lg }}>
                <AppText tone="muted">No enquiries yet. Share your card — enquiries from it land here.</AppText>
              </View>
            )}
          </Card>

          {plan.renewsOn ? <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>{plan.label} · valid till {plan.renewsOn}</AppText> : null}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

type Sub = { isActive: boolean; currentPeriodEnd: Date | string; packageId: number; package?: { name?: string } | null } | null | undefined;
type Trial = { status: string; daysLeft: number } | null | undefined;

/** One place that turns plan + trial into what the owner needs to know. */
function planStatus(sub: Sub, trial: Trial) {
  const label = sub?.package?.name ? `${sub.package.name} plan` : "Your plan";
  const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / 86_400_000) : 0;
  const onTrial = sub?.packageId === 7 || trial?.status === "active" || trial?.status === "expiring_soon";
  const live = !!sub?.isActive || trial?.status === "active" || trial?.status === "expiring_soon" || trial?.status === "grace";

  let banner: { tone: "warn" | "bad"; title: string; body: string } | null = null;
  if (!live) {
    banner = { tone: "bad", title: "Your card is paused", body: "Renew your plan to bring it back online. Visitors currently see a paused notice." };
  } else if (onTrial && daysLeft <= 7) {
    banner = { tone: "warn", title: `Free trial ends in ${Math.max(daysLeft, 0)} day${daysLeft === 1 ? "" : "s"}`, body: "Choose Gold or Platinum so your card stays live." };
  } else if (daysLeft > 0 && daysLeft <= 7) {
    banner = { tone: "warn", title: `${label} ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, body: "Renew early so your card never goes offline." };
  }
  return { live, label, banner, renewsOn: end && live ? dateLabel(end) : "" };
}
