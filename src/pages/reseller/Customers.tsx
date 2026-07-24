import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function ResellerCustomers() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.user.resellerCustomers.useQuery({ page: 1, limit: 100 });

  const filtered = useMemo(() => {
    const rows = data?.customers ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((c) => (c.fullName || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [data, search]);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="My Customers" subtitle="Customers you've onboarded" /></div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text" placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
            />
          </div>
          <span className="text-sm text-[#64748B] whitespace-nowrap">{data?.total ?? 0} total</span>
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Phone", "Status", "Joined"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#94A3B8]">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-16 text-center">
                    <Users size={28} className="mx-auto text-[#CBD5E1] mb-2" />
                    <p className="text-sm text-[#94A3B8]">{search ? "No customers match your search." : "No customers yet — share your referral link to onboard customers."}</p>
                  </td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                            <span className="text-[#0F172A] text-xs font-bold">{(c.fullName || "U").charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{c.fullName}</p>
                            <p className="text-xs text-[#94A3B8]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{c.phone || "—"}</td>
                      <td className="px-4 py-3"><span className={`badge-${c.status === "active" ? "green" : "red"}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
