import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Mail, Search, RefreshCw, Loader2, CheckCircle2, XCircle, MinusCircle,
  ChevronLeft, ChevronRight, Download, Trash2, Inbox,
} from "lucide-react";

/* Every outbound email, so support can answer "did they actually get it?"
   without logging into the SMTP provider. Bodies are deliberately not stored —
   a welcome email carries a plaintext password — so this shows the envelope:
   who, what, which template, and whether it left the building. */

type Status = "all" | "sent" | "failed" | "skipped";

/* Template function name → what a human would call it. Anything not listed
   falls back to a de-camel-cased version of the name, so a new template shows
   up readably the day it is added. */
const KIND_LABEL: Record<string, string> = {
  accountDetailsEmail: "Account details",
  featureUpdateEmail: "What's new announcement",
  welcomeEmail: "Welcome",
  enquiryAutoReplyEmail: "Enquiry auto-reply",
  leadNotificationEmail: "New lead",
  hotLeadEmail: "Hot lead",
  planUpgradedEmail: "Plan upgraded",
  cardPublishedEmail: "Card published",
  monthlyDigestEmail: "Monthly digest",
  dormantCardEmail: "Dormant card nudge",
  reviewRequestEmail: "Review request",
  paymentSubmittedEmail: "Payment submitted",
  paymentToVerifyAdminEmail: "Payment to verify",
  paymentVerifiedEmail: "Payment verified",
  paymentRejectedEmail: "Payment rejected",
  verifyEmailAddressEmail: "Verify email address",
  passwordChangedEmail: "Password changed",
  passwordResetEmail: "Password reset",
  trialEndingEmail: "Trial ending",
  trialDay1Email: "Trial day 1",
  trialDay7Email: "Trial day 7",
  newSignupAdminEmail: "New signup (admin)",
  referralSignupAdminEmail: "Referral signup (admin)",
  referralRewardEmail: "Referral reward",
  payoutRequestAdminEmail: "Payout request (admin)",
  resellerApplicationAdminEmail: "Reseller application (admin)",
  resellerApplicationReceivedEmail: "Reseller application received",
  resellerApprovedEmail: "Reseller approved",
  resellerApprovedExistingEmail: "Reseller approved (existing)",
  resellerRejectedEmail: "Reseller rejected",
  smtpTestEmail: "SMTP test",
};

const kindLabel = (k: string | null) =>
  !k ? "—"
    : KIND_LABEL[k]
    || k.replace(/Email$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const STATUS_STYLE: Record<string, { chip: string; icon: typeof CheckCircle2; label: string }> = {
  sent: { chip: "bg-[#DCFCE7] text-[#166534]", icon: CheckCircle2, label: "Sent" },
  failed: { chip: "bg-[#FEE2E2] text-[#991B1B]", icon: XCircle, label: "Failed" },
  skipped: { chip: "bg-[#F1F5F9] text-[#475569]", icon: MinusCircle, label: "Skipped" },
};

function when(v: string | Date | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function AdminEmailLog() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");           // committed search (Enter / button)
  const [status, setStatus] = useState<Status>("all");
  const [kind, setKind] = useState<string>("");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data, isLoading, isFetching, refetch } = trpc.admin.emailLogs.useQuery(
    { q: term || undefined, status, kind: kind || undefined, days, page, perPage },
    { placeholderData: (prev) => prev },
  );
  const prune = trpc.admin.pruneEmailLogs.useMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const counts = data?.byStatus ?? { sent: 0, failed: 0, skipped: 0 };
  const kinds = useMemo(() => data?.kinds ?? [], [data]);

  const search = () => { setTerm(q.trim()); setPage(1); };
  const setFilter = (fn: () => void) => { fn(); setPage(1); };

  const exportCsv = () => {
    if (!rows.length) { toast.error("Nothing to export on this page."); return; }
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Sent at", "To", "Subject", "Template", "Status", "Error"].map(cell).join(","),
      ...rows.map((r) => [when(r.createdAt), r.toEmail, r.subject, kindLabel(r.kind), r.status, r.error || ""].map(cell).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-log-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doPrune = async () => {
    if (!confirm("Delete every log entry older than 180 days? Emails already sent are not affected — only the log rows.")) return;
    try {
      const res = await prune.mutateAsync({ olderThanDays: 180 });
      toast.success(`Old entries removed — ${res.remaining.toLocaleString("en-IN")} left in the log.`);
      await refetch();
    } catch {
      toast.error("Could not clear the old entries.");
    }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Email Log" subtitle="Every email DigitalCarda has sent, and whether it went through" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl">

        {/* Totals for the whole date window — deliberately NOT filtered, so the
            four numbers always add up while you narrow the list below. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["Total", counts.sent + counts.failed + counts.skipped, "text-[#0F172A]", Mail],
            ["Sent", counts.sent, "text-[#166534]", CheckCircle2],
            ["Failed", counts.failed, "text-[#991B1B]", XCircle],
            ["Skipped", counts.skipped, "text-[#475569]", MinusCircle],
          ] as [string, number, string, typeof Mail][]).map(([label, n, tone, Icon]) => (
            <div key={label} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                <Icon size={13} /> {label}
              </div>
              <div className={`text-2xl font-extrabold mt-1 tabular-nums ${tone}`}>{n.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search by email address or subject…"
                className="w-full h-11 rounded-xl border border-[#E2E8F0] pl-9 pr-3 text-sm outline-none focus:border-[#F7B31C]"
              />
            </div>
            <button onClick={search} className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold whitespace-nowrap">Search</button>
            <button onClick={() => refetch()} disabled={isFetching}
              className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 disabled:opacity-60">
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "sent", "failed", "skipped"] as Status[]).map((s) => (
              <button key={s} onClick={() => setFilter(() => setStatus(s))}
                className={`h-9 px-3.5 rounded-xl text-[12.5px] font-semibold border-2 transition-all capitalize ${
                  status === s ? "border-[#F7B31C] bg-[#FEF3C7]/50 text-[#92400E]" : "border-[#E2E8F0] text-[#334155] hover:border-[#F7B31C]/50"}`}>
                {s}
              </button>
            ))}

            <span className="w-px h-6 bg-[#E2E8F0] mx-1 hidden sm:block" />

            <select value={days} onChange={(e) => setFilter(() => setDays(Number(e.target.value)))}
              className="h-9 rounded-xl border border-[#E2E8F0] px-2.5 text-[12.5px] font-semibold text-[#334155] outline-none focus:border-[#F7B31C]">
              {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
            </select>

            <select value={kind} onChange={(e) => setFilter(() => setKind(e.target.value))}
              className="h-9 max-w-[230px] rounded-xl border border-[#E2E8F0] px-2.5 text-[12.5px] font-semibold text-[#334155] outline-none focus:border-[#F7B31C]">
              <option value="">All templates</option>
              {kinds.map((k) => <option key={k.kind} value={k.kind}>{kindLabel(k.kind)} ({k.n})</option>)}
            </select>

            {/* Kept together so they wrap as a pair rather than splitting across rows */}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={exportCsv}
                className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-1.5">
                <Download size={14} /> Export page
              </button>
              <button onClick={doPrune} disabled={prune.isPending}
                className="h-9 px-3.5 rounded-xl border border-[#FECACA] text-[12.5px] font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] flex items-center gap-1.5 disabled:opacity-60">
                <Trash2 size={14} /> Clear 180+ days
              </button>
            </div>
          </div>
        </div>

        {/* The log */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center text-[#64748B] gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading the log…
            </div>
          ) : !rows.length ? (
            <div className="p-12 text-center">
              <Inbox size={30} className="mx-auto text-[#CBD5E1]" />
              <p className="text-sm font-semibold text-[#334155] mt-3">Nothing here yet</p>
              <p className="text-[12.5px] text-[#94A3B8] mt-1">
                {term || status !== "all" || kind
                  ? "No emails match these filters. Try widening the date range."
                  : "Emails sent from now on will be recorded here."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#64748B]">
                      <th className="text-left font-bold px-4 py-3 whitespace-nowrap">Sent at</th>
                      <th className="text-left font-bold px-4 py-3">To</th>
                      <th className="text-left font-bold px-4 py-3">Subject</th>
                      <th className="text-left font-bold px-4 py-3 whitespace-nowrap">Template</th>
                      <th className="text-left font-bold px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATUS_STYLE[r.status] || STATUS_STYLE.skipped;
                      const Icon = st.icon;
                      return (
                        <tr key={r.id} className="border-t border-[#F1F5F9] align-top">
                          <td className="px-4 py-3 text-[12.5px] text-[#64748B] whitespace-nowrap tabular-nums">{when(r.createdAt)}</td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] break-all max-w-[220px]">{r.toEmail}</td>
                          <td className="px-4 py-3 text-[13px] text-[#334155] max-w-[340px]">
                            {r.subject}
                            {r.error && <div className="text-[11.5px] text-[#B91C1C] mt-1 break-words">{r.error}</div>}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] text-[#64748B] whitespace-nowrap">{kindLabel(r.kind)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${st.chip}`}>
                              <Icon size={12} /> {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-[#F1F5F9]">
                {rows.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.skipped;
                  const Icon = st.icon;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[13px] font-semibold text-[#0F172A] break-all">{r.toEmail}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${st.chip}`}>
                          <Icon size={11} /> {st.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#334155] mt-1.5">{r.subject}</p>
                      {r.error && <p className="text-[11.5px] text-[#B91C1C] mt-1 break-words">{r.error}</p>}
                      <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#94A3B8]">
                        <span>{kindLabel(r.kind)}</span><span>·</span><span className="tabular-nums">{when(r.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* How many the current filters match, and paging when there's more than a page */}
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-[#64748B] tabular-nums">
            {total.toLocaleString("en-IN")} {total === 1 ? "entry" : "entries"} match
            {pages > 1 && <> · page {page} of {pages}</>}
          </p>
          {pages > 1 && (
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-[#94A3B8] leading-relaxed">
          Only the envelope is recorded — recipient, subject, template and outcome. Message bodies are never stored,
          because welcome emails contain a customer's password.
        </p>
      </div>
    </ResponsiveDashboardLayout>
  );
}
