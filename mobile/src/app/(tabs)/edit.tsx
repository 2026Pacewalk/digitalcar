import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Check, CloudOff, ExternalLink, Images, Palette, ShoppingBag, Wallet } from "lucide-react-native";
import { AppText, Banner, Button, Card, Field, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { SNAPSHOT_KEY, useSnapshot, type CardCustomer, type CardSnapshot } from "~/lib/card";
import { SITE_URL } from "~/lib/config";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

/* The fields this build edits natively. Everything else on the card is left
   exactly as it is — the whole snapshot is sent back, only these change. */
const FIELDS = ["name", "designation", "company_name", "nature", "mobile1", "mobile2", "email", "url", "address", "about_us"] as const;
type FieldKey = (typeof FIELDS)[number];
type Draft = Record<FieldKey, string>;

const pick = (c: CardCustomer | undefined): Draft =>
  Object.fromEntries(FIELDS.map((k) => [k, String(c?.[k] ?? "")])) as Draft;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

export default function EditScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const snapshot = useSnapshot();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef<CardSnapshot | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start from the server copy; don't clobber in-progress typing on refetch.
  useEffect(() => {
    if (snapshot.data && (!draft || state === "idle" || state === "saved")) {
      baseRef.current = snapshot.data;
      setDraft(pick(snapshot.data.data.customer));
    }
  }, [snapshot.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = trpc.publish.saveSnapshot.useMutation();

  const persist = useCallback(async (next: Draft, force = false) => {
    const base = baseRef.current;
    if (!base) return;
    setState("saving");
    const data = { ...base.data, customer: { ...base.data.customer, ...next } };
    try {
      const res = await save.mutateAsync({
        slug: base.slug, cardId: base.cardId || 1, data,
        // The version this edit started from; the server refuses the save if
        // the card was changed elsewhere since (e.g. on the website).
        baseTs: force ? undefined : base.updatedAt ?? undefined,
      });
      const fresh: CardSnapshot = { ...base, data, updatedAt: res.updatedAt ?? base.updatedAt };
      baseRef.current = fresh;
      qc.setQueryData(SNAPSHOT_KEY, fresh);
      setState("saved");
      setError(null);
    } catch (e) {
      const msg = errorMessage(e);
      if (/SNAPSHOT_STALE/.test(msg)) {
        setState("conflict");
        haptics.warning();
        if (Platform.OS === "web") {
          // The web preview has no native alert; confirm() gives the same choice.
          if (globalThis.confirm?.("Your card was changed elsewhere after you started editing. OK keeps your changes; Cancel loads the latest.")) void persist(next, true);
          else { setState("idle"); await snapshot.refetch(); }
          return;
        }
        Alert.alert(
          "Your card was changed elsewhere",
          "Someone updated this card on another device or the website after you started editing.",
          [
            { text: "Use the latest", onPress: async () => { setState("idle"); await snapshot.refetch(); } },
            { text: "Keep my changes", style: "destructive", onPress: () => void persist(next, true) },
          ],
        );
      } else {
        setState("error");
        setError(msg);
      }
    }
  }, [qc, save, snapshot]);

  const change = (key: FieldKey, value: string) => {
    if (!draft) return;
    const next = { ...draft, [key]: value };
    setDraft(next);
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 1500);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (snapshot.isLoading) return <Loading />;
  if (!snapshot.data || !draft) {
    return (
      <Screen edgesTop>
        <AppText variant="title">Edit card</AppText>
        <Card style={{ gap: space.md }}>
          <AppText tone="muted">Your card isn't published yet. Create it on the website first — then edit it here any time.</AppText>
          <Button title="Create my card" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/dashboard/build`)} />
        </Card>
      </Screen>
    );
  }

  const phoneOk = !draft.mobile1 || draft.mobile1.replace(/\D/g, "").length >= 10;
  const emailOk = !draft.email || /^\S+@\S+\.\S+$/.test(draft.email);
  const openWeb = (path: string) => void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edgesTop>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="title">Edit card</AppText>
          <SaveBadge state={state} />
        </View>
        <AppText variant="caption" tone="muted">Changes save automatically and go live on your card.</AppText>

        {state === "error" && error ? (
          <Banner tone="bad" title="Not saved yet" body={error} action={<Button size="md" kind="secondary" title="Try again" onPress={() => void persist(draft)} />} />
        ) : null}

        <SectionTitle>You</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="Name" value={draft.name} onChangeText={(t) => change("name", t)} autoCapitalize="words" placeholder="Your full name" />
          <Field label="Role" value={draft.designation} onChangeText={(t) => change("designation", t)} autoCapitalize="words" placeholder="Founder, Director, Consultant…" />
          <Field label="Business name" value={draft.company_name} onChangeText={(t) => change("company_name", t)} placeholder="Your company or shop" />
          <Field label="What you do" value={draft.nature} onChangeText={(t) => change("nature", t)} placeholder="e.g. Real estate consultant, Mohali" hint="Shown under your name on the card" />
        </Card>

        <SectionTitle>Contact</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="Mobile" value={draft.mobile1} onChangeText={(t) => change("mobile1", t)} keyboardType="phone-pad" placeholder="+91 98765 43210" error={phoneOk ? undefined : "Enter a 10-digit mobile number"} />
          <Field label="WhatsApp" value={draft.mobile2} onChangeText={(t) => change("mobile2", t)} keyboardType="phone-pad" placeholder="Same as mobile if left empty" />
          <Field label="Email" value={draft.email} onChangeText={(t) => change("email", t)} keyboardType="email-address" autoCapitalize="none" placeholder="you@business.com" error={emailOk ? undefined : "This doesn't look like an email address"} />
          <Field label="Website" value={draft.url} onChangeText={(t) => change("url", t)} keyboardType="url" autoCapitalize="none" placeholder="https://" />
          <Field label="Address" value={draft.address} onChangeText={(t) => change("address", t)} multiline placeholder="Shop / office address" />
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card>
          <Field label="About your business" value={draft.about_us} onChangeText={(t) => change("about_us", t)} multiline placeholder="Two or three lines on what you do and why customers choose you." />
        </Card>

        <SectionTitle>More on your card</SectionTitle>
        <Card padded={false}>
          <Row first icon={<Palette color={c.accentText} size={18} />} title="Design & colours" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/templates")} />
          <Row icon={<ShoppingBag color={c.accentText} size={18} />} title="Services & products" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/products")} />
          <Row icon={<Images color={c.accentText} size={18} />} title="Photo, logo & gallery" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/build")} />
          <Row icon={<Wallet color={c.accentText} size={18} />} title="Payments & social links" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/payments")} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const { c } = useTheme();
  if (state === "saving" || state === "pending") {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ActivityIndicator size="small" color={c.muted} /><AppText variant="caption" tone="muted">Saving…</AppText></View>;
  }
  if (state === "saved") return <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Check color={c.good} size={16} /><AppText variant="caption" tone="good">Saved</AppText></View>;
  if (state === "error" || state === "conflict") return <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><CloudOff color={c.bad} size={16} /><AppText variant="caption" tone="bad">Not saved</AppText></View>;
  return null;
}
