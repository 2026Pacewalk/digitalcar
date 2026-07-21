import DashboardLayout from "@/components/layout/DashboardLayout";
import { useState } from "react";
import {
  Search, Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight,
  X, CreditCard, Users, UserCheck, Clock, Mail, Phone, Package,
  TrendingUp, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { getRealCustomers, type CustomerData } from "@/data/realMembers";

const PLANS = ["Free", "Starter", "Professional", "Business", "Enterprise"];
const STATUS_OPTIONS = ["active", "inactive"];

const REAL_CUSTOMERS: CustomerData[] = getRealCustomers();

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerData[]>(REAL_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", businessName: "", plan: "Starter", status: "active", city: "" });
  const limit = 8;

  const filtered = customers.filter((c) => {
    const matchesSearch = !search || c.fullName.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || c.plan === planFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });
  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openAdd = () => { setEditing(null); setForm({ fullName: "", email: "", phone: "", businessName: "", plan: "Starter", status: "active", city: "" }); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ fullName: c.fullName, email: c.email, phone: c.phone, businessName: c.businessName, plan: c.plan, status: c.status, city: c.city }); setShowForm(true); };
  const handleSave = () => {
    if (!form.fullName || !form.email) { toast.error("Name and email required"); return; }
    if (editing) { setCustomers(customers.map((c) => c.id === editing.id ? { ...c, ...form } : c)); toast.success("Customer updated"); }
    else { setCustomers([{ id: Date.now(), ...form, cards: 0, totalViews: 0, leads: 0, createdAt: new Date().toISOString().split("T")[0], lastActive: "Just now" }, ...customers]); toast.success("Customer added"); }
    setShowForm(false);
  };
  const handleDelete = (id: number) => { if (confirm("Delete this customer?")) { setCustomers(customers.filter((c) => c.id !== id)); toast.success("Deleted"); } };
  const toggleStatus = (id: number) => { setCustomers(customers.map((c) => c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c)); toast.success("Status updated"); };

  return (
    <DashboardLayout title="Customers" subtitle="Manage customer accounts">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Customers", value: customers.length, icon: Users, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Active", value: customers.filter((c) => c.status === "active").length, icon: UserCheck, color: "bg-[#D1FAE5] text-[#065F46]" },
            { label: "Total Cards", value: customers.reduce((a, c) => a + c.cards, 0), icon: CreditCard, color: "bg-[#DBEAFE] text-[#1E40AF]" },
            { label: "Total Leads", value: customers.reduce((a, c) => a + c.leads, 0), icon: TrendingUp, color: "bg-[#FCE7F3] text-[#9D174D]" },
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
              <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]" />
            </div>
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Plans</option>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] shrink-0"><Plus size={16} /> Add Customer</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-[#F8FAFC]">
                {["Customer", "Business", "Plan", "Status", "Cards", "Views", "Leads", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4"><div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center"><span className="text-[#0F172A] text-xs font-bold">{c.fullName.charAt(0)}</span></div>
                      <div><p className="text-sm font-medium text-[#0F172A]">{c.fullName}</p><p className="text-xs text-[#94A3B8]">{c.email}</p></div>
                    </div></td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{c.businessName}</td>
                    <td className="px-5 py-4"><span className="badge-gold">{c.plan}</span></td>
                    <td className="px-5 py-4"><button onClick={() => toggleStatus(c.id)} className={`${c.status === "active" ? "badge-green" : "badge-gray bg-gray-100 text-gray-600"} capitalize cursor-pointer hover:opacity-80`}>{c.status}</button></td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{c.cards}</td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{c.totalViews.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-[#64748B]">{c.leads}</td>
                    <td className="px-5 py-4"><div className="flex items-center gap-1">
                      <button onClick={() => setViewCustomer(c)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F1F5F9]">
              <p className="text-xs text-[#94A3B8]">Page {page} of {totalPages}</p>
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
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]"><h3 className="text-base font-semibold text-[#0F172A]">{editing ? "Edit Customer" : "Add Customer"}</h3><button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button></div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-premium w-full" placeholder="John Doe" /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Name</label><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="input-premium w-full" placeholder="Business" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email *</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-premium w-full" placeholder="john@example.com" type="email" /></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-premium w-full" placeholder="+91 98765 43210" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Plan</label><select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="input-premium w-full">{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-premium w-full"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-premium w-full" placeholder="Mumbai" /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#F1F5F9]">
              <button onClick={() => setShowForm(false)} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={handleSave} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold">{editing ? "Update" : "Add"} Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewCustomer(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10">
            <div className="p-6 text-center border-b border-[#F1F5F9] relative">
              <button onClick={() => setViewCustomer(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
              <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-3"><span className="text-[#0F172A] text-2xl font-bold">{viewCustomer.fullName.charAt(0)}</span></div>
              <h3 className="text-lg font-bold text-[#0F172A]">{viewCustomer.fullName}</h3>
              <p className="text-sm text-[#64748B]">{viewCustomer.businessName}</p>
              <div className="flex justify-center gap-2 mt-2"><span className="badge-gold">{viewCustomer.plan}</span><span className={viewCustomer.status === "active" ? "badge-green" : "badge-gray bg-gray-100 text-gray-600"}>{viewCustomer.status}</span></div>
            </div>
            <div className="p-5 space-y-3">
              {[{ l: "Email", v: viewCustomer.email }, { l: "Phone", v: viewCustomer.phone }, { l: "City", v: viewCustomer.city }, { l: "Cards", v: String(viewCustomer.cards) }, { l: "Total Views", v: viewCustomer.totalViews.toLocaleString() }, { l: "Leads Captured", v: String(viewCustomer.leads) }, { l: "Joined", v: viewCustomer.createdAt }, { l: "Last Active", v: viewCustomer.lastActive }].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0"><span className="text-xs text-[#94A3B8]">{item.l}</span><span className="text-sm font-medium text-[#0F172A]">{item.v}</span></div>
              ))}
            </div>
            <div className="p-5 border-t border-[#F1F5F9] flex gap-3">
              <button onClick={() => { setViewCustomer(null); openEdit(viewCustomer); }} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center justify-center gap-2"><Pencil size={14} /> Edit</button>
              <button onClick={() => setViewCustomer(null)} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
