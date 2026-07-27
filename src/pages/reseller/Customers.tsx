import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { Search, Users, UserPlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function ResellerCustomers() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.user.resellerCustomers.useQuery({ page: 1, limit: 100 });
  const utils = trpc.useUtils();
  const createCustomer = trpc.reseller.createCustomer.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const add = async () => {
    if (!form.fullName.trim() || !form.email.trim()) return toast.error("Name and email are required");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      await createCustomer.mutateAsync(form);
      toast.success(`${form.fullName} added to your customers`);
      setOpen(false); setForm({ fullName: "", email: "", phone: "", password: "" });
      utils.user.resellerCustomers.invalidate(); utils.user.resellerStats.invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add customer"); }
  };
  const inputCls = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]";

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
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-[#64748B] whitespace-nowrap">{data?.total ?? 0} total</span>
            <button onClick={() => setOpen(true)} className="h-11 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-gold transition-all"><UserPlus size={16} /> Add Customer</button>
          </div>
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

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center"><X size={16} /></button>
            <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-4"><UserPlus size={20} className="text-[#F7B31C]" /></div>
            <h3 className="text-lg font-bold text-[#0F172A]">Add a customer</h3>
            <p className="text-sm text-[#64748B] mt-0.5 mb-4">They're linked to your account, and you earn commission when they go paid.</p>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-[#334155] mb-1">Full name</label><input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputCls} placeholder="Customer name" /></div>
              <div><label className="block text-xs font-semibold text-[#334155] mb-1">Email</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="customer@example.com" /></div>
              <div><label className="block text-xs font-semibold text-[#334155] mb-1">Phone <span className="font-normal text-[#94A3B8]">(optional)</span></label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+91 XXXXX XXXXX" /></div>
              <div><label className="block text-xs font-semibold text-[#334155] mb-1">Temporary password</label><input value={form.password} onChange={(e) => set("password", e.target.value)} className={inputCls} placeholder="Min 6 characters — share it with them" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={add} disabled={createCustomer.isPending} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-60">{createCustomer.isPending ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : "Add Customer"}</button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
