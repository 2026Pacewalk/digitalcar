import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { REAL_MEMBERS } from "@/data/realMembers";
import {
  Users, CreditCard, Store, TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity, Clock, DollarSign, Eye, Zap, MessageSquare,
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
  { label: "Total Users", value: totalMembers.toString(), change: "+12%", up: true, icon: Users },
  { label: "Customers", value: trialMembers.toString(), change: "+8%", up: true, icon: CreditCard },
  { label: "Resellers", value: standardMembers.toString(), change: "+3%", up: true, icon: Store },
  { label: "Starter Plan", value: starterMembers.toString(), change: "+5%", up: true, icon: DollarSign },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <TopBar title="Dashboard" subtitle="Platform overview" />
      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center">
                  <stat.icon size={18} className="text-[#F7B31C]" />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${stat.up ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Revenue Overview</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Monthly revenue trends</p>
              </div>
              <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View Report</button>
            </div>
            <div className="h-[280px]">
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
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-4">Recent Activity</h2>
            <div className="space-y-4">
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
          <div className="p-6 border-b border-[#F1F5F9] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Recent Customers</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Latest signups</p>
            </div>
            <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Plan", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recentMembers.map((customer, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#0F172A]">{customer.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge-${customer.status === "Active" ? "green" : "red"}`}>{customer.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">Edit</button>
                    </td>
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
