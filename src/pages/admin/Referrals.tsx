import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import {
  Gift, Banknote, ArrowDownToLine, Check, X, Percent, Users, Clock,
  CheckCircle2, XCircle, Wallet, Save, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const inr = (v: unknown) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (s: string | Date | null) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("en-GB").replace(/\//g, "-"); };

export default function AdminReferrals() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"rewards" | "payouts">("rewards");
  const { data: config } = trpc.referral.getConfig.useQuery();
  const { data: referrals } = trpc.referral.adminList.useQuery();
  const { data: payouts } = trpc.referral.adminWithdrawals.useQuery();

  const setConfigMut = trpc.referral.setConfig.useMutation();
  const creditMut = trpc.referral.creditReward.useMutation();
  const payMut = trpc.referral.payWithdrawal.useMutation();
  const rejectMut = trpc.referral.rejectWithdrawal.useMutation();

  const [commInput, setCommInput] = useState<string>("");
  const [discInput, setDiscInput] = useState<string>("");
  const commValue = commInput !== "" ? commInput : String(config?.commissionPercent ?? "");
  const discValue = discInput !== "" ? discInput : String(config?.discountPercent ?? "");

  const pendingPayouts = (payouts || []).filter((p) => p.status === "pending").length;
  const eligible = (referrals || []).filter((r) => r.hasPaidPlan && r.status !== "rewarded").length;

  const saveConfig = async () => {
    const c = Number(commValue), d = Number(discValue);
    if (![c, d].every((p) => Number.isFinite(p) && p >= 0 && p <= 100)) return toast.error("Enter percentages between 0 and 100");
    try {
      await setConfigMut.mutateAsync({ commissionPercent: c, discountPercent: d });
      toast.success("Referral rates updated");
      utils.referral.getConfig.invalidate();
      utils.referral.adminList.invalidate();
      setCommInput(""); setDiscInput("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const refreshAll = () => {
    utils.referral.adminList.invalidate();
    utils.referral.adminWithdrawals.invalidate();
  };

  const stats = [
    { label: "Total referrals", value: referrals?.length ?? 0, icon: Users, bg: "#DBEAFE", fg: "#2563EB" },
    { label: "Ready to reward", value: eligible, icon: TrendingUp, bg: "#FEF3C7", fg: "#D97706" },
    { label: "Rewarded", value: (referrals || []).filter((r) => r.status === "rewarded").length, icon: Banknote, bg: "#DCFCE7", fg: "#16A34A" },
    { label: "Pending payouts", value: pendingPayouts, icon: ArrowDownToLine, bg: "#FEE2E2", fg: "#DC2626" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Referrals & Payouts" subtitle="Reward referrers for paid conversions and process wallet payouts" /></div>
      <div className="p-4 sm:p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.fg }} /></div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-[#0F172A] tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rate settings */}
        <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Percent size={20} className="text-[#D97706]" /></div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Referral rates</p>
              <p className="text-[12px] text-[#64748B]">Set what the referrer earns and what the referred user saves.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Referrer commission</label>
              <div className="relative">
                <input value={commValue} onChange={(e) => setCommInput(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="h-10 w-28 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-3 pr-7 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">%</span>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-1">of the plan price they pay</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Referred-user discount</label>
              <div className="relative">
                <input value={discValue} onChange={(e) => setDiscInput(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="h-10 w-28 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-3 pr-7 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">%</span>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-1">off their first paid plan</p>
            </div>
            <button onClick={saveConfig} disabled={setConfigMut.isPending} className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] transition-colors disabled:opacity-50 sm:ml-auto"><Save size={15} /> Save</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-[#F1F5F9] p-1 w-full sm:w-auto sm:inline-flex">
          {([["rewards", "Rewards", eligible], ["payouts", "Payouts", pendingPayouts]] as const).map(([id, label, badge]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tab === id ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>
              {label}
              {badge > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === id ? "bg-[#F7B31C] text-[#0F172A]" : "bg-[#E2E8F0] text-[#64748B]"}`}>{badge}</span>}
            </button>
          ))}
        </div>

        {tab === "rewards" ? (
          <RewardsTable rows={referrals || []} onCredit={async (id, amount) => {
            try { await creditMut.mutateAsync({ referralId: id, amount }); toast.success("Reward credited to wallet"); refreshAll(); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }} loading={creditMut.isPending} />
        ) : (
          <PayoutsTable rows={payouts || []}
            onPay={async (id, reference) => { try { await payMut.mutateAsync({ id, reference }); toast.success("Marked as paid"); refreshAll(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}
            onReject={async (id, note) => { try { await rejectMut.mutateAsync({ id, note }); toast.success("Payout declined & refunded"); refreshAll(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}
            busy={payMut.isPending || rejectMut.isPending}
          />
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}

/* ─── Rewards table ─── */
type RefRow = {
  id: number; status: string; rewardAmount: number; rewardedAt: string | Date | null; createdAt: string | Date;
  referrer: { name: string | null; email: string } | null;
  referee: { name: string | null; email: string } | null;
  hasPaidPlan: boolean; planName: string | null; planAmount: number; suggestedReward: number; commissionPercent: number;
};

function RewardsTable({ rows, onCredit, loading }: { rows: RefRow[]; onCredit: (id: number, amount: number) => void; loading: boolean }) {
  if (rows.length === 0) return <Empty icon={Gift} title="No referrals yet" desc="Referrals will appear here as users invite friends." />;
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8] border-b border-[#F1F5F9]">
              <th className="px-4 py-3 font-semibold">Referrer</th>
              <th className="px-4 py-3 font-semibold">Referred user</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map((r) => <RewardRow key={r.id} r={r} onCredit={onCredit} loading={loading} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RewardRow({ r, onCredit, loading }: { r: RefRow; onCredit: (id: number, amount: number) => void; loading: boolean }) {
  const [amount, setAmount] = useState(String(r.suggestedReward || ""));
  const rewarded = r.status === "rewarded";
  return (
    <tr className="hover:bg-[#FAFBFC]">
      <td className="px-4 py-3">
        <p className="font-medium text-[#0F172A]">{r.referrer?.name || "—"}</p>
        <p className="text-[11px] text-[#94A3B8]">{r.referrer?.email || ""}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-[#0F172A]">{r.referee?.name || r.referee?.email || "Invited"}</p>
        <p className="text-[11px] text-[#94A3B8]">{fmt(r.createdAt)}</p>
      </td>
      <td className="px-4 py-3">
        {r.hasPaidPlan ? (
          <><p className="font-medium text-[#0F172A]">{r.planName || "Paid plan"}</p><p className="text-[11px] text-[#94A3B8]">{inr(r.planAmount)}</p></>
        ) : <span className="text-[12px] text-[#94A3B8]">No paid plan yet</span>}
      </td>
      <td className="px-4 py-3">
        {rewarded ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600"><Banknote size={12} /> {inr(r.rewardAmount)} paid</span>
        ) : r.hasPaidPlan ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600"><Clock size={12} /> Ready</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-[#F1F5F9] text-[#64748B]">Signed up</span>
        )}
      </td>
      <td className="px-4 py-3">
        {rewarded ? (
          <p className="text-right text-[11px] text-[#94A3B8]">{fmt(r.rewardedAt)}</p>
        ) : r.hasPaidPlan ? (
          <div className="flex items-center justify-end gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">₹</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="h-9 w-24 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] pl-6 pr-2 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]" />
            </div>
            <button onClick={() => { const a = Number(amount); if (!a || a <= 0) return toast.error("Enter an amount"); onCredit(r.id, a); }} disabled={loading} className="h-9 px-3 rounded-lg gradient-gold text-[#0F172A] text-[13px] font-semibold flex items-center gap-1 hover:shadow-gold transition-all disabled:opacity-50"><Check size={14} /> Credit</button>
          </div>
        ) : (
          <p className="text-right text-[11px] text-[#CBD5E1]">Waiting for upgrade</p>
        )}
      </td>
    </tr>
  );
}

/* ─── Payouts table ─── */
type PayoutRow = {
  id: number; amount: number; method: "bank" | "upi"; destination: string; accountName: string | null; ifsc: string | null;
  status: string; createdAt: string | Date; adminNote: string | null; reference: string | null;
  user: { name: string; email: string; balance: number } | null;
};

function PayoutsTable({ rows, onPay, onReject, busy }: {
  rows: PayoutRow[]; onPay: (id: number, ref?: string) => void; onReject: (id: number, note?: string) => void; busy: boolean;
}) {
  if (rows.length === 0) return <Empty icon={Wallet} title="No payout requests" desc="Withdrawal requests from users will show up here." />;
  return (
    <div className="space-y-3">
      {rows.map((w) => <PayoutCard key={w.id} w={w} onPay={onPay} onReject={onReject} busy={busy} />)}
    </div>
  );
}

function PayoutCard({ w, onPay, onReject, busy }: { w: PayoutRow; onPay: (id: number, ref?: string) => void; onReject: (id: number, note?: string) => void; busy: boolean }) {
  const [reference, setReference] = useState("");
  const pending = w.status === "pending";
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0"><ArrowDownToLine size={19} className="text-[#64748B]" /></div>
          <div className="min-w-0">
            <p className="text-base font-bold text-[#0F172A]">{inr(w.amount)} <span className="text-[11px] font-semibold uppercase text-[#94A3B8] ml-1">{w.method}</span></p>
            <p className="text-[12px] text-[#0F172A]">{w.user?.name} <span className="text-[#94A3B8]">· {w.user?.email}</span></p>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              {w.method === "upi" ? <>UPI: <b>{w.destination}</b></> : <>A/C: <b>{w.destination}</b>{w.ifsc ? ` · IFSC ${w.ifsc}` : ""}{w.accountName ? ` · ${w.accountName}` : ""}</>}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Requested {fmt(w.createdAt)} · user balance {inr(w.user?.balance)}</p>
          </div>
        </div>
        <div className="shrink-0">
          {w.status === "paid" ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={14} /> Paid{w.reference ? ` · ${w.reference}` : ""}</span>
          ) : w.status === "rejected" ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-500"><XCircle size={14} /> Declined</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600"><Clock size={14} /> Pending</span>
          )}
        </div>
      </div>

      {pending && (
        <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Payment reference / UTR (optional)" className="flex-1 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]" />
          <div className="flex gap-2">
            <button onClick={() => onPay(w.id, reference.trim() || undefined)} disabled={busy} className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors disabled:opacity-50"><Check size={15} /> Mark paid</button>
            <button onClick={() => onReject(w.id, undefined)} disabled={busy} className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"><X size={15} /> Decline</button>
          </div>
        </div>
      )}
      {w.adminNote && <p className="text-[11px] text-[#94A3B8] mt-2">Note: {w.adminNote}</p>}
    </div>
  );
}

function Empty({ icon: Icon, title, desc }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Icon size={26} className="text-[#94A3B8]" /></div>
      <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
      <p className="text-xs text-[#94A3B8] mt-1">{desc}</p>
    </div>
  );
}
