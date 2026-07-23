import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Store, Mail, Phone, Building2, Check, X, Clock, CheckCircle2, XCircle, Loader2, Inbox } from "lucide-react";

const fmtDate = (s: string | Date | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminResellerApplications() {
  const utils = trpc.useUtils();
  const { data: apps, isLoading } = trpc.reseller.list.useQuery();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const approve = trpc.reseller.approve.useMutation({
    onSuccess: () => { toast.success("Approved — reseller notified by email"); utils.reseller.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.reseller.reject.useMutation({
    onSuccess: () => { toast.success("Application rejected"); utils.reseller.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const busy = approve.isPending || reject.isPending;

  const list = (apps || []).filter((a) => filter === "all" || a.status === filter);
  const counts = {
    pending: (apps || []).filter((a) => a.status === "pending").length,
    approved: (apps || []).filter((a) => a.status === "approved").length,
    rejected: (apps || []).filter((a) => a.status === "rejected").length,
    all: (apps || []).length,
  };
  const filters = [
    { id: "pending" as const, label: "Pending" }, { id: "approved" as const, label: "Approved" },
    { id: "rejected" as const, label: "Rejected" }, { id: "all" as const, label: "All" },
  ];

  const badge = (s: string) => s === "approved"
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-semibold"><CheckCircle2 size={10} /> Approved</span>
    : s === "rejected"
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold"><XCircle size={10} /> Rejected</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold"><Clock size={10} /> Pending</span>;

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Reseller Applications" subtitle="Review and approve partner requests" /></div>
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${filter === f.id ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
              {f.label}<span className={`text-[10px] px-1.5 rounded-full ${filter === f.id ? "bg-white/20" : "bg-[#F1F5F9]"}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-[#F1F5F9]" />)}</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#F1F5F9] p-16 text-center"><Inbox size={28} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-sm text-[#94A3B8]">No {filter !== "all" ? filter : ""} applications</p></div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0"><Store size={18} className="text-[#7C3AED]" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] truncate">{a.fullName}</p>
                      <p className="text-[11px] text-[#94A3B8]">{fmtDate(a.createdAt)}</p>
                    </div>
                  </div>
                  {badge(a.status)}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] text-[#334155] hover:text-[#F7B31C]"><Mail size={11} /> {a.email}</a>
                  {a.phone && <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] text-[#334155] hover:text-[#F7B31C]"><Phone size={11} /> {a.phone}</a>}
                  {a.companyName && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[11px] text-[#334155]"><Building2 size={11} /> {a.companyName}</span>}
                </div>

                {a.message && <p className="text-xs text-[#475569] mt-3 leading-relaxed bg-[#F8FAFC] rounded-lg p-3">{a.message}</p>}

                {a.status === "pending" && (
                  <div className="flex items-center gap-2 mt-4">
                    <button disabled={busy} onClick={() => approve.mutate({ id: a.id as number })} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors active:scale-[0.98]">
                      {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                    </button>
                    <button disabled={busy} onClick={() => { const note = window.prompt("Reason for rejection (optional):") ?? undefined; reject.mutate({ id: a.id as number, note: note || undefined }); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors active:scale-[0.98]">
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
                {a.adminNote && a.status === "rejected" && <p className="text-[11px] text-[#94A3B8] mt-2">Note: {a.adminNote}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
