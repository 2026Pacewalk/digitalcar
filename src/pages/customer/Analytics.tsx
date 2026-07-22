import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Eye, MousePointer, UserCheck, Clock, ArrowUpRight, TrendingUp } from "lucide-react";

const viewsData = [
  { day: "Mon", views: 45, unique: 32 }, { day: "Tue", views: 62, unique: 48 },
  { day: "Wed", views: 38, unique: 28 }, { day: "Thu", views: 78, unique: 55 },
  { day: "Fri", views: 91, unique: 67 }, { day: "Sat", views: 56, unique: 41 }, { day: "Sun", views: 43, unique: 35 },
];

const devicesData = [
  { name: "Mobile", value: 68 }, { name: "Desktop", value: 24 }, { name: "Tablet", value: 8 },
];

const sourcesData = [
  { name: "Direct", value: 42 }, { name: "QR Code", value: 28 }, { name: "Social", value: 18 }, { name: "Email", value: 12 },
];

export default function CustomerAnalytics() {
  const stats = [
    { label: "Total Views", value: "1,247", change: "+12%", icon: Eye, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "Unique Visitors", value: "892", change: "+8%", icon: UserCheck, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Contact Clicks", value: "346", change: "+15%", icon: MousePointer, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Avg. Time", value: "2m 34s", change: "+5%", icon: Clock, color: "bg-[#FCE7F3] text-[#9D174D]" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Analytics" subtitle="Track your card performance" /></div>
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Views This Week</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Daily card impressions</p>
              </div>
              <div className="flex gap-2">
                {["7D", "30D", "90D"].map((p) => (
                  <button key={p} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${p === "7D" ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"} transition-colors`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsData}>
                  <defs>
                    <linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7B31C" stopOpacity={0.2} /><stop offset="95%" stopColor="#F7B31C" stopOpacity={0} /></linearGradient>
                    <linearGradient id="au" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2} /><stop offset="95%" stopColor="#14B8A6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke="#F7B31C" strokeWidth={2} fill="url(#av)" name="Total Views" />
                  <Area type="monotone" dataKey="unique" stroke="#14B8A6" strokeWidth={2} fill="url(#au)" name="Unique" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sources */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1">Traffic Sources</h2>
            <p className="text-xs text-[#64748B] mb-6">Where visitors come from</p>
            <div className="space-y-4">
              {sourcesData.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[#0F172A] font-medium">{s.name}</span>
                    <span className="text-[#64748B]">{s.value}%</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, backgroundColor: ["#F7B31C", "#14B8A6", "#3B82F6", "#8B5CF6"][i] }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-[#F1F5F9]">
              <h3 className="text-sm font-medium text-[#0F172A] mb-3">Devices</h3>
              <div className="space-y-2">
                {devicesData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">{d.name}</span>
                    <span className="text-[#0F172A] font-medium">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Links */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-6 border-b border-[#F1F5F9]">
            <h2 className="text-base font-semibold text-[#0F172A]">Link Performance</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Most clicked links on your card</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Link", "Clicks", "Unique", "CTR"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {["Phone", "Email", "Website", "WhatsApp", "Location"].map((link, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{link}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{[124, 98, 76, 65, 42][i]}</td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">{[98, 82, 62, 54, 35][i]}</td>
                    <td className="px-6 py-4"><span className="badge-teal">{(["8.2%", "6.5%", "5.1%", "4.3%", "2.8%"][i])}</span></td>
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
