import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, Calendar, CreditCard, Gift, Loader2, BadgePercent, Copy, X, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getOfferExpiry, OFFER_PERCENT } from "@/lib/upgradeOffer";

const PLAN_ICONS = [Zap, Package, CreditCard, Calendar];
const inr = (v: number) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Build a short feature list from a DB package's flags/limits. */
function featuresFor(p: {
  maxCards: number; maxProducts: number; featureAnalytics: boolean; featureCustomDomain: boolean;
  featureAI: boolean; featureLeadCapture: boolean; featurePrioritySupport: boolean; featureWhiteLabel: boolean;
}): string[] {
  return [
    `${p.maxCards} Digital Card${p.maxCards > 1 ? "s" : ""}`,
    p.maxProducts > 0 ? `${p.maxProducts} Products / Services` : "",
    p.featureCustomDomain ? "Custom Domain" : "",
    p.featureLeadCapture ? "Lead Capture" : "",
    p.featureAnalytics ? "Advanced Analytics" : "Basic Analytics",
    p.featureAI ? "AI Assistant" : "",
    p.featureWhiteLabel ? "White-label" : "",
    p.featurePrioritySupport ? "Priority Support" : "Email Support",
  ].filter(Boolean);
}

export default function CustomerSubscription() {
  const utils = trpc.useUtils();
  const { data: subscription } = trpc.subscription.mySubscription.useQuery();
  const { data: packages } = trpc.package.list.useQuery();
  const { data: discount } = trpc.referral.myDiscount.useQuery();
  const { data: orders } = trpc.payment.myOrders.useQuery();
  const pendingOrder = (orders || []).find((o) => o.status === "pending");

  const [isYearly, setIsYearly] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [offerExp, setOfferExp] = useState<number>(0);
  useEffect(() => { setOfferExp(getOfferExpiry()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const currentPkgId = subscription?.package?.id;
  const currentPaid = Number(subscription?.amount) || 0;
  const hasPaid = currentPaid > 0;
  // Referral discount only applies to the first paid plan (never on later upgrades).
  const dPct = discount?.eligible && !hasPaid ? discount.percent : 0;
  // Limited-time upgrade offer
  const offerMs = offerExp - now;
  const offerActive = offerExp > 0 && offerMs > 0;
  const offerPct = offerActive ? OFFER_PERCENT : 0;
  const offerH = Math.floor(offerMs / 3_600_000), offerM = Math.floor((offerMs % 3_600_000) / 60_000);
  const applyOffer = (v: number) => (offerPct ? Math.round(v * (1 - offerPct / 100) * 100) / 100 : v);

  // Manual payment: pick a plan → open the pay modal (QR / bank + submit reference)
  const [payFor, setPayFor] = useState<{ id: number; name: string; amount: number } | null>(null);
  const choose = (packageId: number, name: string, amount: number) => setPayFor({ id: packageId, name, amount });

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Subscription" subtitle="Manage your plan" /></div>
      <div className="p-6 space-y-6">
        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center"><Zap size={24} className="text-[#0F172A]" /></div>
            <div>
              <p className="text-xs text-[#94A3B8]">Current Plan</p>
              <p className="text-xl font-bold text-white">{subscription?.package?.name || "Free"}</p>
              {subscription?.currentPeriodEnd && (
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Referral discount banner */}
        {dPct > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FEF3C7] to-[#FFF7E6] border border-[#FDE68A] px-4 py-3">
            <span className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0"><Gift size={18} className="text-[#0F172A]" /></span>
            <div>
              <p className="text-sm font-bold text-[#92400E]">Your {dPct}% referral discount is ready</p>
              <p className="text-[12px] text-[#B45309]">It's applied automatically to your first paid plan below.</p>
            </div>
          </div>
        )}

        {/* Pending payment verification */}
        {pendingOrder && (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FFF7E6] border border-[#FDE68A] px-4 py-3.5">
            <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0"><Clock size={19} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#92400E]">Payment awaiting verification</p>
              <p className="text-[12px] text-[#B45309]">{pendingOrder.planName} · {inr(Number(pendingOrder.amount))} · ref {pendingOrder.reference}. Your plan activates once our team verifies it.</p>
            </div>
          </div>
        )}

        {/* Limited-time offer banner */}
        {offerActive && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7f1d1d] to-[#c2410c] px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><BadgePercent size={19} className="text-white" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Limited-time offer — extra {OFFER_PERCENT}% OFF</p>
              <p className="text-[12px] text-white/70">Applied automatically at checkout below. Don't miss it!</p>
            </div>
            <span className="text-[12px] font-bold text-white bg-white/15 rounded-lg px-2.5 py-1.5 tabular-nums shrink-0">{offerH}h {String(offerM).padStart(2, "0")}m left</span>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!isYearly ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>Monthly</span>
          <button onClick={() => setIsYearly(!isYearly)} className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isYearly ? "translate-x-7" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-medium ${isYearly ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>Yearly <span className="badge-green text-[10px] ml-1">Save more</span></span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(packages || []).map((plan, idx) => {
            const isCurrent = currentPkgId === plan.id;
            const Icon = PLAN_ICONS[idx % PLAN_ICONS.length];
            const base = Number(isYearly ? plan.yearlyPrice : plan.monthlyPrice);
            const isPaid = base > 0;
            // First paid plan → referral discount. Upgrade → credit the old amount.
            const isUpgrade = hasPaid && !isCurrent && isPaid;
            const discounted = dPct > 0 && isPaid ? Math.round(base * (1 - dPct / 100) * 100) / 100 : base;
            const payable = isUpgrade ? Math.max(0, Math.round((base - currentPaid) * 100) / 100) : discounted;
            const finalPrice = isPaid ? applyOffer(payable) : base; // limited-time offer on top
            const popular = idx === 1;

            return (
              <div key={plan.id} className={`bg-white rounded-2xl p-6 shadow-premium border-2 transition-all ${isCurrent ? "border-[#F7B31C]" : popular ? "border-[#F7B31C]/50" : "border-[#F1F5F9]"} card-hover relative`}>
                {popular && !isCurrent && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap">MOST POPULAR</span>}
                {isCurrent && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap">CURRENT PLAN</span>}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><Icon size={18} className="text-[#F7B31C]" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">{plan.name}</h3>
                    <p className="text-[11px] text-[#94A3B8]">{plan.description || "Digital card plan"}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A]">{inr(finalPrice)}</span>
                    {isPaid && finalPrice < base && <span className="text-sm text-[#94A3B8] line-through">{inr(base)}</span>}
                  </div>
                  <span className="text-sm text-[#94A3B8]">/{isYearly ? "mo, billed yearly" : "month"}</span>
                  <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                    {isUpgrade && <span className="text-[11px] font-semibold text-blue-600">−{inr(currentPaid)} adjusted</span>}
                    {dPct > 0 && isPaid && <span className="text-[11px] font-semibold text-emerald-600">−{dPct}% referral</span>}
                    {offerPct > 0 && isPaid && <span className="text-[11px] font-semibold text-red-600">−{offerPct}% offer</span>}
                  </span>
                </div>
                <div className="space-y-2.5 mb-6">
                  {featuresFor(plan).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]"><Check size={14} className="text-emerald-500 shrink-0" /> {f}</div>
                  ))}
                </div>
                <button
                  onClick={() => choose(plan.id, plan.name, finalPrice)}
                  disabled={isCurrent || !!pendingOrder}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isCurrent ? "bg-[#F1F5F9] text-[#94A3B8] cursor-default" : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98] disabled:opacity-50"}`}
                >
                  {isCurrent ? "Current Plan" : isPaid ? "Upgrade" : "Choose"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {payFor && (
        <PayModal
          plan={payFor} offerPct={offerPct} isYearly={isYearly}
          onClose={() => setPayFor(null)}
          onDone={() => { setPayFor(null); utils.payment.myOrders.invalidate(); }}
        />
      )}
    </ResponsiveDashboardLayout>
  );
}

/* ─── Manual payment modal (UPI QR / bank transfer + submit reference) ─── */
function PayModal({ plan, offerPct, isYearly, onClose, onDone }: {
  plan: { id: number; name: string; amount: number }; offerPct: number; isYearly: boolean;
  onClose: () => void; onDone: () => void;
}) {
  const { data: pay } = trpc.payment.instructions.useQuery();
  const createOrder = trpc.payment.createOrder.useMutation();
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState("");
  const copy = (t: string, k: string) => { navigator.clipboard.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1400); }); };
  const upiLink = pay?.upiId ? `upi://pay?pa=${encodeURIComponent(pay.upiId)}&pn=${encodeURIComponent(pay.upiName || "DigitalCarda")}&am=${plan.amount}&cu=INR` : "";
  const qrSrc = pay?.upiQr || (upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}` : "");

  const submit = async () => {
    if (reference.trim().length < 3) return toast.error("Enter your UPI/transaction reference (UTR)");
    try {
      await createOrder.mutateAsync({ packageId: plan.id, billingCycle: isYearly ? "yearly" : "monthly", method, reference: reference.trim(), wantsOffer: offerPct > 0 });
      toast.success("Payment submitted — we'll verify and activate your plan shortly");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not submit"); }
  };

  const Row = ({ label, value, k }: { label: string; value: string; k: string }) => (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-[#F1F5F9] last:border-0">
      <div className="min-w-0"><p className="text-[10px] text-[#94A3B8] uppercase tracking-wide">{label}</p><p className="text-[13px] font-semibold text-[#0F172A] truncate">{value || "—"}</p></div>
      {value && <button onClick={() => copy(value, k)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center shrink-0">{copied === k ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-[#64748B]" />}</button>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9] shrink-0">
          <div><p className="text-base font-bold text-[#0F172A]">Pay {inr(plan.amount)}</p><p className="text-[11px] text-[#94A3B8]">{plan.name} · {isYearly ? "Yearly" : "Monthly"}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>

        <div className="flex rounded-xl bg-[#F1F5F9] p-1 m-4 mb-0">
          {(["upi", "bank"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${method === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>{m === "upi" ? "UPI / QR" : "Bank Transfer"}</button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto">
          {method === "upi" ? (
            <div className="text-center">
              {qrSrc ? <img src={qrSrc} alt="UPI QR" className="w-44 h-44 mx-auto rounded-xl border border-[#F1F5F9] p-1.5" /> : <div className="w-44 h-44 mx-auto rounded-xl bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] text-xs">QR unavailable</div>}
              <p className="text-[11px] text-[#94A3B8] mt-2">Scan with any UPI app, or use the ID below</p>
              <div className="mt-3 rounded-xl border border-[#E2E8F0] px-3"><Row label="UPI ID" value={pay?.upiId || ""} k="upi" /></div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E2E8F0] px-3">
              <Row label="Account holder" value={pay?.bankHolder || ""} k="h" />
              <Row label="Account number" value={pay?.bankAccount || ""} k="a" />
              <Row label="IFSC" value={pay?.bankIfsc || ""} k="i" />
              <Row label="Bank" value={pay?.bankName || ""} k="b" />
            </div>
          )}

          {pay?.note && <p className="text-[11px] text-[#92400E] bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-lg p-2.5 mt-3 leading-relaxed">{pay.note}</p>}

          <div className="mt-4">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">After paying, enter your reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / UTR / txn ID" className="h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]" />
          </div>
        </div>

        <div className="p-4 border-t border-[#F1F5F9] shrink-0">
          <button onClick={submit} disabled={createOrder.isPending} className="w-full h-12 gradient-gold text-[#0F172A] rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-60">
            {createOrder.isPending ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : <><Check size={18} /> I've paid — submit for verification</>}
          </button>
          <p className="text-[11px] text-[#94A3B8] text-center mt-2">Your plan activates once our team verifies the payment.</p>
        </div>
      </div>
    </div>
  );
}
