import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import {
  Users, CreditCard, Store, DollarSign, Clock,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (ym: string) => {
  const m = Number((ym || "").split("-")[1]) - 1;
  return MONTHS[m] || ym;
};

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

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, bg: "#FEF3C7", fg: "#D97706" },
    { label: "Customers", value: stats?.customers ?? 0, icon: CreditCard, bg: "#DBEAFE", fg: "#2563EB" },
    { label: "Resellers", value: stats?.resellers ?? 0, icon: Store, bg: "#EDE9FE", fg: "#7C3AED" },
    { label: "Revenue", value: inr(stats?.revenue ?? 0), icon: DollarSign, bg: "#DCFCE7", fg: "#16A34A" },
  ];

  const chartData = (stats?.monthlyRevenue ?? []).map((m) => ({ name: monthLabel(m.month), amount: m.amount }));
  const recentActivity = stats?.recentActivity ?? [];
  const recentUsers = stats?.recentUsers ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle="Platform overview" /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg, color: stat.fg }}>
                <stat.icon size={16} />
              </span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{isLoading ? "—" : stat.value}</p>
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

        {/* Recent Signups */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Signups</h2>
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
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                          <span className="text-[#0F172A] text-xs font-bold">{(u.fullName || "U").charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{u.fullName}</p>
                          <p className="text-xs text-[#94A3B8]">{u.email}</p>
                        </div>
                      </div>
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
      </div>
    </ResponsiveDashboardLayout>
  );
}
