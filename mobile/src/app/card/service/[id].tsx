import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MousePointerClick, Trash2 } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, Field, Loading, SwitchRow } from "~/components/ui";
import { ImageField } from "~/components/ImageField";
import { useSnapshot } from "~/lib/card";
import { nextId, planLimit, useCardUpdate } from "~/lib/cardStore";
import {
  CTA_OPTIONS, DESC_MAX, amount, asList, ctaHint, inr, isoDay, normaliseUrl, percentOff, plainText, type Product,
} from "~/lib/cardContent";
import { dateLabel } from "~/lib/format";
import * as haptics from "~/lib/haptics";
import { fonts, radius, space, useTheme } from "~/theme";

/* Add or edit one service or offer. Nothing is saved until Save, and leaving
   with unsaved changes asks first. */

type Form = Omit<Product, "id">;
const blank = (isOffer: boolean): Form => ({
  name: "", filename: "", price: "", offer_price: "", description: "",
  button: "", button_title: isOffer ? "Get Offer" : "Buy Now", isOffer, valid: "",
});

const VALID_FOR = [
  { label: "1 week", days: 7 }, { label: "2 weeks", days: 14 }, { label: "1 month", days: 30 }, { label: "3 months", days: 90 },
];
const inDays = (n: number) => isoDay(new Date(Date.now() + n * 86_400_000));

export default function ServiceEditor() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; offer?: string }>();
  const isNew = params.id === "new";
  const snapshot = useSnapshot();
  const update = useCardUpdate();

  const data = snapshot.data?.data;
  const existing = useMemo(
    () => (isNew ? null : asList<Product>(data?.products).find((p) => String(p.id) === params.id) ?? null),
    [data?.products, isNew, params.id],
  );

  const [form, setForm] = useState<Form | null>(null);
  const initial = useRef<string>("");
  const originalDescription = useRef<string>("");
  const [customButton, setCustomButton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);

  // Start from the saved item once the card has loaded.
  useEffect(() => {
    if (form || snapshot.isLoading) return;
    const start: Form = existing
      ? { ...blank(!!existing.isOffer), ...existing, description: plainText(existing.description) }
      : blank(params.offer === "1");
    delete (start as Partial<Product>).id;
    originalDescription.current = existing ? String(existing.description ?? "") : "";
    initial.current = JSON.stringify(start);
    setCustomButton(!!start.button_title && !CTA_OPTIONS.includes(start.button_title));
    setForm(start);
  }, [existing, form, params.offer, snapshot.isLoading]);

  const dirty = !!form && JSON.stringify(form) !== initial.current;

  // Leaving with unsaved changes asks first (back button, back gesture, Android back).
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty });
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (!dirty || leaving.current) return;
      e.preventDefault();
      const discard = () => { leaving.current = true; navigation.dispatch(e.data.action); };
      if (Platform.OS === "web") { if (globalThis.confirm?.("Discard your changes?")) discard(); return; }
      Alert.alert("Discard your changes?", "What you've typed here hasn't been saved.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: discard },
      ]);
    });
    return sub;
  }, [dirty, navigation]);

  if (snapshot.isLoading || !form) return <Loading />;
  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, padding: space.xl, backgroundColor: c.ground }}>
        <Banner tone="info" title="This item was removed" body="It may have been deleted on the website or another phone." />
      </View>
    );
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => (f ? { ...f, [k]: v } : f)); if (error) setError(null); };
  const noun = form.isOffer ? "offer" : "service";
  const off = percentOff(form.price, form.offer_price);

  const save = async () => {
    if (!form.name.trim()) { setError(`Give this ${noun} a name.`); haptics.warning(); return; }
    setSaving(true);
    setError(null);
    // Keep the website's formatted description (links etc.) when it wasn't edited here.
    const description = existing && form.description === plainText(originalDescription.current)
      ? originalDescription.current : form.description.slice(0, DESC_MAX);
    const item: Form = {
      ...form, name: form.name.trim(), description, button: normaliseUrl(form.button),
      button_title: form.button_title.trim() || (form.isOffer ? "Get Offer" : "Buy Now"),
      valid: form.isOffer ? form.valid : "",
    };
    let limitHit = false;
    const r = await update((d) => {
      const list = asList<Product>(d.products);
      if (existing) {
        if (!list.some((p) => p.id === existing.id)) return { ...d, products: [...list, { ...item, id: existing.id }] };
        return { ...d, products: list.map((p) => (p.id === existing.id ? { ...p, ...item, id: p.id } : p)) };
      }
      const same = list.filter((p) => !!p.isOffer === !!item.isOffer).length;
      if (same >= planLimit(d, item.isOffer ? "offer" : "product")) { limitHit = true; return null; }
      return { ...d, products: [...list, { ...item, id: nextId(list) }] };
    });
    setSaving(false);
    if (limitHit) { setError(`You've used all the ${noun}s on your plan. Upgrade to add more.`); return; }
    if (!r.ok) { setError(r.message); return; }
    haptics.success();
    leaving.current = true;
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const go = async () => {
      setSaving(true);
      const r = await update((d) => ({ ...d, products: asList<Product>(d.products).filter((p) => p.id !== existing.id) }));
      setSaving(false);
      if (!r.ok) { setError(r.message); return; }
      haptics.success();
      leaving.current = true;
      router.back();
    };
    if (Platform.OS === "web") { if (globalThis.confirm?.(`Delete this ${noun}?`)) void go(); return; }
    Alert.alert(`Delete this ${noun}?`, "It disappears from your card.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void go() },
    ]);
  };

  const validChoice = VALID_FOR.find((v) => inDays(v.days) === form.valid);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.ground }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: `${isNew ? "New" : "Edit"} ${noun}` }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 + insets.bottom }}>
        {error ? <Banner tone="bad" title={error} /> : null}

        <ImageField value={form.filename} onChange={(v) => set("filename", v)} kind="product" label="a photo" onError={setError} />
        <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: -space.sm }}>A square photo works best.</AppText>

        <Field label="Name" value={form.name} onChangeText={(v) => set("name", v)} placeholder={form.isOffer ? "e.g. Diwali offer — 20% off" : "e.g. Interior design consultation"} autoCapitalize="sentences" />

        <Field
          label="Description"
          value={form.description}
          onChangeText={(v) => set("description", v.slice(0, DESC_MAX))}
          placeholder={`What's included, who it's for…`}
          multiline
          hint={`${form.description.length}/${DESC_MAX}${existing && form.description === plainText(originalDescription.current) && /<a\s/i.test(originalDescription.current) ? " · links from the website are kept unless you edit this" : ""}`}
        />

        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Price (₹)" value={form.price} onChangeText={(v) => set("price", v.replace(/[^\d.,]/g, ""))} keyboardType="decimal-pad" placeholder="999" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Offer price (₹)" value={form.offer_price} onChangeText={(v) => set("offer_price", v.replace(/[^\d.,]/g, ""))} keyboardType="decimal-pad" placeholder="799"
              hint={off ? `${off}% off · saves ${inr(amount(form.price) - amount(form.offer_price))}` : undefined} />
          </View>
        </View>

        <Card padded={false}>
          <SwitchRow first title="This is an offer" subtitle="Listed under Offers, with the date it runs until" value={!!form.isOffer}
            onChange={(v) => { set("isOffer", v); if (!v) set("valid", ""); }} />
          {form.isOffer ? (
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
              <AppText variant="label" tone="ink2">Runs until</AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                <Chip label="No end date" selected={!form.valid} onPress={() => set("valid", "")} />
                {VALID_FOR.map((v) => <Chip key={v.label} label={v.label} selected={validChoice?.days === v.days} onPress={() => set("valid", inDays(v.days))} />)}
              </View>
              {form.valid ? <AppText variant="caption" tone="muted">Valid till {dateLabel(form.valid)}</AppText> : null}
            </View>
          ) : null}
        </Card>

        <View style={{ gap: space.sm }}>
          <AppText variant="label" tone="ink2">Button</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {CTA_OPTIONS.map((o) => (
              <Chip key={o} label={o} selected={!customButton && form.button_title === o} onPress={() => { setCustomButton(false); set("button_title", o); }} />
            ))}
            <Chip label="Custom…" selected={customButton} onPress={() => { setCustomButton(true); set("button_title", ""); }} />
          </ScrollView>
          {customButton ? <Field label="Button text" value={form.button_title} onChangeText={(v) => set("button_title", v.slice(0, 30))} placeholder="Type your own button text" /> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.rule, padding: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.accent, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 }}>
              <MousePointerClick color={c.accentInk} size={14} />
              <AppText variant="label" style={{ color: c.accentInk, fontFamily: fonts.semibold }}>{form.button_title || "Button"}</AppText>
            </View>
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>{ctaHint(form.button_title)}</AppText>
          </View>
          <Field label="Button link (optional)" value={form.button} onChangeText={(v) => set("button", v)} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url"
            hint="Where Buy, Book or Know-more buttons take people." />
        </View>

        {existing ? (
          <Pressable accessibilityRole="button" onPress={remove} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: space.md }}>
            <Trash2 color={c.bad} size={16} />
            <AppText variant="label" tone="bad">Delete this {noun}</AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: insets.bottom + space.md, backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.rule }}>
        <Button title={isNew ? `Add ${noun}` : "Save changes"} loading={saving} disabled={!isNew && !dirty} onPress={() => void save()} />
      </View>
    </KeyboardAvoidingView>
  );
}
