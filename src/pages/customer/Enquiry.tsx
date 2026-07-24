import { useEffect, useMemo, useState } from "react";
import { Mail, Search, Phone, Calendar, Trash2, Inbox, Info, Sparkles, TrendingUp } from "lucide-react";
const MailIcon = Mail;
import { toast } from "sonner";
import ModuleShell from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { fetchMyLeads } from "@/lib/adminData";
import { useEnquiryNotifications, loadNewEnquiries, NEW_ENQ_KEY } from "@/hooks/useEnquiryNotifications";

type Enquiry = { id: string; name: string; contact: string; email: string; description: string; uname: string; created_on: string; status: string };
const isNewLead = (id: string) => id.startsWith("new_");
const DELETED_KEY = "dc_deleted_enquiries";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-600 border-blue-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  closed: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = { new: "New", pending: "Pending", closed: "Closed" };
const STATUS_ORDER = ["new", "pending", "closed"];
const STATUS_KEY = "dc_enquiry_status";

const fmt = (s: string) => { const d = new Date(String(s).replace(" ", "T")); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const withinDays = (s: string, days: number) => { const d = new Date(String(s).replace(" ", "T")); if (isNaN(d.getTime())) return false; return (Date.now() - d.getTime()) <= days * 86_400_000; };

const loadDeleted = (): Set<string> => { try { const a = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); } };

export default function CustomerEnquiry() {
  const { data } = useCustomer();
  const slug = String(data.slug || "");
  const { newItems, markAllRead } = useEnquiryNotifications();
  const [baseRows, setBaseRows] = useState<Enquiry[]>([]);
  const [deleted, setDeleted] = useState<Set<string>>(() => loadDeleted());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(STATUS_KEY); if (raw) setStatusMap(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const sl = slug.toLowerCase();
    fetchMyLeads<Enquiry[]>()
      .then((d) => setBaseRows(d.filter((e) => String(e.uname ?? "").toLowerCase() === sl)))
      .catch(() => setBaseRows([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const statusOf = (e: Enquiry) => (statusMap[e.id] ?? (e.status || "new")).toLowerCase();
  const setStatus = (id: string, val: string) => {
    setStatusMap((m) => { const next = { ...m, [id]: val }; try { localStorage.setItem(STATUS_KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
    setMenuFor(null);
    toast.success(`Marked as ${STATUS_LABEL[val]}`);
  };

  // Seeing this page clears the unread badge
  useEffect(() => { markAllRead(); }, [markAllRead, newItems.length]);

  // Card submissions (newest first) + historical enquiries, minus deleted
  const rows = useMemo(() => {
    const fresh = [...(newItems as unknown as Enquiry[])].sort((a, b) => (b.created_on || "").localeCompare(a.created_on || ""));
    return [...fresh, ...baseRows].filter((e) => !deleted.has(e.id));
  }, [newItems, baseRows, deleted]);

  const stats = useMemo(() => ({
    total: rows.length,
    fresh: rows.filter((e) => isNewLead(e.id)).length,
    week: rows.filter((e) => withinDays(e.created_on, 7)).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((e) => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.contact?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
  }, [rows, search]);

  const doDelete = (id: string) => {
    const next = new Set(deleted); next.add(id);
    setDeleted(next);
    try { localStorage.setItem(DELETED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
    if (isNewLead(id)) {
      try { localStorage.setItem(NEW_ENQ_KEY, JSON.stringify(loadNewEnquiries().filter((e) => e.id !== id))); window.dispatchEvent(new Event("storage")); } catch { /* ignore */ }
    }
    setConfirmId(null);
    toast.success("Enquiry deleted");
  };

  const statCards = [
    { label: "Total Leads", value: stats.total, icon: Inbox, from: "#14243E", to: "#243b63" },
    { label: "New (uncontacted)", value: stats.fresh, icon: Sparkles, from: "#D97706", to: "#F59E0B" },
    { label: "This Week", value: stats.week, icon: TrendingUp, from: "#0891B2", to: "#06B6D4" },
  ];

  return (
    <ModuleShell title="Enquiries" subtitle={`Leads captured from your card${slug ? ` /${slug}` : ""}`} icon={MailIcon}
      actions={
        <div className="relative w-40 sm:w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="w-full h-10 bg-white rounded-xl pl-9 pr-3 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
        </div>
      }>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="relative rounded-2xl p-3.5 sm:p-4 text-white overflow-hidden shadow-premium" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
            <s.icon size={40} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20" />
            <p className="text-2xl sm:text-3xl font-extrabold leading-none">{s.value}</p>
            <p className="text-[10px] sm:text-xs font-medium opacity-90 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Intro banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] px-4 py-3">
        <Info size={16} className="text-[#B45309] mt-0.5 shrink-0" />
        <p className="text-xs sm:text-sm text-[#92400E]">Every enquiry from your digital card arrives here in real time, with new leads flagged. Reply quickly — prospects contacted within the first hour convert far more often.</p>
      </div>

      {/* Lead cards */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-[#F1F5F9] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Inbox size={24} className="text-[#94A3B8]" /></div>
          <p className="text-sm font-medium text-[#0F172A]">{search ? "No matching enquiries" : "No enquiries yet"}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{search ? "Try a different search." : "You'll be alerted the moment someone enquires from your card."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const status = statusOf(e);
            return (
              <div key={e.id} className="group bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 sm:p-5 hover:border-[#F7B31C]/40 hover:shadow-gold/10 transition-all">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] flex items-center justify-center shrink-0 text-[#B45309] font-bold">
                    {(e.name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#0F172A] truncate">{e.name || "Anonymous"}</h3>
                      {isNewLead(e.id) && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 animate-pulse"><Sparkles size={9} /> Just In</span>}
                      {/* Click-to-change status */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuFor((m) => (m === e.id ? null : e.id))}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border cursor-pointer hover:brightness-95 transition ${STATUS_STYLE[status] || STATUS_STYLE.new}`}
                          title="Click to change status"
                        >
                          {STATUS_LABEL[status] || "New"}
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                        {menuFor === e.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                            <div className="absolute left-0 top-6 z-30 w-32 bg-white rounded-xl shadow-premium-lg border border-[#F1F5F9] p-1">
                              {STATUS_ORDER.map((v) => (
                                <button key={v} onClick={() => setStatus(e.id, v)} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${v === status ? "bg-[#F8FAFC]" : "hover:bg-[#F8FAFC]"}`}>
                                  <span className={`w-2 h-2 rounded-full ${v === "new" ? "bg-blue-500" : v === "pending" ? "bg-amber-500" : "bg-emerald-500"}`} />
                                  {STATUS_LABEL[v]}
                                  {v === status && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto text-emerald-500"><path d="M20 6L9 17l-5-5" /></svg>}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-[#94A3B8] mt-0.5"><Calendar size={11} /> {fmt(e.created_on)}</p>

                    {/* Contact chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] hover:border-[#F7B31C] hover:text-[#0F172A] transition-colors max-w-full"><Mail size={12} className="text-[#94A3B8] shrink-0" /><span className="truncate">{e.email}</span></a>}
                      {e.contact && <a href={`tel:${e.contact}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] hover:border-[#F7B31C] hover:text-[#0F172A] transition-colors"><Phone size={12} className="text-[#94A3B8] shrink-0" />{e.contact}</a>}
                    </div>

                    {/* Requirement */}
                    {e.description && <p className="text-xs text-[#475569] mt-2.5 leading-relaxed bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#F1F5F9]">{e.description}</p>}
                  </div>

                  {/* Delete */}
                  <button onClick={() => setConfirmId(e.id)} className="w-9 h-9 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center shrink-0 transition-colors" aria-label="Delete enquiry"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-[#94A3B8] pt-1">Showing {filtered.length} of {rows.length} enquir{rows.length === 1 ? "y" : "ies"}</p>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-[#0F172A]">Delete this enquiry?</h3>
            <p className="text-sm text-[#64748B] mt-1">This lead will be permanently removed and won't come back.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmId(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={() => doDelete(confirmId)} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
