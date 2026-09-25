import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Check, CheckCircle2, Clock, Inbox, Loader2, Mail, Phone, Store, Building2, X, XCircle } from "lucide-react";

/* Applications from the public "become a reseller" form. Approving one creates
   the reseller's login at the commission rate chosen here — it used to be
   fixed at 10% whatever the admin intended. */

const fmtDate = (d: unknown) => {
  const dt = d ? new Date(String(d)) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

const badge = (s: string) => s === "approved"
  ? <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]"><CheckCircle2 size={10} /> Approved</span>
  : s === "rejected"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500"><XCircle size={10} /> Rejected</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]"><Clock size={10} /> Pending</span>;

export default function ResellerApplicationsPanel() {
  const utils = trpc.useUtils();
  const { data: apps, isLoading } = trpc.reseller.list.useQuery();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rates, setRates] = useState<Record<number, string>>({});

  const refresh = () => Promise.all([utils.reseller.list.invalidate(), utils.resellerLedger.overview.invalidate()]);
  const approve = trpc.reseller.approve.useMutation({
    onSuccess: async (r) => { toast.success(r.isNew ? "Approved — they've been emailed a link to set their password" : "Approved — their existing account is now a reseller"); await refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.reseller.reject.useMutation({
    onSuccess: async () => { toast.success("Application declined"); await refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const busy = approve.isPending || reject.isPending;

  const all = apps ?? [];
  const list = all.filter((a) => filter === "all" || a.status === filter);
  const count = (s: string) => (s === "all" ? all.length : all.filter((a) => a.status === s).length);
  const filters = [
    { id: "pending" as const, label: "Pending" }, { id: "approved" as const, label: "Approved" },
    { id: "rejected" as const, label: "Declined" }, { id: "all" as const, label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === f.id ? "bg-[#0F172A] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`}>
            {f.label}<span className={`rounded-full px-1.5 text-[10px] ${filter === f.id ? "bg-white/20" : "bg-[#F1F5F9]"}`}>{count(f.id)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#F1F5F9] bg-white" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-[#F1F5F9] bg-white p-16 text-center"><Inbox size={28} className="mx-auto mb-2 text-[#CBD5E1]" /><p className="text-sm text-[#94A3B8]">No {filter === "all" ? "" : filters.find((f) => f.id === filter)?.label.toLowerCase()} applications</p></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((a) => {
            const id = a.id as number;
            const rate = rates[id] ?? "20";
            return (
              <div key={id} className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE]"><Store size={18} className="text-[#7C3AED]" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0F172A]">{a.fullName}</p>
                      <p className="text-[11px] text-[#94A3B8]">Applied {fmtDate(a.createdAt)}</p>
                    </div>
                  </div>
                  {badge(a.status)}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] px-2 py-1 text-[11px] text-[#334155] hover:text-[#B45309]"><Mail size={11} /> {a.email}</a>
                  {a.phone && <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] px-2 py-1 text-[11px] text-[#334155] hover:text-[#B45309]"><Phone size={11} /> {a.phone}</a>}
                  {a.companyName && <span className="inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] px-2 py-1 text-[11px] text-[#334155]"><Building2 size={11} /> {a.companyName}</span>}
                </div>

                {/* The application page folds the business type and the
                    white-label box into the message, one part per paragraph. */}
                {a.message?.includes("Interested in white-label") && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#92400E]"><Store size={11} /> Wants white-label</span>
                )}
                {a.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#475569]">{a.message}</p>}

                {a.status === "pending" && (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-[#475569]">Commission %</span>
                      <input value={rate} inputMode="decimal" onChange={(e) => setRates({ ...rates, [id]: e.target.value.replace(/[^\d.]/g, "") })}
                        className="h-9 w-20 rounded-lg border border-[#E2E8F0] px-2 text-center text-sm font-semibold outline-none focus:border-[#F7B31C]" />
                    </label>
                    <button disabled={busy} onClick={() => {
                      const r = Number(rate);
                      if (!(r >= 0 && r <= 100)) return toast.error("Commission must be between 0 and 100");
                      approve.mutate({ id, commissionRate: r });
                    }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50">
                      {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                    </button>
                    <button disabled={busy} onClick={() => { const note = window.prompt("Reason for declining (optional — it's included in their email):") ?? undefined; reject.mutate({ id, note: note || undefined }); }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-4 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 active:scale-[0.98] disabled:opacity-50">
                      <X size={14} /> Decline
                    </button>
                  </div>
                )}
                {a.adminNote && a.status !== "pending" && <p className="mt-2 text-[11px] text-[#94A3B8]">Note: {a.adminNote}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
