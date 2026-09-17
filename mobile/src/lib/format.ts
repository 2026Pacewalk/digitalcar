/* Small display helpers shared by the screens. */

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dateLabel(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string | null | undefined): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "D";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const firstName = (name: string | null | undefined) => String(name || "").trim().split(/\s+/)[0] || "";

/** Digits only, with India's country code added to a bare 10-digit mobile. */
export function phoneDigits(phone: string | null | undefined): string {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
}

export const telLink = (phone: string) => `tel:+${phoneDigits(phone)}`;
export const whatsappLink = (phone: string, text?: string) =>
  `https://wa.me/${phoneDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const compact = (n: number | null | undefined) => {
  const v = Number(n || 0);
  if (v >= 100_000) return `${(v / 100_000).toFixed(v >= 1_000_000 ? 0 : 1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return String(v);
};

export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
