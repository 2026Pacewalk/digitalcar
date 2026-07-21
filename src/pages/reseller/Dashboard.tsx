import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { Users, CreditCard, DollarSign, TrendingUp, ArrowUpRight, Plus, Eye } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { name: "Jan", customers: 12, revenue: 450 }, { name: "Feb", customers: 18, revenue: 680 },
  { name: "Mar", customers: 24, revenue: 920 }, { name: "Apr", customers: 32, revenue: 1200 },
  { name: "May", customers: 38, revenue: 1450 }, { name: "Jun", customers: 45, revenue: 1800 },
];

const recentCustomers = [
  { name: "Alice Brown", email: "alice@example.com", plan: "Professional", date: "2 days ago" },
  { name: "Bob Wilson", email: "bob@example.com", plan: "Starter", date: "3 days ago" },
  { name: "Carol White", email: "carol@example.com", plan: "Business", date: "5 days ago" },
];

export default function ResellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { label: "My Customers", value: "45", change: "+8%", icon: Users, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "Active Cards", value: "128", change: "+12%", icon: CreditCard, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Commission", value: "$1,450", change: "+18%", icon: DollarSign, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Conversion", value: "24%", change: "+3%", icon: TrendingUp, color: "bg-[#FCE7F3] text-[#9D174D]" },
  ];

  return (
    <DashboardLayout>
      <TopBar title="Dashboard" subtitle={`Welcome back, ${user?.fullName?.split(" ")[0] || "Reseller"}`} />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}><stat.icon size={18} /></div>
                <span className="badge-green flex items-center gap-0.5"><ArrowUpRight size={10} />{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Revenue & Customers</h2>
            <p className="text-xs text-[#64748B] mb-6">Monthly performance</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                  <Area type="monotone" dataKey="customers" stroke="#F7B31C" strokeWidth={2} fill="url(#rc)" name="Customers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              {[
                { label: "Add Customer", icon: Plus, action: () => navigate("/reseller/customers") },
                { label: "View Customers", icon: Users, action: () => navigate("/reseller/customers") },
                { label: "View Analytics", icon: Eye, action: () => {} },
              ].map((action, i) => (
                <button key={i} onClick={action.action} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left group">
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center">
                    <action.icon size={16} className="text-[#64748B]" />
                  </div>
                  <span className="text-sm font-medium text-[#0F172A] flex-1">{action.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <DollarSign size={16} className="text-[#F7B31C]" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8]">Commission Rate</p>
                  <p className="text-lg font-bold text-[#0F172A]">20%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Recent Customers</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Latest signups</p>
            </div>
            <button onClick={() => navigate("/reseller/customers")} className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Plan", "Date"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recentCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                          <span className="text-[#0F172A] text-xs font-bold">{c.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{c.name}</p>
                          <p className="text-xs text-[#94A3B8]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="badge-gold">{c.plan}</span></td>
                    <td className="px-6 py-4 text-sm text-[#94A3B8]">{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
