import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useState } from "react";
import {
  Search, Plus, Pencil, Trash2, Shield, UserCheck, X, Check,
  ChevronLeft, ChevronRight, Eye, Filter, MoreHorizontal,
  Users, UserCircle, Store, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { getRealUsers, type UserData } from "@/data/realMembers";

const ROLE_OPTIONS = ["super_admin", "reseller", "customer"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

const REAL_USERS: UserData[] = getRealUsers();

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>(REAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [viewUser, setViewUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "customer", status: "active", password: "" });
  const limit = 8;

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openAdd = () => { setEditingUser(null); setForm({ fullName: "", email: "", phone: "", role: "customer", status: "active", password: "" }); setShowForm(true); };
  const openEdit = (u: UserData) => { setEditingUser(u); setForm({ fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, status: u.status, password: "" }); setShowForm(true); };

  const handleSave = () => {
    if (!form.fullName || !form.email) { toast.error("Name and email are required"); return; }
    if (editingUser) {
      setUsers(users.map((u) => u.id === editingUser.id ? { ...u, ...form } : u));
      toast.success("User updated");
    } else {
      const newUser: UserData = { id: Date.now(), ...form, createdAt: new Date().toISOString().split("T")[0], lastLogin: "Never", cards: 0, plan: "Starter" };
      setUsers([newUser, ...users]);
      toast.success("User created");
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => { if (confirm("Delete this user?")) { setUsers(users.filter((u) => u.id !== id)); toast.success("User deleted"); } };
  const toggleStatus = (id: number) => {
    setUsers(users.map((u) => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u));
    toast.success("Status updated");
  };

  const roleBadge = (role: string) => {
    if (role === "super_admin") return "badge-gold";
    if (role === "reseller") return "badge-blue";
    return "badge-green";
  };
  const statusBadge = (status: string) => {
    if (status === "active") return "badge-green";
    if (status === "inactive") return "badge-gray bg-gray-100 text-gray-600";
    return "badge-red";
  };

  return (
    <ResponsiveDashboardLayout title="User Management" subtitle="Manage all platform users">
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Admins", value: users.filter((u) => u.role === "super_admin").length, icon: Shield, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Resellers", value: users.filter((u) => u.role === "reseller").length, icon: Store, color: "bg-[#DBEAFE] text-[#1E40AF]" },
            { label: "Customers", value: users.filter((u) => u.role === "customer").length, icon: UserCircle, color: "bg-[#D1FAE5] text-[#065F46]" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={16} /></span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input type="text" placeholder="Search by name, email, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]" />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Roles</option><option value="super_admin">Admin</option><option value="reseller">Reseller</option><option value="customer">Customer</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
            </select>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] shrink-0">
            <Plus size={16} /> Add User
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-[#F8FAFC]">
                {["User", "Role", "Status", "Phone", "Cards", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No users found</td></tr>
                ) : (
                  paginated.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center"><span className="text-[#0F172A] text-xs font-bold">{u.fullName.charAt(0)}</span></div>
                        <div><p className="text-sm font-medium text-[#0F172A]">{u.fullName}</p><p className="text-xs text-[#94A3B8]">{u.email}</p></div>
                      </div></td>
                      <td className="px-4 py-3"><span className={`${roleBadge(u.role)} capitalize`}>{u.role.replace("_", " ")}</span></td>
                      <td className="px-4 py-3"><button onClick={() => toggleStatus(u.id)} className={`${statusBadge(u.status)} capitalize cursor-pointer hover:opacity-80 transition-opacity`}>{u.status}</button></td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{u.phone}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{u.cards}</td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8]">{u.lastLogin}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1">
                        <button onClick={() => setViewUser(u)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors" title="View"><Eye size={14} /></button>
                        <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
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
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
              <h3 className="text-base font-semibold text-[#0F172A]">{editingUser ? "Edit User" : "Add New User"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-premium w-full" placeholder="John Doe" /></div>
              <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email *</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-premium w-full" placeholder="john@example.com" type="email" /></div>
              <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-premium w-full" placeholder="+91 98765 43210" /></div>
              {!editingUser && <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Password *</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-premium w-full" placeholder="Min 6 characters" type="password" /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-premium w-full">
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-premium w-full">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#F1F5F9]">
              <button onClick={() => setShowForm(false)} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all">{editingUser ? "Update User" : "Create User"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Detail Modal ─── */}
      {viewUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10">
            <div className="p-6 text-center border-b border-[#F1F5F9]">
              <button onClick={() => setViewUser(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
              <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-3"><span className="text-[#0F172A] text-2xl font-bold">{viewUser.fullName.charAt(0)}</span></div>
              <h3 className="text-lg font-bold text-[#0F172A]">{viewUser.fullName}</h3>
              <p className="text-sm text-[#64748B]">{viewUser.email}</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className={`${roleBadge(viewUser.role)} capitalize`}>{viewUser.role.replace("_", " ")}</span>
                <span className={`${statusBadge(viewUser.status)} capitalize`}>{viewUser.status}</span>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Phone", value: viewUser.phone },
                { label: "Plan", value: viewUser.plan },
                { label: "Cards Created", value: String(viewUser.cards) },
                { label: "Joined", value: viewUser.createdAt },
                { label: "Last Login", value: viewUser.lastLogin },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-xs text-[#94A3B8]">{item.label}</span>
                  <span className="text-sm font-medium text-[#0F172A]">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[#F1F5F9] flex gap-3">
              <button onClick={() => { setViewUser(null); openEdit(viewUser); }} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center justify-center gap-2"><Pencil size={14} /> Edit</button>
              <button onClick={() => setViewUser(null)} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-2">Close</button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
