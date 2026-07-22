import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState } from "react";
import { Search, Mail, Phone, Calendar, MessageSquare, PhoneCall, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  new: "bg-[#DBEAFE] text-[#1E40AF]",
  contacted: "bg-[#D1FAE5] text-[#065F46]",
  qualified: "bg-[#CCFBF1] text-[#0F766E]",
  proposal: "bg-purple-50 text-purple-700",
  negotiation: "bg-orange-50 text-orange-700",
  won: "bg-[#D1FAE5] text-emerald-700",
  lost: "bg-red-50 text-red-500",
};

const DEMO_LEADS = [
  { id: 1, fullName: "Rahul Sharma", email: "rahul@example.com", phone: "+91 98765 43210", source: "whatsapp", status: "new", createdAt: "2026-05-08T14:30:00", message: "Interested in premium plan" },
  { id: 2, fullName: "Priya Patel", email: "priya@design.com", phone: "+91 99887 66554", source: "qr scan", status: "new", createdAt: "2026-05-08T12:15:00", message: "Saw your card at the event" },
  { id: 3, fullName: "Amit Kumar", email: "amit@tech.in", phone: "+91 98123 45678", source: "website", status: "contacted", createdAt: "2026-05-07T18:45:00", message: "Need enterprise pricing" },
  { id: 4, fullName: "Sneha Gupta", email: "sneha@biz.com", phone: "+91 98765 11223", source: "direct", status: "followup", createdAt: "2026-05-06T09:20:00", message: "Follow up next week" },
  { id: 5, fullName: "Vikram Mehta", email: "vikram@style.com", phone: "+91 98111 22333", source: "whatsapp", status: "qualified", createdAt: "2026-05-05T16:30:00", message: "Ready to purchase" },
  { id: 6, fullName: "Deepa Joshi", email: "deepa@creative.in", phone: "+91 98340 55667", source: "qr scan", status: "proposal", createdAt: "2026-05-04T11:00:00", message: "Send proposal please" },
];

const statusOptions = ["all", "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

/* ─── Mobile Lead Card ─── */
function LeadCard({ lead, onStatusChange }: { lead: typeof DEMO_LEADS[0]; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full gradient-gold flex items-center justify-center shrink-0">
          <span className="text-[#0F172A] text-sm font-bold">{lead.fullName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#0F172A]">{lead.fullName}</h3>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${statusColors[lead.status]}`}>{lead.status}</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5 capitalize">{lead.source} &middot; {new Date(lead.createdAt).toLocaleDateString()}</p>
          {lead.message && <p className="text-[11px] text-[#64748B] mt-1.5 bg-[#F8FAFC] rounded-lg p-2">{lead.message}</p>}
          <div className="flex items-center gap-3 mt-2.5">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#F7B31C]"><Mail size={10} /> {lead.email}</a>
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#F7B31C]"><Phone size={10} /> {lead.phone}</a>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
        <a href={`tel:${lead.phone}`} className="flex-1 h-8 rounded-lg bg-[#0F172A] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform">
          <PhoneCall size={12} /> Call
        </a>
        <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" className="flex-1 h-8 rounded-lg bg-[#14B8A6] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform">
          <MessageSquare size={12} /> WhatsApp
        </a>
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className="h-8 px-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-medium text-[#0F172A] outline-none focus:border-[#F7B31C]"
        >
          {statusOptions.filter((s) => s !== "all").map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─── Desktop Table Row ─── */
function TableRow({ lead, onStatusChange }: { lead: typeof DEMO_LEADS[0]; onStatusChange: (id: number, status: string) => void }) {
  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center">
            <span className="text-[#0F172A] text-xs font-bold">{lead.fullName.charAt(0)}</span>
          </div>
          <span className="text-sm font-medium text-[#0F172A]">{lead.fullName}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-xs text-[#64748B]"><Mail size={11} /> {lead.email}</span>
          <span className="flex items-center gap-1 text-xs text-[#64748B]"><Phone size={11} /> {lead.phone}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[#64748B] capitalize">{lead.source}</td>
      <td className="px-6 py-4">
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className={`text-xs font-medium border-0 outline-none cursor-pointer bg-transparent ${statusColors[lead.status]}`}
        >
          {statusOptions.filter((s) => s !== "all").map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4 text-sm text-[#94A3B8]">
        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(lead.createdAt).toLocaleDateString()}</span>
      </td>
    </tr>
  );
}

export default function CustomerLeads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leads, setLeads] = useState(DEMO_LEADS);

  const filtered = leads.filter((l) => {
    const matchesSearch = !search || l.fullName.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: number, status: string) => {
    setLeads(leads.map((l) => l.id === id ? { ...l, status } : l));
    toast.success("Status updated");
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Leads" subtitle="Manage your captured leads" /></div>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter === s ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: leads.length },
            { label: "New", value: leads.filter((l) => l.status === "new").length },
            { label: "Contacted", value: leads.filter((l) => l.status === "contacted").length },
            { label: "Won", value: leads.filter((l) => l.status === "won").length },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9]">
              <p className="text-xs text-[#94A3B8]">{s.label}</p>
              <p className="text-xl font-bold text-[#0F172A] mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-premium border border-[#F1F5F9] text-center">
              <p className="text-sm text-[#94A3B8]">No leads found</p>
            </div>
          ) : (
            filtered.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Lead", "Contact", "Source", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-[#94A3B8]">No leads found</td></tr>
                ) : (
                  filtered.map((lead) => <TableRow key={lead.id} lead={lead} onStatusChange={handleStatusChange} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
