import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Store, Users, UserCheck, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminData } from "@/lib/adminData";

/* Retailer (admin_id) → name, from the old superadmin table. Mirrors the map on
   the Customers page so both pages label resellers identically. */
const RETAILERS: Record<number, string> = {
  0: "Website", 1: "DigitalCarda", 2: "Sunny", 3: "Raman Kumar", 10: "Onkar Singh",
  11: "Vijay", 12: "Kiran", 13: "Ankush", 14: "Mohit Bhatia", 15: "Vishu",
  16: "Shekhar Jain", 17: "Davinder Singh", 18: "Nikil", 19: "Roxana Greener",
  20: "Kristopher", 21: "Gurwinder Singh", 22: "Jasvinder Singh", 23: "David Carlson",
};
const retailerName = (id: number) => RETAILERS[id] ?? `Retailer #${id}`;

type Cust = { admin_id: number; package_id: number };
type Reseller = { id: number; name: string; total: number; trial: number; starter: number; standard: number };

export default function AdminResellers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Cust[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAdminData<Cust[]>("customers")
      .then((d) => setRows(d))
      .catch(() => toast.error("Could not load resellers"))
      .finally(() => setLoading(false));
  }, []);

  // The real resellers are the retailers (admin_id) that actually own customers.
  const resellers = useMemo<Reseller[]>(() => {
    const map = new Map<number, Reseller>();
    for (const c of rows) {
      const id = Number(c.admin_id);
      if (!map.has(id)) map.set(id, { id, name: retailerName(id), total: 0, trial: 0, starter: 0, standard: 0 });
      const r = map.get(id)!;
      r.total++;
      const p = Number(c.package_id);
      if (p === 5) r.starter++;
      else if (p === 6) r.standard++;
      else r.trial++;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const filtered = resellers.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  const stats = [
    { label: "Resellers", value: resellers.length, icon: Store, tint: "#8B5CF6", bg: "#EDE9FE" },
    { label: "Total Customers", value: rows.length, icon: Users, tint: "#F7B31C", bg: "#FEF3C7" },
    { label: "Active Resellers", value: resellers.filter((r) => r.total > 0 && r.id !== 0).length, icon: UserCheck, tint: "#22C55E", bg: "#DCFCE7" },
  ];

  return (
    <ResponsiveDashboardLayout title="Resellers" subtitle="Retailers who onboard customers">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.tint }} /></div>
              <div><p className="text-xl font-extrabold text-[#0F172A] tabular-nums">{loading ? "—" : s.value.toLocaleString("en-IN")}</p><p className="text-xs text-[#64748B]">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder="Search resellers…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 bg-white rounded-lg pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["SN", "Reseller", "Customers", "Trial", "Gold", "Platinum", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-9 bg-[#F1F5F9] rounded-lg animate-pulse" /></td></tr>)
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-[#94A3B8]">No resellers found</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#94A3B8]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0"><span className="text-[#0F172A] text-xs font-bold">{r.name.charAt(0).toUpperCase()}</span></div>
                          <span className="font-medium text-[#0F172A] whitespace-nowrap">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold">{r.total}</span></td>
                      <td className="px-4 py-3 text-[#64748B]">{r.trial}</td>
                      <td className="px-4 py-3 text-[#64748B]">{r.starter}</td>
                      <td className="px-4 py-3 text-[#64748B]">{r.standard}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/admin/customers?retailer=${r.id}`)} title="View customers" className="inline-flex items-center gap-1 text-xs font-semibold text-[#F7B31C] hover:text-[#D97706]">View <ChevronRight size={13} /></button>
                      </td>
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
