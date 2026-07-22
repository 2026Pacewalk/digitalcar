import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { REAL_MEMBERS } from "@/data/realMembers";
import {
  Users, CreditCard, Store, TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity, Clock, DollarSign, Eye, Zap, MessageSquare, Pencil,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { name: "Jan", views: 1200 }, { name: "Feb", views: 1900 }, { name: "Mar", views: 1600 },
  { name: "Apr", views: 2400 }, { name: "May", views: 2800 }, { name: "Jun", views: 3200 },
  { name: "Jul", views: 3800 }, { name: "Aug", views: 4100 }, { name: "Sep", views: 3600 },
  { name: "Oct", views: 4500 }, { name: "Nov", views: 5200 }, { name: "Dec", views: 5800 },
];

// Real member stats
const totalMembers = REAL_MEMBERS.length;
const trialMembers = REAL_MEMBERS.filter(m => m.package === "Trial").length;
const standardMembers = REAL_MEMBERS.filter(m => m.package === "STANDARD").length;
const starterMembers = REAL_MEMBERS.filter(m => m.package === "STARTER").length;

// Get 5 most recent members by startDate
const recentMembers = [...REAL_MEMBERS]
  .sort((a, b) => new Date(b.startDate.split("-").reverse().join("-")).getTime() - new Date(a.startDate.split("-").reverse().join("-")).getTime())
  .slice(0, 5)
  .map(m => ({
    name: m.name,
    email: m.email,
    plan: m.package === "STANDARD" ? "Professional" : "Starter",
    status: "Active",
    avatar: m.name.charAt(0).toUpperCase(),
  }));

const activities = [
  { text: "New user registration: " + (REAL_MEMBERS[0]?.name || "Alex Turner"), time: "2 min ago", type: "user" },
  { text: "Package upgraded: Business Plan", time: "15 min ago", type: "purchase" },
  { text: "Card published: " + (REAL_MEMBERS[1]?.name || "Sarah") + "'s Portfolio", time: "32 min ago", type: "card" },
  { text: "New lead captured: Design inquiry", time: "1 hr ago", type: "lead" },
];

const statCards = [
  { label: "Total Users", value: totalMembers.toString(), change: "+12%", up: true, icon: Users, bg: "#FEF3C7", fg: "#D97706" },
  { label: "Customers", value: trialMembers.toString(), change: "+8%", up: true, icon: CreditCard, bg: "#DBEAFE", fg: "#2563EB" },
  { label: "Resellers", value: standardMembers.toString(), change: "+3%", up: true, icon: Store, bg: "#EDE9FE", fg: "#7C3AED" },
  { label: "Starter Plan", value: starterMembers.toString(), change: "+5%", up: true, icon: DollarSign, bg: "#DCFCE7", fg: "#16A34A" },
];

export default function AdminDashboard() {
  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle="Platform overview" /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg, color: stat.fg }}>
                  <stat.icon size={16} />
                </span>
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stat.up ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                  {stat.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">Revenue Overview <span className="text-[#94A3B8] font-normal">· monthly</span></h2>
              <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">Report</button>
            </div>
            <div className="h-[240px]">
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
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12, padding: "8px 12px" }} />
                  <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2} fill="url(#goldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Recent Activity</h2>
            <div className="space-y-3.5">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activity.type === "purchase" ? "bg-[#F7B31C]" : activity.type === "user" ? "bg-[#14B8A6]" : "bg-[#3B82F6]"}`} />
                  <div>
                    <p className="text-sm text-[#0F172A]">{activity.text}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Customers</h2>
            <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Plan", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recentMembers.map((customer, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                          <span className="text-[#0F172A] text-xs font-bold">{customer.avatar}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{customer.name}</p>
                          <p className="text-xs text-[#94A3B8]">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#0F172A]">{customer.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-${customer.status === "Active" ? "green" : "red"}`}>{customer.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button title="Edit" aria-label="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#F7B31C] hover:bg-[#F1F5F9] transition-colors"><Pencil size={14} /></button>
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
