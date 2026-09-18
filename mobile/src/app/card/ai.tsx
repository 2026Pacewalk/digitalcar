import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Globe, Sparkles, Wand2 } from "lucide-react-native";
import { AppText, Banner, Button, Card, Field, Loading, Screen, SectionTitle, Segmented } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { nextId, planLimit, useCardUpdate } from "~/lib/cardStore";
import { asList, normaliseUrl, readSocialLinks, SOCIAL_BY_KEY, type Product, type SocialLink } from "~/lib/cardContent";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

/* Write with AI: from the owner's own website, or from a few details. Every
   suggestion is shown with a tick box — nothing on the card changes until the
   owner picks what to use and taps "Add to my card". Mapping follows the
   website's AI generator (src/pages/public/AIGenerator.tsx). */

type Mode = "website" | "details";
type Service = { name: string; description: string };
type Suggestions = {
  source: "ai" | "smart";
  tagline: string; about: string; services: Service[]; cta: string;
  seoTitle: string; seoDescription: string;
  web?: { phone: string; email: string; address: string; url: string; socials: Record<string, string> };
};

const str = (v: unknown) => String(v ?? "").trim();
/** Website social keys → the card's platform keys. */
const SOCIAL_KEY: Record<string, string> = { twitter: "x", x: "x", facebook: "facebook", instagram: "instagram", linkedin: "linkedin", youtube: "youtube", pinterest: "pinterest", whatsapp: "whatsapp", telegram: "telegram", tiktok: "tiktok" };

export default function WriteWithAi() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const generate = trpc.ai.generate.useMutation();
  const fromWebsite = trpc.ai.fromWebsite.useMutation();

  const customer = snapshot.data?.data.customer;
  const [mode, setMode] = useState<Mode>(params.mode === "details" ? "details" : "website");
  const [url, setUrl] = useState<string | null>(null);
  const [business, setBusiness] = useState<string | null>(null);
  const [profession, setProfession] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [result, setResult] = useState<Suggestions | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The card's own details, until the owner types something else.
  const urlValue = url ?? str(customer?.url);
  const businessValue = business ?? (str(customer?.company_name) || str(customer?.name));
  const professionValue = profession ?? (str(customer?.nature) || str(customer?.designation));

  const data = snapshot.data?.data;
  const existingServices = asList<Product>(data?.products).filter((p) => !p.isOffer);
  const room = data ? Math.max(0, planLimit(data, "product") - existingServices.length) : 0;
  const cardLinks = useMemo(() => readSocialLinks(customer), [customer]);

  if (snapshot.isLoading) return <Loading />;
  if (!data || !customer) return <Screen><Banner tone="info" title="Publish your card first" body="Write with AI fills in your live card." /></Screen>;

  /* What each suggestion would change, and whether it starts ticked: on for
     empty parts of the card, off where the owner already wrote something. */
  const rows = result ? buildRows(result, customer, cardLinks, existingServices.length, room) : [];

  const run = async () => {
    setError(null); setDone(null); setResult(null);
    try {
      let r: Suggestions;
      if (mode === "website") {
        if (!urlValue) { setError("Enter your website address."); return; }
        const res = await fromWebsite.mutateAsync({ url: urlValue });
        r = { ...res, web: res.web };
      } else {
        if (!businessValue || !professionValue) { setError("Add your business name and what you do."); return; }
        r = await generate.mutateAsync({ businessName: businessValue.slice(0, 80), profession: professionValue.slice(0, 60), city: city.trim().slice(0, 60) || undefined });
      }
      setResult(r);
      setPicked(Object.fromEntries(buildRows(r, customer, cardLinks, existingServices.length, room).map((row) => [row.key, row.defaultOn])));
      haptics.success();
    } catch (e) {
      setError(errorMessage(e, mode === "website" ? "Couldn't read that website. Check the address, or use your details instead." : "Couldn't write suggestions just now. Try again in a moment."));
    }
  };

  const apply = async () => {
    if (!result) return;
    const chosen = rows.filter((r) => picked[r.key]);
    if (!chosen.length) { setError("Tick at least one suggestion."); return; }
    setSaving(true); setError(null);
    let added = 0;
    const r = await update((d) => {
      const customerPatch: Record<string, unknown> = {};
      let products = asList<Product>(d.products);
      let links = readSocialLinks(d.customer);
      let linksChanged = false;
      const roomNow = Math.max(0, planLimit(d, "product") - products.filter((p) => !p.isOffer).length);
      const services: Service[] = [];
      for (const row of chosen) {
        if (row.kind === "field") customerPatch[row.field] = row.value;
        else if (row.kind === "service") services.push(row.service);
        else if (row.kind === "social" && !links.some((l) => l.platform === row.link.platform)) { links = [...links, row.link]; linksChanged = true; }
      }
      if (customerPatch.about_us) customerPatch.about_on = 1;
      let id = nextId(products);
      const newItems = services.slice(0, roomNow).map((s) => ({
        id: id++, name: s.name.slice(0, 120), description: s.description.slice(0, 2000), filename: "",
        price: "", offer_price: "", button: "", button_title: result.cta || "Enquire Now", isOffer: false, valid: "",
      }));
      added = newItems.length;
      if (newItems.length) products = [...products, ...newItems];
      return {
        ...d, products,
        customer: { ...d.customer, ...customerPatch, ...(linksChanged ? { social_links: JSON.stringify(links) } : {}) },
      };
    });
    setSaving(false);
    if (!r.ok) { setError(r.message); return; }
    haptics.success();
    const skipped = chosen.filter((x) => x.kind === "service").length - added;
    setDone(`Added to your card${skipped > 0 ? ` · ${skipped} service${skipped === 1 ? "" : "s"} left out (plan limit)` : ""}.`);
    setResult(null);
  };

  const busy = generate.isPending || fromWebsite.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <AppText tone="muted">AI writes suggestions for your card. Nothing changes until you tick what to use.</AppText>
        {done ? (
          <Banner tone="good" title={done} body="Read it through before you share — AI can get details wrong."
            action={<Button size="md" kind="secondary" style={{ marginTop: 6, alignSelf: "flex-start" }} title="Preview my card" onPress={() => router.push("/preview")} />} />
        ) : null}

        <Segmented<Mode> value={mode} onChange={(m) => { setMode(m); setResult(null); setError(null); }} options={[
          { value: "website", label: "From my website" }, { value: "details", label: "From my details" },
        ]} />

        <Card style={{ gap: space.md }}>
          {mode === "website" ? (
            <>
              <Field label="Your website" value={urlValue} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url"
                placeholder="yourbusiness.com" hint="We read your site's public pages: about, services, contact details, social links." />
              <Button title={fromWebsite.isPending ? "Reading your website…" : "Read my website"} loading={fromWebsite.isPending} disabled={busy}
                icon={<Globe color={c.accentInk} size={18} />} onPress={() => void run()} />
            </>
          ) : (
            <>
              <Field label="Business name" value={businessValue} onChangeText={setBusiness} placeholder="e.g. Sharma Interiors" />
              <Field label="What you do" value={professionValue} onChangeText={setProfession} placeholder="e.g. Interior designer" />
              <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="e.g. Mohali" />
              <Button title={generate.isPending ? "Writing…" : "Write it for me"} loading={generate.isPending} disabled={busy}
                icon={<Wand2 color={c.accentInk} size={18} />} onPress={() => void run()} />
            </>
          )}
        </Card>

        {error ? <Banner tone="bad" title={error} /> : null}

        {result ? (
          <>
            <SectionTitle>Suggestions</SectionTitle>
            {result.source === "smart" ? <AppText variant="caption" tone="muted">Written from your details without AI writing — edit it to sound like you.</AppText> : null}
            <Card padded={false}>
              {rows.map((row, i) => (
                <Pressable key={row.key} accessibilityRole="checkbox" accessibilityState={{ checked: !!picked[row.key] }} aria-checked={!!picked[row.key]} accessibilityLabel={row.title}
                  onPress={() => { haptics.tap(); setPicked((p) => ({ ...p, [row.key]: !p[row.key] })); }}
                  style={({ pressed }) => ({ flexDirection: "row", gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderColor: c.rule, backgroundColor: pressed ? c.surfaceAlt : "transparent" })}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginTop: 1, alignItems: "center", justifyContent: "center",
                    borderColor: picked[row.key] ? c.accent : c.rule, backgroundColor: picked[row.key] ? c.accent : "transparent",
                  }}>
                    {picked[row.key] ? <Check color={c.accentInk} size={14} strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label">{row.title}</AppText>
                    <AppText variant="caption" tone="ink2">{row.preview}</AppText>
                    {row.note ? <AppText variant="caption" tone="muted">{row.note}</AppText> : null}
                  </View>
                </Pressable>
              ))}
            </Card>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button style={{ flex: 1 }} kind="secondary" title="Try again" disabled={busy || saving} onPress={() => void run()} />
              <Button style={{ flex: 1.4 }} title="Add to my card" loading={saving} icon={<Sparkles color={c.accentInk} size={18} />} onPress={() => void apply()} />
            </View>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

type Row = { key: string; title: string; preview: string; note?: string; defaultOn: boolean } & (
  | { kind: "field"; field: string; value: string }
  | { kind: "service"; service: Service }
  | { kind: "social"; link: SocialLink }
);

function buildRows(r: Suggestions, customer: Record<string, unknown>, links: SocialLink[], serviceCount: number, room: number): Row[] {
  const rows: Row[] = [];
  const field = (key: string, title: string, value: string, current: unknown, note?: string) => {
    const v = str(value);
    if (!v || v === str(current)) return;
    rows.push({ key, kind: "field", field: key, value: v, title, preview: v, defaultOn: !str(current), note: str(current) ? note ?? "Replaces what's on your card now." : note });
  };
  field("nature", "What you do (under your name)", r.tagline, customer.nature);
  field("about_us", "About", r.about, customer.about_us);
  r.services.slice(0, 8).forEach((s, i) => {
    if (!str(s.name)) return;
    rows.push({
      key: `service-${i}`, kind: "service", service: { name: str(s.name), description: str(s.description) },
      title: `Service: ${str(s.name)}`, preview: str(s.description) || "—", defaultOn: serviceCount === 0 && i < room,
      note: i >= room ? "Over your plan's service limit" : undefined,
    });
  });
  field("seo_title", "Google listing title", r.seoTitle, customer.seo_title);
  field("seo_description", "Google listing description", r.seoDescription, customer.seo_description);
  if (r.web) {
    field("mobile1", "Phone", r.web.phone, customer.mobile1);
    field("email", "Email", r.web.email, customer.email);
    field("address", "Address", r.web.address, customer.address);
    field("url", "Website", normaliseUrl(r.web.url), customer.url);
    for (const [k, v] of Object.entries(r.web.socials ?? {})) {
      const platform = SOCIAL_KEY[k.toLowerCase()];
      if (!platform || !str(v) || links.some((l) => l.platform === platform)) continue;
      rows.push({ key: `social-${platform}`, kind: "social", link: { platform, url: normaliseUrl(str(v)) }, title: SOCIAL_BY_KEY[platform]?.label ?? platform, preview: str(v), defaultOn: true });
    }
  }
  // Contact details already on the card are only replaced when the owner ticks them.
  return rows.map((row) => (row.kind === "field" && ["mobile1", "email", "address", "url"].includes(row.field) && str(customer[row.field]) ? { ...row, defaultOn: false } : row));
}
