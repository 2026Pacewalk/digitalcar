import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo } from "react";
import { Sparkles, Phone, MapPin, Briefcase, Wand2, Cpu, RefreshCw } from "lucide-react";

const fmt = (s: string | Date | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const isToday = (s: string | Date | null) => {
  if (!s) return false;
  const d = new Date(s); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function AdminAiGenerator() {
  const { data: rows, isLoading, refetch, isFetching } = trpc.ai.list.useQuery();

  const stats = useMemo(() => {
    const list = rows || [];
    const phones = new Set(list.map((r) => (r.phone || "").trim()).filter(Boolean));
    return {
      total: list.length,
      today: list.filter((r) => isToday(r.createdAt)).length,
      withPhone: list.filter((r) => (r.phone || "").trim()).length,
      uniquePhones: phones.size,
      ai: list.filter((r) => r.source === "ai").length,
    };
  }, [rows]);

  const cards = [
    { label: "Total attempts", value: stats.total, icon: Sparkles },
    { label: "Today", value: stats.today, icon: Wand2 },
    { label: "Left a mobile", value: stats.withPhone, icon: Phone },
    { label: "Unique numbers", value: stats.uniquePhones, icon: Cpu },
  ];

  return (
    <ResponsiveDashboardLayout>
      <TopBar title="AI Card Generator" subtitle="Everyone trying the AI generator — captured before signup" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-[#64748B]">Leads from the public <span className="font-mono text-[#0F172A]">/ai-card-generator</span> page. Follow up with anyone who left a mobile number.</p>
          <button onClick={() => refetch()} className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-2">
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">{c.label}</span>
                <c.icon size={16} className="text-[#F7B31C]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#0F172A]">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
            <p className="text-sm font-bold text-[#0F172A]">Recent attempts</p>
            <span className="text-[11px] text-[#94A3B8]">{stats.ai} via Claude AI · {stats.total - stats.ai} smart fallback · latest 300</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] border-b border-[#F1F5F9]">
                  <th className="px-4 py-2.5">Business</th>
                  <th className="px-4 py-2.5">Profession</th>
                  <th className="px-4 py-2.5">City</th>
                  <th className="px-4 py-2.5">Mobile</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                )}
                {!isLoading && (rows || []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-[#94A3B8]">
                    <Sparkles size={22} className="mx-auto mb-2 text-[#CBD5E1]" />
                    No one has tried the AI generator yet.
                  </td></tr>
                )}
                {(rows || []).map((r) => (
                  <tr key={r.id} className="border-b border-[#F8FAFC] hover:bg-[#FFFBEB]/50">
                    <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{r.businessName || "—"}</td>
                    <td className="px-4 py-2.5 text-[#334155]"><span className="inline-flex items-center gap-1.5"><Briefcase size={12} className="text-[#94A3B8]" />{r.profession || "—"}</span></td>
                    <td className="px-4 py-2.5 text-[#334155]">{r.city ? <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-[#94A3B8]" />{r.city}</span> : "—"}</td>
                    <td className="px-4 py-2.5">
                      {r.phone
                        ? <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 font-medium text-[#0F172A] hover:text-[#F7B31C]"><Phone size={12} />{r.phone}</a>
                        : <span className="text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${r.source === "ai" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                        {r.source === "ai" ? <><Sparkles size={10} /> AI</> : <><Cpu size={10} /> Smart</>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
