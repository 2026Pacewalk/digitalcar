import { useState } from "react";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Wallet, TrendingUp, CheckCircle2, Clock, X, Loader2, ArrowUpRight } from "lucide-react";

/* Earnings & payouts. Every commission is itemised — which customer, what
   they paid, at what rate — and withdrawals go through the same payout queue
   the admin already works for referral rewards. */

const inr = (n: unknown) => {
  // Whole rupees stay clean (₹999); anything with paise shows both digits (₹199.80, not ₹199.8).
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};
const input = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:bg-white transition-colors";

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "In progress", cls: "bg-[#FEF3C7] text-[#92400E]" },
  paid: { label: "Paid", cls: "bg-[#D1FAE5] text-[#065F46]" },
  rejected: { label: "Declined — refunded", cls: "bg-[#FEE2E2] text-[#991B1B]" },
};

export default function ResellerEarnings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.reseller.earnings.useQuery();
  const { data: me } = trpc.reseller.me.useQuery();
  const withdraw = trpc.referral.requestWithdrawal.useMutation();
  const [tab, setTab] = useState<"commissions" | "payouts">("commissions");
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState({ amount: "", method: "upi" as "upi" | "bank", upi: "", accountName: "", accountNumber: "", ifsc: "" });

  const balance = data?.walletBalance ?? 0;

  // Pre-fill from the saved payout details each time the form opens.
  const openWithdraw = () => {
    setReq({
      amount: balance ? String(balance) : "",
      method: me?.payoutMethod ?? "upi",
      upi: me?.payoutUpi ?? "",
      accountName: me?.payoutAccountName || me?.fullName || "",
      accountNumber: me?.payoutAccountNumber ?? "",
      ifsc: me?.payoutIfsc ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const amount = Number(req.amount);
    if (!(amount >= 1)) return toast.error("Enter an amount of at least ₹1");
    if (amount > balance) return toast.error(`You can withdraw up to ${inr(balance)}`);
    const destination = req.method === "upi" ? req.upi.trim() : req.accountNumber.trim();
    if (!destination) return toast.error(req.method === "upi" ? "Enter your UPI ID" : "Enter your account number");
    if (req.method === "bank" && !req.ifsc.trim()) return toast.error("Enter the IFSC");
    try {
      await withdraw.mutateAsync({
        amount, method: req.method, destination,
        accountName: req.method === "bank" ? req.accountName.trim() : undefined,
        ifsc: req.method === "bank" ? req.ifsc.trim().toUpperCase() : undefined,
      });
      toast.success(`Withdrawal of ${inr(amount)} requested — we'll pay it and let you know`);
      setOpen(false);
      setTab("payouts");
      await Promise.all([utils.reseller.earnings.invalidate(), utils.user.resellerStats.invalidate()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request the withdrawal");
    }
  };

  const tiles = [
    { label: "Ready to withdraw", value: inr(balance), icon: Wallet, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Earned in total", value: inr(data?.totalEarned), icon: TrendingUp, color: "bg-[#EDE9FE] text-[#5B21B6]" },
    { label: "Paid out", value: inr(data?.paidOut), icon: CheckCircle2, color: "bg-[#D1FAE5] text-[#065F46]" },
    { label: "Payout in progress", value: inr(data?.inFlight), icon: Clock, color: "bg-[#FEF3C7] text-[#92400E]" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Earnings & payouts" subtitle="Every commission you've earned, and every payout" /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="bg-white rounded-2xl p-3.5 shadow-premium border border-[#F1F5F9]">
              <span className={`w-8 h-8 rounded-lg ${t.color} flex items-center justify-center`}><t.icon size={16} /></span>
              <p className="text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums">{isLoading ? "…" : t.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1">{t.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-[#14243E] to-[#0F172A] rounded-2xl p-5 shadow-premium text-white flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/50">Ready to withdraw</p>
            <p className="text-3xl font-bold tabular-nums text-[#F7B31C] mt-0.5">{inr(balance)}</p>
            <p className="text-xs text-white/60 mt-1">Paid to your bank or UPI. We’ll let you know when it’s sent.</p>
          </div>
          <button onClick={openWithdraw} disabled={balance < 1}
            className="h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            Withdraw <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="px-4 pt-4 sm:px-5 border-b border-[#F1F5F9] flex gap-5">
            {([["commissions", `Commissions (${data?.commissions.length ?? 0})`], ["payouts", `Payouts (${data?.payouts.length ?? 0})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === k ? "border-[#F7B31C] text-[#0F172A]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {tab === "commissions" ? (
              <table className="w-full">
                <thead><tr className="bg-[#F8FAFC]">
                  {["Date", "Customer", "They paid", "Rate", "You earned"].map((h, i) => (
                    <th key={h} className={`text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {!data?.commissions.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No commission yet. It appears here the moment one of your customers pays for a plan.</td></tr>
                  ) : data.commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{c.customerName}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-[#334155]">{inr(c.orderAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-[#64748B]">{c.rate}%</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-[#065F46]">+{inr(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead><tr className="bg-[#F8FAFC]">
                  {["Requested", "Amount", "To", "Status", "Reference"].map((h, i) => (
                    <th key={h} className={`text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3 ${i === 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {!data?.payouts.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#94A3B8]">No payouts yet.</td></tr>
                  ) : data.payouts.map((p) => {
                    const s = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending;
                    return (
                      <tr key={p.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-[#0F172A]">{inr(p.amount)}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{p.method === "upi" ? "UPI" : "Bank"}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span></td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{p.reference || p.adminNote || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Withdraw">
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <button onClick={() => setOpen(false)} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center"><X size={16} /></button>
            <h2 className="text-lg font-bold text-[#0F172A]">Withdraw your commission</h2>
            <p className="text-sm text-[#64748B] mt-1">Up to {inr(balance)} available.</p>

            <label className="block mt-5">
              <span className="block text-xs font-medium text-[#0F172A] mb-1.5">Amount (₹)</span>
              <input className={input} inputMode="decimal" value={req.amount} onChange={(e) => setReq({ ...req, amount: e.target.value.replace(/[^\d.]/g, "") })} />
            </label>

            <div role="radiogroup" aria-label="Pay to" className="inline-flex rounded-xl bg-[#F1F5F9] p-1 mt-4">
              {(["upi", "bank"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={req.method === m} onClick={() => setReq({ ...req, method: m })}
                  className={`h-8 px-4 rounded-lg text-xs font-semibold transition-colors ${req.method === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>
                  {m === "upi" ? "UPI" : "Bank transfer"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {req.method === "upi" ? (
                <label className="block">
                  <span className="block text-xs font-medium text-[#0F172A] mb-1.5">UPI ID</span>
                  <input className={input} value={req.upi} onChange={(e) => setReq({ ...req, upi: e.target.value })} />
                </label>
              ) : (
                <>
                  <label className="block"><span className="block text-xs font-medium text-[#0F172A] mb-1.5">Account holder name</span>
                    <input className={input} value={req.accountName} onChange={(e) => setReq({ ...req, accountName: e.target.value })} /></label>
                  <label className="block"><span className="block text-xs font-medium text-[#0F172A] mb-1.5">Account number</span>
                    <input className={input} inputMode="numeric" value={req.accountNumber} onChange={(e) => setReq({ ...req, accountNumber: e.target.value.replace(/\D/g, "") })} /></label>
                  <label className="block"><span className="block text-xs font-medium text-[#0F172A] mb-1.5">IFSC</span>
                    <input className={`${input} uppercase`} value={req.ifsc} onChange={(e) => setReq({ ...req, ifsc: e.target.value })} /></label>
                </>
              )}
            </div>

            <button onClick={submit} disabled={withdraw.isPending}
              className="mt-6 h-11 w-full gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {withdraw.isPending && <Loader2 size={15} className="animate-spin" />} Request withdrawal
            </button>
            <p className="text-[11px] text-[#94A3B8] mt-3 text-center">The amount is held from your balance straight away, and returned if the payout is declined.</p>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
