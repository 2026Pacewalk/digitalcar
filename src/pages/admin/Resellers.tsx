import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useState } from "react";
import {
  Search, Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight,
  X, Store, UserCheck, DollarSign, Users, TrendingUp, Globe, Mail, Phone, Percent, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { REAL_MEMBERS } from "@/data/realMembers";

interface Reseller {
  id: number; fullName: string; email: string; phone: string;
  businessName: string; domain: string; status: string;
  commissionRate: number; customerCount: number; monthlyRevenue: number;
  createdAt: string; lastLogin: string; city: string;
}

const STATUS_OPTIONS = ["active", "inactive", "pending"];

// Generate real resellers from STANDARD package members
const STANDARD_MEMBERS = REAL_MEMBERS.filter(m => m.package === "STANDARD");
const REAL_RESELLERS: Reseller[] = STANDARD_MEMBERS.map((m, i) => ({
  id: m.sn,
  fullName: m.name,
  email: m.email,
  phone: m.phone,
  businessName: m.name,
  domain: `${m.slug}.digitalcarda.in`,
  status: "active",
  commissionRate: 20 + (i % 4) * 3,
  customerCount: Math.floor(Math.random() * 50) + 5,
  monthlyRevenue: Math.floor(Math.random() * 50000) + 5000,
  createdAt: m.startDate,
  lastLogin: m.startDate,
  city: "India",
}));

export default function AdminResellers() {
  const [resellers, setResellers] = useState<Reseller[]>(REAL_RESELLERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reseller | null>(null);
  const [viewReseller, setViewReseller] = useState<Reseller | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", businessName: "", domain: "", city: "", commissionRate: 20, status: "active" });
  const limit = 8;

  const filtered = resellers.filter((r) => {
    const matchesSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openAdd = () => { setEditing(null); setForm({ fullName: "", email: "", phone: "", businessName: "", domain: "", city: "", commissionRate: 20, status: "active" }); setShowForm(true); };
  const openEdit = (r: Reseller) => { setEditing(r); setForm({ fullName: r.fullName, email: r.email, phone: r.phone, businessName: r.businessName, domain: r.domain, city: r.city, commissionRate: r.commissionRate, status: r.status }); setShowForm(true); };
  const handleSave = () => {
    if (!form.fullName || !form.email) { toast.error("Name and email required"); return; }
    if (editing) { setResellers(resellers.map((r) => r.id === editing.id ? { ...r, ...form } : r)); toast.success("Reseller updated"); }
    else { setResellers([{ id: Date.now(), ...form, customerCount: 0, monthlyRevenue: 0, createdAt: new Date().toISOString().split("T")[0], lastLogin: "Never" }, ...resellers]); toast.success("Reseller added"); }
    setShowForm(false);
  };
  const handleDelete = (id: number) => { if (confirm("Delete this reseller?")) { setResellers(resellers.filter((r) => r.id !== id)); toast.success("Deleted"); } };
  const toggleStatus = (id: number) => { setResellers(resellers.map((r) => r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r)); toast.success("Status updated"); };

  const statusBadge = (s: string) => {
    if (s === "active") return "badge-green";
    if (s === "pending") return "badge-gold";
    return "badge-gray bg-gray-100 text-gray-600";
  };

  return (
    <ResponsiveDashboardLayout title="Resellers" subtitle="Manage reseller partners">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Resellers", value: resellers.length, icon: Store, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Active", value: resellers.filter((r) => r.status === "active").length, icon: UserCheck, color: "bg-[#D1FAE5] text-[#065F46]" },
            { label: "Total Customers", value: resellers.reduce((a, r) => a + r.customerCount, 0), icon: Users, color: "bg-[#DBEAFE] text-[#1E40AF]" },
            { label: "Avg Commission", value: `${Math.round(resellers.reduce((a, r) => a + r.commissionRate, 0) / (resellers.length || 1))}%`, icon: Percent, color: "bg-[#FCE7F3] text-[#9D174D]" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}><s.icon size={18} /></div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input type="text" placeholder="Search resellers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Status</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] shrink-0"><Plus size={16} /> Add Reseller</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-[#F8FAFC]">
                {["Reseller", "Business", "Domain", "Commission", "Status", "Customers", "Revenue", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No resellers found</td></tr>
                ) : (
                  paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4"><div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center"><span className="text-[#0F172A] text-xs font-bold">{r.fullName.charAt(0)}</span></div>
                        <div><p className="text-sm font-medium text-[#0F172A]">{r.fullName}</p><p className="text-xs text-[#94A3B8]">{r.email}</p></div>
                      </div></td>
                      <td className="px-5 py-4 text-sm text-[#64748B]">{r.businessName}</td>
                      <td className="px-5 py-4 text-xs text-[#64748B]">{r.domain}</td>
                      <td className="px-5 py-4"><span className="badge-gold">{r.commissionRate}%</span></td>
                      <td className="px-5 py-4"><button onClick={() => toggleStatus(r.id)} className={`${statusBadge(r.status)} capitalize cursor-pointer hover:opacity-80`}>{r.status}</button></td>
                      <td className="px-5 py-4 text-sm text-[#64748B]">{r.customerCount}</td>
                      <td className="px-5 py-4 text-sm text-[#64748B]">{r.monthlyRevenue > 0 ? `₹${(r.monthlyRevenue / 1000).toFixed(1)}K` : "—"}</td>
                      <td className="px-5 py-4"><div className="flex items-center gap-1">
                        <button onClick={() => setViewReseller(r)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Eye size={14} /></button>
                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9]">
              <p className="text-xs text-[#94A3B8]">Page {page} of {totalPages} ({filtered.length} total)</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
              <h3 className="text-base font-semibold text-[#0F172A]">{editing ? "Edit Reseller" : "Add Reseller"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-premium w-full" placeholder="John Doe" /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Name *</label><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="input-premium w-full" placeholder="Business" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email *</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-premium w-full" placeholder="john@example.com" type="email" /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-premium w-full" placeholder="+91 98765 43210" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Domain</label><input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="input-premium w-full" placeholder="cards.example.com" /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-premium w-full" placeholder="Mumbai" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Commission Rate (%)</label><input value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} className="input-premium w-full" placeholder="20" type="number" min={5} max={50} /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-premium w-full">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#F1F5F9]">
              <button onClick={() => setShowForm(false)} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={handleSave} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold">{editing ? "Update" : "Add"} Reseller</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewReseller && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewReseller(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10">
            <div className="p-6 text-center border-b border-[#F1F5F9] relative">
              <button onClick={() => setViewReseller(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
              <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-3"><span className="text-[#0F172A] text-2xl font-bold">{viewReseller.fullName.charAt(0)}</span></div>
              <h3 className="text-lg font-bold text-[#0F172A]">{viewReseller.fullName}</h3>
              <p className="text-sm text-[#64748B]">{viewReseller.businessName}</p>
              <div className="flex justify-center gap-2 mt-2"><span className={`${statusBadge(viewReseller.status)} capitalize`}>{viewReseller.status}</span></div>
            </div>
            <div className="p-5 space-y-3">
              {[{ l: "Email", v: viewReseller.email }, { l: "Phone", v: viewReseller.phone }, { l: "Domain", v: viewReseller.domain }, { l: "City", v: viewReseller.city }, { l: "Commission Rate", v: `${viewReseller.commissionRate}%` }, { l: "Customers", v: String(viewReseller.customerCount) }, { l: "Monthly Revenue", v: viewReseller.monthlyRevenue > 0 ? `₹${viewReseller.monthlyRevenue.toLocaleString()}` : "—" }, { l: "Joined", v: viewReseller.createdAt }, { l: "Last Login", v: viewReseller.lastLogin }].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0"><span className="text-xs text-[#94A3B8]">{item.l}</span><span className="text-sm font-medium text-[#0F172A]">{item.v}</span></div>
              ))}
            </div>
            <div className="p-5 border-t border-[#F1F5F9] flex gap-3">
              <button onClick={() => { setViewReseller(null); openEdit(viewReseller); }} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center justify-center gap-2"><Pencil size={14} /> Edit</button>
              <button onClick={() => setViewReseller(null)} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
