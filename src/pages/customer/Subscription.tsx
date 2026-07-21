import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { Check, Zap, Package, ArrowRight, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const plans = [
  {
    name: "Starter", code: "starter", monthlyPrice: "9.99", yearlyPrice: "7.99",
    description: "Perfect for individuals",
    features: ["1 Digital Card", "Basic Blocks", "QR Code", "50 Leads/month", "Basic Analytics", "Email Support"],
    icon: Zap,
  },
  {
    name: "Professional", code: "professional", monthlyPrice: "19.99", yearlyPrice: "15.99",
    description: "Best for professionals",
    features: ["3 Digital Cards", "All Blocks", "Custom Domain", "200 Leads/month", "Advanced Analytics", "Priority Support", "AI Assistant"],
    icon: Package, popular: true,
  },
  {
    name: "Business", code: "business", monthlyPrice: "39.99", yearlyPrice: "31.99",
    description: "For teams & businesses",
    features: ["10 Digital Cards", "All Blocks", "Custom Domain", "Unlimited Leads", "Full Analytics", "24/7 Support", "AI Assistant", "Team Management"],
    icon: CreditCard,
  },
  {
    name: "Enterprise", code: "enterprise", monthlyPrice: "99.99", yearlyPrice: "79.99",
    description: "For large organizations",
    features: ["Unlimited Cards", "White-label", "API Access", "Unlimited Leads", "Custom Analytics", "Dedicated Support", "AI Assistant", "SSO", "SLA"],
    icon: Calendar,
  },
];

export default function CustomerSubscription() {
  const { data: subscription } = trpc.subscription.mySubscription.useQuery();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentPlanCode = subscription?.package?.code || "free";

  return (
    <DashboardLayout>
      <TopBar title="Subscription" subtitle="Manage your plan" />
      <div className="p-6 space-y-6">
        {/* Current Plan Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center">
              <Zap size={24} className="text-[#0F172A]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Current Plan</p>
              <p className="text-xl font-bold text-white">{subscription?.package?.name || "Free"}</p>
              {subscription?.expiresAt && (
                <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1">
                  <Calendar size={10} /> Renews on {new Date(subscription.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {currentPlanCode !== "free" && (
            <button className="h-10 px-5 border border-red-400/30 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all">
              Cancel Plan
            </button>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!isYearly ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isYearly ? "translate-x-7" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-medium ${isYearly ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
            Yearly <span className="badge-green text-[10px] ml-1">Save 20%</span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const Icon = plan.icon;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.code}
                className={`bg-white rounded-2xl p-6 shadow-premium border-2 transition-all ${
                  isCurrent ? "border-[#F7B31C]" : plan.popular ? "border-[#F7B31C]/50" : "border-[#F1F5F9]"
                } card-hover relative`}
              >
                {plan.popular && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap">MOST POPULAR</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap">CURRENT PLAN</span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                    <Icon size={18} className="text-[#F7B31C]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">{plan.name}</h3>
                    <p className="text-[11px] text-[#94A3B8]">{plan.description}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-[#0F172A]">${price}</span>
                  <span className="text-sm text-[#94A3B8]">/{isYearly ? "mo, billed yearly" : "month"}</span>
                </div>
                <div className="space-y-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check size={14} className="text-emerald-500 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedPlan(plan.code); toast.success(`${plan.name} plan selected!`); }}
                  disabled={isCurrent}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all ${
                    isCurrent
                      ? "bg-[#F1F5F9] text-[#94A3B8] cursor-default"
                      : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98]"
                  }`}
                >
                  {isCurrent ? "Current Plan" : selectedPlan === plan.code ? "Selected" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
