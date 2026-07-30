import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useEffect, useMemo, useState } from "react";
import {
  Search, Mail, Phone, Calendar, CheckCircle2, Trash2,
  ChevronLeft, ChevronRight, Inbox, CreditCard, Globe, Loader2, User,
  AlertTriangle, X, Flame, Ban, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { classifyLead, type LeadCategory } from "@/lib/leadIntel";
import { cleanText } from "@/lib/cleanText";
import { fetchAdminData, hideAdminRecords } from "@/lib/adminData";

type Enquiry = {
  id: string; name: string; contact: string; email: string; description: string;
  uname: string; created_on: string; status: string;
  reseller_convert: string | null; converted_on: string | null; remarks: string | null;
};

const PAGE_SIZE = 15;
const isCardLead = (e: Enquiry) => !!e.uname && e.uname !== "admin" && e.uname.trim() !== "";
const fmtDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function CatBadge({ c }: { c: LeadCategory }) {
  if (c === "important") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFEDD5] text-[#C2410C] text-[10px] font-bold"><Flame size={10} /> Important</span>;
  if (c === "spam") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] text-[10px] font-bold"><Ban size={10} /> Spam</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-semibold">Normal</span>;
}

export default function AdminLeads() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "important" | "normal" | "spam" | "converted">("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetchAdminData<Enquiry[]>("enquiries")
      // Newest enquiries first (by created_on, id as tiebreaker).
      .then((d) => {
        const t = (s: string) => new Date(String(s || "").replace(" ", "T")).getTime() || 0;
        setRows([...d].sort((a, b) => t(b.created_on) - t(a.created_on) || Number(b.id) - Number(a.id)));
      })
      .catch(() => toast.error("Could not load enquiries"))
      .finally(() => setLoading(false));
  }, []);

  // AI/heuristic intelligence: classify every lead as important / normal / spam.
  const verdicts = useMemo(() => {
    const m = new Map<string, LeadCategory>();
    for (const e of rows) m.set(e.id, classifyLead({ name: e.name, email: e.email, contact: e.contact, description: e.description, uname: e.uname }).category);
    return m;
  }, [rows]);
  const cat = (e: Enquiry): LeadCategory => verdicts.get(e.id) || "normal";

  const stats = useMemo(() => {
    const important = rows.filter((e) => cat(e) === "important").length;
    const spam = rows.filter((e) => cat(e) === "spam").length;
    const converted = rows.filter((e) => e.status === "converted").length;
    return { total: rows.length, important, normal: rows.length - important - spam, spam, converted };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, verdicts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((e) => {
      if (filter === "converted" && e.status !== "converted") return false;
      if ((filter === "important" || filter === "normal" || filter === "spam") && cat(e) !== filter) return false;
      if (!q) return true;
      return (
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.contact?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.uname?.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      // Important first, then normal, then spam (date order preserved within each).
      const rank: Record<LeadCategory, number> = { important: 0, normal: 1, spam: 2 };
      return rank[cat(a)] - rank[cat(b)];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filter, verdicts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  useEffect(() => { setPage(1); }, [search, filter]);

  useEffect(() => {
    if (!confirmIds) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setConfirmIds(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmIds]);

  const convert = (id: string) => {
    setRows((r) => r.map((e) => (e.id === id ? { ...e, status: "converted", converted_on: new Date().toISOString() } : e)));
    toast.success("Enquiry converted to customer");
  };
  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAllPage = () => setSelected((s) => {
    const n = new Set(s);
    const all = pageIds.every((id) => n.has(id));
    pageIds.forEach((id) => (all ? n.delete(id) : n.add(id)));
    return n;
  });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => r.id)));

  const askDelete = (ids: string[]) => { if (ids.length) setConfirmIds(ids); };
  const doDelete = async () => {
    if (!confirmIds) return;
    const ids = confirmIds;
    const del = new Set(ids);
    setRows((r) => r.filter((e) => !del.has(e.id)));
    setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
    setConfirmIds(null);
    // Persist the delete server-side so they don't return after a refresh.
    try {
      const res = await hideAdminRecords("enquiries", ids);
      if (res.ok) toast.success(ids.length > 1 ? `${ids.length.toLocaleString("en-IN")} enquiries deleted` : "Enquiry deleted");
      else throw new Error();
    } catch {
      toast.error("Removed here, but the server didn't save it — they may return on refresh.");
    }
  };

  const statCards = [
    { label: "Total Enquiries", value: stats.total, icon: Inbox, tint: "#F7B31C", bg: "#FEF3C7" },
    { label: "Important", value: stats.important, icon: Flame, tint: "#EA580C", bg: "#FFEDD5" },
    { label: "Spam", value: stats.spam, icon: Ban, tint: "#EF4444", bg: "#FEE2E2" },
    { label: "Converted", value: stats.converted, icon: CheckCircle2, tint: "#22C55E", bg: "#DCFCE7" },
  ];
  const filters = [
    { id: "all" as const, label: "All", count: stats.total },
    { id: "important" as const, label: "🔥 Important", count: stats.important },
    { id: "normal" as const, label: "Normal", count: stats.normal },
    { id: "spam" as const, label: "🚫 Spam", count: stats.spam },
    { id: "converted" as const, label: "Converted", count: stats.converted },
  ];

  const clearAllSpam = () => {
    const ids = rows.filter((e) => cat(e) === "spam").map((e) => e.id);
    if (!ids.length) { toast.info("No spam leads to clear"); return; }
    setConfirmIds(ids);
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Enquiries" subtitle="Leads captured from cards & the website" /></div>
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <s.icon size={20} style={{ color: s.tint }} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#0F172A] tabular-nums">{loading ? "—" : s.value.toLocaleString("en-IN")}</p>
                <p className="text-xs text-[#64748B]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text" placeholder="Search name, email, contact, requirement…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {filters.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${filter === f.id ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {f.label}
                <span className={`text-[10px] px-1.5 rounded-full ${filter === f.id ? "bg-white/20" : "bg-[#F1F5F9]"}`}>{f.count}</span>
              </button>
            ))}
            {stats.spam > 0 && (
              <button onClick={clearAllSpam} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1.5">
                <Trash2 size={13} /> Clear {stats.spam.toLocaleString("en-IN")} spam
              </button>
            )}
          </div>
        </div>
        {!loading && (
          <p className="-mt-2 text-[11px] text-[#94A3B8] flex items-center gap-1"><Sparkles size={11} className="text-[#F7B31C]" /> Auto-sorted by smart lead scoring — Important leads first-priority, Spam filtered for one-tap cleanup.</p>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0F172A] rounded-xl shadow-premium animate-fade-in">
            <div className="flex items-center gap-3 text-sm text-white">
              <span className="font-semibold">{selected.size.toLocaleString("en-IN")} selected</span>
              {selected.size < filtered.length && (
                <button onClick={selectAllFiltered} className="text-[#F7B31C] hover:underline text-xs font-medium">
                  Select all {filtered.length.toLocaleString("en-IN")}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-[#94A3B8] hover:text-white text-xs">Clear</button>
            </div>
            <button onClick={() => askDelete([...selected])} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors active:scale-[0.98]">
              <Trash2 size={14} /> Delete selected
            </button>
          </div>
        )}

        {/* Table (desktop) + cards (mobile) */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[940px]">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} className="rounded border-[#CBD5E1] accent-[#F7B31C] w-4 h-4 align-middle cursor-pointer" aria-label="Select all on page" />
                  </th>
                  {["#", "Date", "Name", "Email", "Contact", "Requirement", "Source", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-9 bg-[#F1F5F9] rounded-lg animate-pulse" /></td></tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-16 text-center">
                    <Inbox size={28} className="mx-auto text-[#CBD5E1] mb-2" />
                    <p className="text-sm text-[#94A3B8]">No enquiries found</p>
                  </td></tr>
                ) : (
                  pageRows.map((e, i) => {
                    const card = isCardLead(e);
                    const isOpen = expanded.has(e.id);
                    const desc = cleanText(e.description);
                    const long = desc.length > 90;
                    const checked = selected.has(e.id);
                    return (
                      <tr key={e.id} className={`transition-colors align-top ${checked ? "bg-[#FEF3C7]/40" : "hover:bg-[#F8FAFC]"}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={checked} onChange={() => toggleSelect(e.id)} className="rounded border-[#CBD5E1] accent-[#F7B31C] w-4 h-4 align-middle cursor-pointer" aria-label={`Select ${e.name}`} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8]">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap"><span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(e.created_on)}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0"><User size={13} className="text-[#64748B]" /></span>
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-[#0F172A] truncate">{cleanText(e.name) || "—"}</span>
                              <span className="mt-0.5 inline-block"><CatBadge c={cat(e)} /></span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{e.email ? <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-[#F7B31C]"><Mail size={11} /> {e.email}</a> : "—"}</td>
                        <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{e.contact ? <a href={`tel:${e.contact}`} className="flex items-center gap-1 hover:text-[#F7B31C]"><Phone size={11} /> {e.contact}</a> : "—"}</td>
                        <td className="px-4 py-3 text-xs text-[#475569] max-w-[280px]">
                          <span className="whitespace-pre-wrap break-words">{long && !isOpen ? desc.slice(0, 90).trim() + "…" : desc || "—"}</span>
                          {long && <button onClick={() => toggleExpand(e.id)} className="ml-1 text-[#F7B31C] font-medium">{isOpen ? "less" : "more"}</button>}
                        </td>
                        <td className="px-4 py-3">
                          {card
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#115E59] text-[11px] font-semibold"><CreditCard size={10} /> /{e.uname}</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[11px] font-semibold"><Globe size={10} /> Website</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.status === "converted"
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-semibold"><CheckCircle2 size={10} /> Converted</span>
                            : <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[11px] font-semibold capitalize">{e.status}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {e.status !== "converted" && (
                              <button onClick={() => convert(e.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold hover:bg-[#1E293B] transition-colors">
                                <CheckCircle2 size={12} /> Convert
                              </button>
                            )}
                            <button onClick={() => askDelete([e.id])} className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" aria-label="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden">
            {!loading && pageRows.length > 0 && (
              <label className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F1F5F9] bg-[#F8FAFC] cursor-pointer">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} className="rounded border-[#CBD5E1] accent-[#F7B31C] w-4 h-4" />
                <span className="text-xs font-medium text-[#64748B]">Select all on this page</span>
              </label>
            )}
            {loading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-[#F1F5F9] rounded-xl animate-pulse" />)}</div>
            ) : pageRows.length === 0 ? (
              <div className="px-4 py-16 text-center"><Inbox size={28} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-sm text-[#94A3B8]">No enquiries found</p></div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {pageRows.map((e) => {
                  const card = isCardLead(e);
                  const isOpen = expanded.has(e.id);
                  const desc = cleanText(e.description);
                  const long = desc.length > 120;
                  const checked = selected.has(e.id);
                  return (
                    <div key={e.id} className={`p-4 transition-colors ${checked ? "bg-[#FEF3C7]/40" : ""}`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(e.id)} className="mt-1 rounded border-[#CBD5E1] accent-[#F7B31C] w-4 h-4 shrink-0" aria-label={`Select ${e.name}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{cleanText(e.name) || "—"}</p>
                              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5"><Calendar size={10} /> {fmtDate(e.created_on)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <CatBadge c={cat(e)} />
                              {e.status === "converted" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-semibold"><CheckCircle2 size={10} /> Converted</span>}
                            </div>
                          </div>

                          {/* contact chips */}
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 max-w-full px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] text-[#334155] hover:text-[#F7B31C]"><Mail size={11} className="shrink-0" /> <span className="truncate">{e.email}</span></a>}
                            {e.contact && <a href={`tel:${e.contact}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] text-[#334155] hover:text-[#F7B31C]"><Phone size={11} /> {e.contact}</a>}
                            {card
                              ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#CCFBF1] text-[#115E59] text-[11px] font-semibold"><CreditCard size={11} /> /{e.uname}</span>
                              : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#DBEAFE] text-[#1E40AF] text-[11px] font-semibold"><Globe size={11} /> Website</span>}
                          </div>

                          {/* requirement */}
                          {desc && (
                            <p className="text-xs text-[#475569] mt-2.5 leading-relaxed whitespace-pre-wrap break-words">
                              {long && !isOpen ? desc.slice(0, 120).trim() + "… " : desc + " "}
                              {long && <button onClick={() => toggleExpand(e.id)} className="text-[#F7B31C] font-medium">{isOpen ? "less" : "more"}</button>}
                            </p>
                          )}

                          {/* actions */}
                          <div className="flex items-center gap-2 mt-3">
                            {e.status !== "converted" && (
                              <button onClick={() => convert(e.id)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors active:scale-[0.98]"><CheckCircle2 size={14} /> Convert</button>
                            )}
                            <button onClick={() => askDelete([e.id])} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors active:scale-[0.98]"><Trash2 size={14} /> Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC]">
              <p className="text-xs text-[#64748B]">
                Showing <span className="font-semibold text-[#0F172A]">{(safePage - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-[#0F172A]">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-[#0F172A]">{filtered.length.toLocaleString("en-IN")}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={15} /></button>
                <span className="text-xs text-[#64748B] px-2">Page <span className="font-semibold text-[#0F172A]">{safePage}</span> / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <p className="text-center text-xs text-[#94A3B8] flex items-center justify-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading enquiries…</p>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmIds && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmIds(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <button onClick={() => setConfirmIds(null)} className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors" aria-label="Close"><X size={16} /></button>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A]">
              Delete {confirmIds.length > 1 ? `${confirmIds.length.toLocaleString("en-IN")} enquiries` : "this enquiry"}?
            </h3>
            <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
              {confirmIds.length > 1
                ? "The selected enquiries will be permanently removed. "
                : "This enquiry will be permanently removed. "}
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmIds(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
              <button onClick={doDelete} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
