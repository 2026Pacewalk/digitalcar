import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Handshake, Search, Loader2, AlertTriangle, Eye, History, Check, Link2Off } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { readableError } from "@/lib/errors";
import { AdminModal } from "@/components/admin/RowActions";

/* Admin → Customers → Assign to reseller.

   For a customer a reseller brought in by word of mouth who signed up on their
   own: put them in that reseller's account (users.reseller_id). Super admin
   only. The rules it shows are the ones the server applies
   (api/reseller-router.ts assignCustomer):
   - the reseller earns on plan payments verified from now on, never past ones;
   - they see the customer's contact details, and payments from today only;
   - nothing is taken back from a previous reseller. */

export type AssignResult = { resellerUserId: number | null; resellerAccountId: number | null; resellerName: string | null };

const day = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Note({ tone, children }: { tone: "amber" | "blue" | "red"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
    : tone === "amber" ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
    : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]";
  return <div className={`flex gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] leading-relaxed ${cls}`}>{children}</div>;
}

export default function AssignResellerModal({ customer, onClose, onDone }: {
  customer: { name: string; email: string };
  onClose: () => void;
  onDone: (r: AssignResult) => void;
}) {
  // Never from cache: reopening right after a change must show the reseller as it is now.
  const preview = trpc.reseller.assignPreview.useQuery({ email: customer.email }, { refetchOnWindowFocus: false, retry: false, gcTime: 0, refetchOnMount: "always" });
  const targets = trpc.reseller.assignTargets.useQuery(undefined, { refetchOnWindowFocus: false });
  const assign = trpc.reseller.assignCustomer.useMutation();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const data = preview.data?.ok && !preview.isFetching ? preview.data : null;
  const current = data?.current ?? null;
  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (targets.data ?? []).filter((r) => !s || [r.name, r.company, r.email].some((v) => (v || "").toLowerCase().includes(s)));
  }, [targets.data, q]);
  const chosen = (targets.data ?? []).find((r) => r.accountId === pick) ?? null;
  const moving = !!current && !!chosen;
  const title = current ? "Change reseller" : "Assign to reseller";
  const first = customer.name?.split(" ")[0] || "this customer";

  const save = async (accountId: number | null) => {
    if (!data) return;
    try {
      const res = await assign.mutateAsync({
        email: customer.email, accountId, expectFrom: current?.userId ?? null, note: note.trim() || undefined,
      });
      if (!res.ok) { toast.error(`No live account matches ${customer.email}.`); return; }
      if (accountId === null) toast.success(`${customer.name} is no longer with ${current?.name ?? "a reseller"}`);
      else toast.success(`${customer.name} is now in ${res.resellerName}'s account${res.emailed ? " — they've been emailed" : ""}`);
      onDone({ resellerUserId: res.resellerUserId, resellerAccountId: res.resellerAccountId, resellerName: res.resellerName });
    } catch (e) {
      toast.error(readableError(e, "Couldn't save the reseller."));
    }
  };

  return (
    <AdminModal large onClose={onClose} icon={<Handshake size={20} className="text-[#0F766E]" />} iconBg="bg-[#CCFBF1]"
      title={title} subtitle={`${customer.name || "Customer"} · ${customer.email}`}>
      {preview.isLoading || preview.isFetching ? (
        <p className="flex items-center gap-2 py-6 text-[13px] text-[#64748B]"><Loader2 size={15} className="animate-spin" /> Loading their account…</p>
      ) : preview.error ? (
        <Note tone="red"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{readableError(preview.error, "Couldn't load this customer.")}</Note>
      ) : !data ? (
        <Note tone="red"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {preview.data && !preview.data.ok && preview.data.reason === "not_customer"
            ? "This isn't a customer account, so it can't be put with a reseller."
            : "No live account matches this email (an old card from before the new system), so there's nothing to link. It works once the customer has an account."}
        </Note>
      ) : (
        <div className="space-y-4">
          {/* The customer, as the reseller will get them */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-[#E9EDF4] bg-[#F8FAFC] px-4 py-3 text-[12.5px]">
            <p className="text-[#64748B]">Joined <b className="text-[#0F172A]">{day(data.customer.joinedAt)}</b></p>
            <p className="text-[#64748B]">Plan <b className="text-[#0F172A]">{data.customer.plan ? `${data.customer.plan.name}${data.customer.plan.until ? ` till ${day(data.customer.plan.until)}` : ""}` : "Trial / none"}</b></p>
            <p className="text-[#64748B]">Paid plans <b className="text-[#0F172A]">{data.paid.count ? `${data.paid.count} · ${rupees(data.paid.total)}` : "none yet"}</b></p>
            <p className="text-[#64748B]">Reseller <b className="text-[#0F172A]">{current ? current.name : "None (Website)"}</b></p>
          </div>

          {data.blocked && <Note tone="red"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{data.blocked} It can't be put with a reseller.</Note>}

          {!data.blocked && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#334155]">{current ? "Move to" : "Reseller"}</label>
              <div className="relative mb-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resellers…" aria-label="Search resellers"
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#14B8A6]" />
              </div>
              <div role="radiogroup" aria-label="Reseller" className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {targets.isLoading && <p className="py-3 text-[12.5px] text-[#94A3B8]">Loading resellers…</p>}
                {targets.error && <p className="py-3 text-[12.5px] text-[#B91C1C]">Couldn&apos;t load the resellers. Close this and try again.</p>}
                {!targets.isLoading && !targets.error && !list.length && (
                  <p className="py-3 text-[12.5px] text-[#64748B]">{(targets.data ?? []).length ? "No reseller matches that search." : "No active resellers with a login yet — give one a login in Admin → Resellers first."}</p>
                )}
                {list.map((r) => {
                  const isCurrent = r.userId === current?.userId;
                  const on = pick === r.accountId;
                  return (
                    <button key={r.accountId} type="button" role="radio" aria-checked={on} disabled={isCurrent} onClick={() => setPick(r.accountId)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-[#14B8A6] bg-[#F0FDFA]" : "border-[#E9EDF4] bg-white hover:border-[#CBD5E1]"} disabled:cursor-default disabled:opacity-60`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-[#0F766E] bg-[#0F766E]" : "border-[#CBD5E1]"}`}>{on && <Check size={10} className="text-white" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#0F172A]">{r.name}{r.company && r.company.trim().toLowerCase() !== r.name.trim().toLowerCase() ? <span className="font-normal text-[#64748B]"> · {r.company}</span> : null}</span>
                        <span className="block truncate text-[11.5px] text-[#94A3B8]">{r.email} · {plural(r.customers, "customer")}{r.invited ? " · hasn't signed in yet" : ""}</span>
                      </span>
                      <span className="shrink-0 text-right text-[12px] font-bold text-[#0F766E]">{isCurrent ? "Current" : `${r.rate}%`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {chosen && (
            <div className="space-y-2">
              <Note tone="blue"><Handshake size={15} className="mt-0.5 shrink-0" />
                <span>From today <b>{chosen.name}</b> earns <b>{chosen.rate}%</b> on every plan {first} pays for — new plans, renewals and upgrades. {data.paid.count === 1 ? `The plan already paid (${rupees(data.paid.total)}) earns nothing.` : data.paid.count ? `The ${data.paid.count} plans already paid (${rupees(data.paid.total)}) earn nothing.` : "Nothing is paid for past plans."}</span>
              </Note>
              {moving && (
                <Note tone="amber"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>Commission already paid stays with <b>{current!.name}</b>. From now on it goes to <b>{chosen.name}</b>.</span>
                </Note>
              )}
              {data.pending > 0 && (
                <Note tone="amber"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{plural(data.pending, "payment")} {data.pending === 1 ? "is" : "are"} waiting for verification. When you verify {data.pending === 1 ? "it" : "them"}, the commission goes to <b>{chosen.name}</b>.</span>
                </Note>
              )}
              {data.referral && !data.referral.rewarded && (
                <Note tone="amber"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{first} was referred by <b>{data.referral.by}</b>. Their first paid plan pays both: {data.referral.by}&apos;s referral reward and {chosen.name}&apos;s commission.</span>
                </Note>
              )}
              <Note tone="blue"><Eye size={15} className="mt-0.5 shrink-0" />
                <span><b>{chosen.name}</b> will see {first}&apos;s name, email, phone, account status and join date, and the plan payments made from today. They can&apos;t open or edit the card, see leads, or sign in as {first}.</span>
              </Note>
            </div>
          )}

          {(chosen || current) && !data.blocked && (
            <div>
              <label htmlFor="assign-note" className="mb-1.5 block text-xs font-semibold text-[#334155]">Note (optional)</label>
              <input id="assign-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 255))} placeholder="e.g. Came through Vishu by word of mouth — confirmed on call"
                className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] outline-none focus:border-[#14B8A6]" />
            </div>
          )}

          {data.history.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#334155]"><History size={13} /> Changes</p>
              <ul className="space-y-1 text-[12px] text-[#64748B]">
                {data.history.map((h, i) => (
                  <li key={i}>{day(h.at)} · {h.from ?? "Website"} → <b className="text-[#334155]">{h.to ?? "Website"}</b>{h.by ? ` · by ${h.by}` : ""}{h.note ? ` · “${h.note}”` : ""}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {current && (
              // Two clicks: removing stops their commission on this customer.
              <button type="button" onClick={() => (confirmRemove ? save(null) : setConfirmRemove(true))} onBlur={() => setConfirmRemove(false)} disabled={assign.isPending}
                className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-4 text-[13px] font-semibold disabled:opacity-50 ${confirmRemove ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"}`}>
                <Link2Off size={15} /> {confirmRemove ? `Yes, remove from ${current.name}` : `Remove from ${current.name}`}
              </button>
            )}
            <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
            {!data.blocked && (
              <button type="button" onClick={() => chosen && save(chosen.accountId)} disabled={!chosen || assign.isPending}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 text-sm font-bold text-white hover:bg-[#115E59] disabled:opacity-45">
                {assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <Handshake size={15} />}
                {chosen ? (moving ? `Move to ${chosen.name}` : `Add to ${chosen.name}`) : "Choose a reseller"}
              </button>
            )}
          </div>
        </div>
      )}
    </AdminModal>
  );
}
