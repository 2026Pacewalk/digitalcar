import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { Users, IndianRupee, Wallet, Gift, Eye, Percent } from "lucide-react";

const inr = (n: unknown) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
};

export default function ResellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: rstats } = trpc.user.resellerStats.useQuery();
  const { data: program } = trpc.referral.myProgram.useQuery();
  const { data: custData } = trpc.user.resellerCustomers.useQuery({ page: 1, limit: 5 });

  const stats = [
    { label: "My Customers", value: (rstats?.totalCustomers ?? 0).toLocaleString("en-IN"), icon: Users, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "Total Earnings", value: inr(rstats?.totalEarnings), icon: IndianRupee, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Wallet Balance", value: inr(program?.wallet?.balance), icon: Wallet, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Referrals Joined", value: (program?.stats?.joined ?? 0).toLocaleString("en-IN"), icon: Gift, color: "bg-[#FCE7F3] text-[#9D174D]" },
  ];
  const recent = custData?.customers ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle={`Welcome back, ${user?.fullName?.split(" ")[0] || "Reseller"}`} /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}><stat.icon size={16} /></span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Referral program */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#14243E] to-[#0F172A] rounded-2xl p-6 shadow-premium text-white">
            <h2 className="text-sm font-semibold mb-1">Refer &amp; Earn</h2>
            <p className="text-xs text-white/50 mb-5">Share your code — earn commission when they upgrade.</p>
            <div className="flex items-center gap-3 mb-5">
              <div className="px-4 py-2.5 rounded-xl bg-white/10 font-mono text-lg font-bold tracking-wider">{program?.code || "…"}</div>
              <div className="text-xs text-white/60">
                <div>Commission: <span className="text-[#F7B31C] font-semibold">{program?.commissionPercent ?? rstats?.commissionRate ?? "—"}%</span></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Invited", value: program?.stats?.invited ?? 0 },
                { label: "Joined", value: program?.stats?.joined ?? 0 },
                { label: "Rewarded", value: program?.stats?.rewarded ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Quick Actions</h2>
            <div className="space-y-1.5">
              {[
                { label: "View Customers", icon: Users, action: () => navigate("/reseller/customers") },
                { label: "Refer & Earn", icon: Gift, action: () => navigate("/dashboard/refer") },
                { label: "My Profile", icon: Eye, action: () => navigate("/reseller/profile") },
              ].map((action, i) => (
                <button key={i} onClick={action.action} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0"><action.icon size={15} className="text-[#64748B]" /></div>
                  <span className="text-sm font-medium text-[#0F172A] flex-1">{action.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><Percent size={15} className="text-[#F7B31C]" /></div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">Your Commission Rate</p>
                <p className="text-sm font-bold text-[#0F172A]">{rstats?.commissionRate ?? "—"}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent customers */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Customers</h2>
            <button onClick={() => navigate("/reseller/customers")} className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Status", "Joined"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recent.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No customers yet — share your referral code to onboard them.</td></tr>
                ) : recent.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center"><span className="text-[#0F172A] text-xs font-bold">{(c.fullName || "U").charAt(0).toUpperCase()}</span></div>
                        <div><p className="text-sm font-medium text-[#0F172A]">{c.fullName}</p><p className="text-xs text-[#94A3B8]">{c.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge-${c.status === "active" ? "green" : "red"}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{fmtDate(c.createdAt)}</td>
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
