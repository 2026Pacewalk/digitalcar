import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Camera, ChevronRight, Eye, ImagePlus, Images, LayoutList, Palette, Share2, ShoppingBag, Sparkles, Trash2, Wallet } from "lucide-react-native";
import { AppText, Avatar, Banner, Button, Card, Field, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { SaveBadge } from "~/components/SaveBadge";
import { NoCardYet } from "~/components/NoCardYet";
import { imageOf } from "~/lib/card";
import { setFields, useCardUpdate } from "~/lib/cardStore";
import { useCardFields } from "~/lib/useCardFields";
import { pickCardImage, type ImageKind, type PickSource } from "~/lib/images";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* The card fields this screen edits. Each is saved on its own, a moment after
   the last keystroke, onto the latest copy of the card — so a change made on
   the website in the meantime is kept. */
const FIELDS = ["name", "designation", "company_name", "nature", "mobile1", "mobile2", "email", "url", "address", "google_map", "about_us"] as const;

export default function EditScreen() {
  const { c } = useTheme();
  const { snapshot, draft, set: change, flush, state, error } = useCardFields(FIELDS, 1500);
  const update = useCardUpdate();
  const [imageBusy, setImageBusy] = useState<ImageKind | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const changeImage = async (kind: ImageKind, source: PickSource) => {
    setImageBusy(kind);
    setImageError(null);
    try {
      const picked = await pickCardImage(kind, source);
      if (!picked.ok) {
        if (picked.reason !== "cancelled") setImageError(picked.message ?? "Couldn't use that image.");
        return;
      }
      const r = await update(setFields({ [kind]: picked.dataUrl }));
      if (r.ok) haptics.success(); else setImageError(r.message);
    } finally {
      setImageBusy(null);
    }
  };

  const removeImage = (kind: ImageKind) => {
    const label = kind === "photo" ? "photo" : "logo";
    const go = async () => {
      setImageBusy(kind);
      const r = await update(setFields({ [kind]: "" }));
      setImageBusy(null);
      if (!r.ok) setImageError(r.message);
    };
    if (Platform.OS === "web") { if (globalThis.confirm?.(`Remove your ${label} from the card?`)) void go(); return; }
    Alert.alert(`Remove your ${label}?`, "It disappears from your card. You can add a new one any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void go() },
    ]);
  };

  if (snapshot.isLoading) return <Loading />;
  if (!snapshot.data || !draft) {
    return (
      <Screen edgesTop>
        <AppText variant="title">Edit card</AppText>
        <NoCardYet />
      </Screen>
    );
  }

  const customer = snapshot.data.data.customer;
  const photo = imageOf(customer.photo);
  const logo = imageOf(customer.logo);
  const phoneOk = !draft.mobile1 || draft.mobile1.replace(/\D/g, "").length >= 10;
  const emailOk = !draft.email || /^\S+@\S+\.\S+$/.test(draft.email);
  const canUseCamera = Platform.OS !== "web";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edgesTop>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="title">Edit card</AppText>
          <SaveBadge state={state} />
        </View>
        <AppText variant="caption" tone="muted">Changes save automatically and go live on your card.</AppText>

        {state === "error" && error ? (
          <Banner tone="bad" title="Not saved yet" body={error} action={<Button size="md" kind="secondary" title="Try again" onPress={() => void flush()} />} />
        ) : null}
        {imageError ? <Banner tone="bad" title={imageError} /> : null}

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
          <Field label="Google Maps link" value={draft.google_map} onChangeText={(t) => change("google_map", t)} keyboardType="url" autoCapitalize="none" autoCorrect={false} placeholder="https://maps.app.goo.gl/…" hint="The Directions button on your card opens this" />
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card>
          <Field label="About your business" value={draft.about_us} onChangeText={(t) => change("about_us", t)} multiline placeholder="Two or three lines on what you do and why customers choose you." />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push({ pathname: "/card/ai", params: { mode: "details" } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: space.sm }}>
            <Sparkles color={c.accentText} size={16} />
            <AppText variant="label" tone="accent">Write it with AI</AppText>
          </Pressable>
        </Card>

        <SectionTitle>More on your card</SectionTitle>
        <Card padded={false}>
          <Row first icon={<Sparkles color={c.accentText} size={18} />} title="Write with AI" subtitle="From your website or a few details" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/ai")} />
          <Row icon={<ShoppingBag color={c.accentText} size={18} />} title="Services & offers" subtitle="What you sell, with photos and prices" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/services")} />
          <Row icon={<Images color={c.accentText} size={18} />} title="Photos & videos" subtitle="Your work, shop and video links" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/media")} />
          <Row icon={<Wallet color={c.accentText} size={18} />} title="Payments" subtitle="UPI, bank details and payment QR" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/payments")} />
          <Row icon={<Share2 color={c.accentText} size={18} />} title="Social links & reviews" subtitle="Instagram, Facebook, Google reviews…" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/social")} />
          <Row icon={<LayoutList color={c.accentText} size={18} />} title="Sections on your card" subtitle="Show or hide each section" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/card/sections")} />
          <Row icon={<Palette color={c.accentText} size={18} />} title="Design" subtitle="Pick a new look for your card" right={<ChevronRight color={c.muted} size={18} />} onPress={() => router.push("/designs")} />
        </Card>
        <Button kind="secondary" title="Preview my card" icon={<Eye color={c.ink} size={18} />} onPress={() => router.push("/preview")} />
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
