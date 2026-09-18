import { useMemo, useState, type ReactNode } from "react";
import { Alert, FlatList, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Eye, Lock, Palette } from "lucide-react-native";
import { AppText, Banner, Button, Chip, EmptyState, Loading } from "~/components/ui";
import { SNAPSHOT_KEY, useSnapshot } from "~/lib/card";
import { cardUrl, PURCHASE_LINKS, SITE_URL } from "~/lib/config";
import { errorMessage, trpc } from "~/lib/trpc";
import { useOpenDashboard } from "~/lib/web";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* Choose the card's design. Thumbnails are the catalogue's own mockups; a
   sample of each design opens as a working demo card; Apply updates the live
   card straight away — the same write the website's Templates page makes. */

const CATS = [
  ["all", "All"], ["featured", "Featured"], ["basic", "Basic"], ["modern", "Modern"],
  ["bio", "Link-in-bio"], ["professional", "Professional"], ["premium", "Premium"],
] as const;
type Cat = (typeof CATS)[number][0];

type Design = {
  id: number; name: string; style: number; primary: string; secondary: string;
  category: string; featured: boolean;
  thumb: string | null; demoSlug: string | null;
  addon: "id_card" | "membership" | null;
};

// The ID Card (49) and Membership Card (50) designs are paid add-ons.
const addonFor = (style: number) => (style === 49 ? "id_card" : style === 50 ? "membership" : null);
const THUMB_RATIO = 1149 / 1369;

export default function DesignsScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const snapshot = useSnapshot();
  const presets = trpc.template.presets.useQuery();
  const catalogue = trpc.product.catalogue.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const addons = trpc.addon.mine.useQuery(undefined, { retry: false });
  const apply = trpc.publish.updateDesign.useMutation();
  const openDashboard = useOpenDashboard();

  const [cat, setCat] = useState<Cat>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [applied, setApplied] = useState<{ title: string; live: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const designs = useMemo<Design[]>(() => {
    const byStyle = new Map((catalogue.data ?? []).map((p) => [p.styleNumber, p]));
    return (presets.data?.list ?? []).filter((p) => p.active).map((p) => {
      const product = byStyle.get(p.style);
      const img = Array.isArray(product?.images) ? String((product.images as unknown[])[0] ?? "") : "";
      return {
        id: p.id, name: p.name, style: p.style, primary: p.primary, secondary: p.secondary,
        category: p.category ?? "modern", featured: !!p.featured,
        thumb: img ? (img.startsWith("http") ? img : `${SITE_URL}${img}`) : null,
        demoSlug: product?.slug ?? null,
        addon: addonFor(p.style),
      };
    });
  }, [presets.data, catalogue.data]);

  const owned = useMemo(() => new Set((addons.data ?? []).map((a) => a.type)), [addons.data]);
  const locked = (d: Design) => !!d.addon && !owned.has(d.addon);

  // The design live on the card: same style and colour, else same style.
  const customer = snapshot.data?.data.customer;
  const currentId = useMemo(() => {
    const theme = Number(customer?.theme);
    if (!theme) return null;
    const colour = String(customer?.color ?? "").toLowerCase();
    return (designs.find((d) => d.style === theme && d.primary.toLowerCase() === colour)
      ?? designs.find((d) => d.style === theme))?.id ?? null;
  }, [designs, customer?.theme, customer?.color]);

  const visible = useMemo(() => designs.filter((d) =>
    cat === "all" ? true : cat === "featured" ? d.featured : d.category === cat), [designs, cat]);
  const count = (k: Cat) => k === "all" ? designs.length : k === "featured" ? designs.filter((d) => d.featured).length : designs.filter((d) => d.category === k).length;

  const selected = designs.find((d) => d.id === selectedId) ?? null;
  // Re-applying the design on the card is still an action when its colours were customised.
  const liveExactly = (d: Design) => String(customer?.theme) === String(d.style)
    && String(customer?.color ?? "").toLowerCase() === d.primary.toLowerCase()
    && String(customer?.color2 ?? "").toLowerCase() === d.secondary.toLowerCase();
  const pending = selected && !liveExactly(selected) ? selected : null;

  if (snapshot.isLoading || presets.isLoading) return <Loading />;
  if (!snapshot.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, justifyContent: "center", padding: space.xl }}>
        <EmptyState icon={<Palette color={c.accentText} size={32} />} title="Publish your card first"
          body="Designs apply to your live card. Create it on the website — then pick designs here any time." />
      </View>
    );
  }

  const gap = space.md;
  const tileW = (width - space.lg * 2 - gap) / 2;

  const choose = (d: Design) => {
    setError(null);
    if (locked(d)) {
      const open = () => void openDashboard("/dashboard/subscription");
      if (!PURCHASE_LINKS) {
        const note = `${d.name} is an add-on design that isn't part of your plan.`;
        if (Platform.OS === "web") globalThis.alert?.(note); else Alert.alert("Add-on design", note);
        return;
      }
      const body = `${d.name} is an add-on. Add it to your plan on digitalcarda.in to use this design.`;
      if (Platform.OS === "web") { if (globalThis.confirm?.(`${body}\n\nOpen your plan?`)) open(); return; }
      Alert.alert("Add-on design", body, [{ text: "Not now", style: "cancel" }, { text: "See plans", onPress: open }]);
      return;
    }
    haptics.tap();
    setApplied(null);
    setSelectedId(d.id);
  };

  const applySelected = async () => {
    if (!pending) return;
    setError(null);
    try {
      const r = await apply.mutateAsync({
        cardId: snapshot.data?.cardId || 1, theme: String(pending.style), color: pending.primary, color2: pending.secondary,
      });
      await qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
      haptics.success();
      setApplied(r.published
        ? { title: `${pending.name} is live on your card`, live: true }
        : { title: `${pending.name} saved`, live: false });
      setSelectedId(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const slug = snapshot.data.slug;
  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <AppText tone="muted">Tap a design, look at a sample, then apply it. Your details, photo and links stay exactly as they are.</AppText>
      {applied ? (
        <Banner tone="good" title={applied.title} body={applied.live ? "Visitors and your QR code already see the new design." : "Publish your card on the website to show it."}
          action={<Button size="md" kind="secondary" style={{ marginTop: 6, alignSelf: "flex-start" }} title="View my card" onPress={() => void WebBrowser.openBrowserAsync(cardUrl(slug))} />} />
      ) : null}
      {error ? <Banner tone="bad" title="Couldn't apply that design" body={error} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
        style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
        {CATS.filter(([k]) => k === "all" || count(k) > 0).map(([k, label]) => (
          <Chip key={k} label={`${label} ${count(k)}`} selected={cat === k} onPress={() => setCat(k)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <FlatList
        data={visible}
        key="grid"
        numColumns={2}
        keyExtractor={(d) => String(d.id)}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ padding: space.lg, gap, paddingBottom: (pending ? 120 : space.xxl) + insets.bottom }}
        renderItem={({ item: d }) => (
          <DesignTile
            design={d} width={tileW}
            current={d.id === currentId} selected={d.id === selectedId} locked={locked(d)}
            onPress={() => choose(d)}
          />
        )}
      />

      {pending ? (
        <View style={{
          position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surface,
          borderTopWidth: 1, borderColor: c.rule, paddingHorizontal: space.lg, paddingTop: space.md,
          paddingBottom: insets.bottom + space.md, gap: space.sm,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Swatches primary={pending.primary} secondary={pending.secondary} />
            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{pending.name}</AppText>
            {pending.demoSlug ? (
              <Pressable accessibilityRole="link" hitSlop={8}
                onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/demo/${pending.demoSlug}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Eye color={c.accentText} size={16} />
                <AppText variant="label" tone="accent">See a sample</AppText>
              </Pressable>
            ) : null}
          </View>
          <Button title={`Apply ${pending.name}`} loading={apply.isPending} onPress={() => void applySelected()} />
        </View>
      ) : null}
    </View>
  );
}

function DesignTile({ design: d, width, current, selected, locked, onPress }: {
  design: Design; width: number; current: boolean; selected: boolean; locked: boolean; onPress: () => void;
}) {
  const { c } = useTheme();
  const [fallback, setFallback] = useState(false);
  // Catalogue images are large PNGs; most have a small WebP beside them.
  const uri = d.thumb ? (fallback ? d.thumb : d.thumb.replace(/\.png$/i, ".webp")) : null;
  const ring = selected ? c.accent : current ? c.good : c.rule;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.name}${current ? ", on your card now" : ""}${locked ? ", add-on" : ""}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ borderRadius: radius.lg, borderWidth: selected || current ? 2 : 1, borderColor: ring, overflow: "hidden", backgroundColor: c.surface }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", aspectRatio: THUMB_RATIO, backgroundColor: d.secondary }}
            contentFit="cover" transition={150} recyclingKey={String(d.id)}
            onError={() => { if (!fallback) setFallback(true); }} />
        ) : (
          <View style={{ width: "100%", aspectRatio: THUMB_RATIO, backgroundColor: d.secondary, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: "56%", aspectRatio: 0.56, borderRadius: 14, backgroundColor: d.primary, opacity: 0.9 }} />
          </View>
        )}
        {current || selected || locked ? (
          <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 }}>
            {current ? <Badge bg={c.good} fg="#fff" icon={<Check color="#fff" size={12} />} label="On your card" /> : null}
            {locked ? <Badge bg="rgba(15,23,42,0.82)" fg="#fff" icon={<Lock color="#fff" size={12} />} label="Add-on" /> : null}
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, paddingHorizontal: 2 }}>
        <Swatches primary={d.primary} secondary={d.secondary} small />
        <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{d.name}</AppText>
      </View>
    </Pressable>
  );
}

function Badge({ bg, fg, icon, label }: { bg: string; fg: string; icon: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      {icon}
      <AppText variant="caption" style={{ color: fg, fontSize: 11.5, lineHeight: 15 }}>{label}</AppText>
    </View>
  );
}

function Swatches({ primary, secondary, small }: { primary: string; secondary: string; small?: boolean }) {
  const { c } = useTheme();
  const s = small ? 10 : 14;
  return (
    <View style={{ flexDirection: "row" }}>
      {[primary, secondary].map((col, i) => (
        <View key={i} style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: col, borderWidth: 1, borderColor: c.rule, marginLeft: i ? -3 : 0 }} />
      ))}
    </View>
  );
}

