import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  History, Search, RefreshCw, Loader2, CheckCircle2, Ban, AlertTriangle, ChevronLeft, ChevronRight,
  Download, Inbox, Activity as ActivityIcon, UserCheck, ShieldAlert, LogIn, Eye,
} from "lucide-react";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { STAFF_MODULES, moduleLabel } from "@contracts/staff";

/* Activity Log — everything done in the admin portal: every change by staff and
   by you, staff sign-ins, the pages staff opened, and anything they tried
   without permission (refused). Inputs are kept as a short redacted summary;
   passwords, tokens and images are never stored. */

type Kind = "all" | "changes" | "signins" | "visits";
type Status = "all" | "ok" | "denied" | "error";

const STATUS: Record<string, { chip: string; label: string; icon: typeof CheckCircle2 }> = {
  ok: { chip: "bg-[#DCFCE7] text-[#166534]", label: "Done", icon: CheckCircle2 },
  denied: { chip: "bg-[#FEF3C7] text-[#92400E]", label: "Refused", icon: Ban },
  error: { chip: "bg-[#FEE2E2] text-[#991B1B]", label: "Failed", icon: AlertTriangle },
};

function when(v: string | Date | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

function ActionIcon({ action }: { action: string }) {
  if (action === "Signed in") return <LogIn size={14} className="text-[#4338CA]" />;
  if (action === "Opened page") return <Eye size={14} className="text-[#64748B]" />;
  return <ActivityIcon size={14} className="text-[#0F172A]" />;
}

export default function AdminActivity() {
  const [params] = useSearchParams();
  const initialActor = Number(params.get("actor")) || undefined;
  const [actor, setActor] = useState<string>(initialActor ? String(initialActor) : "all");
  const [kind, setKind] = useState<Kind>("all");
  const [status, setStatus] = useState<Status>("all");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data: staff } = trpc.staff.list.useQuery();
  const who = actor === "super" ? "super_admin" : "all";
  const actorId = actor !== "all" && actor !== "super" ? Number(actor) : undefined;
  const { data, isLoading, isFetching, refetch } = trpc.staff.activity.useQuery(
    { actorId, who, kind, status, module: module || undefined, from: from || undefined, to: to || undefined, q: term || undefined, page, perPage },
    { placeholderData: (prev) => prev },
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const stats = data?.stats ?? { eventsToday: 0, staffActiveToday: 0, deniedThisWeek: 0 };
  const staffName = useMemo(() => new Map((staff ?? []).map((s) => [s.id, s.fullName])), [staff]);

  const setFilter = (fn: () => void) => { fn(); setPage(1); };
  const search = () => { setTerm(q.trim()); setPage(1); };

  const exportCsv = () => {
    if (!rows.length) { toast.error("Nothing to export on this page."); return; }
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["When", "Person", "Role", "Action", "Module", "Target", "Details", "Result", "Reason", "IP"].map(cell).join(","),
      ...rows.map((r) => [when(r.createdAt), r.actorName, r.actorRole === "super_admin" ? "Super admin" : "Staff", r.action, moduleLabel(r.module), r.target, r.summary, STATUS[r.status]?.label, r.error, r.ip].map(cell).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pill = (on: boolean) =>
    `h-9 px-3.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all ${on ? "border-[#6366F1] bg-[#EEF2FF] text-[#3730A3]" : "border-[#E2E8F0] text-[#334155] hover:border-[#6366F1]/50"}`;
  const select = "h-9 rounded-xl border border-[#E2E8F0] px-2.5 text-[12.5px] font-semibold text-[#334155] outline-none focus:border-[#6366F1] bg-white";

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Activity Log" subtitle="Everything your team and you did in the admin portal" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl">

        <div className="grid grid-cols-3 gap-3">
          {([
            ["Events · 24 h", stats.eventsToday, "text-[#0F172A]", ActivityIcon],
            ["Staff active today", stats.staffActiveToday, "text-[#3730A3]", UserCheck],
            ["Refused · 7 days", stats.deniedThisWeek, stats.deniedThisWeek ? "text-[#B45309]" : "text-[#0F172A]", ShieldAlert],
          ] as [string, number, string, typeof History][]).map(([label, n, tone, Icon]) => (
            <div key={label} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide"><Icon size={13} /> <span className="truncate">{label}</span></div>
              <div className={`text-2xl font-extrabold mt-1 tabular-nums ${tone}`}>{n.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input id="activity-search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search by person, action, customer email or card address…"
                className="w-full h-11 rounded-xl border border-[#E2E8F0] pl-9 pr-3 text-sm outline-none focus:border-[#6366F1]" />
            </div>
            <button onClick={search} className="h-11 px-5 rounded-xl bg-[#4338CA] text-white text-sm font-bold">Search</button>
            <button onClick={() => refetch()} disabled={isFetching}
              className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 disabled:opacity-60">
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([["all", "Everything"], ["changes", "Changes"], ["signins", "Sign-ins"], ["visits", "Pages opened"]] as [Kind, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(() => setKind(k))} className={pill(kind === k)}>{label}</button>
            ))}
            <span className="w-px h-6 bg-[#E2E8F0] mx-1 hidden sm:block" />
            {([["all", "Any result"], ["ok", "Done"], ["denied", "Refused"], ["error", "Failed"]] as [Status, string][]).map(([s, label]) => (
              <button key={s} onClick={() => setFilter(() => setStatus(s))} className={pill(status === s)}>{label}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select id="activity-person" value={actor} onChange={(e) => setFilter(() => setActor(e.target.value))} className={`${select} max-w-[220px]`}>
              <option value="all">Everyone</option>
              <option value="super">Super admin</option>
              {(staff ?? []).map((s) => <option key={s.id} value={String(s.id)}>{s.fullName}</option>)}
            </select>
            <select id="activity-module" value={module} onChange={(e) => setFilter(() => setModule(e.target.value))} className={`${select} max-w-[240px]`}>
              <option value="">All modules</option>
              {STAFF_MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              <option value="impersonate">Log in as customer</option>
              <option value="staff">Staff &amp; access changes</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-[#64748B]">From
              <input id="activity-from" type="date" value={from} onChange={(e) => setFilter(() => setFrom(e.target.value))} className={select} /></label>
            <label className="flex items-center gap-1.5 text-[12px] text-[#64748B]">To
              <input id="activity-to" type="date" value={to} onChange={(e) => setFilter(() => setTo(e.target.value))} className={select} /></label>
            <button onClick={exportCsv} className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-1.5 ml-auto">
              <Download size={14} /> Export page
            </button>
          </div>
          {actorId && (
            <p className="text-[12.5px] text-[#475569]">Showing only <b>{staffName.get(actorId) ?? "this person"}</b> · <button className="font-semibold text-[#4338CA] underline" onClick={() => setFilter(() => setActor("all"))}>show everyone</button></p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center text-[#64748B] gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Loading activity…</div>
          ) : !rows.length ? (
            <div className="p-12 text-center">
              <Inbox size={30} className="mx-auto text-[#CBD5E1]" />
              <p className="text-sm font-semibold text-[#334155] mt-3">No activity {term || kind !== "all" || status !== "all" || module || actor !== "all" || from || to ? "matches these filters" : "yet"}</p>
              <p className="text-[12.5px] text-[#94A3B8] mt-1">Changes made in the admin portal, staff sign-ins and the pages they open appear here.
                {!staff?.length && <> <Link to="/admin/staff" className="font-semibold text-[#4338CA] underline">Add your first staff member</Link>.</>}</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#64748B]">
                      <th className="text-left font-bold px-4 py-3 whitespace-nowrap">When</th>
                      <th className="text-left font-bold px-4 py-3">Person</th>
                      <th className="text-left font-bold px-4 py-3">What they did</th>
                      <th className="text-left font-bold px-4 py-3">Module</th>
                      <th className="text-left font-bold px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATUS[r.status] ?? STATUS.ok;
                      const Icon = st.icon;
                      return (
                        <tr key={r.id} className="border-t border-[#F1F5F9] align-top">
                          <td className="px-4 py-3 text-[12.5px] text-[#64748B] whitespace-nowrap tabular-nums">{when(r.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-semibold text-[#0F172A]">{r.actorName}</div>
                            <div className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-px rounded ${r.actorRole === "super_admin" ? "bg-[#FFE4E6] text-[#BE123C]" : "bg-[#EEF2FF] text-[#4338CA]"}`}>{r.actorRole === "super_admin" ? "SUPER ADMIN" : "STAFF"}</div>
                          </td>
                          <td className="px-4 py-3 max-w-[420px]">
                            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0F172A]"><ActionIcon action={r.action} /> {r.action}{r.target && r.action !== "Opened page" ? <span className="font-normal text-[#475569] break-all">· {r.target}</span> : null}</div>
                            {r.summary && <div className="text-[12px] text-[#64748B] mt-0.5 break-words">{r.summary}</div>}
                            {r.error && <div className="text-[12px] text-[#B45309] mt-0.5">{r.error}</div>}
                            {r.ip && r.ip !== "unknown" && <div className="text-[11px] text-[#94A3B8] mt-0.5">IP {r.ip}</div>}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] text-[#475569] whitespace-nowrap">{moduleLabel(r.module) || "—"}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${st.chip}`}><Icon size={12} /> {st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-[#F1F5F9]">
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.ok;
                  const Icon = st.icon;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#0F172A]"><ActionIcon action={r.action} /> {r.action}</p>
                          {r.target && r.action !== "Opened page" && <p className="text-[12.5px] text-[#475569] break-all">{r.target}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${st.chip}`}><Icon size={11} /> {st.label}</span>
                      </div>
                      {r.summary && <p className="text-[12px] text-[#64748B] mt-1 break-words">{r.summary}</p>}
                      {r.error && <p className="text-[12px] text-[#B45309] mt-1">{r.error}</p>}
                      <p className="text-[11.5px] text-[#94A3B8] mt-2">{r.actorName} · {r.actorRole === "super_admin" ? "Super admin" : "Staff"}{r.module ? ` · ${moduleLabel(r.module)}` : ""} · <span className="tabular-nums">{when(r.createdAt)}</span></p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-[#64748B] tabular-nums">
            {total.toLocaleString("en-IN")} {total === 1 ? "event" : "events"}{pages > 1 && <> · page {page} of {pages}</>}
          </p>
          {pages > 1 && (
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} aria-label="Next page"
                className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-[#94A3B8] leading-relaxed">
          Recorded: every change made in the admin portal (by staff and by you), staff sign-ins, the pages staff open (at most once
          per page every 10 minutes) and anything staff tried without permission. Passwords, tokens and images are never stored.
        </p>
      </div>
    </ResponsiveDashboardLayout>
  );
}
