/* Smart-sharing helpers for public cards: a real "Save Contact" (vCard download
   so the owner lands in the visitor's phone book) and native share with a
   copy-link fallback. These power the viral loop — every save/share puts the
   card in front of a new person. */

export interface VCardData {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  url?: string; // the public card URL — stored as a note
}

// vCard values must escape backslash, comma, semicolon and newlines.
const esc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/([;,])/g, "\\$1").replace(/\r?\n/g, "\\n");

export function buildVCard(d: VCardData): string {
  const name = (d.name || "").trim() || "Contact";
  const parts = name.split(/\s+/);
  const first = parts.shift() || name;
  const last = parts.join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(last)};${esc(first)};;;`, `FN:${esc(name)}`];
  if (d.company) lines.push(`ORG:${esc(d.company)}`);
  if (d.title) lines.push(`TITLE:${esc(d.title)}`);
  if (d.phone) lines.push(`TEL;TYPE=CELL:${esc(d.phone)}`);
  if (d.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(d.email)}`);
  if (d.website) lines.push(`URL:${esc(d.website)}`);
  if (d.address) lines.push(`ADR;TYPE=WORK:;;${esc(d.address)};;;;`);
  if (d.url) lines.push(`NOTE:${esc("Digital card: " + d.url)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Download the owner's contact as a .vcf so it saves straight to the phone. */
export function downloadVCard(d: VCardData): void {
  const blob = new Blob([buildVCard(d)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(d.name || "contact").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Native share sheet when available, otherwise copy the link to the clipboard.
 * Returns "shared" | "copied" | "cancelled" | "failed" so the caller can toast.
 */
export async function shareCard(opts: { url: string; title?: string; text?: string }): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const { url, title, text } = opts;
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share({ title: title || "Digital Card", text: text || "", url });
      return "shared";
    } catch (e) {
      // The user dismissing the native sheet throws AbortError — do nothing.
      if ((e as Error)?.name === "AbortError") return "cancelled";
      // Other failures fall through to the copy path.
    }
  }
  try {
    await nav!.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
