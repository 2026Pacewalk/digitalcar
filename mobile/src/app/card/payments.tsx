import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Plus, QrCode, Trash2 } from "lucide-react-native";
import { AppText, Banner, Button, Card, Chip, Field, Loading, Screen, SectionTitle, SwitchRow } from "~/components/ui";
import { ImageField } from "~/components/ImageField";
import { SaveBadge } from "~/components/SaveBadge";
import { imageOf } from "~/lib/card";
import { nextId, planLimit, sectionOn, setFields, useCardUpdate } from "~/lib/cardStore";
import { asList, type QrItem } from "~/lib/cardContent";
import { useCardFields } from "~/lib/useCardFields";
import * as haptics from "~/lib/haptics";
import { radius, space, useTheme } from "~/theme";

/* Payment details exactly as the live card shows them: one UPI ID, wallet
   numbers, one bank account, GST, and any number of payment QR images. */

const FIELDS = [
  "upi", "paytm_number", "phone_pe", "google_pay",
  "account_holder", "bank_name", "account_number", "ifsc", "account_type", "gst",
] as const;

export default function PaymentsScreen() {
  const { c } = useTheme();
  const { snapshot, draft, set, state, error } = useCardFields(FIELDS);
  const update = useCardUpdate();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrName, setQrName] = useState("Pay Online");
  const [qrImage, setQrImage] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  if (snapshot.isLoading) return <Loading />;
  const data = snapshot.data?.data;
  if (!data || !draft) {
    return <Screen><Banner tone="info" title="Publish your card first" body="Payment details appear on your live card. Publish it on digitalcarda.in, then add them here." /></Screen>;
  }

  const qrs = asList<QrItem>(data.qrcodes);
  const qrLimit = planLimit(data, "qrcode");
  const upiOk = !draft.upi || /^[\w.-]{2,}@[a-zA-Z][\w.-]*$/.test(draft.upi.trim());
  const ifscOk = !draft.ifsc || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(draft.ifsc.trim());
  const accountType = draft.account_type || "current";

  const toggle = (flag: string, on: boolean) => void update(setFields({ [flag]: on ? 1 : 0 }));

  const addQr = async () => {
    if (!qrImage) { setQrError("Add the QR image first."); return; }
    setQrBusy(true);
    let full = false;
    const r = await update((d) => {
      const list = asList<QrItem>(d.qrcodes);
      if (list.length >= planLimit(d, "qrcode")) { full = true; return null; }
      return { ...d, qrcodes: [...list, { id: nextId(list), name: qrName.trim() || "Pay Online", filename: qrImage }] };
    });
    setQrBusy(false);
    if (full) { setQrError(`You've used all ${qrLimit} payment QR codes on your plan.`); return; }
    if (!r.ok) { setQrError(r.message); return; }
    haptics.success();
    setQrOpen(false); setQrImage(""); setQrName("Pay Online"); setQrError(null);
  };

  const removeQr = (q: QrItem) => {
    const go = () => void update((d) => ({ ...d, qrcodes: asList<QrItem>(d.qrcodes).filter((x) => x.id !== q.id) }));
    if (Platform.OS === "web") { if (globalThis.confirm?.("Remove this QR code from your card?")) go(); return; }
    Alert.alert("Remove this QR code?", "It disappears from your card.", [
      { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: go },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>Saved as you type. Customers copy these from your card in one tap.</AppText>
          <SaveBadge state={state} />
        </View>
        {state === "error" && error ? <Banner tone="bad" title="Not saved yet" body={error} /> : null}

        <Card padded={false}>
          <SwitchRow first title="Show payment details on my card" subtitle={sectionOn(data, "payment_on") ? "Visible to visitors" : "Hidden — turn on to show this section"}
            value={sectionOn(data, "payment_on")} onChange={(v) => toggle("payment_on", v)} />
        </Card>

        <SectionTitle>UPI & wallets</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="UPI ID" value={draft.upi} onChangeText={(v) => set("upi", v.trim())} autoCapitalize="none" autoCorrect={false} placeholder="yourname@okhdfcbank"
            error={upiOk ? undefined : "A UPI ID looks like name@bank"} />
          <Field label="Paytm number" value={draft.paytm_number} onChangeText={(v) => set("paytm_number", v)} keyboardType="phone-pad" placeholder="98765 43210" />
          <Field label="PhonePe number" value={draft.phone_pe} onChangeText={(v) => set("phone_pe", v)} keyboardType="phone-pad" placeholder="98765 43210" />
          <Field label="Google Pay number" value={draft.google_pay} onChangeText={(v) => set("google_pay", v)} keyboardType="phone-pad" placeholder="98765 43210" />
        </Card>

        <SectionTitle>Bank account</SectionTitle>
        <Card style={{ gap: space.lg }}>
          <Field label="Account holder" value={draft.account_holder} onChangeText={(v) => set("account_holder", v)} autoCapitalize="words" placeholder="Name on the account" />
          <Field label="Bank name" value={draft.bank_name} onChangeText={(v) => set("bank_name", v)} autoCapitalize="words" placeholder="e.g. HDFC Bank" />
          <Field label="Account number" value={draft.account_number} onChangeText={(v) => set("account_number", v.replace(/\D/g, "").slice(0, 18))} keyboardType="number-pad" placeholder="XXXXXXXXXXXX" />
          <Field label="IFSC code" value={draft.ifsc} onChangeText={(v) => set("ifsc", v.toUpperCase().replace(/\s/g, "").slice(0, 11))} autoCapitalize="characters" autoCorrect={false} placeholder="HDFC0001234"
            error={ifscOk ? undefined : "IFSC is 11 characters, like HDFC0001234"} />
          <View style={{ gap: space.sm }}>
            <AppText variant="label" tone="ink2">Account type</AppText>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Chip label="Current" selected={accountType === "current"} onPress={() => set("account_type", "current")} />
              <Chip label="Savings" selected={accountType === "savings"} onPress={() => set("account_type", "savings")} />
            </View>
          </View>
          <Field label="GST number (optional)" value={draft.gst} onChangeText={(v) => set("gst", v.toUpperCase().replace(/\s/g, "").slice(0, 15))} autoCapitalize="characters" autoCorrect={false} placeholder="22AAAAA0000A1Z5" />
        </Card>

        <SectionTitle>Payment QR codes</SectionTitle>
        <Card padded={false}>
          <SwitchRow first title="Show payment QR on my card" value={sectionOn(data, "qrcode_on")} onChange={(v) => toggle("qrcode_on", v)} />
          {qrs.map((q) => (
            <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderTopWidth: 1, borderColor: c.rule }}>
              <View style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: "#fff", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                {imageOf(q.filename) ? <Image source={{ uri: imageOf(q.filename) }} style={{ width: 54, height: 54 }} contentFit="contain" /> : <QrCode color={c.muted} size={22} />}
              </View>
              <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>{q.name || "Pay Online"}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${q.name || "QR code"}`} hitSlop={8} onPress={() => removeQr(q)}>
                <Trash2 color={c.bad} size={18} />
              </Pressable>
            </View>
          ))}
        </Card>

        {qrOpen ? (
          <Card style={{ gap: space.md }}>
            <AppText variant="heading">Add a payment QR</AppText>
            {qrError ? <Banner tone="bad" title={qrError} /> : null}
            <ImageField value={qrImage} onChange={(v) => { setQrImage(v); setQrError(null); }} kind="qr" label="QR image" onError={setQrError} />
            <Field label="Label" value={qrName} onChangeText={setQrName} placeholder="e.g. Pay with any UPI app" />
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button style={{ flex: 1 }} kind="secondary" title="Cancel" onPress={() => { setQrOpen(false); setQrImage(""); setQrError(null); }} />
              <Button style={{ flex: 1 }} title="Add QR" loading={qrBusy} onPress={() => void addQr()} />
            </View>
          </Card>
        ) : (
          <>
            {qrError ? <Banner tone="bad" title={qrError} /> : null}
            <Button kind={qrs.length >= qrLimit ? "secondary" : "primary"} title="Add a payment QR" icon={<Plus color={qrs.length >= qrLimit ? c.ink : c.accentInk} size={18} />}
              onPress={() => { if (qrs.length >= qrLimit) { setQrError(`You've used all ${qrLimit} payment QR codes on your plan.`); return; } setQrError(null); setQrOpen(true); }} />
          </>
        )}
        <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>{qrs.length} of {qrLimit} QR codes on your plan · a screenshot of your UPI QR works</AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

