import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, ExternalLink, Loader2, RotateCcw, ShieldCheck, Trash2, UserX } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* Account-deletion requests made in the mobile app. Asking signs the owner out
   everywhere and pauses their card; the erasure itself waits 30 days so a change
   of mind (or a request made by someone else holding the phone) can be undone. */

type Filter = "pending" | "completed" | "cancelled" | "all";
type Req = {
  id: number; userId: number; status: "pending" | "completed" | "cancelled"; source: string; reason: string | null;
  email: string; requestedAt: string | Date; scheduledFor: string | Date; completedAt: string | Date | null; due: boolean;
  name: string | null; phone: string | null; role: string | null; accountStatus: string | null;
  slugs: string[]; leads: number; paidUntil: string | null; autoRenew: boolean;
};

const DAY = 86_400_000;
const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminDeletionRequests() {
  const { data, isLoading, refetch } = trpc.admin.deletionRequests.useQuery();
  const complete = trpc.admin.completeDeletion.useMutation();
  const cancel = trpc.admin.cancelDeletion.useMutation();
  const [filter, setFilter] = useState<Filter>("pending");
  const [erasing, setErasing] = useState<Req | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const list = useMemo(() => (data?.list ?? []) as Req[], [data]);
  const shown = useMemo(() => (filter === "all" ? list : list.filter((r) => r.status === filter))
    // Due ones first, then soonest.
    .sort((a, b) => Number(b.due) - Number(a.due) || new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
  [list, filter]);

  const restore = async (r: Req) => {
    if (!window.confirm(`Cancel the deletion request and switch ${r.name || r.email}'s account back on? Their card goes live again straight away.`)) return;
    setBusy(r.id);
    try {
      await cancel.mutateAsync({ id: r.id });
      toast.success("Request cancelled — the account is active again", { description: "They can sign in again with their password." });
      await refetch();
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Couldn't cancel the request.");
    } finally { setBusy(null); }
  };

  const erase = async () => {
    const r = erasing;
    if (!r) return;
    setBusy(r.id);
    try {
      const res = await complete.mutateAsync({ id: r.id, early: !r.due });
      toast.success("Account erased", { description: `${res.cards} card${res.cards === 1 ? "" : "s"} and ${res.leads} enquir${res.leads === 1 ? "y" : "ies"} removed. Payment records kept.` });
      setErasing(null);
      await refetch();
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Couldn't erase the account.");
    } finally { setBusy(null); }
  };

  const counts = data?.counts ?? { pending: 0, due: 0, completed: 0, cancelled: 0 };
  const tabs: [Filter, string, number | null][] = [
    ["pending", "Waiting", counts.pending], ["completed", "Erased", counts.completed], ["cancelled", "Cancelled", counts.cancelled], ["all", "All", null],
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Account Deletions" subtitle="Requests from the mobile app — erase after 30 days, or restore" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-4xl">

        {counts.due > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <CalendarClock size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{counts.due} request{counts.due === 1 ? " is" : "s are"} past the 30-day window</p>
              <p className="text-[12px] text-red-700 mt-0.5">The owner was promised erasure by this date. Erase them now, or restore the account if they've asked to stay.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 text-[12px] text-[#475569] leading-relaxed">
          <p className="font-semibold text-[#0F172A] text-[13px] mb-1">What erasing does</p>
          Removes their cards (photos included), enquiries, notifications, custom domains, app sign-ins and email-log rows, and replaces the
          account's name, email, phone and password. <b>Payments, invoices, subscriptions and orders are kept</b> for the books, under an
          anonymous account. It can't be undone.
        </div>

        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`shrink-0 h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${filter === k ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
              {label}{n != null && <span className={`text-[10px] font-bold ${filter === k ? "text-white/70" : "text-[#94A3B8]"}`}>{n}</span>}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Loading requests…</div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3"><ShieldCheck size={24} className="text-emerald-500" /></div>
            <p className="text-sm font-semibold text-[#0F172A]">{filter === "pending" ? "No requests waiting" : "Nothing here"}</p>
            <p className="text-[13px] text-[#94A3B8] mt-1">When someone deletes their account in the app, it shows up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => {
              const daysLeft = Math.ceil((new Date(r.scheduledFor).getTime() - Date.now()) / DAY);
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0"><UserX size={17} className="text-[#64748B]" /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] truncate">{r.name || "—"} <span className="text-[11px] font-normal text-[#94A3B8]">#{r.userId}</span></p>
                        <p className="text-[12px] text-[#64748B] break-all">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                      </div>
                    </div>
                    <StatusPill r={r} daysLeft={daysLeft} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                    <Fact label="Asked on" value={fmt(r.requestedAt)} />
                    <Fact label={r.status === "completed" ? "Erased on" : "Erase from"} value={fmt(r.status === "completed" ? r.completedAt : r.scheduledFor)} />
                    <Fact label="Enquiries" value={String(r.leads)} />
                    <Fact label="From" value={r.source === "app" ? "Mobile app" : r.source} />
                  </dl>

                  {r.slugs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.slugs.map((s) => (
                        <a key={s} href={`/${s}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1 hover:border-[#F7B31C]">
                          digitalcarda.in/{s} <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  )}

                  {r.reason && <p className="mt-3 text-[12px] text-[#334155] bg-[#F8FAFC] rounded-lg px-3 py-2">“{r.reason}”</p>}

                  {r.status === "pending" && r.paidUntil && (
                    <p className="mt-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Paid plan running until {fmt(r.paidUntil)}{r.autoRenew ? " with auto-renew on" : ""}. Erasing stops renewal here — cancel any gateway mandate or refund separately.</span>
                    </p>
                  )}

                  {r.status === "pending" && (
                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <button type="button" onClick={() => restore(r)} disabled={busy === r.id}
                        className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-[#334155] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] disabled:opacity-60">
                        <RotateCcw size={14} /> Cancel & restore account
                      </button>
                      <button type="button" onClick={() => { setConfirmText(""); setErasing(r); }} disabled={busy === r.id}
                        className={`h-10 px-4 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${r.due ? "bg-red-600 text-white hover:bg-red-700" : "border border-red-200 text-red-700 hover:bg-red-50"}`}>
                        {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {r.due ? "Erase account" : "Erase early"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!erasing} onOpenChange={(o) => { if (!o && busy == null) setErasing(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erase {erasing?.name || "this account"}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px]">
                {erasing && !erasing.due && (
                  <p className="text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    The 30-day window ends on {fmt(erasing.scheduledFor)}. Erase early only if the owner asked for it in writing.
                  </p>
                )}
                <p>Their card{erasing && erasing.slugs.length === 1 ? "" : "s"}, {erasing?.leads ?? 0} enquir{erasing?.leads === 1 ? "y" : "ies"} and personal details are removed for good. Payment records stay.</p>
                <p>Type <b className="text-[#0F172A] break-all">{erasing?.email}</b> to confirm.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus spellCheck={false} autoComplete="off"
            aria-label="Type the account email to confirm"
            className="h-11 w-full rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-red-400" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy != null}>Keep it</AlertDialogCancel>
            <button type="button" onClick={erase}
              disabled={busy != null || confirmText.trim().toLowerCase() !== (erasing?.email ?? "").toLowerCase()}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-red-700 disabled:opacity-50">
              {busy != null ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Erase for good
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveDashboardLayout>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-semibold">{label}</dt>
      <dd className="text-[#0F172A] font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function StatusPill({ r, daysLeft }: { r: Req; daysLeft: number }) {
  if (r.status === "completed") return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] inline-flex items-center gap-1"><CheckCircle2 size={12} /> Erased</span>;
  if (r.status === "cancelled") return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Restored</span>;
  if (r.due) return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">Due{daysLeft < 0 ? ` · ${-daysLeft}d overdue` : " today"}</span>;
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 tabular-nums">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>;
}
