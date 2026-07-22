import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Search, CreditCard, Eye, MousePointer, ExternalLink, Globe, Lock } from "lucide-react";

export default function AdminCards() {
  const [search, setSearch] = useState("");
  const { data: cardsData, isLoading } = trpc.card.listAll.useQuery();

  const cards = (cardsData?.cards || []).filter((c: Record<string, unknown>) =>
    !search || (c.title as string)?.toLowerCase().includes(search.toLowerCase()) || (c.ownerName as string)?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Cards" subtitle="All digital cards on the platform" /></div>
      <div className="p-6 space-y-6">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search cards by title or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["Card", "Owner", "Views", "Clicks", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-10 bg-[#F1F5F9] rounded-xl animate-pulse" /></td></tr>
                  ))
                ) : cards.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No cards found</td></tr>
                ) : (
                  cards.map((card: Record<string, unknown>) => (
                    <tr key={card.id as number} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                            <CreditCard size={16} className="text-[#0F172A]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{card.title as string}</p>
                            <p className="text-xs text-[#94A3B8]">/{card.slug as string}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{card.ownerName as string || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-[#64748B]"><Eye size={13} className="text-[#94A3B8]" /> {Number(card.viewCount || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-[#64748B]"><MousePointer size={13} className="text-[#94A3B8]" /> {Number(card.clickCount || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge-${card.status === "published" ? "green" : card.status === "draft" ? "blue" : "red"}`}>
                          {card.status as string}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/c/${card.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors inline-flex">
                          <ExternalLink size={14} />
                        </a>
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
