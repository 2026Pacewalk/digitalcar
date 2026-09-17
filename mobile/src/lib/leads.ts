/* Lead stages, named the way owners talk about them. Same stages as the web. */
export const STAGES = ["new", "contacted", "interested", "follow_up", "converted", "not_interested", "closed"] as const;
export type Stage = (typeof STAGES)[number];

const LABELS: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow-up",
  converted: "Won",
  not_interested: "Not interested",
  closed: "Closed",
};

export const stageLabel = (s: string) => LABELS[s as Stage] ?? s;

export const stageTone = (s: string): "accent" | "info" | "good" | "warn" | "neutral" => {
  switch (s) {
    case "new": return "accent";
    case "contacted": case "interested": return "info";
    case "follow_up": return "warn";
    case "converted": return "good";
    default: return "neutral";
  }
};

export const SOURCE_LABELS: Record<string, string> = {
  card: "Card enquiry form",
  qr: "QR scan",
  nfc: "NFC tap",
  whatsapp: "WhatsApp",
  website: "Website",
  manual: "Added by you",
};
