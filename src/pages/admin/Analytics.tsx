import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Eye, MousePointer, Users, CreditCard, ArrowUpRight } from "lucide-react";

const viewsData = [
  { name: "Jan", views: 4200, clicks: 1800 }, { name: "Feb", views: 5800, clicks: 2400 },
  { name: "Mar", views: 7200, clicks: 3100 }, { name: "Apr", views: 8900, clicks: 3800 },
  { name: "May", views: 10500, clicks: 4500 }, { name: "Jun", views: 12800, clicks: 5200 },
];

const planData = [
  { name: "Free", value: 420, color: "#CBD5E1" }, { name: "Starter", value: 280, color: "#F7B31C" },
  { name: "Professional", value: 180, color: "#14B8A6" }, { name: "Business", value: 85, color: "#3B82F6" },
  { name: "Enterprise", value: 32, color: "#8B5CF6" },
];

const topCards = [
  { title: "John Smith Portfolio", views: 12400, clicks: 5200, owner: "John Smith" },
  { title: "Sarah Design Studio", views: 9800, clicks: 4100, owner: "Sarah Chen" },
  { title: "Tech Solutions Inc", views: 8700, clicks: 3600, owner: "Mike Johnson" },
  { title: "Creative Agency", views: 7200, clicks: 3100, owner: "Emily Davis" },
  { title: "Consulting Pro", views: 6500, clicks: 2800, owner: "David Wilson" },
];

const stats = [
  { label: "Total Views", value: "49,400", change: "+24%", icon: Eye, color: "bg-[#FEF3C7] text-[#92400E]" },
  { label: "Total Clicks", value: "21,000", change: "+18%", icon: MousePointer, color: "bg-[#D1FAE5] text-[#065F46]" },
  { label: "Active Users", value: "997", change: "+12%", icon: Users, color: "bg-[#DBEAFE] text-[#1E40AF]" },
  { label: "Active Cards", value: "1,254", change: "+15%", icon: CreditCard, color: "bg-[#FCE7F3] text-[#9D174D]" },
];

export default function AdminAnalytics() {
  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Platform-wide performance metrics" /></div>
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}><s.icon size={18} /></div>
                <span className="badge-green flex items-center gap-0.5"><ArrowUpRight size={10} />{s.change}</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Views Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Views & Clicks</h2>
            <p className="text-xs text-[#64748B] mb-6">Monthly engagement trends</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsData}>
                  <defs>
                    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2} /><stop offset="95%" stopColor="#14B8A6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2} fill="url(#vg)" />
                  <Area type="monotone" dataKey="clicks" stroke="#14B8A6" strokeWidth={2} fill="url(#cg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Plan Distribution</h2>
            <p className="text-xs text-[#64748B] mb-6">Customers by plan</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {planData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {planData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span>
                  <span className="text-[#64748B] font-medium">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Cards */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-6 border-b border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A]">Top Performing Cards</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Most viewed cards this month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Card", "Owner", "Views", "Clicks", "CTR"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {topCards.map((card, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{card.title}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{card.owner}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{card.views.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{card.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4"><span className="badge-teal">{((card.clicks / card.views) * 100).toFixed(1)}%</span></td>
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
