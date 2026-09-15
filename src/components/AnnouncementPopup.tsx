/*
 * Offer / festival announcement popup, run from Admin → Offer Popups.
 *
 * Shows the one live announcement for this audience (public site or
 * dashboard) a few seconds after the page opens, once per visitor per version
 * of the announcement — editing it shows it again. The same card renders the
 * live preview in the admin editor.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";
import { Check, Copy, Megaphone, PartyPopper, Sparkles, X, type LucideIcon } from "lucide-react";
import { trpc } from "@/providers/trpc";

export type AnnouncementTheme = "diwali" | "holi" | "newyear" | "festive" | "brand" | "dark";

export type AnnouncementView = {
  title: string;
  message: string | null;
  kind: "offer" | "teaser" | "info";
  theme: AnnouncementTheme;
  badge: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  countdownTo: Date | string | null;
  coupon: {
    code: string;
    discountType: "percent" | "flat";
    discountValue: number;
    maxDiscount: number | null;
    minAmount: number | null;
    validUntil: Date | string | null;
    description?: string | null;
  } | null;
};

type ThemeTokens = {
  bg: string; text: string; muted: string; accent: string; accentText: string; glow: string;
  sparkles: string[]; icon: LucideIcon; panel: string;
};

export const ANNOUNCEMENT_THEMES: Record<AnnouncementTheme, ThemeTokens & { label: string }> = {
  diwali: {
    label: "Diwali", icon: Sparkles,
    bg: "radial-gradient(130% 100% at 50% 0%, #9A3412 0%, #4C1D95 50%, #1E0B2E 100%)",
    text: "#FFF7ED", muted: "rgba(255,247,237,0.8)", accent: "#FBBF24", accentText: "#2A1204", glow: "#F59E0B",
    sparkles: ["#FBBF24", "#FB923C", "#FDE68A"], panel: "rgba(255,255,255,0.1)",
  },
  holi: {
    label: "Holi", icon: PartyPopper,
    bg: "linear-gradient(140deg, #EC4899 0%, #8B5CF6 48%, #06B6D4 100%)",
    text: "#FFFFFF", muted: "rgba(255,255,255,0.88)", accent: "#FDE047", accentText: "#3B0764", glow: "#F472B6",
    sparkles: ["#FDE047", "#F9A8D4", "#A5F3FC"], panel: "rgba(255,255,255,0.16)",
  },
  newyear: {
    label: "New Year", icon: PartyPopper,
    bg: "radial-gradient(130% 100% at 50% 0%, #1D4ED8 0%, #0B1120 72%)",
    text: "#F8FAFC", muted: "rgba(226,232,240,0.82)", accent: "#F7B31C", accentText: "#0B1120", glow: "#60A5FA",
    sparkles: ["#F7B31C", "#E0F2FE", "#93C5FD"], panel: "rgba(255,255,255,0.1)",
  },
  festive: {
    label: "Festive", icon: Sparkles,
    bg: "linear-gradient(145deg, #0B1120 0%, #312E81 55%, #9A3412 100%)",
    text: "#F8FAFC", muted: "rgba(226,232,240,0.82)", accent: "#F7B31C", accentText: "#0B1120", glow: "#A78BFA",
    sparkles: ["#F7B31C", "#C4B5FD", "#FDBA74"], panel: "rgba(255,255,255,0.1)",
  },
  brand: {
    label: "Brand gold", icon: Megaphone,
    bg: "linear-gradient(145deg, #FBBF24 0%, #D97706 100%)",
    text: "#0B1120", muted: "rgba(11,17,32,0.74)", accent: "#0B1120", accentText: "#FBBF24", glow: "#FEF3C7",
    sparkles: ["#FFFFFF", "#FEF3C7", "#0B1120"], panel: "rgba(11,17,32,0.1)",
  },
  dark: {
    label: "Dark", icon: Megaphone,
    bg: "linear-gradient(145deg, #0B1120 0%, #1E293B 100%)",
    text: "#F8FAFC", muted: "rgba(203,213,225,0.9)", accent: "#F7B31C", accentText: "#0B1120", glow: "#F7B31C",
    sparkles: ["#F7B31C", "#94A3B8", "#FDE68A"], panel: "rgba(255,255,255,0.08)",
  },
};

// Fixed positions so the sparkles never jump between renders.
const SPARKLES = [
  { top: 8, left: 12, size: 6, delay: 0 }, { top: 14, left: 84, size: 4, delay: 0.8 }, { top: 30, left: 6, size: 3, delay: 1.6 },
  { top: 22, left: 70, size: 5, delay: 2.2 }, { top: 48, left: 92, size: 4, delay: 0.4 }, { top: 62, left: 4, size: 5, delay: 1.2 },
  { top: 78, left: 88, size: 3, delay: 2.8 }, { top: 88, left: 16, size: 4, delay: 2 }, { top: 6, left: 46, size: 3, delay: 3.2 },
];

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const dayLabel = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function useCountdown(target: Date | string | null) {
  const targetMs = target ? new Date(target).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetMs || targetMs <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  const left = targetMs - now;
  if (!targetMs || left <= 0) return null;
  const s = Math.floor(left / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Where the button goes. Dashboard links from the public site go through sign-in,
    and an offer's coupon rides along to the checkout so it applies itself. */
function ctaHref(a: AnnouncementView, audience: "public" | "dashboard"): string | null {
  let url = a.ctaUrl || (a.coupon ? "/dashboard/subscription" : null);
  if (!url) return null;
  if (a.coupon && url.startsWith("/dashboard/subscription") && !url.includes("coupon=")) {
    url += `${url.includes("?") ? "&" : "?"}coupon=${encodeURIComponent(a.coupon.code)}`;
  }
  if (audience === "public" && url.startsWith("/dashboard")) return `/login?next=${encodeURIComponent(url)}`;
  return url;
}

export function AnnouncementCard({ a, audience = "public", onClose, onCta, preview = false }: {
  a: AnnouncementView;
  audience?: "public" | "dashboard";
  onClose?: () => void;
  onCta?: () => void;
  preview?: boolean;
}) {
  const t = ANNOUNCEMENT_THEMES[a.theme] ?? ANNOUNCEMENT_THEMES.festive;
  const Icon = t.icon;
  const countdown = useCountdown(a.countdownTo);
  const [copied, setCopied] = useState(false);
  const badge = a.badge || (a.kind === "teaser" ? "Coming soon" : a.kind === "offer" ? "Limited offer" : "New");
  const href = ctaHref(a, audience);
  const ctaText = a.ctaLabel || (a.coupon ? "Use my code" : a.kind === "teaser" ? "Explore plans" : "Learn more");
  const c = a.coupon;

  const copy = async () => {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      toast.success(`Code ${c.code} copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Couldn't copy — note the code down"); }
  };

  const ctaClass = "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none";
  const ctaStyle = { background: t.accent, color: t.accentText };

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] shadow-[0_40px_90px_-30px_rgba(2,6,23,0.8)]" style={{ background: t.bg, color: t.text }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl" style={{ background: t.glow, opacity: 0.35 }} />
        {SPARKLES.map((sp, i) => (
          <span key={i} className="absolute rounded-full motion-safe:animate-pulse"
            style={{ top: `${sp.top}%`, left: `${sp.left}%`, width: sp.size, height: sp.size, background: t.sparkles[i % t.sparkles.length], boxShadow: `0 0 ${sp.size * 3}px ${t.sparkles[i % t.sparkles.length]}`, animationDelay: `${sp.delay}s` }} />
        ))}
      </div>

      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{ background: t.panel, color: t.text }}>
          <X size={17} />
        </button>
      )}

      <div className="relative px-6 pb-6 pt-8 text-center sm:px-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: t.panel, color: t.accent, boxShadow: `0 0 44px ${t.glow}66` }}>
          <Icon size={26} />
        </span>
        <span className="mt-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ color: t.accent, border: `1px solid ${t.accent}66`, background: t.panel }}>
          {badge}
        </span>
        <h2 className="mt-3 text-[1.6rem] font-extrabold leading-[1.15] tracking-tight sm:text-[1.9rem]">{a.title}</h2>
        {a.message && <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed" style={{ color: t.muted }}>{a.message}</p>}

        {c && (
          <div className="relative mt-5 flex items-stretch overflow-hidden rounded-2xl bg-white text-left text-[#0F172A] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
            <div className="flex w-[40%] shrink-0 flex-col items-center justify-center px-2 py-4 text-center" style={{ background: t.accent, color: t.accentText }}>
              <span className="text-[28px] font-black leading-none tabular-nums">
                {c.discountType === "percent" ? `${c.discountValue}%` : inr(c.discountValue)}
              </span>
              <span className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.2em]">Off</span>
              {c.discountType === "percent" && c.maxDiscount ? <span className="mt-1 text-[10px] font-semibold opacity-80">up to {inr(c.maxDiscount)}</span> : null}
            </div>
            <span aria-hidden="true" className="absolute bottom-3 left-[40%] top-3 border-l-2 border-dashed border-[#E2E8F0]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">Use code</span>
              <div className="flex items-center gap-2">
                <span className="truncate rounded-lg border-2 border-dashed border-[#CBD5E1] px-2.5 py-1 font-mono text-[16px] font-extrabold tracking-wider">{c.code}</span>
                <button type="button" onClick={copy} aria-label={`Copy code ${c.code}`} disabled={preview}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]">
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
              </div>
              <span className="text-[11px] leading-snug text-[#64748B]">
                On plan upgrades{c.minAmount ? ` above ${inr(c.minAmount)}` : ""}{c.validUntil ? ` · till ${dayLabel(c.validUntil)}` : ""}
              </span>
            </div>
          </div>
        )}

        {countdown && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: t.muted }}>
              {a.kind === "teaser" ? "Goes live in" : "Offer ends in"}
            </p>
            <div className="mt-2 flex justify-center gap-2" role="timer" aria-live="off">
              {([["Days", countdown.d], ["Hrs", countdown.h], ["Min", countdown.m], ["Sec", countdown.s]] as const).map(([label, v]) => (
                <span key={label} className="flex min-w-[58px] flex-col items-center rounded-xl px-2 py-2" style={{ background: t.panel }}>
                  <span className="text-[22px] font-extrabold leading-none tabular-nums">{String(v).padStart(2, "0")}</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {href && (preview
          ? <span className={ctaClass} style={ctaStyle}>{ctaText}</span>
          : href.startsWith("/")
            ? <Link to={href} onClick={onCta} className={ctaClass} style={ctaStyle}>{ctaText}</Link>
            : <a href={href} target="_blank" rel="noreferrer" onClick={onCta} className={ctaClass} style={ctaStyle}>{ctaText}</a>)}

        {onClose && (
          <button type="button" onClick={onClose} className="mt-3 text-[13px] font-semibold underline-offset-4 hover:underline" style={{ color: t.muted }}>
            {href ? "Maybe later" : "Got it"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementPopup({ audience }: { audience: "public" | "dashboard" }) {
  const { pathname } = useLocation();
  // Admin screens are for running the business, not for being sold to.
  const skip = audience === "dashboard" && pathname.startsWith("/admin");
  const { data } = trpc.announcement.current.useQuery(
    { audience },
    { enabled: !skip, staleTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false },
  );
  const [open, setOpen] = useState(false);
  const key = data ? `dc_ann_${data.id}_${data.version}` : "";

  useEffect(() => {
    if (!data || skip) return;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch { /* storage blocked — just show it */ }
    if (seen) return;
    const timer = setTimeout(() => setOpen(true), 3500);
    return () => clearTimeout(timer);
  }, [data, key, skip]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(key, "1"); } catch { /* storage blocked */ }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={data.title}>
      <div className="absolute inset-0 bg-[#020617]/65 backdrop-blur-sm" onClick={dismiss} style={{ animation: "fadeIn .2s ease-out" }} />
      <div className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto" style={{ animation: "scaleIn .3s cubic-bezier(.2,.8,.2,1)" }}>
        <AnnouncementCard a={data} audience={audience} onClose={dismiss} onCta={dismiss} />
      </div>
    </div>
  );
}
