import { useEffect, useMemo, useState } from "react";
import { Mail as MailIcon, Search, Phone, Calendar, Trash2, Inbox, User } from "lucide-react";
import { toast } from "sonner";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

type Enquiry = { id: string; name: string; contact: string; email: string; description: string; uname: string; created_on: string };

const fmt = (s: string) => { const d = new Date(String(s).replace(" ", "T")); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

export default function CustomerEnquiry() {
  const { data } = useCustomer();
  const slug = String(data.slug || "");
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/enquiries.json").then((r) => r.json())
      .then((d: Enquiry[]) => setRows(d.filter((e) => e.uname === slug)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((e) => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.contact?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
  }, [rows, search]);

  const remove = (id: string) => { setRows((r) => r.filter((e) => e.id !== id)); toast.success("Enquiry deleted"); };

  return (
    <ModuleShell title="Enquiries" subtitle={`Leads captured from your card${slug ? ` /${slug}` : ""}`} icon={MailIcon}
      actions={
        <div className="relative w-48 sm:w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full h-10 bg-white rounded-lg pl-9 pr-3 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
        </div>
      }>
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="bg-[#F8FAFC]">
              {["#", "Date", "Name", "Email", "Contact", "Requirement", ""].map((h) => <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-[#F1F5F9] rounded-lg animate-pulse" /></td></tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center"><Inbox size={26} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-sm text-[#94A3B8]">No enquiries yet</p></td></tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} className="hover:bg-[#F8FAFC] transition-colors align-top">
                  <td className="px-4 py-3 text-xs text-[#94A3B8]">{i + 1}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap"><span className="flex items-center gap-1"><Calendar size={11} /> {fmt(e.created_on)}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2 text-sm font-medium text-[#0F172A]"><span className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0"><User size={13} className="text-[#64748B]" /></span>{e.name || "—"}</span></td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{e.email ? <a href={`mailto:${e.email}`} className="hover:text-[#F7B31C]">{e.email}</a> : "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{e.contact ? <a href={`tel:${e.contact}`} className="flex items-center gap-1 hover:text-[#F7B31C]"><Phone size={11} /> {e.contact}</a> : "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#475569] max-w-[260px]"><span className="line-clamp-2">{e.description || "—"}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => remove(e.id)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && <div className="px-4 py-2.5 bg-[#F8FAFC] text-xs text-[#64748B] border-t border-[#F1F5F9]">{filtered.length} enquir{filtered.length === 1 ? "y" : "ies"}</div>}
      </div>
    </ModuleShell>
  );
}
