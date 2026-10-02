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
import { getAuthUser } from "@/hooks/useCustomer";

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
    // Night sky over a lit street: plum to deep indigo, with the lamps' warmth
    // painted in by DiwaliScene below.
    bg: "radial-gradient(120% 95% at 50% 0%, #4C1D95 0%, #2E1065 38%, #150B2E 72%, #0B0618 100%)",
    text: "#FFF7ED", muted: "rgba(255,247,237,0.82)", accent: "#FBBF24", accentText: "#2A1204", glow: "#F59E0B",
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

/* ── Diwali scene ──────────────────────────────────────────────────────
   The Diwali popup is drawn, not just coloured: a marigold toran across the
   top, a faint rangoli behind the headline, firework bursts in the night sky,
   and a row of oil lamps along the bottom whose flames flicker. Everything is
   inline SVG + CSS (no images to load), decorative (aria-hidden), and still
   when the visitor asks for reduced motion. */

/** One marigold flower of the garland. */
const Marigold = ({ cx, cy, r, hue }: { cx: number; cy: number; r: number; hue: string }) => (
  <g>
    {[0, 45, 90, 135].map((a) => (
      <ellipse key={a} cx={cx} cy={cy} rx={r} ry={r * 0.55} fill={hue} opacity={0.85} transform={`rotate(${a} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.42} fill="#FDE68A" opacity={0.9} />
  </g>
);

/** Marigold + leaf garland hung across the top. */
function Toran() {
  const flowers = [6, 18, 30, 42, 54, 66, 78, 90];
  return (
    <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[26px] w-full" aria-hidden="true">
      <path d="M0 3 Q 50 17 100 3" fill="none" stroke="#065F46" strokeWidth="0.7" opacity="0.85" />
      {flowers.map((x, i) => {
        // Sit each flower on the curve, with a leaf hanging below every other one.
        const t = x / 100, y = 3 + 14 * (4 * t * (1 - t));
        return (
          <g key={x}>
            <line x1={x} y1={y} x2={x} y2={y + (i % 2 ? 4.5 : 2.8)} stroke="#047857" strokeWidth="0.45" opacity="0.8" />
            <Marigold cx={x} cy={y + (i % 2 ? 6 : 4.2)} r={i % 2 ? 2.6 : 2.1} hue={i % 3 === 0 ? "#FB923C" : i % 3 === 1 ? "#FBBF24" : "#F97316"} />
          </g>
        );
      })}
    </svg>
  );
}

/** Faint rangoli mandala behind the headline. */
const Rangoli = () => (
  <svg viewBox="0 0 120 120" className="absolute left-1/2 top-[10%] h-[180px] w-[180px] -translate-x-1/2 opacity-[0.10]" aria-hidden="true">
    {[0, 30, 60, 90, 120, 150].map((a) => (
      <ellipse key={a} cx="60" cy="60" rx="46" ry="17" fill="none" stroke="#FDE68A" strokeWidth="0.8" transform={`rotate(${a} 60 60)`} />
    ))}
    {[14, 26, 38].map((r) => <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="#FBBF24" strokeWidth="0.6" strokeDasharray="2 3" />)}
    <circle cx="60" cy="60" r="5" fill="#FBBF24" opacity="0.5" />
  </svg>
);

/** A clay lamp. The flame flickers; the halo breathes. */
const Diya = ({ className, delay, scale = 1 }: { className: string; delay: number; scale?: number }) => (
  <svg viewBox="0 0 60 46" className={className} style={{ width: 60 * scale, height: 46 * scale }} aria-hidden="true">
    <ellipse cx="30" cy="14" rx="17" ry="15" fill="#F59E0B" opacity="0.28" className="dc-diya-glow" style={{ animationDelay: `${delay}s` }} />
    <g className="dc-flame" style={{ animationDelay: `${delay}s` }}>
      <path d="M30 6 C34 12 35.5 16 35.5 19.5 C35.5 23.6 33 26.5 30 26.5 C27 26.5 24.5 23.6 24.5 19.5 C24.5 16 26 12 30 6 Z" fill="url(#dcFlameFill)" />
      <path d="M30 14 C31.8 17 32.5 19 32.5 20.8 C32.5 23 31.4 24.4 30 24.4 C28.6 24.4 27.5 23 27.5 20.8 C27.5 19 28.2 17 30 14 Z" fill="#FFF7D6" opacity="0.95" />
    </g>
    <path d="M12 30 C12 38 20 43 30 43 C40 43 48 38 48 30 Z" fill="url(#dcClayFill)" />
    <ellipse cx="30" cy="30" rx="18" ry="4.6" fill="#92400E" />
    <ellipse cx="30" cy="29.4" rx="14" ry="3.2" fill="#B45309" opacity="0.9" />
    <path d="M12 30 C12 38 20 43 30 43" fill="none" stroke="#FCD34D" strokeWidth="0.9" opacity="0.5" />
    <defs>
      <linearGradient id="dcFlameFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FEF3C7" /><stop offset="55%" stopColor="#FBBF24" /><stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
      <linearGradient id="dcClayFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#C2410C" /><stop offset="100%" stopColor="#7C2D12" />
      </linearGradient>
    </defs>
  </svg>
);

/** A firework burst: spokes from a point, fading out. */
const Burst = ({ style, color }: { style: React.CSSProperties; color: string }) => (
  <svg viewBox="0 0 40 40" className="dc-burst absolute h-16 w-16" style={style} aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => (
      <g key={a} transform={`rotate(${a} 20 20)`}>
        <line x1="20" y1="11" x2="20" y2="4" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
        <circle cx="20" cy="3" r="1.1" fill={color} />
      </g>
    ))}
    <circle cx="20" cy="20" r="2" fill="#FFF7D6" opacity="0.9" />
  </svg>
);

const EMBERS = [
  { left: 12, bottom: 18, size: 3, delay: 0, hue: "#FBBF24" }, { left: 26, bottom: 10, size: 2, delay: 1.4, hue: "#FB923C" },
  { left: 44, bottom: 14, size: 3, delay: 2.6, hue: "#FDE68A" }, { left: 62, bottom: 9, size: 2, delay: 0.8, hue: "#FBBF24" },
  { left: 78, bottom: 16, size: 3, delay: 3.4, hue: "#FB923C" }, { left: 90, bottom: 11, size: 2, delay: 2, hue: "#FDE68A" },
];

function DiwaliScene() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* night sky warmth, strongest at the lamps */}
      <span className="absolute inset-x-0 bottom-0 h-40" style={{ background: "radial-gradient(70% 100% at 50% 100%, rgba(245,158,11,0.38) 0%, rgba(245,158,11,0.10) 45%, transparent 75%)" }} />
      <Rangoli />
      <Burst style={{ top: "6%", left: "4%", animationDelay: "1.2s" }} color="#FDE68A" />
      <Burst style={{ top: "12%", right: "3%", animationDelay: "3.6s" }} color="#FCA5A5" />
      <Burst style={{ top: "30%", left: "16%", animationDelay: "5.1s" }} color="#FBBF24" />
      <Toran />
      {EMBERS.map((e, i) => (
        <span key={i} className="dc-ember absolute rounded-full"
          style={{ left: `${e.left}%`, bottom: e.bottom, width: e.size, height: e.size, background: e.hue, boxShadow: `0 0 ${e.size * 4}px ${e.hue}`, animationDelay: `${e.delay}s` }} />
      ))}
      {/* the row of lamps the whole card sits on */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-4 pb-0.5">
        <Diya className="opacity-90" delay={0.3} scale={0.5} />
        <Diya className="" delay={0} scale={0.62} />
        <Diya className="opacity-90" delay={0.6} scale={0.5} />
      </div>
      {/* gold foil edge */}
      <span className="absolute inset-0 rounded-[22px]" style={{ boxShadow: "inset 0 0 0 1px rgba(253,230,138,0.35), inset 0 0 40px rgba(245,158,11,0.18)" }} />
    </div>
  );
}

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
  // Diwali gets its own drawn scene, so the content leaves room for the
  // garland at the top and the row of lamps at the bottom.
  const diwali = a.theme === "diwali";
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

  const ctaClass = "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-bold shadow-[0_10px_22px_-12px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none";
  const ctaStyle = { background: t.accent, color: t.accentText };

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] shadow-[0_30px_70px_-26px_rgba(2,6,23,0.8)]" style={{ background: t.bg, color: t.text }}>
      {diwali ? <DiwaliScene /> : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl" style={{ background: t.glow, opacity: 0.35 }} />
          {SPARKLES.map((sp, i) => (
            <span key={i} className="absolute rounded-full motion-safe:animate-pulse"
              style={{ top: `${sp.top}%`, left: `${sp.left}%`, width: sp.size, height: sp.size, background: t.sparkles[i % t.sparkles.length], boxShadow: `0 0 ${sp.size * 3}px ${t.sparkles[i % t.sparkles.length]}`, animationDelay: `${sp.delay}s` }} />
          ))}
        </div>
      )}

      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{ background: t.panel, color: t.text }}>
          <X size={15} />
        </button>
      )}

      <div className={`relative px-4 text-center ${diwali ? "pb-9 pt-7" : "pb-4 pt-5"}`}>
        {/* The badge carries the icon, so the card loses a whole row. */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]"
          style={{ color: t.accent, border: `1px solid ${t.accent}66`, background: t.panel }}>
          <Icon size={12} /> {badge}
        </span>
        <h2 className="mt-2 text-[1.15rem] font-extrabold leading-[1.2] tracking-tight">{a.title}</h2>
        {a.message && <p className="dc-clamp-2 mx-auto mt-1 text-[12px] leading-snug" style={{ color: t.muted }}>{a.message}</p>}

        {c && (
          <div className="relative mt-3 flex items-stretch overflow-hidden rounded-xl bg-white text-left text-[#0F172A] shadow-[0_12px_26px_-16px_rgba(0,0,0,0.6)]">
            <div className="flex w-[34%] shrink-0 flex-col items-center justify-center px-1.5 py-2" style={{ background: t.accent, color: t.accentText }}>
              <span className="text-[19px] font-black leading-none tabular-nums">
                {c.discountType === "percent" ? `${c.discountValue}%` : inr(c.discountValue)}
              </span>
              <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em]">Off</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[13.5px] font-extrabold tracking-wider">{c.code}</span>
                <span className="block truncate text-[10px] text-[#64748B]">
                  {c.validUntil ? `Till ${dayLabel(c.validUntil)}` : "On plan upgrades"}{c.minAmount ? ` · above ${inr(c.minAmount)}` : ""}
                </span>
              </span>
              <button type="button" onClick={copy} aria-label={`Copy code ${c.code}`} disabled={preview}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]">
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        )}

        {countdown && (
          /* One line instead of four boxes: days and hours are what people act on. */
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums"
            style={{ background: t.panel, color: t.text }} role="timer" aria-live="off">
            <span style={{ color: t.muted }}>{a.kind === "teaser" ? "Live in" : "Ends in"}</span>
            {countdown.d > 0 && <span>{countdown.d}d</span>}
            <span>{String(countdown.h).padStart(2, "0")}h</span>
            <span>{String(countdown.m).padStart(2, "0")}m</span>
            {countdown.d === 0 && <span>{String(countdown.s).padStart(2, "0")}s</span>}
          </p>
        )}

        {href && (preview
          ? <span className={ctaClass} style={ctaStyle}>{ctaText}</span>
          : href.startsWith("/")
            ? <Link to={href} onClick={onCta} className={ctaClass} style={ctaStyle}>{ctaText}</Link>
            : <a href={href} target="_blank" rel="noreferrer" onClick={onCta} className={ctaClass} style={ctaStyle}>{ctaText}</a>)}

        {onClose && (
          <button type="button" onClick={onClose} className="mt-2 text-[11.5px] font-semibold underline-offset-4 hover:underline" style={{ color: t.muted }}>
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
  // Dashboard offers are card-owner offers (plans, coupons): not for the admin or partner portals.
  const skip = audience === "dashboard" && (pathname.startsWith("/admin") || pathname.startsWith("/reseller") || getAuthUser()?.role !== "customer");
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
    // 10 seconds in: long enough that it never lands on someone still reading
    // the top of the page, short enough to catch them before they leave.
    const timer = setTimeout(() => setOpen(true), 10_000);
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
  /* A corner card, not a blocking dialog: it slides in at the bottom right and
     the page stays usable behind it. On phones it sits above the tab bar. */
  return (
    <div
      role="dialog" aria-label={data.title}
      className="fixed bottom-20 right-3 z-[80] w-[min(300px,calc(100vw-1.5rem))] max-h-[78vh] overflow-y-auto sm:bottom-5 sm:right-5 lg:bottom-6 lg:right-6"
      style={{ animation: "dcCornerIn .35s cubic-bezier(.2,.8,.2,1)" }}
    >
      <AnnouncementCard a={data} audience={audience} onClose={dismiss} onCta={dismiss} />
    </div>
  );
}
