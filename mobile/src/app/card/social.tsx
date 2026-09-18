import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { AppText, Banner, Card, Chip, Field, Loading, Screen, SectionTitle, SwitchRow } from "~/components/ui";
import { SaveBadge } from "~/components/SaveBadge";
import { sectionOn, setFields, useCardUpdate } from "~/lib/cardStore";
import { MAX_WEBSITE_LINKS, SOCIAL_BY_KEY, SOCIAL_PLATFORMS, normaliseUrl, readSocialLinks, type SocialLink } from "~/lib/cardContent";
import { useCardFields } from "~/lib/useCardFields";
import { fonts, radius, space, useTheme } from "~/theme";

/* Social profiles and the Google review link. Links are kept as the website
   keeps them (a list, any platform once, up to six custom website links). */

const FIELDS = ["social_title", "google_review", "social_links"] as const;

export default function SocialScreen() {
  const { c } = useTheme();
  const { snapshot, draft, set, state, error } = useCardFields(FIELDS);
  const update = useCardUpdate();
  const [links, setLinks] = useState<SocialLink[] | null>(null);
  const edited = useRef(false);
  const inputs = useRef<Record<number, TextInput | null>>({});
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const customer = snapshot.data?.data.customer;
  // Follow the saved links until the owner starts editing them here.
  useEffect(() => {
    if (customer && !edited.current) setLinks(readSocialLinks(customer));
  }, [customer]);

  useEffect(() => {
    if (focusIndex != null) { inputs.current[focusIndex]?.focus(); setFocusIndex(null); }
  }, [focusIndex, links]);

  if (snapshot.isLoading) return <Loading />;
  if (!customer || !draft || !links) {
    return <Screen><Banner tone="info" title="Publish your card first" body="Social links appear on your live card. Publish it on digitalcarda.in, then add them here." /></Screen>;
  }

  const change = (next: SocialLink[]) => {
    edited.current = true;
    setLinks(next);
    const clean = next.filter((l) => l.platform && l.url.trim()).map((l) => ({ platform: l.platform, url: normaliseUrl(l.url) }));
    set("social_links", JSON.stringify(clean));
  };

  const used = new Set(links.map((l) => l.platform));
  const websites = links.filter((l) => l.platform === "website").length;
  const available = SOCIAL_PLATFORMS.filter((p) => (p.key === "website" ? websites < MAX_WEBSITE_LINKS : !used.has(p.key)));
  const iconStyle = customer.social_icon_style === "brand" ? "brand" : "theme";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>Saved as you type. Visitors tap an icon to open your profile.</AppText>
          <SaveBadge state={state} />
        </View>
        {state === "error" && error ? <Banner tone="bad" title="Not saved yet" body={error} /> : null}

        <SectionTitle>Your profiles</SectionTitle>
        <Card padded={false}>
          {links.length === 0 ? (
            <View style={{ padding: space.lg }}>
              <AppText tone="muted">No profiles yet. Tap a platform below to add one.</AppText>
            </View>
          ) : links.map((l, i) => {
            const p = SOCIAL_BY_KEY[l.platform];
            return (
              <View key={`${l.platform}-${i}`} style={{ padding: space.md, gap: 6, borderTopWidth: i ? 1 : 0, borderColor: c.rule }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p?.color ?? c.muted }} />
                  <AppText variant="label" style={{ flex: 1 }}>{p?.label ?? l.platform}</AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p?.label ?? l.platform}`} hitSlop={10}
                    onPress={() => change(links.filter((_, idx) => idx !== i))}>
                    <X color={c.muted} size={18} />
                  </Pressable>
                </View>
                <TextInput
                  ref={(el) => { inputs.current[i] = el; }}
                  value={l.url}
                  onChangeText={(url) => change(links.map((x, idx) => (idx === i ? { ...x, url } : x)))}
                  placeholder={p?.placeholder ?? "https://"}
                  placeholderTextColor={c.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  accessibilityLabel={`${p?.label ?? l.platform} link`}
                  style={{ height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.rule, backgroundColor: c.surface, color: c.ink, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15 }}
                />
              </View>
            );
          })}
        </Card>

        {available.length ? (
          <View style={{ gap: space.sm }}>
            <AppText variant="label" tone="ink2">Add a profile</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {available.map((p) => (
                <Chip key={p.key} label={`+ ${p.label}`} onPress={() => { change([...links, { platform: p.key, url: "" }]); setFocusIndex(links.length); }} />
              ))}
            </View>
          </View>
        ) : null}

        <SectionTitle>How they look</SectionTitle>
        <Card style={{ gap: space.md }}>
          <Field label="Heading above the icons" value={draft.social_title} onChangeText={(v) => set("social_title", v)} placeholder="Follow Us" />
          <View style={{ gap: space.sm }}>
            <AppText variant="label" tone="ink2">Icon colours</AppText>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Chip label="My card colour" selected={iconStyle === "theme"} onPress={() => void update(setFields({ social_icon_style: "theme" }))} />
              <Chip label="Brand colours" selected={iconStyle === "brand"} onPress={() => void update(setFields({ social_icon_style: "brand" }))} />
            </View>
          </View>
        </Card>

        <SectionTitle>Google reviews</SectionTitle>
        <Card padded={false}>
          <SwitchRow first title="Show reviews on my card" value={sectionOn(snapshot.data?.data, "review_on")}
            onChange={(v) => void update(setFields({ review_on: v ? 1 : 0 }))} />
          <View style={{ padding: space.lg, paddingTop: 0 }}>
            <Field label="Google review link" value={draft.google_review} onChangeText={(v) => set("google_review", v.trim())}
              autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://g.page/r/…/review"
              hint="Adds a Write-a-Review button. Find it in Google Business Profile → Ask for reviews." />
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
