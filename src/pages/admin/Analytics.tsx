import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, MousePointer, Users, CreditCard, BarChart3 } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (ymd: string) => {
  const [, m, d] = (ymd || "").split("-");
  return m && d ? `${d} ${MONTHS[Number(m) - 1]}` : ymd;
};
const PIE_COLORS = ["#F7B31C", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#CBD5E1"];

export default function AdminAnalytics() {
  const { data, isLoading } = trpc.analytics.adminOverview.useQuery();

  const stats = [
    { label: "Total Views", value: data?.totalViews ?? 0, icon: Eye, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "Total Clicks", value: data?.totalClicks ?? 0, icon: MousePointer, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Users", value: data?.totalUsers ?? 0, icon: Users, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Cards", value: data?.totalCards ?? 0, icon: CreditCard, color: "bg-[#FCE7F3] text-[#9D174D]" },
  ];
  const chart = useMemo(() => (data?.dailyViews ?? []).map((d) => ({ name: dayLabel(d.date), views: d.views })), [data]);
  const plan = data?.planDistribution ?? [];
  const topCards = data?.topCards ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Platform-wide performance metrics" /></div>
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
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Daily Views</h2>
            <p className="text-xs text-[#64748B] mb-6">Card impressions across the platform</p>
            <div className="h-[280px]">
              {chart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#94A3B8]"><BarChart3 size={28} className="mb-2 text-[#CBD5E1]" /><p className="text-sm">{isLoading ? "Loading…" : "No view data yet."}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                    <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2} fill="url(#vg)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Plan distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Plan Distribution</h2>
            <p className="text-xs text-[#64748B] mb-6">Active subscriptions by plan</p>
            {plan.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">{isLoading ? "Loading…" : "No active paid plans yet."}</p>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={plan} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {plan.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {plan.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />{p.name}</span>
                      <span className="text-[#64748B] font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top cards */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-6 border-b border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A]">Top Performing Cards</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Most viewed cards on the platform</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Card", "Owner", "Views", "Leads"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {topCards.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-[#94A3B8]">{isLoading ? "Loading…" : "No cards yet."}</td></tr>
                ) : topCards.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{c.title || c.slug}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{c.owner}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B] tabular-nums">{c.views.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B] tabular-nums">{c.leads.toLocaleString("en-IN")}</td>
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
