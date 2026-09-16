/* Small email helpers shared by the sign-in and password-recovery pages. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Common address typos (Indian mail users especially). Offered, never applied
   silently — the person taps the suggestion to accept it. */
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmail.in": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahooo.com": "yahoo.com", "yhoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "outllok.com": "outlook.com",
  "rediffmial.com": "rediffmail.com", "redifmail.com": "rediffmail.com", "rediffmail.co": "rediffmail.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com",
};

export function emailSuggestion(v: string): string {
  const t = v.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at < 1) return "";
  const fix = DOMAIN_FIXES[t.slice(at + 1)];
  return fix ? `${t.slice(0, at)}@${fix}` : "";
}

/* A direct link to the person's webmail inbox, when their address is on a
   provider we can open. Business domains (e.g. @sharmasweets.in) return null —
   we can't know where those are hosted, so no guess is shown. */
export function inboxFor(email: string): { label: string; href: string } | null {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  if (domain === "gmail.com" || domain === "googlemail.com") return { label: "Open Gmail", href: "https://mail.google.com/mail/u/0/#inbox" };
  if (["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.in", "hotmail.co.in", "live.in"].includes(domain)) return { label: "Open Outlook", href: "https://outlook.live.com/mail/0/inbox" };
  if (domain.startsWith("yahoo.") || domain === "ymail.com" || domain === "rocketmail.com") return { label: "Open Yahoo Mail", href: "https://mail.yahoo.com" };
  if (domain === "rediffmail.com") return { label: "Open Rediffmail", href: "https://mail.rediff.com" };
  if (domain.startsWith("zoho.") || domain === "zohomail.in" || domain === "zohomail.com") return { label: "Open Zoho Mail", href: "https://mail.zoho.in" };
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return { label: "Open iCloud Mail", href: "https://www.icloud.com/mail" };
  return null;
}
