import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { CalendarClock, Mail, MessageCircle, Phone } from "lucide-react-native";
import { AppText, Button, Card, Chip, EmptyState, Field, Loading, Screen, SectionTitle } from "~/components/ui";
import { SOURCE_LABELS, STAGES, stageLabel, stageTone, type Stage } from "~/lib/leads";
import { dateLabel, firstName, telLink, timeAgo, whatsappLink } from "~/lib/format";
import { useAuth } from "~/lib/auth";
import { errorMessage, trpc } from "~/lib/trpc";
import * as haptics from "~/lib/haptics";
import { space, useTheme } from "~/theme";

const FOLLOW_UPS = [
  { label: "Tomorrow 10 am", at: () => atHour(1, 10) },
  { label: "In 3 days", at: () => atHour(3, 10) },
  { label: "Next week", at: () => atHour(7, 10) },
];
function atHour(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function LeadDetail() {
  const { c } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const utils = trpc.useUtils();
  const lead = trpc.lead.getById.useQuery({ id: leadId }, { enabled: Number.isFinite(leadId) });
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (lead.data) setNotes(lead.data.notes ?? ""); }, [lead.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = trpc.lead.update.useMutation({
    onSuccess: () => { void utils.lead.invalidate(); setError(null); },
    onError: (e) => setError(errorMessage(e, "Couldn't save. Check your connection and try again.")),
  });

  if (lead.isLoading) return <Loading />;
  const l = lead.data;
  if (!l) return <Screen><EmptyState title="Enquiry not found" body="It may have been deleted from the web dashboard." /></Screen>;

  // Replying moves a new lead to Contacted, as on the web.
  const reply = (url: string) => {
    haptics.tap();
    void Linking.openURL(url);
    if (l.status === "new") update.mutate({ id: l.id, status: "contacted" });
  };
  const greeting = `Hi ${firstName(l.fullName) || "there"}, this is ${firstName(user?.fullName) || "me"} — thanks for your enquiry on my digital card.`;

  return (
    <Screen>
      <Stack.Screen options={{ title: l.fullName }} />

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Chip label={stageLabel(l.status)} tone={stageTone(l.status)} />
          <AppText variant="caption" tone="muted">{timeAgo(l.createdAt)} · {SOURCE_LABELS[l.source] ?? l.source}</AppText>
        </View>
        <AppText variant="title">{l.fullName}</AppText>
        {l.company ? <AppText tone="ink2">{l.company}</AppText> : null}
        {l.message ? (
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: space.md, marginTop: space.xs }}>
            <AppText>{l.message}</AppText>
          </View>
        ) : null}
        {[l.city, l.country, l.device].filter(Boolean).length ? (
          <AppText variant="caption" tone="muted">{[l.city, l.country, l.device].filter(Boolean).join(" · ")}</AppText>
        ) : null}
      </Card>

      <View style={{ gap: space.sm }}>
        {l.phone ? (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button style={{ flex: 1 }} title="WhatsApp" icon={<MessageCircle color={c.accentInk} size={19} />} onPress={() => reply(whatsappLink(l.phone!, greeting))} />
            <Button style={{ flex: 1 }} kind="secondary" title="Call" icon={<Phone color={c.ink} size={19} />} onPress={() => reply(telLink(l.phone!))} />
          </View>
        ) : null}
        {l.email ? (
          <Button kind="secondary" title={`Email ${l.email}`} icon={<Mail color={c.ink} size={19} />}
            onPress={() => reply(`mailto:${l.email}?subject=${encodeURIComponent("Re: your enquiry")}&body=${encodeURIComponent(greeting)}`)} />
        ) : null}
      </View>

      {error ? <AppText tone="bad">{error}</AppText> : null}

      <SectionTitle>Status</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {STAGES.map((s) => (
          <Chip key={s} label={stageLabel(s)} selected={l.status === s} onPress={() => update.mutate({ id: l.id, status: s as Stage })} />
        ))}
      </View>

      <SectionTitle>Follow-up</SectionTitle>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <CalendarClock color={l.followUpDate ? c.accentText : c.muted} size={18} />
          <AppText tone={l.followUpDate ? "ink" : "muted"}>
            {l.followUpDate ? `Follow up on ${dateLabel(l.followUpDate)}` : "No follow-up set"}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {FOLLOW_UPS.map((f) => (
            <Chip key={f.label} label={f.label} onPress={() => update.mutate({ id: l.id, followUpDate: f.at(), status: l.status === "new" ? "follow_up" : undefined })} />
          ))}
          {l.followUpDate ? <Chip label="Clear" onPress={() => update.mutate({ id: l.id, followUpDate: null })} /> : null}
        </View>
      </Card>

      <SectionTitle>Notes</SectionTitle>
      <Field
        label="Only you can see these"
        value={notes}
        onChangeText={(t) => { setNotes(t); setNotesSaved(false); }}
        onBlur={() => { if (!notesSaved) update.mutate({ id: l.id, notes }, { onSuccess: () => { setNotesSaved(true); haptics.success(); } }); }}
        multiline
        placeholder="Budget, requirement, what you promised…"
        hint={notesSaved ? undefined : "Saves when you leave the box"}
      />
    </Screen>
  );
}
