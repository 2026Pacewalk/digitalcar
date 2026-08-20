import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { getActiveCardId, readCustomer } from "@/hooks/useCustomer";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Eye, MessageSquare, BarChart3, QrCode, Phone, MessageCircle, Mail, Globe, MapPin,
  UserPlus, Share2, Users, ShoppingBag, MousePointerClick, Activity, TrendingUp, CalendarClock, Flame, ArrowRight,
} from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (ymd: string) => { const [, m, d] = (ymd || "").split("-"); return m && d ? `${d} ${MONTHS[Number(m) - 1]}` : ymd; };
const nf = (n: number) => Number(n || 0).toLocaleString("en-IN");

// Every tappable action on the card, with a brand-ish colour for the charts.
const ACTIONS = [
  { key: "qr_scan", label: "QR Scans", icon: QrCode, color: "#6366F1" },
  { key: "call", label: "Calls", icon: Phone, color: "#22C55E" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  { key: "email", label: "Emails", icon: Mail, color: "#3B82F6" },
  { key: "website", label: "Website", icon: Globe, color: "#0EA5E9" },
  { key: "directions", label: "Directions", icon: MapPin, color: "#EF4444" },
  { key: "save_contact", label: "Contact Saves", icon: UserPlus, color: "#8B5CF6" },
  { key: "product", label: "Product Taps", icon: ShoppingBag, color: "#14B8A6" },
  { key: "share", label: "Shares", icon: Share2, color: "#F59E0B" },
  { key: "social", label: "Social Clicks", icon: Users, color: "#EC4899" },
  { key: "enquiry", label: "Enquiries", icon: MessageSquare, color: "#D97706" },
] as const;

const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) =>
  active && payload && payload.length ? (
    <div className="rounded-xl bg-[#0F172A] text-white px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold mb-0.5">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /> {p.name}: <b className="tabular-nums">{nf(p.value)}</b></p>)}
    </div>
  ) : null;

export default function CustomerAnalytics() {
  const { data: overview } = trpc.analytics.myOverview.useQuery();
  const { data: eng, isLoading } = trpc.publish.myStats.useQuery({ cardId: getActiveCardId() }, { retry: false });

  // Total Views = same live source as the card + dashboard (historic base + tracked).
  const slug = useMemo(() => String(readCustomer()?.slug || "").toLowerCase(), []);
  const [realViews, setRealViews] = useState<number | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/views/${encodeURIComponent(slug)}`).then((r) => r.json())
      .then((d) => { if (!cancelled && d && typeof d.views === "number") setRealViews(d.views); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  const t = (eng?.total ?? {}) as Record<string, number>;
  const l30 = (eng?.last30 ?? {}) as Record<string, number>;
  const daily = useMemo(() => (eng?.daily ?? []).map((d) => ({ day: dayLabel(d.date), views: d.views, taps: d.taps })), [eng]);
  const dow = useMemo(() => (eng?.dow ?? []).map((v, i) => ({ day: DOW[i], views: v })), [eng]);

  const cardViews = t.view ?? 0;
  const totalViews = realViews ?? cardViews;
  const actionRows = useMemo(() => ACTIONS.map((a) => ({ ...a, count: t[a.key] ?? 0 })).sort((x, y) => y.count - x.count), [t]);
  const totalActions = actionRows.reduce((s, a) => s + a.count, 0);
  const maxAction = Math.max(1, actionRows[0]?.count ?? 0);
  const engagementRate = cardViews ? Math.round((totalActions / cardViews) * 1000) / 10 : 0;
  const leads = overview?.totalLeads ?? 0;

  const peak = daily.reduce((m, d) => (d.views > m.views ? d : m), { day: "—", views: 0 });
  const bestDowIdx = dow.length ? dow.reduce((mi, d, i, a) => (d.views > a[mi].views ? i : mi), 0) : -1;
  const topAction = actionRows.find((a) => a.count > 0);
  const hasAny = cardViews > 0 || totalActions > 0;

  const kpis = [
    { label: "Total Views", value: nf(totalViews), icon: Eye, grad: "from-[#F7B31C] to-[#D97706]", trend: l30.view ? `+${nf(l30.view)} in 30d` : null },
    { label: "Total Actions", value: nf(totalActions), icon: MousePointerClick, grad: "from-[#6366F1] to-[#4F46E5]", trend: topAction ? `${topAction.label} leads` : null },
    { label: "Engagement Rate", value: `${engagementRate}%`, icon: Activity, grad: "from-[#14B8A6] to-[#0D9488]", trend: "taps per 100 views" },
    { label: "Leads Captured", value: nf(leads), icon: MessageSquare, grad: "from-[#EC4899] to-[#DB2777]", trend: "from enquiries" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Track your card performance" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto w-full">

        {/* KPI hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-premium border border-[#F1F5F9] relative overflow-hidden">
              <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${k.grad} opacity-10`} />
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${k.grad} flex items-center justify-center shadow-sm`}><k.icon size={19} className="text-white" /></div>
              <p className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] tabular-nums mt-3 leading-none">{isLoading ? "—" : k.value}</p>
              <p className="text-xs text-[#64748B] mt-1">{k.label}</p>
              {k.trend && <p className="text-[11px] font-medium text-[#94A3B8] mt-1.5">{k.trend}</p>}
            </div>
          ))}
        </div>

        {!hasAny ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#F7B31C] flex items-center justify-center mx-auto mb-3"><BarChart3 size={26} /></div>
            <h2 className="text-base font-semibold text-[#0F172A]">No activity yet</h2>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-sm mx-auto">Share your card link or QR — every view and tap will show up here in real time.</p>
            <Link to="/dashboard/qr" className="inline-flex items-center gap-2 h-10 px-5 mt-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold">Get your QR & share <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <>
            {/* Activity trend + highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">Activity — last 30 days</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">Views and taps on your live card, per day</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-[#64748B]"><span className="w-2.5 h-2.5 rounded-full bg-[#F7B31C]" /> Views</span>
                    <span className="flex items-center gap-1.5 text-[#64748B]"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" /> Taps</span>
                  </div>
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
                      <Area type="monotone" dataKey="taps" name="Taps" stroke="#14B8A6" strokeWidth={2} fill="url(#gt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Highlights */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
                <h2 className="text-base font-semibold text-[#0F172A] mb-4">Highlights</h2>
                <div className="space-y-3">
                  {[
                    { icon: TrendingUp, tint: "bg-[#FEF3C7] text-[#B45309]", label: "Views in last 30 days", value: nf(l30.view ?? 0) },
                    { icon: Flame, tint: "bg-[#FEE2E2] text-[#B91C1C]", label: "Busiest day", value: peak.views > 0 ? `${peak.day} · ${nf(peak.views)}` : "—" },
                    { icon: CalendarClock, tint: "bg-[#EDE9FE] text-[#6D28D9]", label: "Top weekday", value: bestDowIdx >= 0 && dow[bestDowIdx]?.views > 0 ? DOW[bestDowIdx] : "—" },
                    { icon: MousePointerClick, tint: "bg-[#DCFCE7] text-[#166534]", label: "Most-used action", value: topAction ? `${topAction.label} · ${nf(topAction.count)}` : "—" },
                  ].map((h) => (
                    <div key={h.label} className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-xl ${h.tint} flex items-center justify-center shrink-0`}><h.icon size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[#94A3B8]">{h.label}</p>
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{h.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action breakdown + day-of-week */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
                <h2 className="text-base font-semibold text-[#0F172A]">Engagement breakdown</h2>
                <p className="text-xs text-[#64748B] mt-0.5 mb-4">Which actions visitors take — real taps, never estimated</p>
                <div className="space-y-3">
                  {actionRows.map((a) => (
                    <div key={a.key} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}1a`, color: a.color }}><a.icon size={15} /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-[#334155]">{a.label}</span>
                          <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{nf(a.count)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((a.count / maxAction) * 100)}%`, background: a.color, minWidth: a.count > 0 ? 6 : 0 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
                <h2 className="text-base font-semibold text-[#0F172A]">When people view</h2>
                <p className="text-xs text-[#64748B] mt-0.5 mb-4">Views by day of week</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dow} margin={{ left: -22, right: 4, top: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} width={40} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "#F8FAFC" }} />
                      <Bar dataKey="views" name="Views" radius={[6, 6, 0, 0]}>
                        {dow.map((d, i) => <Cell key={i} fill={i === bestDowIdx && d.views > 0 ? "#F7B31C" : "#FDE68A"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
