/* Small building blocks shared by the dashboard sections: the card shell,
   links that only link when the viewer may open the page, the change chip,
   sparkline, ranked bars, chart tooltip and empty state. */
import { useId, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { FOCUS, change, inr, nf, share } from "./format";

export type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

/** The white card every section sits in. */
export function Panel({ title, sub, icon: Icon, tint, action, className = "", children }: {
  title: string;
  sub?: ReactNode;
  icon?: IconType;
  tint?: { bg: string; fg: string };
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4 sm:p-5 min-w-0 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && (
            <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint?.bg ?? "#F1F5F9", color: tint?.fg ?? "#475569" }}>
              <Icon size={16} />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={id} className="font-display text-[15px] font-bold text-[#0F172A] leading-tight">{title}</h2>
            {sub && <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </header>
      {children}
    </section>
  );
}

/** "View all →" — hidden when the viewer can't open the page. */
export function ViewLink({ to, show = true, dark, children }: { to: string; show?: boolean; dark?: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-0.5 rounded-md text-xs font-semibold hover:underline ${dark ? "text-[#FCD34D] hover:text-[#FDE68A] focus-visible:ring-offset-[#0F172A]" : "text-[#B45309] hover:text-[#92400E]"} ${FOCUS}`}
    >
      {children}<ChevronRight size={13} aria-hidden="true" />
    </Link>
  );
}

/** A row or tile that opens its page when the viewer may, and is plain otherwise. */
export function MaybeLink({ to, allowed, className = "", label, children }: {
  to: string | null | undefined;
  allowed: boolean;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  if (to && allowed) return <Link to={to} aria-label={label} className={`${className} ${FOCUS}`}>{children}</Link>;
  return <div className={className}>{children}</div>;
}

type Tone = "gold" | "emerald" | "green" | "red" | "amber" | "blue" | "slate" | "rose" | "indigo" | "violet";
const PILL: Record<Tone, string> = {
  gold: "bg-[#FEF3C7] text-[#92400E]",
  emerald: "bg-[#D1FAE5] text-[#065F46]",
  green: "bg-[#DCFCE7] text-[#15803D]",
  red: "bg-[#FEE2E2] text-[#B91C1C]",
  amber: "bg-[#FEF3C7] text-[#B45309]",
  blue: "bg-[#DBEAFE] text-[#1D4ED8]",
  slate: "bg-[#F1F5F9] text-[#475569]",
  rose: "bg-[#FFE4E6] text-[#BE123C]",
  indigo: "bg-[#E0E7FF] text-[#4338CA]",
  violet: "bg-[#EDE9FE] text-[#6D28D9]",
};
export function Pill({ tone = "slate", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-4 whitespace-nowrap ${PILL[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Up / down / new against an earlier window. `pct` wins when the server
    already worked the change out. */
export function DeltaChip({ now, before = 0, pct, context, dark }: {
  now: number;
  before?: number;
  pct?: number | null;
  context: string;
  dark?: boolean;
}) {
  const d = pct !== undefined ? pct : change(now, before);
  if (d === null && now <= 0) return null;
  const kind = d === null ? "new" : d > 0 ? "up" : d < 0 ? "down" : "flat";
  const cls = {
    up: dark ? "bg-[#16A34A]/20 text-[#4ADE80]" : "bg-[#DCFCE7] text-[#15803D]",
    down: dark ? "bg-[#DC2626]/20 text-[#FCA5A5]" : "bg-[#FEE2E2] text-[#B91C1C]",
    flat: dark ? "bg-white/10 text-[#CBD5E1]" : "bg-[#F1F5F9] text-[#64748B]",
    new: dark ? "bg-[#2563EB]/25 text-[#93C5FD]" : "bg-[#DBEAFE] text-[#1D4ED8]",
  }[kind];
  const Icon = kind === "up" ? TrendingUp : kind === "down" ? TrendingDown : kind === "flat" ? Minus : null;
  const text = d === null ? "new" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}%`;
  const said = d === null ? `new — nothing ${context}` : d === 0 ? `same as ${context}` : `${d > 0 ? "up" : "down"} ${Math.abs(d)}% ${context}`;
  return (
    <span title={said} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap ${cls}`}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{said}</span>
    </span>
  );
}

/** A tiny trend line — plain SVG, so a tile never pays for a chart library. */
export function Sparkline({ values, color, className = "h-9" }: { values: number[]; color: string; className?: string }) {
  const gid = "sp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 32;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (Math.max(0, v) / max) * (h - 4)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Proportions as one thin bar, a 2px gap between the parts. */
export function SplitBar({ parts, className = "h-1.5" }: { parts: { key: string; value: number; color: string }[]; className?: string }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div className={`flex gap-[2px] rounded-full overflow-hidden bg-[#F1F5F9] ${className}`} aria-hidden="true">
      {shown.map((p) => (
        <span key={p.key} className="h-full" style={{ flexGrow: p.value, flexBasis: 0, minWidth: 3, background: p.color }} />
      ))}
    </div>
  );
}

/** A colour key: swatch + text in ink, never text in the series colour. */
export function Key({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Ranked horizontal bars — sources, devices, actions. Never a pie. `rows` may
    be just the top few; `total` is the whole list's, so each % is of all of it. */
export function RankedBars({ rows, total, color, empty, icons }: {
  rows: { key: string; label: string; value: number }[];
  total: number;
  color: string;
  empty: string;
  icons?: Record<string, IconType>;
}) {
  if (!rows.length) return <p className="text-[13px] text-[#94A3B8] py-2">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const Icon = icons?.[r.key];
        return (
          <li key={r.key} className="flex items-center gap-2.5">
            {Icon && <span className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#64748B] flex items-center justify-center shrink-0"><Icon size={14} /></span>}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[12.5px] font-medium text-[#334155] truncate">{r.label}</span>
                <span className="text-[12.5px] font-bold text-[#0F172A] tabular-nums shrink-0">
                  {nf(r.value)} <span className="text-[10.5px] font-medium text-[#94A3B8]">· {Math.round(share(r.value, total))}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${share(r.value, max)}%`, minWidth: r.value > 0 ? 4 : 0, background: color }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type TipRow = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };
/** The dark rounded tooltip used by every chart. */
export function ChartTip({ active, payload, label, money }: { active?: boolean; payload?: TipRow[]; label?: string | number; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0F172A] text-white px-3 py-2 shadow-lg ring-1 ring-white/10 text-[12px] min-w-[150px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} aria-hidden="true" />
          <span className="text-[#CBD5E1]">{p.name}</span>
          <b className="ml-auto pl-3 tabular-nums">{money ? inr(p.value) : nf(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

/** What a chart shows before there's anything to plot: faint ghost bars and
    one line saying what will appear here. */
export function ChartEmpty({ icon: Icon, title, hint, dark, className = "h-[200px]" }: {
  icon: IconType;
  title: string;
  hint?: string;
  dark?: boolean;
  className?: string;
}) {
  const ghost = [26, 38, 32, 50, 44, 58, 48, 66, 56, 74, 64, 82];
  return (
    <div className={`relative flex flex-col items-center justify-center text-center rounded-xl border border-dashed overflow-hidden px-6 ${dark ? "border-white/10" : "border-[#E2E8F0] bg-[#F8FAFC]/70"} ${className}`}>
      <div aria-hidden="true" className="absolute inset-x-5 bottom-0 h-3/5 flex items-end gap-1.5 sm:gap-2">
        {ghost.map((h, i) => (
          <span key={i} className={`flex-1 rounded-t-[4px] ${dark ? "bg-white/[0.035]" : "bg-[#EEF2F6]"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${dark ? "bg-white/[0.06] text-[#F7B31C]" : "bg-white text-[#94A3B8] shadow-sm"}`}>
        <Icon size={18} />
      </span>
      <p className={`relative text-[13px] font-semibold ${dark ? "text-white" : "text-[#334155]"}`}>{title}</p>
      {hint && <p className={`relative text-xs mt-1 max-w-xs ${dark ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{hint}</p>}
    </div>
  );
}

/** Loading placeholder with the house shimmer. */
export function Skel({ className = "", dark }: { className?: string; dark?: boolean }) {
  return <div className={`${dark ? "skeleton-dark" : "skeleton"} ${className}`} aria-hidden="true" />;
}
