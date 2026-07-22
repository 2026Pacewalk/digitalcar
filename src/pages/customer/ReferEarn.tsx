import { useState } from "react";
import {
  Gift, Copy, Check, MessageCircle, Share2, Users, UserCheck, Wallet,
  Link2, Send, Clock, Sparkles, ArrowRight, Banknote, ArrowDownToLine,
  TrendingUp, X, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Tip } from "@/components/customer/ModuleShell";
import { trpc } from "@/providers/trpc";

const inr = (v: number) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (s: string | Date) => { const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("en-GB").replace(/\//g, "-"); };

export default function CustomerReferEarn() {
  const utils = trpc.useUtils();
  const { data: program } = trpc.referral.myProgram.useQuery();
  const { data: referralsData } = trpc.referral.list.useQuery();
  const { data: walletData } = trpc.referral.wallet.useQuery();
  const { data: payouts } = trpc.referral.withdrawals.useQuery();
  const withdrawMut = trpc.referral.requestWithdrawal.useMutation();

  const [copied, setCopied] = useState<"code" | "link" | "">("");
  const [showPayout, setShowPayout] = useState(false);

  const code = program?.code || "…";
  const percent = program?.commissionPercent ?? 0;
  const discountPercent = program?.discountPercent ?? 0;
  const stats = program?.stats || { invited: 0, joined: 0, rewarded: 0 };
  const wallet = program?.wallet || { balance: 0, totalEarned: 0, pendingPayout: 0 };
  const referrals = (referralsData as { id: number; refereeEmail: string | null; status: string; rewardAmount: string | number; createdAt: string | Date }[] | undefined) || [];
  const txns = walletData?.transactions || [];

  const origin = typeof window !== "undefined" ? window.location.origin : "https://digitalcarda.in";
  const link = `${origin}/signup?ref=${program?.code || ""}`;
  const shareText = `Join DigitalCarda — the smart digital business card — with my link: ${link}`;

  const copy = async (text: string, key: "code" | "link") => {
    try { await navigator.clipboard.writeText(text); setCopied(key); toast.success("Copied"); setTimeout(() => setCopied(""), 1600); }
    catch { toast.error("Copy failed"); }
  };
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareNative = () => {
    if (navigator.share) navigator.share({ title: "Refer & Earn — DigitalCarda", text: shareText, url: link });
    else copy(link, "link");
  };

  const steps = [
    { icon: Send, title: "Share your link", desc: "Send your referral link to friends, clients, or your network." },
    { icon: UserCheck, title: "They upgrade to a paid plan", desc: `Your friend gets ${discountPercent}% off — and you earn ${percent}% of what they pay.` },
    { icon: Wallet, title: "Withdraw your earnings", desc: "Your reward lands in your wallet — request a payout to your bank or UPI anytime." },
  ];

  return (
    <ModuleShell title="Refer & Earn" subtitle={`Friend saves ${discountPercent}%, you earn ${percent}% cash`} icon={Gift}
      actions={<button onClick={shareWhatsApp} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Share2 size={16} /> Share</button>}>

      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-5 shadow-premium-lg ring-1 ring-black/5">
        <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-[#F7B31C]/25 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-[#14B8A6]/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/10 text-[10px] font-semibold uppercase tracking-wider text-[#F7B31C]"><Sparkles size={11} /> Give {discountPercent}%, get {percent}% cash</span>
          <h2 className="text-xl font-extrabold text-white mt-3 leading-tight">Refer friends, earn real cash</h2>
          <p className="text-[13px] text-white/60 mt-1">Your friend saves {discountPercent}% on their first paid plan, and you earn {percent}% of what they pay — straight to your wallet.</p>

          {/* Code + link */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Your referral code</p>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-[15px] font-bold text-white tracking-wide truncate">{code}</p>
                <button onClick={() => copy(code, "code")} disabled={!program} aria-label="Copy code" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40">{copied === "code" ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}</button>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Your referral link</p>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-[13px] font-medium text-white/90 truncate flex items-center gap-1.5"><Link2 size={13} className="text-white/50 shrink-0" /> {link.replace(/^https?:\/\//, "")}</p>
                <button onClick={() => copy(link, "link")} disabled={!program} aria-label="Copy link" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40">{copied === "link" ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}</button>
              </div>
            </div>
          </div>

          {/* Share buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={shareWhatsApp} className="flex-1 h-11 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors active:scale-[0.98]"><MessageCircle size={16} /> Share on WhatsApp</button>
            <button onClick={shareNative} className="h-11 px-4 rounded-xl bg-white/10 ring-1 ring-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors active:scale-[0.98]"><Share2 size={16} /> More</button>
          </div>
        </div>
      </div>

      {/* ─── Wallet ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#F1F5F9] shadow-premium p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5"><Wallet size={13} className="text-[#F7B31C]" /> Wallet balance</p>
            <p className="text-3xl font-extrabold text-[#0F172A] mt-1 tabular-nums">{inr(wallet.balance)}</p>
            <div className="flex items-center gap-4 mt-2 text-[11px]">
              <span className="text-[#64748B]">Total earned <b className="text-[#0F172A]">{inr(wallet.totalEarned)}</b></span>
              {wallet.pendingPayout > 0 && <span className="text-amber-600">Pending payout <b>{inr(wallet.pendingPayout)}</b></span>}
            </div>
          </div>
          <button
            onClick={() => setShowPayout(true)}
            disabled={wallet.balance < 1}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowDownToLine size={15} /> Withdraw
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, value: stats.invited, label: "Invited", bg: "#DBEAFE", fg: "#2563EB" },
          { icon: UserCheck, value: stats.joined, label: "Signed up", bg: "#DCFCE7", fg: "#16A34A" },
          { icon: TrendingUp, value: stats.rewarded, label: "Earned from", bg: "#FEF3C7", fg: "#D97706" },
        ].map((s, i) => (
          <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-4">
            <s.icon className="absolute -right-2 -bottom-2 opacity-[0.06]" size={64} style={{ color: s.fg }} />
            <div className="relative">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.fg }}><s.icon size={16} /></span>
              <p className="text-2xl font-bold text-[#0F172A] mt-3 leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-[#64748B] mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tip>You earn only when a referred friend upgrades to a <b>paid plan</b>. The reward is added to your wallet by our team — then withdraw it to your bank or UPI whenever you like.</Tip>

      {/* ─── How it works ─── */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-4">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><s.icon size={17} className="text-[#F7B31C]" /></span>
                <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                {i < steps.length - 1 && <ArrowRight size={14} className="text-[#CBD5E1] ml-auto hidden sm:block" />}
              </div>
              <p className="text-[13px] font-semibold text-[#0F172A]">{s.title}</p>
              <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Referral list ─── */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#0F172A]">Your referrals</p>
          <span className="text-[11px] text-[#94A3B8]">{stats.invited} total</span>
        </div>
        {referrals.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Gift size={22} className="text-[#94A3B8]" /></div>
            <p className="text-sm font-medium text-[#0F172A]">No referrals yet</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Share your link to start earning cash rewards.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {referrals.map((r) => {
              const label = r.refereeEmail || "Invited friend";
              const rewarded = r.status === "rewarded";
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0"><span className="text-[#0F172A] text-xs font-bold">{label.charAt(0).toUpperCase()}</span></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#0F172A] truncate">{label}</p>
                    <p className="text-[11px] text-[#94A3B8]">{fmt(r.createdAt)}</p>
                  </div>
                  {rewarded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600"><Banknote size={11} /> {inr(Number(r.rewardAmount))} earned</span>
                  ) : r.status === "joined" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600"><UserCheck size={11} /> Signed up</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600"><Clock size={11} /> Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Payout requests ─── */}
      {payouts && payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[#F1F5F9]">
            <p className="text-[13px] font-semibold text-[#0F172A]">Payout requests</p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {payouts.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0"><ArrowDownToLine size={16} className="text-[#64748B]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#0F172A]">{inr(Number(w.amount))} <span className="font-normal text-[#94A3B8]">· {w.method.toUpperCase()}</span></p>
                  <p className="text-[11px] text-[#94A3B8] truncate">{w.destination} · {fmt(w.createdAt)}</p>
                </div>
                {w.status === "paid" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={11} /> Paid</span>
                ) : w.status === "rejected" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-500"><XCircle size={11} /> Declined</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600"><Clock size={11} /> Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Wallet statement ─── */}
      {txns.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-premium overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[#F1F5F9]">
            <p className="text-[13px] font-semibold text-[#0F172A]">Wallet statement</p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {txns.map((t) => {
              const amt = Number(t.amount);
              const credit = amt >= 0;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${credit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                    {t.type === "reward" ? <Banknote size={15} /> : t.type === "withdrawal" ? <ArrowDownToLine size={15} /> : <TrendingUp size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#0F172A] capitalize truncate">{t.note || t.type}</p>
                    <p className="text-[11px] text-[#94A3B8]">{fmt(t.createdAt)}{t.status === "pending" ? " · pending" : t.status === "reversed" ? " · reversed" : ""}</p>
                  </div>
                  <p className={`text-[13px] font-bold tabular-nums shrink-0 ${credit ? "text-emerald-600" : "text-red-500"}`}>{credit ? "+" : "−"}{inr(Math.abs(amt))}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Payout modal ─── */}
      {showPayout && (
        <PayoutModal
          balance={wallet.balance}
          onClose={() => setShowPayout(false)}
          onSubmit={async (payload) => {
            try {
              await withdrawMut.mutateAsync(payload);
              toast.success("Payout requested — we'll process it shortly");
              setShowPayout(false);
              utils.referral.myProgram.invalidate();
              utils.referral.wallet.invalidate();
              utils.referral.withdrawals.invalidate();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not request payout");
            }
          }}
          loading={withdrawMut.isPending}
        />
      )}
    </ModuleShell>
  );
}

/* ─── Payout request modal ─── */
function PayoutModal({
  balance, onClose, onSubmit, loading,
}: {
  balance: number;
  onClose: () => void;
  onSubmit: (p: { amount: number; method: "bank" | "upi"; destination: string; accountName?: string; ifsc?: string }) => void;
  loading: boolean;
}) {
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [amount, setAmount] = useState(String(balance || ""));
  const [upi, setUpi] = useState("");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [ifsc, setIfsc] = useState("");

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt < 1) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds your balance");
    if (method === "upi") {
      if (!upi.trim()) return toast.error("Enter your UPI ID");
      onSubmit({ amount: amt, method: "upi", destination: upi.trim() });
    } else {
      if (!account.trim()) return toast.error("Enter your account number");
      onSubmit({ amount: amt, method: "bank", destination: account.trim(), accountName: name.trim(), ifsc: ifsc.trim() });
    }
  };

  const fld = "h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all placeholder:text-[#94A3B8]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md relative z-10 p-5 pb-safe">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[#0F172A]">Withdraw earnings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>
        <p className="text-[12px] text-[#94A3B8] mb-4">Available balance <b className="text-[#0F172A]">{inr(balance)}</b></p>

        {/* Method toggle */}
        <div className="flex rounded-xl bg-[#F1F5F9] p-1 mb-4">
          {(["upi", "bank"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${method === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>{m === "upi" ? "UPI" : "Bank"}</button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Amount (₹)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0.00" className={fld} />
          </div>
          {method === "upi" ? (
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">UPI ID</label>
              <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" className={fld} />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Account holder name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="As per bank records" className={fld} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Account number</label>
                <input value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 18))} inputMode="numeric" placeholder="0000 0000 0000" className={fld} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">IFSC code</label>
                <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))} placeholder="ABCD0123456" className={fld} />
              </div>
            </>
          )}
        </div>

        <button onClick={submit} disabled={loading} className="w-full h-12 mt-5 gradient-gold text-[#0F172A] rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-60">
          {loading ? <><Loader2 size={18} className="animate-spin" /> Requesting…</> : <><ArrowDownToLine size={18} /> Request payout</>}
        </button>
        <p className="text-[11px] text-[#94A3B8] text-center mt-2">Payouts are reviewed and paid by our team.</p>
      </div>
    </div>
  );
}
