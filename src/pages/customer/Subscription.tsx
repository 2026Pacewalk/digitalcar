import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, Calendar, CreditCard, Gift, Loader2, BadgePercent, Copy, X, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { getOfferExpiry, OFFER_PERCENT } from "@/lib/upgradeOffer";
import { useCustomer } from "@/hooks/useCustomer";
import { planFeatures, planRank, type PlanPkg } from "@/lib/planFeatures";

const PLAN_ICONS = [Zap, Package, CreditCard, Calendar];
const inr = (v: number) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function CustomerSubscription() {
  const utils = trpc.useUtils();
  const { data: subscription } = trpc.subscription.mySubscription.useQuery();
  const { data: packages } = trpc.package.list.useQuery();
  const { data: customer } = useCustomer();
  const { data: discount } = trpc.referral.myDiscount.useQuery();
  const { data: orders } = trpc.payment.myOrders.useQuery();
  const pendingOrder = (orders || []).find((o) => o.status === "pending");

  const [cycle, setCycle] = useState<"monthly" | "yearly" | "triennial">("yearly");
  const isYearly = cycle !== "monthly"; // "billed yearly+"-style copy for any multi-month term
  const [now, setNow] = useState(() => Date.now());
  const [offerExp, setOfferExp] = useState<number>(0);
  useEffect(() => { setOfferExp(getOfferExpiry()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  // Legacy customers (migrated from the old site) have a real plan on their card
  // record (package_id: 5=Gold, 6=Platinum, 7=Trial — same ids as the packages
  // table) but no row in the new `subscriptions` table. Fall back to it so the
  // Subscription page shows the SAME plan as the Profile page instead of "Free".
  const legacyPkgId = Number(customer?.package_id) || 0;
  const currentPkgId = subscription?.package?.id ?? (legacyPkgId || undefined);
  const currentPlan = (packages || []).find((p) => p.id === currentPkgId);
  const currentPlanName = subscription?.package?.name || currentPlan?.name || "Free";
  const currentPaid = Number(subscription?.amount) || 0;
  // Is the current plan past its validity? An expired member may pick ANY plan
  // (including a downgrade, e.g. Platinum → Gold) to re-subscribe.
  const expiryRaw = subscription?.currentPeriodEnd || (customer?.expired_on as string | undefined);
  const planExpired = !!currentPkgId && !!expiryRaw &&
    new Date(String(expiryRaw).replace(" ", "T")).getTime() < Date.now();
  // Don't offer a downgrade to an ACTIVE member (current + higher tiers only) —
  // but once expired, show every plan so they can renew or switch down.
  const currentRank = currentPlan && !planExpired ? planRank(currentPlan as unknown as PlanPkg) : -1;
  const visiblePackages = (packages || []).filter((p) => planRank(p as unknown as PlanPkg) >= currentRank);
  // An active top-tier (Platinum) member has nothing to buy, so a "buy now"
  // discount is irrelevant to them — show an appropriate message instead.
  const topPlanActive = currentPkgId === 6 && !planExpired;
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
      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center"><Zap size={24} className="text-[#0F172A]" /></div>
            <div>
              <p className="text-xs text-[#94A3B8]">Current Plan</p>
              <p className="text-xl font-bold text-white">{currentPlanName}{planExpired ? " (expired)" : ""}</p>
              {planExpired ? (
                <p className="text-xs text-[#FCA5A5] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Expired on {new Date(String(expiryRaw).replace(" ", "T")).toLocaleDateString()} — choose a plan below to reactivate</p>
              ) : subscription?.currentPeriodEnd ? (
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
              ) : customer?.expired_on ? (
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Valid till {new Date(String(customer.expired_on)).toLocaleDateString()}</p>
              ) : null}
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

        {/* Limited-time discount — only for members who can actually buy (a first
            purchase, an upgrade, or a renewal). Not shown to an active Platinum
            member, who has nothing to purchase. */}
        {offerActive && !topPlanActive && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7f1d1d] to-[#c2410c] px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><BadgePercent size={19} className="text-white" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Limited-time offer — extra {OFFER_PERCENT}% OFF</p>
              <p className="text-[12px] text-white/70">Applied automatically at checkout below. Don't miss it!</p>
            </div>
            <span className="text-[12px] font-bold text-white bg-white/15 rounded-lg px-2.5 py-1.5 tabular-nums shrink-0">{offerH}h {String(offerM).padStart(2, "0")}m left</span>
          </div>
        )}

        {/* Active top-tier member — celebrate instead of up-selling a discount. */}
        {topPlanActive && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#334155] px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0"><Check size={19} className="text-[#0F172A]" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">You're on Platinum — our top plan 🎉</p>
              <p className="text-[12px] text-white/70">Everything's unlocked. Enjoy free custom-domain setup on the 3-Year plan.</p>
            </div>
            <Link to="/dashboard/domain" className="text-[12px] font-bold text-[#0F172A] bg-white rounded-lg px-3 py-1.5 shrink-0 hover:bg-[#F1F5F9]">Custom domain</Link>
          </div>
        )}

        {/* Billing Toggle — Monthly · Yearly · 3 Years */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white ring-1 ring-[#E2E8F0] shadow-premium">
            {([
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly", badge: "Save more" },
              { id: "triennial", label: "3 Years", badge: "Best value" },
            ] as const).map((c) => (
              <button key={c.id} onClick={() => setCycle(c.id)}
                className={`relative px-4 sm:px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${cycle === c.id ? "gradient-gold text-[#0F172A] shadow-gold" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                {c.label}
                {c.badge && <span className={`ml-1.5 hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cycle === c.id ? "bg-[#0F172A]/10 text-[#0F172A]" : "bg-[#DCFCE7] text-[#166534]"}`}>{c.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {visiblePackages.map((plan, idx) => {
            const isCurrent = currentPkgId === plan.id && !planExpired;
            const Icon = PLAN_ICONS[idx % PLAN_ICONS.length];
            const base = Number(cycle === "triennial" ? plan.threeYearPrice : cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
            const isPaid = base > 0;
            // First paid plan → referral discount. Upgrade → credit the old amount.
            const isUpgrade = hasPaid && !isCurrent && isPaid;
            const discounted = dPct > 0 && isPaid ? Math.round(base * (1 - dPct / 100) * 100) / 100 : base;
            const payable = isUpgrade ? Math.max(0, Math.round((base - currentPaid) * 100) / 100) : discounted;
            const finalPrice = isPaid ? applyOffer(payable) : base; // limited-time offer on top
            const popular = plan.name === "Gold";

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
                  <span className="text-sm text-[#94A3B8]">{cycle === "triennial" ? " for 3 years" : cycle === "yearly" ? " / year" : " / month"}</span>
                  <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                    {isUpgrade && <span className="text-[11px] font-semibold text-blue-600">−{inr(currentPaid)} adjusted</span>}
                    {dPct > 0 && isPaid && <span className="text-[11px] font-semibold text-emerald-600">−{dPct}% referral</span>}
                    {offerPct > 0 && isPaid && <span className="text-[11px] font-semibold text-red-600">−{offerPct}% offer</span>}
                  </span>
                </div>
                <div className="space-y-2.5 mb-6">
                  {planFeatures(plan as unknown as PlanPkg).map((f, i) => (
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
          plan={payFor} offerPct={offerPct} cycle={cycle}
          onClose={() => setPayFor(null)}
          onDone={() => { setPayFor(null); utils.payment.myOrders.invalidate(); }}
        />
      )}
    </ResponsiveDashboardLayout>
  );
}

/* ─── Manual payment modal (UPI QR / bank transfer + submit reference) ─── */
function PayModal({ plan, offerPct, cycle, onClose, onDone }: {
  plan: { id: number; name: string; amount: number }; offerPct: number; cycle: "monthly" | "yearly" | "triennial";
  onClose: () => void; onDone: () => void;
}) {
  const cycleLabel = cycle === "triennial" ? "3 Years" : cycle === "yearly" ? "Yearly" : "Monthly";
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
      await createOrder.mutateAsync({ packageId: plan.id, billingCycle: cycle, method, reference: reference.trim(), wantsOffer: offerPct > 0 });
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
          <div><p className="text-base font-bold text-[#0F172A]">Pay {inr(plan.amount)}</p><p className="text-[11px] text-[#94A3B8]">{plan.name} · {cycleLabel}</p></div>
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
