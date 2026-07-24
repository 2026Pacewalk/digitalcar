import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, UserCheck, MessageSquare, CreditCard, BarChart3 } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (ymd: string) => {
  const [, m, d] = (ymd || "").split("-");
  return m && d ? `${d} ${MONTHS[Number(m) - 1]}` : ymd;
};
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const BAR_COLORS = ["#F7B31C", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#64748B"];

export default function CustomerAnalytics() {
  const { data, isLoading } = trpc.analytics.myOverview.useQuery();

  const stats = [
    { label: "Total Views", value: data?.totalViews ?? 0, icon: Eye, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "Unique Visitors", value: data?.totalVisitors ?? 0, icon: UserCheck, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Leads Captured", value: data?.totalLeads ?? 0, icon: MessageSquare, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Cards", value: data?.cards?.length ?? 0, icon: CreditCard, color: "bg-[#FCE7F3] text-[#9D174D]" },
  ];

  const chart = useMemo(() => (data?.dailyViews ?? []).map((d) => ({ day: dayLabel(d.date), views: d.views })), [data]);
  const sources = useMemo(() => {
    const rows = (data?.sources ?? []).slice().sort((a, b) => b.count - a.count).slice(0, 6);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return rows.map((r) => ({ name: r.source, value: pct(r.count, total), count: r.count }));
  }, [data]);
  const devices = useMemo(() => {
    const rows = (data?.deviceBreakdown ?? []).slice().sort((a, b) => b.count - a.count);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return rows.map((r) => ({ name: r.device, value: pct(r.count, total) }));
  }, [data]);
  const cards = data?.cards ?? [];
  const hasViews = (data?.totalViews ?? 0) > 0;

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Track your card performance" /></div>
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}><s.icon size={18} /></div>
              <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{isLoading ? "—" : s.value.toLocaleString("en-IN")}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Views chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-[#0F172A]">Daily Views</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Card impressions over time</p>
            </div>
            <div className="h-[280px]">
              {chart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#94A3B8]">
                  <BarChart3 size={28} className="mb-2 text-[#CBD5E1]" />
                  <p className="text-sm">{isLoading ? "Loading…" : "No views yet — share your card to start tracking."}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                    <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2} fill="url(#av)" name="Views" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sources + devices */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Traffic Sources</h2>
            <p className="text-xs text-[#64748B] mb-6">Where visitors come from</p>
            {sources.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">{hasViews ? "—" : "No traffic yet."}</p>
            ) : (
              <div className="space-y-4">
                {sources.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[#0F172A] font-medium truncate max-w-[60%]">{s.name}</span>
                      <span className="text-[#64748B]">{s.value}%</span>
                    </div>
                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-[#F1F5F9]">
              <h3 className="text-sm font-medium text-[#0F172A] mb-3">Devices</h3>
              {devices.length === 0 ? (
                <p className="text-sm text-[#94A3B8]">{hasViews ? "—" : "No data yet."}</p>
              ) : (
                <div className="space-y-2">
                  {devices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B] capitalize">{d.name}</span>
                      <span className="text-[#0F172A] font-medium">{d.value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per-card performance (real) */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-6 border-b border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A]">Card Performance</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Views &amp; leads per card</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Card", "Views", "Leads", "Status"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {cards.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-[#94A3B8]">{isLoading ? "Loading…" : "No cards yet."}</td></tr>
                ) : cards.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{c.title || c.slug}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B] tabular-nums">{c.views.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B] tabular-nums">{c.leads.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4"><span className={c.status === "published" ? "badge-green" : "badge-blue"}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
