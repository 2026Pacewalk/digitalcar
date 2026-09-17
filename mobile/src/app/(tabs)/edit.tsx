import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Camera, Check, CloudOff, ExternalLink, ImagePlus, Images, Palette, ShoppingBag, Trash2, Wallet } from "lucide-react-native";
import { AppText, Avatar, Banner, Button, Card, Field, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { imageOf, SNAPSHOT_KEY, useSnapshot, type CardCustomer, type CardSnapshot } from "~/lib/card";
import { SITE_URL } from "~/lib/config";
import { pickCardImage, type ImageKind, type PickSource } from "~/lib/images";
import { errorMessage, errorTag, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* The fields this build edits natively. Everything else on the card is left
   exactly as it is — the whole snapshot is sent back, only these change. */
const FIELDS = ["name", "designation", "company_name", "nature", "mobile1", "mobile2", "email", "url", "address", "about_us"] as const;
type FieldKey = (typeof FIELDS)[number];
type Draft = Record<FieldKey, string>;
type Patch = Partial<Draft> & { photo?: string; logo?: string };

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
  const [imageBusy, setImageBusy] = useState<ImageKind | null>(null);
  const baseRef = useRef<CardSnapshot | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start from the server copy; don't clobber in-progress typing on refetch.
  useEffect(() => {
    if (snapshot.data && (!draftRef.current || state === "idle" || state === "saved")) {
      baseRef.current = snapshot.data;
      const next = pick(snapshot.data.data.customer);
      draftRef.current = next;
      setDraft(next);
    }
  }, [snapshot.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = trpc.publish.saveSnapshot.useMutation();

  /** Saves the current text fields plus any image change, from the version this edit started on. */
  const persist = useCallback(async (extra: Patch = {}, force = false): Promise<boolean> => {
    const base = baseRef.current;
    if (!base) return false;
    setState("saving");
    const data = { ...base.data, customer: { ...base.data.customer, ...(draftRef.current ?? {}), ...extra } };
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
      return true;
    } catch (e) {
      if (errorTag(e) === "SNAPSHOT_STALE") {
        setState("conflict");
        haptics.warning();
        const useLatest = async () => { setState("idle"); draftRef.current = null; await snapshot.refetch(); };
        if (Platform.OS === "web") {
          // The web preview has no native alert; confirm() gives the same choice.
          if (globalThis.confirm?.("Your card was changed elsewhere after you started editing. OK keeps your changes; Cancel loads the latest.")) return persist(extra, true);
          await useLatest();
          return false;
        }
        Alert.alert(
          "Your card was changed elsewhere",
          "Someone updated this card on another device or the website after you started editing.",
          [
            { text: "Use the latest", onPress: () => void useLatest() },
            { text: "Keep my changes", style: "destructive", onPress: () => void persist(extra, true) },
          ],
        );
      } else {
        setState("error");
        setError(errorMessage(e));
      }
      return false;
    }
  }, [qc, save, snapshot]);

  const change = (key: FieldKey, value: string) => {
    if (!draftRef.current) return;
    const next = { ...draftRef.current, [key]: value };
    draftRef.current = next;
    setDraft(next);
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 1500);
  };

  const changeImage = async (kind: ImageKind, source: PickSource) => {
    setImageBusy(kind);
    try {
      const picked = await pickCardImage(kind, source);
      if (!picked.ok) {
        if (picked.reason !== "cancelled") { setState("error"); setError(picked.message ?? "Couldn't use that image."); }
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      if (await persist({ [kind]: picked.dataUrl })) haptics.success();
    } finally {
      setImageBusy(null);
    }
  };

  const removeImage = (kind: ImageKind) => {
    const label = kind === "photo" ? "photo" : "logo";
    const go = () => { void persist({ [kind]: "" }); };
    if (Platform.OS === "web") { if (globalThis.confirm?.(`Remove your ${label} from the card?`)) go(); return; }
    Alert.alert(`Remove your ${label}?`, "It disappears from your card. You can add a new one any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: go },
    ]);
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

  const customer = baseRef.current?.data.customer ?? snapshot.data.data.customer;
  const photo = imageOf(customer.photo);
  const logo = imageOf(customer.logo);
  const phoneOk = !draft.mobile1 || draft.mobile1.replace(/\D/g, "").length >= 10;
  const emailOk = !draft.email || /^\S+@\S+\.\S+$/.test(draft.email);
  const openWeb = (path: string) => void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);
  const canUseCamera = Platform.OS !== "web";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edgesTop>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="title">Edit card</AppText>
          <SaveBadge state={state} />
        </View>
        <AppText variant="caption" tone="muted">Changes save automatically and go live on your card.</AppText>

        {(state === "error") && error ? (
          <Banner tone="bad" title="Not saved yet" body={error} action={<Button size="md" kind="secondary" title="Try again" onPress={() => void persist()} />} />
        ) : null}

        <SectionTitle>Photo & logo</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <ImageRow
            kind="photo"
            title="Your photo"
            hint="Square, shown in a circle"
            preview={<Avatar uri={photo} name={draft.name} size={64} />}
            busy={imageBusy === "photo"}
            hasImage={!!photo}
            canUseCamera={canUseCamera}
            onPick={(source) => void changeImage("photo", source)}
            onRemove={() => removeImage("photo")}
          />
          <View style={{ height: 1, backgroundColor: c.rule }} />
          <ImageRow
            kind="logo"
            title="Business logo"
            hint="PNG with a clear background looks best"
            preview={
              <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {logo ? <Image source={{ uri: logo }} style={{ width: 56, height: 56 }} contentFit="contain" /> : <ImagePlus color={c.muted} size={22} />}
              </View>
            }
            busy={imageBusy === "logo"}
            hasImage={!!logo}
            canUseCamera={false}
            onPick={(source) => void changeImage("logo", source)}
            onRemove={() => removeImage("logo")}
          />
        </Card>

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
          <Row icon={<Images color={c.accentText} size={18} />} title="Gallery & videos" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/media")} />
          <Row icon={<Wallet color={c.accentText} size={18} />} title="Payments & social links" subtitle="Edit on digitalcarda.in" right={<ExternalLink color={c.muted} size={16} />} onPress={() => openWeb("/dashboard/payments")} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ImageRow({ kind, title, hint, preview, busy, hasImage, canUseCamera, onPick, onRemove }: {
  kind: ImageKind; title: string; hint: string; preview: React.ReactNode; busy: boolean; hasImage: boolean;
  canUseCamera: boolean; onPick: (source: PickSource) => void; onRemove: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <View>
        {preview}
        {busy ? (
          <View style={{ position: "absolute", inset: 0, borderRadius: kind === "photo" ? 32 : radius.md, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View>
          <AppText variant="label">{title}</AppText>
          <AppText variant="caption" tone="muted">{hint}</AppText>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <SmallAction icon={<Images color={c.ink} size={15} />} label={hasImage ? "Change" : "Choose"} disabled={busy} onPress={() => onPick("library")} />
          {canUseCamera ? <SmallAction icon={<Camera color={c.ink} size={15} />} label="Camera" disabled={busy} onPress={() => onPick("camera")} /> : null}
          {hasImage ? <SmallAction icon={<Trash2 color={c.bad} size={15} />} label="Remove" tone="bad" disabled={busy} onPress={onRemove} /> : null}
        </View>
      </View>
    </View>
  );
}

function SmallAction({ icon, label, onPress, disabled, tone }: { icon: React.ReactNode; label: string; onPress: () => void; disabled?: boolean; tone?: "bad" }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: radius.pill,
        backgroundColor: tone === "bad" ? c.badWash : c.surfaceAlt, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {icon}
      <AppText variant="label" tone={tone === "bad" ? "bad" : "ink"} style={{ fontSize: 13 }}>{label}</AppText>
    </Pressable>
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
