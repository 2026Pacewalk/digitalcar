import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { Users, BadgeCheck, TrendingUp, Wallet, UserPlus, ReceiptText, UserCircle, ArrowRight } from "lucide-react";

const inr = (n: unknown) => {
  // Whole rupees stay clean (₹999); anything with paise shows both digits (₹199.80, not ₹199.8).
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
};

export default function ResellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: rstats } = trpc.user.resellerStats.useQuery();
  const { data: custData } = trpc.user.resellerCustomers.useQuery({ page: 1, limit: 5 });

  const rate = Number(rstats?.commissionRate ?? 0);
  const stats = [
    { label: "My customers", value: (rstats?.totalCustomers ?? 0).toLocaleString("en-IN"), icon: Users, color: "bg-[#FEF3C7] text-[#92400E]" },
    { label: "On a paid plan", value: (rstats?.activeCustomers ?? 0).toLocaleString("en-IN"), icon: BadgeCheck, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Earned this month", value: inr(rstats?.monthlyEarnings), icon: TrendingUp, color: "bg-[#EDE9FE] text-[#5B21B6]" },
    { label: "Ready to withdraw", value: inr(rstats?.walletBalance), icon: Wallet, color: "bg-[#DBEAFE] text-[#1E40AF]" },
  ];
  const recent = custData?.customers ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle={`Welcome back, ${user?.fullName?.split(" ")[0] || "partner"}`} /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}><stat.icon size={16} /></span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* How they earn — one rate, the real one */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#14243E] to-[#0F172A] rounded-2xl p-6 shadow-premium text-white">
            <p className="text-xs text-white/50">Your commission</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-[#F7B31C]">{rate ? `${rate}%` : "—"}</p>
            <p className="mt-2 text-sm text-white/70 leading-relaxed max-w-md">
              of every paid plan your customers buy. It lands in your wallet the moment their payment clears, and you can withdraw it to your bank or UPI any time.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-lg font-bold tabular-nums">{inr(rstats?.totalEarnings)}</p>
                <p className="text-[11px] text-white/50">Earned in total</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-lg font-bold tabular-nums">{inr(rstats?.walletBalance)}</p>
                <p className="text-[11px] text-white/50">Ready to withdraw</p>
              </div>
            </div>
            <button onClick={() => navigate("/reseller/earnings")} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F7B31C] hover:text-[#FCD34D]">
              Earnings &amp; payouts <ArrowRight size={15} />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Quick actions</h2>
            <div className="space-y-1.5">
              {[
                { label: "Add a customer", icon: UserPlus, action: () => navigate("/reseller/customers?add=1") },
                { label: "Earnings & payouts", icon: ReceiptText, action: () => navigate("/reseller/earnings") },
                { label: "My profile", icon: UserCircle, action: () => navigate("/reseller/profile") },
              ].map((a) => (
                <button key={a.label} onClick={a.action} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0"><a.icon size={15} className="text-[#64748B]" /></div>
                  <span className="text-sm font-medium text-[#0F172A] flex-1">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent customers</h2>
            <button onClick={() => navigate("/reseller/customers")} className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View all</button>
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
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No customers yet. Add your first one and you earn {rate ? `${rate}%` : "commission"} when they buy a plan.</td></tr>
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
