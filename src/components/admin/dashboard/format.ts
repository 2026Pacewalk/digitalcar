/* Money, number and time helpers for the super admin dashboard, plus the small
   hooks the sections share. Kept out of bits.tsx so that file exports only
   components (Fast Refresh needs that). Every date shown is India time. */
import { useEffect, useState, useSyncExternalStore } from "react";

export const IST = "Asia/Kolkata";
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Keyboard focus ring for every link and button on the page. */
export const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2";

const num = (v: unknown) => Number(v) || 0;

/** ₹12,34,567 — whole rupees, Indian grouping. */
export const inr = (v: unknown) => (num(v) < 0 ? "−₹" : "₹") + Math.round(Math.abs(num(v))).toLocaleString("en-IN");

/** ₹1.2L / ₹3.4K / ₹2.1Cr — for chart axes and tight spots. */
export function inrShort(v: unknown): string {
  const n = num(v);
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  const fmt = (x: number, unit: string) => `${sign}₹${Number(x.toFixed(x < 100 ? 1 : 0))}${unit}`;
  if (a >= 1e7) return fmt(a / 1e7, "Cr");
  if (a >= 1e5) return fmt(a / 1e5, "L");
  if (a >= 1e3) return fmt(a / 1e3, "K");
  return `${sign}₹${Math.round(a)}`;
}

export const nf = (v: unknown) => Math.round(num(v)).toLocaleString("en-IN");

/** Share of `of`, as a whole percent clamped to 0–100 (for bar widths). */
export const share = (n: number, of: number) => (of > 0 ? Math.max(0, Math.min(100, (n / of) * 100)) : 0);

/** % change vs the previous window; null when there's nothing to compare with. */
export const change = (now: number, before: number): number | null =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null;

export const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";

/* Server timestamps arrive as ISO strings — or, from a raw query, as MySQL
   "YYYY-MM-DD HH:MM:SS", which Safari won't parse without the "T". */
export function toMs(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v.includes("T") ? v : v.replace(" ", "T"));
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

export const istDate = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(ms).toLocaleString("en-IN", { timeZone: IST, ...opts });

/** Year, month (1–12), day and hour of a moment, on the India clock. */
export function istParts(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

/** "just now", "12 min ago", "3 h ago", "4 d ago", then the date. */
export function ago(v: string | Date | null | undefined, now: number): string {
  const t = toMs(v);
  if (t == null) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.max(1, Math.round(s / 60));
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 45) return `${d} d ago`;
  return istDate(t, { day: "numeric", month: "short", year: "numeric" });
}

/** A clock that ticks, so "5 min ago" labels stay true without reading the
    time during render. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

const RM = "(prefers-reduced-motion: reduce)";
const subscribeRM = (cb: () => void) => {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** True when the viewer asked for less motion (and while rendering on the server). */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => true);

/** Counts from 0 up to `target` once, on mount. Later changes (the minute
    refresh) show straight away — a number that re-counts every minute would
    be noise. */
export function useCountUp(target: number, animate: boolean, duration = 1100): number {
  const [frame, setFrame] = useState(() => ({ value: 0, done: !animate }));
  useEffect(() => {
    if (frame.done) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setFrame({ value: target * (1 - Math.pow(1 - p, 3)), done: p >= 1 });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, frame.done]);
  return frame.done ? target : frame.value;
}

/* Where visitors opened a card from — the same keys the tracker records. */
export const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct / typed", qr: "QR scan", nfc: "NFC tap", whatsapp: "WhatsApp", instagram: "Instagram",
  facebook: "Facebook", linkedin: "LinkedIn", twitter: "X (Twitter)", telegram: "Telegram",
  youtube: "YouTube", google: "Search", email: "Email", sms: "SMS", bio: "Link in bio", share: "Shared link",
  copy: "Copied link", referral: "Other sites", internal: "DigitalCarda",
};
export const humanise = (k: string) => (k || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
