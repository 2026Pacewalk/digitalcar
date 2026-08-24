import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, Calendar, CreditCard, Gift, Loader2, BadgePercent, Copy, X, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { getOfferExpiry, OFFER_PERCENT } from "@/lib/upgradeOffer";
import { useCustomer } from "@/hooks/useCustomer";
import { planFeatures, planRank, isFreePlan, type PlanPkg } from "@/lib/planFeatures";
import { openRazorpayCheckout } from "@/lib/razorpay";

const PLAN_ICONS = [Zap, Package, CreditCard, Calendar];
const TERM_LABEL: Record<"monthly" | "yearly" | "triennial", string> = { monthly: "Monthly", yearly: "Yearly", triennial: "3-Year" };
const inr = (v: number) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");

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
  // Which billing TERM the member is actually on — derived from their validity
  // span (subscriptions don't expose it, legacy cards have none). So "Current
  // Plan" only shows under the matching term (e.g. 3 Years, not also Yearly).
  const userCycle = ((): "monthly" | "yearly" | "triennial" | null => {
    if (!currentPkgId || planExpired) return null;
    const sub = subscription as { currentPeriodStart?: string; currentPeriodEnd?: string } | undefined;
    const parse = (v?: string | null) => { const t = v ? new Date(String(v).replace(" ", "T")).getTime() : NaN; return Number.isFinite(t) ? t : NaN; };
    const start = parse(sub?.currentPeriodStart ?? (customer?.activated_on as string | undefined));
    const end = parse(sub?.currentPeriodEnd ?? (customer?.expired_on as string | undefined));
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const days = (end - start) / 86_400_000;
    if (days < 62) return "monthly";
    if (days < 550) return "yearly"; // up to ~18 months counts as yearly
    return "triennial";
  })();
  // Open the page on the member's actual term (once known, unless they toggled).
  const cyclePinned = useRef(false);
  useEffect(() => { if (!cyclePinned.current && userCycle) { setCycle(userCycle); cyclePinned.current = true; } }, [userCycle]);
  // Don't offer a downgrade to an ACTIVE member (current + higher tiers only) —
  // but once expired, show every plan so they can renew or switch down.
  const currentRank = currentPlan && !planExpired ? planRank(currentPlan as unknown as PlanPkg) : -1;
  // The free trial is a first-time offer for NEW users only — never re-show it to
  // anyone who has already been on a paid plan (active OR expired).
  const hasHadPaidPlan = [5, 6].includes(Number(currentPkgId));
  const visiblePackages = (packages || []).filter((p) => {
    const pp = p as unknown as PlanPkg;
    if (planRank(pp) < currentRank) return false; // no downgrade for an active member
    if (isFreePlan(pp) && hasHadPaidPlan) return false; // trial is first-time-only
    return true;
  });
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
              <button key={c.id} onClick={() => { cyclePinned.current = true; setCycle(c.id); }}
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
            // Only the member's ACTUAL plan+term is "current" — so Platinum 3-Year
            // isn't also flagged current under the Yearly tab. Their own plan shown
            // on a different term is disabled with a note (never a "Choose" that
            // would sell them a shorter term).
            const isOwnPlan = currentPkgId === plan.id && !planExpired;
            const isCurrent = isOwnPlan && (!userCycle || cycle === userCycle);
            const isOwnOtherTerm = isOwnPlan && !isCurrent;
            const Icon = PLAN_ICONS[idx % PLAN_ICONS.length];
            const base = Number(cycle === "triennial" ? plan.threeYearPrice : cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
            const isPaid = base > 0;
            // First paid plan → referral discount. Upgrade → credit the old amount.
            const isUpgrade = hasPaid && !isCurrent && isPaid;
            const discounted = dPct > 0 && isPaid ? Math.round(base * (1 - dPct / 100) * 100) / 100 : base;
            const payable = isUpgrade ? Math.max(0, Math.round((base - currentPaid) * 100) / 100) : discounted;
            const finalPrice = Math.round(isPaid ? applyOffer(payable) : base); // whole rupees
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
                  disabled={isCurrent || isOwnOtherTerm || !!pendingOrder}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isCurrent || isOwnOtherTerm ? "bg-[#F1F5F9] text-[#94A3B8] cursor-default" : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98] disabled:opacity-50"}`}
                >
                  {isCurrent ? "Current Plan" : isOwnOtherTerm ? `On your ${TERM_LABEL[userCycle!]} plan` : isPaid ? "Upgrade" : "Choose"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AddonsSection cycle={userCycle === "monthly" ? "monthly" : "yearly"} />

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

/* ─── Add-on cards (ID Card + Membership Card) — bought on top of the plan ─── */
function AddonsSection({ cycle }: { cycle: "monthly" | "yearly" }) {
  const { data: pricing } = trpc.addon.pricing.useQuery();
  const { data: mine } = trpc.addon.mine.useQuery();
  const rzpCfg = trpc.payment.razorpayConfig.useQuery();
  const create = trpc.addon.razorpayCreateOrder.useMutation();
  const verify = trpc.addon.razorpayVerify.useMutation();
  const utils = trpc.useUtils();
  const { data: customer } = useCustomer();
  const [busy, setBusy] = useState<string>("");

  if (!pricing) return null;
  const owned = new Set((mine ?? []).map((a) => a.type));
  const price = cycle === "monthly" ? pricing.monthly : pricing.yearly;
  const suffix = cycle === "monthly" ? "/mo" : "/yr";
  const money = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const buy = async (type: "id_card" | "membership", name: string) => {
    setBusy(type);
    try {
      const order = await create.mutateAsync({ type, billingCycle: cycle });
      await openRazorpayCheckout({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: "DigitalCarda", description: `${order.name} · ${cycle === "monthly" ? "Monthly" : "Yearly"}`,
        order_id: order.orderId,
        prefill: { name: String(customer?.name || ""), email: String(customer?.email || ""), contact: String(customer?.mobile1 || "") },
        theme: { color: "#F7B31C" },
        handler: async (resp) => {
          try {
            await verify.mutateAsync({ razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature, type, billingCycle: cycle });
            toast.success(`${name} added to your plan 🎉`);
            utils.addon.mine.invalidate();
          } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't verify the payment."); }
          finally { setBusy(""); }
        },
      });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not start the payment."); setBusy(""); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">Add-on cards</h3>
          <p className="text-[12px] text-[#64748B] mt-0.5">Add these to your plan — <span className="font-semibold text-[#0F172A]">{money(price)}{suffix}</span> each. Unlock ID & membership card designs for your team.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pricing.addons.map((a) => {
            const has = owned.has(a.type);
            return (
              <div key={a.type} className={`rounded-2xl border p-4 flex flex-col ${has ? "border-emerald-300 bg-emerald-50/40" : "border-[#E2E8F0]"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#0F172A]">{a.name}</p>
                  <span className="text-[15px] font-extrabold text-[#0F172A]">{money(price)}<span className="text-[11px] font-medium text-[#94A3B8]">{suffix}</span></span>
                </div>
                <p className="text-[12px] text-[#64748B] mt-1 mb-3 flex-1">{a.desc}</p>
                {has ? (
                  <span className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold"><Check size={15} /> Added to your plan</span>
                ) : (
                  <>
                    <button onClick={() => buy(a.type, a.name)} disabled={busy === a.type || !rzpCfg.data?.enabled}
                      className="h-10 rounded-xl gradient-gold text-[#0F172A] text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-50">
                      {busy === a.type ? "Opening…" : "Add to my plan"}
                    </button>
                    {!rzpCfg.data?.enabled && <p className="text-[10px] text-[#94A3B8] mt-1.5 text-center">Online payments are being set up.</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-3">Billed on the same cycle as your plan. On a monthly plan the yearly ₹{pricing.yearly} is split across 12 months.</p>
      </div>
    </div>
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

  // ─── Razorpay instant checkout (shown only when the gateway is configured) ───
  const rzpCfg = trpc.payment.razorpayConfig.useQuery();
  const rzpCreate = trpc.payment.razorpayCreateOrder.useMutation();
  const rzpVerify = trpc.payment.razorpayVerify.useMutation();
  const { data: customer } = useCustomer();
  const [rzpBusy, setRzpBusy] = useState(false);

  const payWithRazorpay = async () => {
    setRzpBusy(true);
    try {
      const order = await rzpCreate.mutateAsync({ packageId: plan.id, billingCycle: cycle, wantsOffer: offerPct > 0 });
      const rzp = await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "DigitalCarda",
        description: `${plan.name} · ${cycleLabel}`,
        order_id: order.orderId,
        prefill: {
          name: String(customer?.name || ""),
          email: String(customer?.email || ""),
          contact: String(customer?.mobile1 || ""),
        },
        theme: { color: "#F7B31C" },
        // Razorpay calls this after a successful payment — verify the signature
        // server-side before treating the plan as paid.
        handler: async (resp) => {
          try {
            await rzpVerify.mutateAsync({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
              packageId: plan.id,
              billingCycle: cycle,
              wantsOffer: offerPct > 0,
            });
            toast.success("Payment successful — your plan is now active 🎉");
            onDone();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "We couldn't verify the payment. If you were charged, contact support.");
          } finally {
            setRzpBusy(false);
          }
        },
        modal: { ondismiss: () => { setRzpBusy(false); toast("Payment cancelled"); } },
      });
      rzp.on("payment.failed", (r) => {
        setRzpBusy(false);
        toast.error(r?.error?.description || "Payment failed. Please try another method.");
      });
    } catch (e) {
      setRzpBusy(false);
      toast.error(e instanceof Error ? e.message : "Could not start the payment");
    }
  };
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

        {/* Instant online checkout (Razorpay) — card / UPI / netbanking in one modal */}
        {rzpCfg.data?.enabled && (
          <div className="px-4 pt-4">
            <button onClick={payWithRazorpay} disabled={rzpBusy}
              className="w-full h-12 rounded-2xl bg-[#0F172A] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#1E293B] active:scale-[0.99] disabled:opacity-60">
              {rzpBusy
                ? <><Loader2 size={18} className="animate-spin" /> Opening secure checkout…</>
                : <><Zap size={18} className="text-[#F7B31C]" /> Pay {inr(plan.amount)} instantly</>}
            </button>
            <p className="text-[11px] text-[#94A3B8] text-center mt-1.5">Card · UPI · Netbanking · Wallets — activated instantly</p>
            <div className="flex items-center gap-3 my-3">
              <div className="h-px flex-1 bg-[#E2E8F0]" />
              <span className="text-[11px] text-[#94A3B8]">or pay manually</span>
              <div className="h-px flex-1 bg-[#E2E8F0]" />
            </div>
          </div>
        )}

        <div className="flex rounded-xl bg-[#F1F5F9] p-1 m-4 mb-0 mt-0">
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
