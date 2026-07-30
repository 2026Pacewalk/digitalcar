import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Inbox, Phone, Mail, Building2, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";

type Status = "new" | "contacted" | "won" | "lost";
const STATUSES: Status[] = ["new", "contacted", "won", "lost"];
const STATUS_STYLE: Record<Status, string> = {
  new: "bg-blue-50 text-blue-600 border-blue-200",
  contacted: "bg-amber-50 text-amber-600 border-amber-200",
  won: "bg-emerald-50 text-emerald-600 border-emerald-200",
  lost: "bg-red-50 text-red-500 border-red-200",
};
const inr = (n: unknown) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const fmt = (s: unknown) => { const d = new Date(String(s || "")); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

export default function AdminBulkOrders() {
  const { data, isLoading, refetch } = trpc.bulkOrder.list.useQuery();
  const setStatus = trpc.bulkOrder.setStatus.useMutation({
    onSuccess: () => { refetch(); },
    onError: () => toast.error("Could not update status"),
  });
  const [filter, setFilter] = useState<Status | "all">("all");

  const rows = useMemo(() => (data || []) as Record<string, unknown>[], [data]);
  const stats = useMemo(() => {
    const s = { total: rows.length, new: 0, contacted: 0, won: 0, lost: 0, pipeline: 0 };
    for (const r of rows) {
      const st = String(r.status) as Status;
      if (st in s) (s as Record<string, number>)[st]++;
      if (st === "new" || st === "contacted") s.pipeline += Math.round(Number(r.totalEstimate) || 0);
    }
    return s;
  }, [rows]);
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const changeStatus = (id: number, status: Status) => {
    setStatus.mutate({ id, status });
    toast.success(`Marked ${status}`);
  };

  const statCards = [
    { label: "Total requests", value: stats.total, icon: Inbox, tint: "#F7B31C", bg: "#FEF3C7" },
    { label: "New", value: stats.new, icon: Sparkles, tint: "#3B82F6", bg: "#DBEAFE" },
    { label: "Contacted", value: stats.contacted, icon: Clock, tint: "#D97706", bg: "#FEF3C7" },
    { label: "Won", value: stats.won, icon: CheckCircle2, tint: "#22C55E", bg: "#DCFCE7" },
    { label: "Open pipeline", value: inr(stats.pipeline), icon: ShoppingCart, tint: "#7C3AED", bg: "#EDE9FE" },
  ];

  return (
    <ResponsiveDashboardLayout title="Bulk Orders" subtitle="Bulk-card purchase requests — follow up and close">
      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.tint }}><s.icon size={18} /></span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-[#0F172A] leading-none truncate">{s.value}</p>
                <p className="text-[11px] text-[#94A3B8] mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", ...STATUSES] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3.5 h-9 rounded-xl text-xs font-semibold border transition-colors capitalize ${filter === f ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-[#F1F5F9] animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Inbox size={24} className="text-[#94A3B8]" /></div>
            <p className="text-sm font-medium text-[#0F172A]">No bulk-order requests {filter !== "all" ? `(${filter})` : "yet"}</p>
            <p className="text-xs text-[#94A3B8] mt-1">Requests from the dashboard & bulk-cards page land here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = String(r.status) as Status;
              return (
                <div key={String(r.id)} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 sm:p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] flex items-center justify-center shrink-0 text-[#B45309]"><Building2 size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#0F172A]">{String(r.company || "—")}</h3>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[st] || STATUS_STYLE.new}`}>{st}</span>
                        {r.packageName ? <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{String(r.packageName)}</span> : null}
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{String(r.contactName || "—")} · {fmt(r.createdAt)}{r.userId ? " · registered user" : " · guest"}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {r.phone ? <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] hover:border-[#F7B31C]"><Phone size={12} className="text-[#94A3B8]" />{String(r.phone)}</a> : null}
                        {r.email ? <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] hover:border-[#F7B31C]"><Mail size={12} className="text-[#94A3B8]" />{String(r.email)}</a> : null}
                      </div>
                      {r.note ? <p className="text-xs text-[#475569] mt-2.5 bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#F1F5F9]">{String(r.note)}</p> : null}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold text-[#0F172A]">{String(r.quantity)} <span className="text-[11px] font-medium text-[#94A3B8]">cards</span></p>
                      <p className="text-[11px] text-[#64748B]">{inr(r.pricePerCard)}/card · {inr(r.totalEstimate)} total</p>
                    </div>
                  </div>
                  {/* Status actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9] flex-wrap">
                    <span className="text-[11px] font-semibold text-[#94A3B8]">Move to:</span>
                    {STATUSES.filter((s) => s !== st).map((s) => (
                      <button key={s} onClick={() => changeStatus(Number(r.id), s)} disabled={setStatus.isPending} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] capitalize disabled:opacity-50">
                        {s === "won" ? <CheckCircle2 size={13} className="text-emerald-500" /> : s === "lost" ? <XCircle size={13} className="text-red-400" /> : s === "contacted" ? <Clock size={13} className="text-amber-500" /> : <Sparkles size={13} className="text-blue-500" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
