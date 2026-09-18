import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { router } from "expo-router";
import { AppText, Banner, Button, Card, Field, Loading, Screen } from "~/components/ui";
import { useSnapshot } from "~/lib/card";
import { useCardUpdate } from "~/lib/cardStore";
import { cardUrl } from "~/lib/config";
import { displayUrl } from "~/lib/format";
import { trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { fonts, space, useTheme } from "~/theme";

/* Move the card to a new address. The rules are the website's (Settings →
   card link): letters, numbers and hyphens, 3–40 characters, not used by any
   other card or account. QR codes from DigitalCarda use a permanent link and
   keep working; visit history moves with the card. */

/** Same as the website's slugifyUsername. */
const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

type Status = "idle" | "short" | "checking" | "available" | "taken" | "error";

export default function CardLinkScreen() {
  const { c } = useTheme();
  const snapshot = useSnapshot();
  const update = useCardUpdate();
  const utils = trpc.useUtils();
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = snapshot.data?.slug ?? "";
  const cardId = snapshot.data?.cardId || 1;
  const next = toSlug(typed);

  // Check the address as the owner types (debounced).
  useEffect(() => {
    if (!typed || next === current) { setStatus("idle"); return; }
    if (next.length < 3) { setStatus("short"); return; }
    setStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const [card, account] = await Promise.all([
          utils.publish.checkSlug.fetch({ slug: next, cardId }),
          utils.auth.checkAvailability.fetch({ username: next }),
        ]);
        if (!cancelled) setStatus(card.available && !account.username ? "available" : "taken");
      } catch { if (!cancelled) setStatus("error"); }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [typed, next, current, cardId, utils]);

  if (snapshot.isLoading) return <Loading />;
  if (!snapshot.data) return <Screen><Banner tone="info" title="Publish your card first" body="Your card doesn't have a link yet." /></Screen>;

  const move = async () => {
    setSaving(true);
    setError(null);
    const r = await update((d) => ({
      ...d,
      customer: { ...d.customer, slug: next, username: next, username_changed_at: new Date().toISOString() },
    }), { slug: next });
    setSaving(false);
    if (!r.ok) { setError(r.message); setStatus("idle"); return; }
    haptics.success();
    await Promise.all([utils.publish.mine.invalidate(), utils.publish.myStats.invalidate()]);
    router.back();
  };

  const confirm = () => {
    const body = `Your card will move to ${displayUrl(cardUrl(next))}. Anything printed or shared with the old address stops working.`;
    if (Platform.OS === "web") { if (globalThis.confirm?.(body)) void move(); return; }
    Alert.alert("Change your card link?", body, [
      { text: "Cancel", style: "cancel" },
      { text: "Change link", style: "destructive", onPress: () => void move() },
    ]);
  };

  const hint = {
    idle: undefined, checking: "Checking…", short: "At least 3 letters or numbers.",
    available: `${displayUrl(cardUrl(next))} is free`, taken: "That link is taken — try another.", error: "Couldn't check right now. Try again.",
  }[status];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Card style={{ gap: 4 }}>
          <AppText variant="caption" tone="muted">Your card is at</AppText>
          <AppText variant="heading">{displayUrl(cardUrl(current))}</AppText>
        </Card>

        <Banner tone="warn" title="Before you change it"
          body="QR codes from DigitalCarda keep working — they use a permanent link. Printed cards, NFC cards and links you've already shared with the old address will stop working." />

        {error ? <Banner tone="bad" title={error} /> : null}

        <Card style={{ gap: space.md }}>
          <Field
            label="New link"
            value={typed}
            onChangeText={(v) => { setTyped(v); setError(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={current}
            error={status === "taken" || status === "short" ? hint : undefined}
            hint={status !== "taken" && status !== "short" ? hint : undefined}
          />
          {next && next !== typed ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <AppText variant="caption" tone="muted">Will be saved as</AppText>
              <AppText variant="caption" style={{ fontFamily: fonts.semibold, color: c.ink }}>{next}</AppText>
            </View>
          ) : null}
          <Button title="Change link" disabled={status !== "available"} loading={saving} onPress={confirm} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
