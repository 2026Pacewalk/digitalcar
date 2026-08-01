import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { useMemo } from "react";
import {
  Users, CreditCard, Store, DollarSign, Clock, Eye, MousePointer, Layers, TrendingUp, BarChart3, ChevronRight,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (ym: string) => {
  const m = Number((ym || "").split("-")[1]) - 1;
  return MONTHS[m] || ym;
};
const dayLabel = (ymd: string) => {
  const [, m, d] = (ymd || "").split("-");
  return m && d ? `${d} ${MONTHS[Number(m) - 1]}` : ymd;
};
const PIE_COLORS = ["#F7B31C", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#CBD5E1"];

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function timeAgo(d: string | Date | null): string {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const dotClass = (type: string) =>
  type === "purchase" ? "bg-[#F7B31C]" : type === "user" ? "bg-[#14B8A6]" : "bg-[#3B82F6]";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.analytics.adminStats.useQuery();
  const { data: overview, isLoading: ovLoading } = trpc.analytics.adminOverview.useQuery();
  const { data: funnel } = trpc.analytics.funnel.useQuery(undefined, { retry: false });
  const { data: prodFunnel } = trpc.analytics.productFunnel.useQuery(undefined, { retry: false });

  // Top row — business health. Every card links to the module that explains it.
  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, bg: "#FEF3C7", fg: "#D97706", to: "/admin/customers" },
    { label: "Customers", value: stats?.customers ?? 0, icon: CreditCard, bg: "#DBEAFE", fg: "#2563EB", to: "/admin/customers" },
    { label: "Resellers", value: stats?.resellers ?? 0, icon: Store, bg: "#EDE9FE", fg: "#7C3AED", to: "/admin/resellers" },
    { label: "Revenue", value: inr(stats?.revenue ?? 0), icon: DollarSign, bg: "#DCFCE7", fg: "#16A34A", to: "/admin/payments" },
  ];

  // Second row — engagement metrics folded in from the old Analytics page.
  const activePlans = (overview?.planDistribution ?? []).reduce((s, p) => s + Number(p.value || 0), 0);
  const engageCards = [
    { label: "Total Views", value: overview?.totalViews ?? 0, icon: Eye, bg: "#FEF3C7", fg: "#92400E" },
    { label: "Total Clicks", value: overview?.totalClicks ?? 0, icon: MousePointer, bg: "#D1FAE5", fg: "#065F46" },
    { label: "Published Cards", value: overview?.totalCards ?? 0, icon: Layers, bg: "#FCE7F3", fg: "#9D174D" },
    { label: "Active Plans", value: activePlans, icon: TrendingUp, bg: "#E0F2FE", fg: "#0369A1" },
  ];

  const chartData = (stats?.monthlyRevenue ?? []).map((m) => ({ name: monthLabel(m.month), amount: m.amount }));
  const recentActivity = stats?.recentActivity ?? [];
  const recentUsers = stats?.recentUsers ?? [];

  const viewChart = useMemo(() => (overview?.dailyViews ?? []).map((d) => ({ name: dayLabel(d.date), views: d.views })), [overview]);
  const plan = overview?.planDistribution ?? [];
  const topCards = overview?.topCards ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle="Platform overview & analytics" /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Business stats — clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <Link
              key={i}
              to={stat.to}
              className="group bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9] transition-all hover:shadow-gold hover:border-[#F7B31C]/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg, color: stat.fg }}>
                  <stat.icon size={16} />
                </span>
                <ChevronRight size={15} className="text-[#CBD5E1] group-hover:text-[#F7B31C] transition-colors" />
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{isLoading ? "—" : stat.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Engagement stats (merged from Analytics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {engageCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg, color: stat.fg }}>
                <stat.icon size={16} />
              </span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{ovLoading ? "—" : Number(stat.value).toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Overview <span className="text-[#94A3B8] font-normal">· monthly (paid invoices)</span></h2>
            </div>
            <div className="h-[240px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-xs text-[#94A3B8]">
                  {isLoading ? "Loading…" : "No paid invoices yet — revenue will appear here once payments come in."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F7B31C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12, padding: "8px 12px" }}
                      formatter={(v: number) => [inr(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#F7B31C" strokeWidth={2} fill="url(#goldGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Recent Activity</h2>
            <div className="space-y-3.5">
              {recentActivity.length === 0 && (
                <p className="text-xs text-[#94A3B8]">{isLoading ? "Loading…" : "No recent activity yet."}</p>
              )}
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${dotClass(activity.type)}`} />
                  <div>
                    <p className="text-sm text-[#0F172A]">{activity.text}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(activity.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Signups — names link to that customer in the list */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Signups</h2>
            <Link to="/admin/customers" className="text-xs font-semibold text-[#F7B31C] hover:underline inline-flex items-center gap-0.5">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["User", "Role", "Joined"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recentUsers.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[#94A3B8]">{isLoading ? "Loading…" : "No users yet."}</td></tr>
                )}
                {recentUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/customers?q=${encodeURIComponent(u.email)}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                          <span className="text-[#0F172A] text-xs font-bold">{(u.fullName || "U").charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A] group-hover:text-[#F7B31C] group-hover:underline transition-colors">{u.fullName}</p>
                          <p className="text-xs text-[#94A3B8]">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#0F172A] capitalize">{u.role.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#64748B]">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== Analytics (merged in) ===== */}

        {/* Conversion funnel */}
        {funnel && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A]">Conversion Funnel</h2>
            <p className="text-xs text-[#64748B] mb-4">Where visitors drop off — product view → demo → try free → register → publish → paid.</p>
            <div className="space-y-2.5">
              {funnel.steps.map((s, i) => {
                const top = funnel.steps[0].count || 1;
                const prev = i > 0 ? funnel.steps[i - 1].count : s.count;
                const pctTop = Math.round((s.count / top) * 100);
                const pctPrev = prev > 0 ? Math.round((s.count / prev) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="font-semibold text-[#334155]">{s.label}</span>
                      <span className="text-[#64748B] tabular-nums">{s.count.toLocaleString("en-IN")}<span className="text-[#94A3B8]"> · {pctTop}%{i > 0 ? ` · ${pctPrev}% from prev` : ""}</span></span>
                    </div>
                    <div className="h-6 rounded-lg bg-[#F1F5F9] overflow-hidden">
                      <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${Math.max(2, pctTop)}%`, background: "linear-gradient(90deg,#F7B31C,#D97706)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-product performance — which designs convert */}
        {prodFunnel && prodFunnel.length > 0 && (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
            <div className="p-5 pb-3">
              <h2 className="text-base font-semibold text-[#0F172A]">Product Performance</h2>
              <p className="text-xs text-[#64748B]">Which designs drive views, trials and published cards.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-y border-[#F1F5F9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5">Product</th>
                    <th className="text-right px-3 py-2.5">Views</th>
                    <th className="text-right px-3 py-2.5">Demos</th>
                    <th className="text-right px-3 py-2.5">Try Free</th>
                    <th className="text-right px-3 py-2.5">Published</th>
                    <th className="text-right px-5 py-2.5">Conv. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {prodFunnel.map((p) => (
                    <tr key={p.slug} className="hover:bg-[#FAFBFC]">
                      <td className="px-5 py-2.5 font-semibold text-[#0F172A] truncate max-w-[240px]">{p.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#334155]">{p.views.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B]">{p.demo.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B]">{p.tryFree.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#64748B]">{p.published.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-2.5 text-right"><span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] tabular-nums">{p.convRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily views */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Daily Views</h2>
            <p className="text-xs text-[#64748B] mb-6">Card impressions across the platform</p>
            <div className="h-[280px]">
              {viewChart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#94A3B8]"><BarChart3 size={28} className="mb-2 text-[#CBD5E1]" /><p className="text-sm">{ovLoading ? "Loading…" : "No view data yet."}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={viewChart}>
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
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Plan Distribution</h2>
            <p className="text-xs text-[#64748B] mb-6">Active subscriptions by plan</p>
            {plan.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">{ovLoading ? "Loading…" : "No active paid plans yet."}</p>
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

        {/* Top performing cards */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#F1F5F9]">
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
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-[#94A3B8]">{ovLoading ? "Loading…" : "No cards yet."}</td></tr>
                ) : topCards.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">
                      <a href={`https://digitalcarda.in/${c.slug}`} target="_blank" rel="noreferrer" className="hover:text-[#F7B31C] hover:underline">{c.title || c.slug}</a>
                    </td>
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
