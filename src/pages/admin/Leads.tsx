import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Search, MessageSquare, Mail, Phone, Calendar, ChevronDown, Filter } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  new: "badge-blue", contacted: "badge-gold", qualified: "badge-teal",
  proposal: "badge-purple bg-purple-50 text-purple-700", negotiation: "badge-orange bg-orange-50 text-orange-700",
  won: "badge-green", lost: "badge-red", archived: "badge-gray bg-gray-100 text-gray-600",
};

export default function AdminLeads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: leads, isLoading } = trpc.lead.list.useQuery();

  const filtered = (leads || []).filter((l: Record<string, unknown>) => {
    const matchesSearch = !search || (l.fullName as string)?.toLowerCase().includes(search.toLowerCase()) || (l.email as string)?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["all", "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

  return (
    <DashboardLayout>
      <TopBar title="Leads" subtitle="Manage captured leads" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter === s ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Lead", "Contact", "Source", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-6 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="h-10 bg-[#F1F5F9] rounded-xl animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94A3B8]">No leads found</td></tr>
                ) : (
                  filtered.map((lead: Record<string, unknown>) => (
                    <tr key={lead.id as number} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                            <MessageSquare size={15} className="text-[#64748B]" />
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">{lead.fullName as string || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {lead.email && <span className="flex items-center gap-1 text-xs text-[#64748B]"><Mail size={11} /> {lead.email as string}</span>}
                          {lead.phone && <span className="flex items-center gap-1 text-xs text-[#64748B]"><Phone size={11} /> {lead.phone as string}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748B] capitalize">{lead.source as string || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={statusColors[lead.status as string] || "badge-blue"}>{lead.status as string}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {lead.createdAt ? new Date(lead.createdAt as string).toLocaleDateString() : "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">View</button>
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
