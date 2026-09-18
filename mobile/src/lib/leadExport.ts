import { Platform } from "react-native";
import { Contact } from "expo-contacts";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SOURCE_LABELS, stageLabel } from "./leads";

/* Getting enquiries out of the app: one person into the phone's contacts (the
   phone's own "new contact" form, prefilled — nothing is saved without the
   owner confirming), or the whole list as a spreadsheet through the share
   sheet (Google Sheets, Excel, WhatsApp, email…). */

export type ExportLead = {
  fullName: string; phone?: string | null; email?: string | null; company?: string | null;
  message?: string | null; status: string; source: string; notes?: string | null;
  createdAt: string | Date; followUpDate?: string | Date | null;
};

export type ExportResult = { ok: true } | { ok: false; message: string };

const PHONE_ONLY = "Works in the DigitalCarda phone app.";

export async function saveLeadToContacts(lead: ExportLead): Promise<ExportResult & { saved?: boolean }> {
  if (Platform.OS === "web") return { ok: false, message: `Saving to contacts ${PHONE_ONLY.toLowerCase()}` };
  const parts = lead.fullName.trim().split(/\s+/);
  const givenName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  const familyName = parts.length > 1 ? parts[parts.length - 1] : "";
  const received = new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  try {
    const saved = await Contact.presentCreateForm({
      givenName,
      familyName,
      ...(lead.company ? { company: lead.company } : {}),
      ...(lead.phone ? { phones: [{ label: "mobile", number: lead.phone }] } : {}),
      ...(lead.email ? { emails: [{ label: "work", address: lead.email }] } : {}),
      note: [`Enquiry on my DigitalCarda card, ${received}.`, lead.message ?? ""].filter(Boolean).join("\n"),
    });
    return { ok: true, saved };
  } catch {
    return { ok: false, message: "Couldn't open your contacts. Try again." };
  }
}

/* ── Spreadsheet ── */

/** A cell as text: quoted, and never read as a formula by the spreadsheet. */
function cell(value: unknown): string {
  let s = String(value ?? "").replace(/\r?\n/g, " ").trim();
  // A phone number like +91 98765 43210 is written as a text value, so it keeps
  // its + and isn't read as a sum. Only digits and phone punctuation qualify.
  if (/^\+[\d\s()-]{6,20}$/.test(s)) return `"=""${s}"""`;
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const day = (v: unknown) => {
  if (!v) return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export function leadsCsv(leads: ExportLead[]): string {
  const header = ["Name", "Phone", "Email", "Company", "Status", "From", "Message", "Received", "Follow-up", "Notes"];
  const rows = leads.map((l) => [
    l.fullName, l.phone, l.email, l.company, stageLabel(l.status), SOURCE_LABELS[l.source] ?? l.source,
    l.message, day(l.createdAt), day(l.followUpDate), l.notes,
  ]);
  // A byte-order mark so Excel reads Hindi and other scripts correctly.
  return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function shareLeadsCsv(leads: ExportLead[]): Promise<ExportResult> {
  const name = `digitalcarda-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = leadsCsv(leads);
  if (Platform.OS === "web") {
    // The web preview downloads the file instead.
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = globalThis.document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true };
  }
  try {
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this phone." };
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export enquiries", UTI: "public.comma-separated-values-text" });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't create the file. Try again." };
  }
}
