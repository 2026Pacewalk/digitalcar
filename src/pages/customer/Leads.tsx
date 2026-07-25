import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState, useEffect } from "react";
import {
  Search, Mail, Phone, MessageSquare, PhoneCall, Trash2,
  ChevronDown, StickyNote, Clock, Share2, Users, CheckCircle2, Loader2, AlarmClock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useCustomer } from "@/hooks/useCustomer";
import { useNavigate } from "react-router";

/* ─── Pipeline stages (must match the leads DB enum) ─── */
type Stage = "new" | "contacted" | "interested" | "follow_up" | "converted" | "not_interested" | "closed";
const STAGES: { value: Stage; label: string; chip: string; dot: string }[] = [
  { value: "new", label: "New", chip: "bg-[#DBEAFE] text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  { value: "contacted", label: "Contacted", chip: "bg-[#E0E7FF] text-[#3730A3]", dot: "bg-[#6366F1]" },
  { value: "interested", label: "Interested", chip: "bg-[#CCFBF1] text-[#0F766E]", dot: "bg-[#14B8A6]" },
  { value: "follow_up", label: "Follow-up", chip: "bg-[#FEF3C7] text-[#92400E]", dot: "bg-[#F59E0B]" },
  { value: "converted", label: "Converted", chip: "bg-[#D1FAE5] text-[#065F46]", dot: "bg-[#10B981]" },
  { value: "not_interested", label: "Not interested", chip: "bg-[#F1F5F9] text-[#475569]", dot: "bg-[#94A3B8]" },
  { value: "closed", label: "Closed", chip: "bg-[#FEE2E2] text-[#991B1B]", dot: "bg-[#EF4444]" },
];
const stageMap = Object.fromEntries(STAGES.map((s) => [s.value, s]));

type Lead = {
  id: number; fullName: string; email: string | null; phone: string | null;
  company: string | null; message: string | null; source: string; status: Stage;
  notes: string | null; followUpDate: string | Date | null; city: string | null;
  device: string | null; createdAt: string | Date;
};

/* ─── Contact helpers ─── */
const digitsFor = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d; // assume Indian 10-digit → prepend country code
};
const waLink = (phone: string, name: string) =>
  `https://wa.me/${digitsFor(phone)}?text=${encodeURIComponent(`Hi ${name.split(" ")[0] || ""}, thanks for reaching out via my DigitalCarda. How can I help you?`)}`;
const fmtDate = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");
const toInputDate = (d: string | Date | null) => {
  if (!d) return "";
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10);
};
const isOverdue = (d: string | Date | null) => {
  if (!d) return false;
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return new Date(d).getTime() <= end.getTime();
};

/* ─── One lead card (expandable) ─── */
function LeadItem({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [followUp, setFollowUp] = useState(toInputDate(lead.followUpDate));

  const update = trpc.lead.update.useMutation();
  const del = trpc.lead.delete.useMutation();
  const st = stageMap[lead.status] ?? STAGES[0];
  const overdue = lead.status !== "converted" && isOverdue(lead.followUpDate);

  const setStatus = (status: Stage) =>
    update.mutate({ id: lead.id, status }, { onSuccess: () => { toast.success("Stage updated"); onChanged(); } });

  const saveDetails = () =>
    update.mutate(
      { id: lead.id, notes, followUpDate: followUp ? new Date(followUp + "T09:00:00") : null },
      { onSuccess: () => { toast.success("Saved"); onChanged(); } }
    );

  const remove = () => {
    if (!confirm(`Delete lead "${lead.fullName}"? This can't be undone.`)) return;
    del.mutate({ id: lead.id }, { onSuccess: () => { toast.success("Lead deleted"); onChanged(); } });
  };

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full gradient-gold flex items-center justify-center shrink-0">
            <span className="text-[#0F172A] text-sm font-bold">{(lead.fullName || "?").charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#0F172A] truncate">{lead.fullName}</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${st.chip}`}>{st.label}</span>
              {overdue && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#FEE2E2] text-[#991B1B] inline-flex items-center gap-1"><AlarmClock size={9} /> Due {fmtDate(lead.followUpDate)}</span>}
            </div>
            {lead.company && <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{lead.company}</p>}
            <p className="text-[11px] text-[#94A3B8] mt-0.5 capitalize">{lead.source} · {fmtDate(lead.createdAt)}</p>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8] shrink-0" aria-label="Details">
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex-1 h-8 rounded-lg bg-[#0F172A] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform">
              <PhoneCall size={12} /> Call
            </a>
          )}
          {lead.phone && (
            <a href={waLink(lead.phone, lead.fullName)} target="_blank" rel="noopener noreferrer" className="flex-1 h-8 rounded-lg bg-[#14B8A6] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform">
              <MessageSquare size={12} /> WhatsApp
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex-1 h-8 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform">
              <Mail size={12} /> Email
            </a>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-[#F1F5F9] p-4 space-y-4 bg-[#FCFCFD]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {lead.email && <div className="flex items-center gap-1.5 text-[#64748B] min-w-0"><Mail size={12} className="shrink-0" /> <span className="truncate">{lead.email}</span></div>}
            {lead.phone && <div className="flex items-center gap-1.5 text-[#64748B]"><Phone size={12} className="shrink-0" /> {lead.phone}</div>}
            {(lead.city || lead.device) && <div className="flex items-center gap-1.5 text-[#94A3B8] col-span-2">{[lead.city, lead.device].filter(Boolean).join(" · ")}</div>}
          </div>

          {lead.message && (
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Message</p>
              <p className="text-[12px] text-[#475569] bg-white rounded-lg p-2.5 border border-[#F1F5F9]">{lead.message}</p>
            </div>
          )}

          {/* Stage picker */}
          <div>
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Pipeline stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button key={s.value} onClick={() => setStatus(s.value)} disabled={update.isPending}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${lead.status === s.value ? s.chip + " ring-1 ring-inset ring-current/20" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes + follow-up */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1"><StickyNote size={11} /> Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add a private note about this lead…"
              className="w-full text-[12px] rounded-lg border border-[#E2E8F0] p-2.5 outline-none focus:border-[#F7B31C] resize-none bg-white" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1 shrink-0"><Clock size={11} /> Follow-up</label>
              <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                className="text-[12px] rounded-lg border border-[#E2E8F0] px-2 py-1.5 outline-none focus:border-[#F7B31C] bg-white" />
              {followUp && <button onClick={() => setFollowUp("")} className="text-[11px] text-[#94A3B8] hover:text-[#EF4444]">Clear</button>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button onClick={remove} disabled={del.isPending} className="text-[11px] text-[#94A3B8] hover:text-[#EF4444] inline-flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
            <button onClick={saveDetails} disabled={update.isPending}
              className="h-9 px-4 rounded-xl gradient-gold text-[#0F172A] text-[12px] font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
              {update.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerLeads() {
  const { data: customer } = useCustomer();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Stage>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.lead.list.useQuery({ status: statusFilter, search: debounced, limit: 100 });
  const { data: stats } = trpc.lead.stats.useQuery();
  const leads = (data?.leads ?? []) as Lead[];

  const refresh = () => {
    utils.lead.list.invalidate();
    utils.lead.stats.invalidate();
    utils.lead.followUps.invalidate();
  };

  const statCards = [
    { label: "Total Leads", value: stats?.total ?? 0, icon: Users, fg: "#3B82F6", bg: "#DBEAFE" },
    { label: "New", value: stats?.new ?? 0, icon: Search, fg: "#6366F1", bg: "#E0E7FF" },
    { label: "Follow-ups due", value: stats?.followUpsDue ?? 0, icon: AlarmClock, fg: "#D97706", bg: "#FEF3C7" },
    { label: "Converted", value: stats?.converted ?? 0, icon: CheckCircle2, fg: "#10B981", bg: "#D1FAE5" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Leads" subtitle="Your captured enquiries & pipeline" /></div>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#94A3B8]">{s.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg }}><s.icon size={14} style={{ color: s.fg }} /></div>
              </div>
              <p className="text-xl font-bold text-[#0F172A] mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input type="text" placeholder="Search by name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${statusFilter === "all" ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
              All
            </button>
            {STAGES.map((s) => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${statusFilter === s.value ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-white rounded-2xl shadow-premium border border-[#F1F5F9] animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-premium border border-[#F1F5F9] text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-3"><Users size={26} className="text-[#D97706]" /></div>
            <h3 className="text-base font-semibold text-[#0F172A]">{debounced || statusFilter !== "all" ? "No matching leads" : "No leads yet"}</h3>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-sm mx-auto">
              {debounced || statusFilter !== "all"
                ? "Try a different search or filter."
                : "Every enquiry from your card lands here. Share your card to start capturing leads."}
            </p>
            {!debounced && statusFilter === "all" && (
              <button onClick={() => navigate("/dashboard/qr")} className="mt-4 h-10 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold inline-flex items-center gap-2">
                <Share2 size={15} /> Share your card
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => <LeadItem key={lead.id} lead={lead} onChanged={refresh} />)}
            {(data?.total ?? 0) > leads.length && (
              <p className="text-center text-xs text-[#94A3B8] pt-1">Showing {leads.length} of {data?.total}. Refine with search to find older leads.</p>
            )}
          </div>
        )}

        {customer && leads.length > 0 && (
          <p className="text-[11px] text-[#CBD5E1] text-center">Leads are private to your account.</p>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
