import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, Calendar, CreditCard, Gift, Loader2, BadgePercent, Copy, X, Clock, TicketPercent } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { getOfferExpiry, OFFER_PERCENT } from "@/lib/upgradeOffer";
import { useCustomer, DEFAULT_CUSTOMER, readAccountCustomer } from "@/hooks/useCustomer";
import { planFeatures, planRank, isFreePlan, type PlanPkg } from "@/lib/planFeatures";
import { openRazorpayCheckout } from "@/lib/razorpay";

const PLAN_ICONS = [Zap, Package, CreditCard, Calendar];
const TERM_LABEL: Record<"monthly" | "yearly" | "triennial", string> = { monthly: "Monthly", yearly: "Yearly", triennial: "3-Year" };
const inr = (v: number) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
/* Milliseconds from a date that may arrive as a Date (tRPC/superjson sends DB
   timestamps as Date objects) or as a "YYYY-MM-DD HH:MM:SS" string (card
   records). NaN when missing or unparseable. The old String(v).replace(" ", "T")
   turned every Date into NaN, which is why the page couldn't tell a member's
   term and showed "Current Plan" on every tab. */
const toMs = (v: unknown): number => {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" && v.trim()) return new Date(v.trim().replace(" ", "T")).getTime();
  return NaN;
};
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* The page body renders INSIDE the dashboard layout, which waits for the card
   record to load before showing its children — so every hook below reads the
   member's real card, never the first-render placeholder. */
type Term = "monthly" | "yearly" | "triennial";
type PayFor = { id: number; name: string; amount: number; cycle: Term };

export default function CustomerSubscription() {
  // Kept up here, outside the layout: crossing the mobile/desktop breakpoint
  // swaps layouts and remounts the body, which must not reset the tab or close
  // an open payment.
  const [cycle, setCycle] = useState<Term>("yearly");
  const cyclePinned = useRef(false);
  const [payFor, setPayFor] = useState<PayFor | null>(null);
  return (
    <ResponsiveDashboardLayout>
      <SubscriptionBody cycle={cycle} setCycle={setCycle} cyclePinned={cyclePinned} payFor={payFor} setPayFor={setPayFor} />
    </ResponsiveDashboardLayout>
  );
}

function SubscriptionBody({ cycle, setCycle, cyclePinned, payFor, setPayFor }: {
  cycle: Term; setCycle: (c: Term) => void; cyclePinned: { current: boolean };
  payFor: PayFor | null; setPayFor: (p: PayFor | null) => void;
}) {
  const utils = trpc.useUtils();
  const subQ = trpc.subscription.mySubscription.useQuery();
  const subscription = subQ.data;
  const { data: packages } = trpc.package.list.useQuery();
  const { data: customer } = useCustomer();
  const { data: discount } = trpc.referral.myDiscount.useQuery();
  // The plan is account-level: read it from the PRIMARY card's record (this body
  // mounts after hydration, so it's in storage). The active card is still used
  // for everything card-specific.
  const [accountRec] = useState(() => readAccountCustomer());
  const planRec = (accountRec ?? customer) as Record<string, unknown>;
  // (4) A self-signup trial has no subscriptions row — its clock is the trial record.
  const { data: trial } = trpc.trial.me.useQuery(undefined, { retry: false });
  const { data: orders } = trpc.payment.myOrders.useQuery();
  const pendingOrder = (orders || []).find((o) => o.status === "pending");

  const [now, setNow] = useState(() => Date.now());
  const [offerExp, setOfferExp] = useState<number>(0);
  useEffect(() => { setOfferExp(getOfferExpiry()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  // Legacy customers (migrated from the old site) have a real plan on their card
  // record (package_id: 5=Gold, 6=Platinum, 7=Trial — same ids as the packages
  // table) but no row in the new `subscriptions` table. Fall back to it so the
  // Subscription page shows the SAME plan as the Profile page instead of "Free".
  const legacyPkgId = Number(planRec?.package_id) || 0;
  const currentPkgId = subscription?.package?.id ?? (legacyPkgId || undefined);
  const currentPlan = (packages || []).find((p) => p.id === currentPkgId);
  const currentPlanName = subscription?.package?.name || currentPlan?.name || "Free";
  const currentPaid = Number(subscription?.amount) || 0;
  // Is the current plan past its validity? An expired member may pick ANY plan
  // (including a downgrade, e.g. Platinum → Gold) to re-subscribe.
  // A plan in the subscriptions table: the server has already decided (isActive).
  // A legacy card with no row: expired when its end date has passed.
  const onSignupTrial = !subscription && Number(currentPkgId) === 7 && !!trial
    && trial.status !== "not_started" && trial.status !== "converted";
  const expiryMs = subscription ? toMs(subscription.currentPeriodEnd)
    : onSignupTrial ? toMs(trial!.endsAt)
    : toMs(planRec?.expired_on);
  const planExpired = subscription
    // Server's verdict at fetch time, plus the clock — a plan that ends while the
    // page is open stops showing upgrade credit the server would no longer give.
    ? !subscription.isActive || !Number.isFinite(expiryMs) || expiryMs <= now
    : onSignupTrial
      ? trial!.status === "expired" || trial!.status === "grace" || trial!.status === "cancelled"
      : !!currentPkgId && Number.isFinite(expiryMs) && expiryMs < now;
  // Which billing TERM the member is actually on. For a plan in the
  // subscriptions table the server sends it (`term`: the stored billing cycle —
  // set by the payment or by the admin's Change Package). Only a legacy card with
  // no subscriptions row falls back to guessing from its validity span.
  const userCycle = ((): "monthly" | "yearly" | "triennial" | null => {
    if (!currentPkgId || planExpired) return null;
    if (subscription) return subscription.term ?? null;
    if (Number(currentPkgId) === 7) return "monthly"; // the free trial is a 30-day term
    const start = toMs(planRec?.activated_on), end = toMs(planRec?.expired_on);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const days = (end - start) / 86_400_000;
    if (days < 62) return "monthly";
    if (days < 550) return "yearly"; // up to ~18 months counts as yearly
    return "triennial";
  })();
  // Open the page on the member's actual term, so the first thing they see is
  // the plan they're on. Waits for real data: the subscription must have loaded,
  // and a member without one needs their real card record (the first render
  // holds the demo placeholder). Once snapped — or once they click a tab — it
  // stays put.
  const dataReady = subQ.isFetchedAfterMount && subQ.isSuccess && (!!subscription || customer !== DEFAULT_CUSTOMER);
  useEffect(() => {
    if (cyclePinned.current || !dataReady || !userCycle) return;
    setCycle(userCycle);
    cyclePinned.current = true;
  }, [dataReady, userCycle]);
  // Don't offer a downgrade to an ACTIVE member (current + higher tiers only) —
  // but once expired, show every plan so they can renew or switch down.
  const currentRank = currentPlan && !planExpired ? planRank(currentPlan as unknown as PlanPkg) : -1;
  // The free trial is a first-time offer for NEW users only — never re-show it to
  // anyone who has already been on a paid plan (active OR expired).
  const hasHadPaidPlan = [5, 6].includes(Number(currentPkgId)) || (Number(currentPkgId) === 7 && planExpired);
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

  // A coupon link (/dashboard/subscription?coupon=CODE) from an offer popup.
  const [urlCoupon] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("coupon")));

  // Pick a plan → open the pay modal. The term is captured with the price, and
  // choosing pins the tab, so nothing can switch the term under an open payment.
  const choose = (packageId: number, name: string, amount: number) => {
    cyclePinned.current = true;
    setPayFor({ id: packageId, name, amount, cycle });
  };

  return (
    <>
      <div className="hidden md:block"><TopBar title="Subscription" subtitle="Manage your plan" /></div>
      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center"><Zap size={24} className="text-[#0F172A]" /></div>
            <div>
              <p className="text-xs text-[#94A3B8]">Current Plan</p>
              <p className="text-xl font-bold text-white">
                {currentPlanName}{planExpired ? " (expired)" : userCycle ? <span className="text-[#F7B31C]"> · {TERM_LABEL[userCycle]}</span> : null}
              </p>
              {planExpired && Number.isFinite(expiryMs) ? (
                <p className="text-xs text-[#FCA5A5] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Expired on {fmtDay(expiryMs)} — choose a plan below to reactivate</p>
              ) : !planExpired && Number.isFinite(expiryMs) ? (
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1"><Calendar size={10} /> Valid till {fmtDay(expiryMs)}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Arrived from an offer popup with a coupon link */}
        {urlCoupon && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] px-4 py-3">
            <span className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center shrink-0"><TicketPercent size={18} className="text-[#16A34A]" /></span>
            <div>
              <p className="text-sm font-bold text-[#166534]">Coupon {urlCoupon.toUpperCase()} is ready</p>
              <p className="text-[12px] text-[#15803D]">Pick a plan — it's applied at checkout if it's valid for that plan.</p>
            </div>
          </div>
        )}

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
              { id: "monthly", label: "Monthly", badge: undefined },
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
            // "Current" is the member's plan on the term they're ACTUALLY on —
            // one card, one tab. Their plan under another term is disabled with a
            // note (never a "Choose" that would sell them a shorter term). If the
            // term genuinely can't be known, no tab claims it: the card just says
            // "Your plan" and the banner above names the plan and its validity.
            const isOwnPlan = currentPkgId === plan.id && !planExpired;
            const isCurrent = isOwnPlan && userCycle !== null && cycle === userCycle;
            const isOwnOtherTerm = isOwnPlan && userCycle !== null && cycle !== userCycle;
            const ownTermUnknown = isOwnPlan && userCycle === null;
            const Icon = PLAN_ICONS[idx % PLAN_ICONS.length];
            const base = Number(cycle === "triennial" ? plan.threeYearPrice : cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
            const isPaid = base > 0;
            // First paid plan → referral discount. Upgrade → credit the old amount.
            const isUpgrade = hasPaid && !planExpired && !isOwnPlan && isPaid;
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
                  disabled={isOwnPlan || !!pendingOrder}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isOwnPlan ? "bg-[#F1F5F9] text-[#94A3B8] cursor-default" : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98] disabled:opacity-50"}`}
                >
                  {isCurrent ? "Current Plan" : isOwnOtherTerm ? `On your ${TERM_LABEL[userCycle!]} plan` : ownTermUnknown ? "Your plan" : isPaid ? "Upgrade" : "Choose"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AddonsSection cycle={userCycle === "monthly" ? "monthly" : "yearly"} />

      {payFor && (
        <PayModal
          plan={payFor} offerPct={offerPct} cycle={payFor.cycle}
          onClose={() => setPayFor(null)}
          onDone={() => { setPayFor(null); utils.payment.myOrders.invalidate(); utils.subscription.mySubscription.invalidate(); }}
        />
      )}
    </>
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

  // ─── Coupon (plans only). The server checks it and returns the exact amount. ───
  const checkCoupon = trpc.payment.checkCoupon.useMutation();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; amount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const amount = coupon ? coupon.amount : plan.amount;

  const applyCoupon = async (raw?: string) => {
    const code = (raw ?? couponInput).trim();
    if (!code) return;
    setCouponError("");
    try {
      const r = await checkCoupon.mutateAsync({ packageId: plan.id, billingCycle: cycle, wantsOffer: offerPct > 0, couponCode: code });
      if (r.valid) {
        setCoupon({ code: r.code, discount: r.discount, amount: r.amount });
        setCouponInput(r.code);
        toast.success(`Coupon ${r.code} applied — you save ${inr(r.discount)}`);
      } else {
        setCoupon(null);
        setCouponError(r.reason);
      }
    } catch (e) {
      setCoupon(null);
      setCouponError(e instanceof Error ? e.message : "Couldn't check this coupon.");
    }
  };

  // Came from an offer popup with ?coupon=CODE → apply it straight away.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("coupon");
    if (fromUrl) { setCouponInput(fromUrl.toUpperCase()); void applyCoupon(fromUrl); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payWithRazorpay = async () => {
    setRzpBusy(true);
    try {
      const order = await rzpCreate.mutateAsync({ packageId: plan.id, billingCycle: cycle, wantsOffer: offerPct > 0, couponCode: coupon?.code });
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
  const upiLink = pay?.upiId ? `upi://pay?pa=${encodeURIComponent(pay.upiId)}&pn=${encodeURIComponent(pay.upiName || "DigitalCarda")}&am=${amount}&cu=INR` : "";
  const qrSrc = pay?.upiQr || (upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}` : "");

  const submit = async () => {
    if (reference.trim().length < 3) return toast.error("Enter your UPI/transaction reference (UTR)");
    try {
      await createOrder.mutateAsync({ packageId: plan.id, billingCycle: cycle, method, reference: reference.trim(), wantsOffer: offerPct > 0, couponCode: coupon?.code });
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
          <div><p className="text-base font-bold text-[#0F172A]">Pay {inr(amount)}</p><p className="text-[11px] text-[#94A3B8]">{plan.name} · {cycleLabel}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>

        {/* Coupon — valid on plans only, never on add-ons */}
        <div className="px-4 pt-4">
          {coupon ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5">
              <TicketPercent size={18} className="shrink-0 text-[#16A34A]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#166534]">{coupon.code} applied</p>
                <p className="text-[11.5px] text-[#15803D]">You save {inr(coupon.discount)} · was {inr(plan.amount)}</p>
              </div>
              <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} className="text-[12px] font-semibold text-[#166534] hover:underline">Remove</button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <TicketPercent size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") void applyCoupon(); }}
                    placeholder="Have a coupon code?" aria-label="Coupon code"
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-[13px] font-semibold uppercase tracking-wide outline-none focus:border-[#F7B31C]" />
                </div>
                <button type="button" onClick={() => void applyCoupon()} disabled={!couponInput.trim() || checkCoupon.isPending}
                  className="h-10 min-w-[72px] rounded-xl bg-[#0F172A] px-4 text-[13px] font-bold text-white disabled:opacity-50">
                  {checkCoupon.isPending ? <Loader2 size={15} className="mx-auto animate-spin" /> : "Apply"}
                </button>
              </div>
              {couponError && <p className="mt-1.5 text-[12px] font-medium text-[#DC2626]">{couponError}</p>}
            </div>
          )}
        </div>

        {/* Instant online checkout (Razorpay) — card / UPI / netbanking in one modal */}
        {rzpCfg.data?.enabled && (
          <div className="px-4 pt-4">
            <button onClick={payWithRazorpay} disabled={rzpBusy}
              className="w-full h-12 rounded-2xl bg-[#0F172A] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#1E293B] active:scale-[0.99] disabled:opacity-60">
              {rzpBusy
                ? <><Loader2 size={18} className="animate-spin" /> Opening secure checkout…</>
                : <><Zap size={18} className="text-[#F7B31C]" /> Pay {inr(amount)} instantly</>}
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
