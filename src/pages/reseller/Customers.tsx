import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState } from "react";
import { Search, Plus, Users, CreditCard, Eye, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const mockCustomers = [
  { id: 1, name: "Alice Brown", email: "alice@example.com", plan: "Professional", cards: 3, views: 2450, status: "active", joined: "May 2026" },
  { id: 2, name: "Bob Wilson", email: "bob@example.com", plan: "Starter", cards: 1, views: 890, status: "active", joined: "Apr 2026" },
  { id: 3, name: "Carol White", email: "carol@example.com", plan: "Business", cards: 5, views: 5200, status: "active", joined: "Mar 2026" },
  { id: 4, name: "Dan Moore", email: "dan@example.com", plan: "Starter", cards: 1, views: 320, status: "inactive", joined: "Feb 2026" },
  { id: 5, name: "Eve Taylor", email: "eve@example.com", plan: "Professional", cards: 2, views: 1800, status: "active", joined: "Jan 2026" },
];

export default function ResellerCustomers() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = mockCustomers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <TopBar title="My Customers" subtitle="Manage your customer accounts" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
            />
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]">
            <Plus size={16} /> Add Customer
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Add New Customer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input placeholder="Full Name" className="input-premium" />
              <input placeholder="Email" type="email" className="input-premium" />
              <select className="input-premium"><option>Starter</option><option>Professional</option><option>Business</option></select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => { setShowForm(false); toast.success("Customer added!"); }} className="btn-gold">Add Customer</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Customer", "Plan", "Cards", "Views", "Status", "Joined", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-[#94A3B8]">No customers found</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
                            <span className="text-[#0F172A] text-xs font-bold">{c.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{c.name}</p>
                            <p className="text-xs text-[#94A3B8]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="badge-gold">{c.plan}</span></td>
                      <td className="px-6 py-4 text-sm text-[#64748B]">{c.cards}</td>
                      <td className="px-6 py-4 text-sm text-[#64748B]">{c.views.toLocaleString()}</td>
                      <td className="px-6 py-4"><span className={`badge-${c.status === "active" ? "green" : "red"}`}>{c.status}</span></td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">{c.joined}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Pencil size={14} /></button>
                          <button className="p-2 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
