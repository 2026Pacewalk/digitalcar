import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { getActiveCardId } from "@/hooks/useCustomer";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  Eye, MessageSquare, BarChart3, QrCode, Phone, MessageCircle, Mail, Globe, MapPin,
  UserPlus, Share2, Users, ShoppingBag, MousePointerClick, Activity, TrendingUp, TrendingDown,
  ArrowRight, Clock, Smartphone, Tablet, Monitor, Download, Printer, Repeat,
  Layers, Radio, Minus,
} from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (ymd: string) => { const [, m, d] = (ymd || "").split("-"); return m && d ? `${d} ${MONTHS[Number(m) - 1]}` : ymd; };
const nf = (n: number) => Number(n || 0).toLocaleString("en-IN");
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

/* "1m 12s" — an average dwell time is far easier to read than 72,431 ms. */
function fmtDuration(ms: number): string {
  const s = Math.round(Number(ms || 0) / 1000);
  if (s <= 0) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/* Human labels + colours for every tracked action. Keys match the server's
   event types exactly; anything unrecognised still renders, humanised. */
const ACTION_META: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  qr_scan: { label: "QR Scans", icon: QrCode, color: "#6366F1" },
  call: { label: "Calls", icon: Phone, color: "#22C55E" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  email: { label: "Emails", icon: Mail, color: "#3B82F6" },
  website: { label: "Website", icon: Globe, color: "#0EA5E9" },
  directions: { label: "Directions", icon: MapPin, color: "#EF4444" },
  map_click: { label: "Map / Directions", icon: MapPin, color: "#EF4444" },
  save_contact: { label: "Contact Saves", icon: UserPlus, color: "#8B5CF6" },
  vcard_download: { label: "Contact Saves", icon: UserPlus, color: "#8B5CF6" },
  product: { label: "Product Taps", icon: ShoppingBag, color: "#14B8A6" },
  product_click: { label: "Product Taps", icon: ShoppingBag, color: "#14B8A6" },
  product_enquiry: { label: "Product Enquiries", icon: ShoppingBag, color: "#0D9488" },
  offer_click: { label: "Offer Taps", icon: ShoppingBag, color: "#F97316" },
  share: { label: "Shares", icon: Share2, color: "#F59E0B" },
  share_channel: { label: "Shared via", icon: Share2, color: "#F59E0B" },
  copy_link: { label: "Link Copied", icon: Share2, color: "#EAB308" },
  social: { label: "Social Clicks", icon: Users, color: "#EC4899" },
  social_click: { label: "Social Clicks", icon: Users, color: "#EC4899" },
  enquiry: { label: "Enquiries Sent", icon: MessageSquare, color: "#D97706" },
  enquiry_start: { label: "Form Opened", icon: MessageSquare, color: "#FBBF24" },
  gallery_open: { label: "Gallery Opens", icon: Layers, color: "#A855F7" },
  video_play: { label: "Video Plays", icon: Radio, color: "#F43F5E" },
  brochure: { label: "Brochure Downloads", icon: Download, color: "#64748B" },
  pay_click: { label: "Pay Taps", icon: ShoppingBag, color: "#059669" },
  upi_copy: { label: "UPI Copied", icon: ShoppingBag, color: "#10B981" },
  review_click: { label: "Review Clicks", icon: TrendingUp, color: "#FACC15" },
};
const humanise = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const metaFor = (k: string) => ACTION_META[k] || { label: humanise(k), icon: MousePointerClick, color: "#94A3B8" };

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct / typed", qr: "QR scan", whatsapp: "WhatsApp", instagram: "Instagram",
  facebook: "Facebook", linkedin: "LinkedIn", twitter: "X (Twitter)", telegram: "Telegram",
  youtube: "YouTube", google: "Search", email: "Email", referral: "Other sites", internal: "DigitalCarda",
};
const DEVICE_ICON: Record<string, typeof Phone> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) =>
  active && payload && payload.length ? (
    <div className="rounded-xl bg-[#0F172A] text-white px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold mb-0.5">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /> {p.name}: <b className="tabular-nums">{nf(p.value)}</b></p>)}
    </div>
  ) : null;

/* Change vs the immediately-preceding window of the same length. */
function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="text-[11px] text-[#CBD5E1]">no data yet</span>;
  if (!before) return <span className="text-[11px] font-medium text-[#16A34A]">new this period</span>;
  const d = Math.round(((now - before) / before) * 100);
  if (d === 0) return <span className="text-[11px] font-medium text-[#94A3B8] inline-flex items-center gap-1"><Minus size={11} /> same as before</span>;
  const up = d > 0;
  return (
    <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{up ? "+" : ""}{d}% vs previous
    </span>
  );
}

const Panel = ({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9] ${className}`}>
    <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
    {sub && <p className="text-xs text-[#64748B] mt-0.5 mb-4">{sub}</p>}
    {!sub && <div className="mb-4" />}
    {children}
  </div>
);

/* A simple labelled bar list — used for sources, devices, sections, products. */
function BarList({ rows, empty, colour = "#F7B31C", icons }: {
  rows: { key: string; n: number }[];
  empty: string;
  colour?: string;
  icons?: Record<string, typeof Phone>;
}) {
  if (!rows.length) return <p className="text-[13px] text-[#94A3B8] py-2">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const Icon = icons?.[r.key];
        return (
          <div key={r.key} className="flex items-center gap-3">
            {Icon && <span className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#64748B] flex items-center justify-center shrink-0"><Icon size={15} /></span>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] font-medium text-[#334155] truncate capitalize">{SOURCE_LABEL[r.key] || humanise(r.key)}</span>
                <span className="text-[13px] font-bold text-[#0F172A] tabular-nums shrink-0">{nf(r.n)} <span className="text-[11px] font-medium text-[#94A3B8]">· {pct(r.n, total)}%</span></span>
              </div>
              <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((r.n / max) * 100)}%`, background: colour, minWidth: r.n > 0 ? 6 : 0 }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerAnalytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = trpc.analytics.insights.useQuery(
    { cardId: getActiveCardId(), days },
    { retry: false },
  );

  const totals = data?.totals;
  const prev = data?.prev;
  const daily = useMemo(() => (data?.daily ?? []).map((d) => ({ day: dayLabel(d.date), views: d.views, actions: d.actions })), [data]);

  // Split the event-type breakdown into real ACTIONS (what the owner cares
  // about) — the passive page signals are surfaced separately.
  const PASSIVE = new Set(["view", "section_view", "scroll", "time_on_card", "card_exit"]);
  const actionRows = useMemo(
    () => (data?.byType ?? []).filter((r) => !PASSIVE.has(r.key)).map((r) => ({ ...r, ...metaFor(r.key) })),
    [data],
  );

  const hasAny = !!(totals && (totals.views > 0 || totals.actions > 0));

  const funnel = data?.funnel;
  /* Share of VISITORS who took at least one action. Deliberately not
     actions ÷ views — that exceeds 100% as soon as one person taps twice, which
     reads as a broken number to a business owner. */
  const engagementRate = funnel?.views ? Math.round((funnel.engaged / funnel.views) * 1000) / 10 : 0;
  const funnelSteps = funnel ? [
    { label: "Opened your card", n: funnel.views, colour: "#F7B31C" },
    { label: "Interacted with it", n: funnel.engaged, colour: "#14B8A6" },
    { label: "Opened the enquiry form", n: funnel.enquiryStart, colour: "#6366F1" },
    { label: "Sent an enquiry", n: funnel.enquiry, colour: "#16A34A" },
  ] : [];

  const heatMax = Math.max(1, ...(data?.heatmap ?? []).map((h) => h.n));
  const heatAt = (dow: number, hour: number) => (data?.heatmap ?? []).find((h) => h.dow === dow && h.hour === hour)?.n ?? 0;

  /* CSV of everything on screen — owners ask for this to share with their team
     or drop into Excel. Built client-side from data already loaded. */
  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["DigitalCarda analytics", `last ${days} days`, data.slug || ""]];
    const section = (t: string, pairs: { key: string; n: number }[]) => {
      rows.push([], [t], ["Item", "Count"]);
      pairs.forEach((p) => rows.push([p.key, String(p.n)]));
    };
    rows.push([], ["Summary"], ["Metric", "Value"],
      ["Views", String(totals?.views ?? 0)],
      ["Unique visitors", String(totals?.visitors ?? 0)],
      ["Returning visitors", String(totals?.returning ?? 0)],
      ["Actions", String(totals?.actions ?? 0)],
      ["Leads", String(totals?.leads ?? 0)],
      ["Avg time on card", fmtDuration(totals?.avgTimeMs ?? 0)],
      ["Engagement rate", `${engagementRate}%`]);
    rows.push([], ["Daily"], ["Date", "Views", "Actions"]);
    (data.daily ?? []).forEach((d) => rows.push([d.date, String(d.views), String(d.actions)]));
    section("Actions", data.byType.filter((r) => !PASSIVE.has(r.key)));
    section("Top products", data.topProducts);
    section("Top sections", data.topSections);
    section("Traffic sources", data.bySource);
    section("Devices", data.byDevice);
    section("Cities", data.byCity);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `digitalcarda-analytics-${data.slug || "card"}-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Analytics exported");
  };

  const RANGES = [7, 30, 90];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Track your card performance" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto w-full print:p-0">

        {/* Range + export */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="inline-flex rounded-xl bg-white border border-[#E2E8F0] p-1 shadow-sm" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setDays(r)} aria-pressed={days === r}
                className={`h-9 px-4 rounded-lg text-[13px] font-semibold transition-colors ${days === r ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {r} days
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} disabled={!hasAny}
              className="h-9 px-4 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-2 disabled:opacity-50">
              <Download size={15} /> Export CSV
            </button>
            <button onClick={() => window.print()} disabled={!hasAny}
              className="h-9 px-4 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-2 disabled:opacity-50">
              <Printer size={15} /> Report
            </button>
          </div>
        </div>

        {/* KPI hero */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Card Views", value: nf(totals?.views ?? 0), icon: Eye, grad: "from-[#F7B31C] to-[#D97706]", now: totals?.views ?? 0, before: prev?.views ?? 0 },
            { label: "Unique Visitors", value: nf(totals?.visitors ?? 0), icon: Users, grad: "from-[#6366F1] to-[#4F46E5]", now: totals?.visitors ?? 0, before: prev?.visitors ?? 0 },
            { label: "Actions Taken", value: nf(totals?.actions ?? 0), icon: MousePointerClick, grad: "from-[#14B8A6] to-[#0D9488]", now: totals?.actions ?? 0, before: prev?.actions ?? 0 },
            { label: "Avg Time on Card", value: fmtDuration(totals?.avgTimeMs ?? 0), icon: Clock, grad: "from-[#0EA5E9] to-[#0284C7]", note: "while the card was open" },
            { label: "Leads Captured", value: nf(totals?.leads ?? 0), icon: MessageSquare, grad: "from-[#EC4899] to-[#DB2777]", now: totals?.leads ?? 0, before: prev?.leads ?? 0 },
            { label: "Engagement Rate", value: `${engagementRate}%`, icon: Activity, grad: "from-[#8B5CF6] to-[#7C3AED]", note: "visitors who took an action" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-premium border border-[#F1F5F9] relative overflow-hidden">
              <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${k.grad} opacity-10`} />
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${k.grad} flex items-center justify-center shadow-sm`}><k.icon size={19} className="text-white" /></div>
              <p className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] tabular-nums mt-3 leading-none">{isLoading ? "—" : k.value}</p>
              <p className="text-xs text-[#64748B] mt-1">{k.label}</p>
              <p className="mt-1.5 min-h-[16px]">
                {k.note
                  ? <span className="text-[11px] font-medium text-[#94A3B8]">{k.note}</span>
                  : <Delta now={k.now ?? 0} before={k.before ?? 0} />}
              </p>
            </div>
          ))}
        </div>

        {!hasAny ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#F7B31C] flex items-center justify-center mx-auto mb-3"><BarChart3 size={26} /></div>
            <h2 className="text-base font-semibold text-[#0F172A]">No activity yet</h2>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-sm mx-auto">Share your card link or QR — every view, tap and enquiry shows up here in real time.</p>
            <Link to="/dashboard/qr" className="inline-flex items-center gap-2 h-10 px-5 mt-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold">Get your QR &amp; share <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <>
            {/* Trend */}
            <Panel title={`Activity — last ${days} days`} sub="Views and actions on your live card, per day">
              <div className="flex items-center gap-4 text-[11px] font-medium mb-3">
                <span className="flex items-center gap-1.5 text-[#64748B]"><span className="w-2.5 h-2.5 rounded-full bg-[#F7B31C]" /> Views</span>
                <span className="flex items-center gap-1.5 text-[#64748B]"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" /> Actions</span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ left: -18, right: 6, top: 4 }}>
                    <defs>
                      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.35} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} /><stop offset="95%" stopColor="#14B8A6" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} width={40} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#F7B31C" strokeWidth={2.5} fill="url(#gv)" />
                    <Area type="monotone" dataKey="actions" name="Actions" stroke="#14B8A6" strokeWidth={2} fill="url(#gt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Enquiry funnel */}
            <Panel title="Visitor journey" sub="How many people move from opening your card to sending you an enquiry">
              <div className="space-y-3">
                {funnelSteps.map((st, i) => {
                  const top = funnelSteps[0]?.n || 0;
                  const share = pct(st.n, top);
                  const dropFrom = i > 0 ? funnelSteps[i - 1].n : 0;
                  const drop = i > 0 && dropFrom > 0 ? dropFrom - st.n : 0;
                  return (
                    <div key={st.label}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[13px] font-medium text-[#334155]">{st.label}</span>
                        <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{nf(st.n)} <span className="text-[11px] font-medium text-[#94A3B8]">· {share}%</span></span>
                      </div>
                      <div className="h-3 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(share, st.n > 0 ? 4 : 0)}%`, background: st.colour }} />
                      </div>
                      {i > 0 && drop > 0 && (
                        <p className="text-[11px] text-[#94A3B8] mt-1">{nf(drop)} dropped off here</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* What people are interested in */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Top products & services" sub="What your visitors tap most — your best sellers">
                <BarList rows={data?.topProducts ?? []} colour="#14B8A6"
                  empty="No product taps yet. Add products and share your card to see which ones pull." />
              </Panel>
              <Panel title="Most-viewed sections" sub="Which parts of your card people actually reach">
                <BarList rows={data?.topSections ?? []} colour="#6366F1"
                  empty="No section views recorded yet." />
              </Panel>
            </div>

            {/* Where visitors come from + what they use */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Where visitors come from" sub="The app or site your card was opened from">
                <BarList rows={data?.bySource ?? []} colour="#F7B31C" empty="No traffic sources recorded yet." />
              </Panel>
              <Panel title="Devices" sub="What your visitors browse on">
                <BarList rows={data?.byDevice ?? []} colour="#8B5CF6" icons={DEVICE_ICON} empty="No device data yet." />
              </Panel>
            </div>

            {/* Actions */}
            <Panel title="Engagement breakdown" sub="Which actions visitors take — real taps, never estimated">
              {actionRows.length ? (
                <div className="space-y-3">
                  {actionRows.map((a) => {
                    const max = Math.max(...actionRows.map((r) => r.n), 1);
                    return (
                      <div key={a.key} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}1a`, color: a.color }}><a.icon size={15} /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] font-medium text-[#334155]">{a.label}</span>
                            <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{nf(a.n)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((a.n / max) * 100)}%`, background: a.color, minWidth: 6 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-[13px] text-[#94A3B8]">No taps recorded yet in this period.</p>}
            </Panel>

            {/* Peak hours + reading depth */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Panel className="lg:col-span-2" title="Peak hours" sub="When your card gets opened (IST) — the best time to send it out">
                <div className="overflow-x-auto -mx-1 px-1">
                  <div className="min-w-[560px]">
                    <div className="flex gap-1 mb-1 pl-9">
                      {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="flex-1 text-center text-[9px] text-[#CBD5E1] tabular-nums">{h % 6 === 0 ? h : ""}</span>
                      ))}
                    </div>
                    {DOW.map((d, di) => (
                      <div key={d} className="flex items-center gap-1 mb-1">
                        <span className="w-8 text-[10px] text-[#94A3B8] shrink-0">{d}</span>
                        {Array.from({ length: 24 }, (_, h) => {
                          const n = heatAt(di, h);
                          const a = n ? 0.15 + (n / heatMax) * 0.85 : 0;
                          return (
                            <span key={h} title={`${d} ${h}:00 — ${n} view${n === 1 ? "" : "s"}`}
                              className="flex-1 h-5 rounded"
                              style={{ background: n ? `rgba(247,179,28,${a})` : "#F8FAFC" }} />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="How far people read" sub="Scroll depth on your card">
                <div className="space-y-3">
                  {[
                    { k: "25%", n: data?.scroll.d25 ?? 0 },
                    { k: "50%", n: data?.scroll.d50 ?? 0 },
                    { k: "75%", n: data?.scroll.d75 ?? 0 },
                    { k: "100%", n: data?.scroll.d100 ?? 0 },
                  ].map((r) => {
                    const top = data?.scroll.d25 || 0;
                    return (
                      <div key={r.k}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-[#334155]">Reached {r.k}</span>
                          <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{nf(r.n)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div className="h-full rounded-full bg-[#0EA5E9] transition-all duration-500" style={{ width: `${pct(r.n, top || 1)}%`, minWidth: r.n > 0 ? 6 : 0 }} />
                        </div>
                      </div>
                    );
                  })}
                  {!(data?.scroll.d25) && <p className="text-[12px] text-[#94A3B8] pt-1">No scroll data yet.</p>}
                </div>
              </Panel>
            </div>

            {/* Audience */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Returning visitors" sub="People who came back on another day">
                <div className="flex items-center gap-4">
                  <span className="w-14 h-14 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0"><Repeat size={24} /></span>
                  <div>
                    <p className="text-2xl font-extrabold text-[#0F172A] tabular-nums leading-none">{nf(totals?.returning ?? 0)}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      of {nf(totals?.visitors ?? 0)} unique visitors
                      {totals?.visitors ? ` · ${pct(totals.returning, totals.visitors)}% came back` : ""}
                    </p>
                  </div>
                </div>
              </Panel>
              <Panel title="Top cities" sub="Where your visitors are">
                <BarList rows={data?.byCity ?? []} colour="#EC4899"
                  empty="City data appears once your card gets traffic from the live site." />
              </Panel>
            </div>
          </>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
