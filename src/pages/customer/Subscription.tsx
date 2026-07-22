import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, Calendar, CreditCard, Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const subscribeMut = trpc.subscription.subscribe.useMutation();

  const [isYearly, setIsYearly] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const currentPkgId = subscription?.package?.id;
  const currentPaid = Number(subscription?.amount) || 0;
  const hasPaid = currentPaid > 0;
  // Referral discount only applies to the first paid plan (never on later upgrades).
  const dPct = discount?.eligible && !hasPaid ? discount.percent : 0;

  const choose = async (packageId: number, name: string) => {
    setBusyId(packageId);
    try {
      const res = await subscribeMut.mutateAsync({ packageId, billingCycle: isYearly ? "yearly" : "monthly", paymentMethod: "razorpay" });
      if (res.isUpgrade) {
        toast.success(`Upgraded to ${name} — ${inr(res.adjustment)} adjusted, you pay ${inr(res.charged)}`);
      } else if (res.discountPercent > 0) {
        toast.success(`${name} activated with ${res.discountPercent}% referral discount — you pay ${inr(res.charged)}`);
      } else {
        toast.success(`${name} plan activated!`);
      }
      utils.subscription.mySubscription.invalidate();
      utils.referral.myDiscount.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete upgrade");
    } finally {
      setBusyId(null);
    }
  };

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
            const popular = idx === 1;
            const busy = busyId === plan.id;

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
                  {isUpgrade ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0F172A]">{inr(payable)}</span>
                      <span className="text-sm text-[#94A3B8] line-through">{inr(base)}</span>
                    </div>
                  ) : dPct > 0 && isPaid ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#0F172A]">{inr(discounted)}</span>
                      <span className="text-sm text-[#94A3B8] line-through">{inr(base)}</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-[#0F172A]">{inr(base)}</span>
                  )}
                  <span className="text-sm text-[#94A3B8]">/{isYearly ? "mo, billed yearly" : "month"}</span>
                  {isUpgrade
                    ? <span className="ml-2 text-[11px] font-semibold text-blue-600">−{inr(currentPaid)} adjusted</span>
                    : dPct > 0 && isPaid && <span className="ml-2 text-[11px] font-semibold text-emerald-600">−{dPct}% referral</span>}
                </div>
                <div className="space-y-2.5 mb-6">
                  {featuresFor(plan).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]"><Check size={14} className="text-emerald-500 shrink-0" /> {f}</div>
                  ))}
                </div>
                <button
                  onClick={() => choose(plan.id, plan.name)}
                  disabled={isCurrent || busy}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isCurrent ? "bg-[#F1F5F9] text-[#94A3B8] cursor-default" : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98] disabled:opacity-60"}`}
                >
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : isCurrent ? "Current Plan" : isPaid ? "Upgrade" : "Choose"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
