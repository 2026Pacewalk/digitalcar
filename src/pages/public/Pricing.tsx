import { Check, ArrowRight, HelpCircle, Sparkles, Zap, Crown, IdCard, QrCode, Images, Tag, MessageSquare, Globe, Star } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";

/* ── Billing periods ──────────────────────────────────────────── */
type Period = "monthly" | "yearly" | "3year";
const PERIODS: { id: Period; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly", badge: "Save 16%" },
  { id: "3year", label: "3 Years", badge: "Best value" },
];

/* ── Plans (prices in ₹) ──────────────────────────────────────── */
type Plan = {
  name: string; tagline: string; icon: typeof IdCard; accent: string; popular?: boolean;
  price: Record<Period, number>;
  cta: string;
  headline: string;                 // what the feature list is "on top of"
  features: { icon?: typeof Check; text: string }[];
};

const PLANS: Plan[] = [
  {
    name: "Free Trial", tagline: "Test-drive the full card", icon: Sparkles, accent: "#14B8A6",
    price: { monthly: 0, yearly: 0, "3year": 0 },
    cta: "Start Free Trial",
    headline: "Everything, free for 30 days:",
    features: [
      { icon: Zap, text: "Your live digital card in minutes" },
      { icon: Crown, text: "All premium features unlocked" },
      { icon: QrCode, text: "Custom QR code + shareable link" },
      { icon: MessageSquare, text: "Call, WhatsApp & Save-Contact buttons" },
      { icon: Check, text: "No credit card required" },
    ],
  },
  {
    name: "Gold", tagline: "Everything a business needs", icon: Star, accent: "#F7B31C", popular: true,
    price: { monthly: 99, yearly: 999, "3year": 2499 },
    cta: "Get Gold",
    headline: "Your professional digital card:",
    features: [
      { icon: IdCard, text: "1 digital card + personal link & QR" },
      { icon: Tag, text: "Up to 25 products / services" },
      { icon: Images, text: "20-photo gallery + 8 videos" },
      { icon: Tag, text: "Up to 15 offers & deals" },
      { icon: MessageSquare, text: "Enquiry form — capture every lead" },
      { icon: Star, text: "Google reviews on your card" },
      { icon: Crown, text: "All 31 designs + link-in-bio styles" },
      { icon: Check, text: "UPI / payment + bank details" },
      { icon: Check, text: "Visit & tap analytics" },
    ],
  },
  {
    name: "Platinum", tagline: "For brands that want it all", icon: Crown, accent: "#8B5CF6",
    price: { monthly: 199, yearly: 1999, "3year": 4999 },
    cta: "Go Platinum",
    headline: "Everything in Gold, plus:",
    features: [
      { icon: IdCard, text: "Up to 3 digital cards" },
      { icon: Tag, text: "Unlimited products & offers" },
      { icon: Images, text: "60-photo gallery + 25 videos" },
      { icon: Globe, text: "Custom domain (yourbrand.com)" },
      { icon: Crown, text: "Remove DigitalCarda branding" },
      { icon: Sparkles, text: "AI writes your card content" },
      { icon: Globe, text: "Multi-language card" },
      { icon: Zap, text: "Advanced analytics + export" },
      { icon: Star, text: "Full SEO controls + priority support" },
    ],
  },
];

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
/* Effective per-month + savings vs paying monthly */
const perMonth = (p: Plan, period: Period) =>
  period === "monthly" ? p.price.monthly : period === "yearly" ? Math.round(p.price.yearly / 12) : Math.round(p.price["3year"] / 36);
const savingsPct = (p: Plan, period: Period) => {
  if (period === "monthly" || p.price.monthly === 0) return 0;
  const months = period === "yearly" ? 12 : 36;
  const full = p.price.monthly * months;
  const paid = period === "yearly" ? p.price.yearly : p.price["3year"];
  return Math.round(((full - paid) / full) * 100);
};
const periodLabel = (period: Period) => (period === "monthly" ? "/mo" : period === "yearly" ? "/yr" : "/ 3 yrs");

const faqs = [
  { q: "What happens after the 30-day free trial?", a: "You get the full card — every premium feature — free for 30 days, no credit card needed. When it ends, simply pick a plan to keep your card live. Nothing is charged automatically." },
  { q: "What's the difference between Monthly, Yearly and 3-Year?", a: "Same card, cheaper the longer you commit. Yearly saves ~16% (about 2 months free) over monthly, and the 3-Year plan works out to just ₹69/month for Gold — our best value." },
  { q: "Can I upgrade from Gold to Platinum later?", a: "Yes, anytime. Your card, link and QR stay exactly the same — you just unlock more features and higher limits instantly. The difference is prorated." },
  { q: "What payment methods do you accept?", a: "UPI, credit/debit cards, net banking, Paytm and GPay. For yearly and 3-year plans you pay once and you're set." },
  { q: "Do I need to buy cards for my whole team?", a: "For 10+ people use Bulk Cards — the more you add, the lower the per-card price (down to ₹399/card/year), with one shared company template and branding." },
  { q: "Can I get a refund?", a: "Yes — a 7-day money-back guarantee on all paid plans, no questions asked." },
];

export default function Pricing() {
  const [period, setPeriod] = useState<Period>("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pt-24 pb-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4"><Sparkles size={13} className="text-[#F7B31C]" /> Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">One card. Every way to be found.</h1>
          <p className="mt-4 text-base text-[#64748B]">Start free for 30 days — full features, no credit card. Then keep your digital card live from just <span className="font-semibold text-[#0F172A]">₹99/month</span>.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white ring-1 ring-[#E2E8F0] shadow-premium">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`relative px-4 sm:px-5 h-10 rounded-xl text-sm font-semibold transition-all ${period === p.id ? "gradient-gold text-[#0F172A] shadow-gold" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                {p.label}
                {p.badge && <span className={`ml-1.5 hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle ${period === p.id ? "bg-[#0F172A]/10 text-[#0F172A]" : "bg-[#DCFCE7] text-[#166534]"}`}>{p.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {PLANS.map((plan) => {
            const isFree = plan.price.monthly === 0;
            const price = plan.price[period];
            const sv = savingsPct(plan, period);
            return (
              <div key={plan.name} className={`relative flex flex-col rounded-3xl bg-white overflow-hidden transition-all ${plan.popular ? "ring-2 ring-[#F7B31C] shadow-premium-lg md:-mt-3 md:mb-3" : "ring-1 ring-[#F1F5F9] shadow-premium"}`}>
                {plan.popular && <div className="text-center py-1.5 gradient-gold text-[#0F172A] text-[11px] font-bold tracking-wide">★ MOST POPULAR</div>}
                <div className="p-6 flex flex-col flex-1">
                  {/* Head */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center ring-1 ring-black/[0.03]" style={{ background: `${plan.accent}1A`, color: plan.accent }}><plan.icon size={18} /></span>
                    <div>
                      <h3 className="text-base font-bold text-[#0F172A] leading-none">{plan.name}</h3>
                      <p className="text-[11px] text-[#94A3B8] mt-1">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-5 mb-1 flex items-end gap-1.5">
                    <span className="text-4xl font-extrabold text-[#0F172A] tabular-nums">{isFree ? "₹0" : inr(price)}</span>
                    <span className="text-sm text-[#94A3B8] mb-1.5">{isFree ? "/ 30 days" : periodLabel(period)}</span>
                  </div>
                  <div className="h-5 mb-4">
                    {!isFree && period !== "monthly" && (
                      <p className="text-[12px] text-[#64748B]">
                        <span className="font-semibold text-[#0F172A]">{inr(perMonth(plan, period))}/mo</span>
                        {sv > 0 && <span className="ml-2 text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full">Save {sv}%</span>}
                      </p>
                    )}
                    {isFree && <p className="text-[12px] text-[#64748B]">then from ₹99/mo — cancel anytime</p>}
                    {!isFree && period === "monthly" && <p className="text-[12px] text-[#94A3B8]">billed monthly</p>}
                  </div>

                  {/* CTA */}
                  <Link to="/signup" className={`w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all mb-5 ${plan.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>
                    {plan.cta} <ArrowRight size={15} />
                  </Link>

                  {/* Features */}
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">{plan.headline}</p>
                  <div className="space-y-2.5">
                    {plan.features.map((f, j) => {
                      const Icon = f.icon || Check;
                      return (
                        <div key={j} className="flex items-start gap-2.5 text-[13px] text-[#475569]">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-px" style={{ background: `${plan.accent}14`, color: plan.accent }}><Icon size={12} /></span>
                          <span>{f.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk teaser */}
        <div className="mt-8 max-w-5xl mx-auto">
          <Link to="/bulk-cards" className="group flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white ring-1 ring-[#F1F5F9] shadow-premium px-6 py-5 hover:ring-[#F7B31C]/50 transition-all">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><IdCard size={20} className="text-[#F7B31C]" /></span>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Cards for your whole team?</p>
                <p className="text-[13px] text-[#64748B]">Bulk pricing from 10 cards — as low as ₹399/card/year with shared branding.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F172A] group-hover:gap-2.5 transition-all whitespace-nowrap">View Bulk Cards <ArrowRight size={15} /></span>
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-center text-[13px] text-[#94A3B8]">7-day money-back guarantee · Cancel anytime · UPI, Cards, Net Banking, Paytm & GPay</p>

        {/* FAQs */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-medium text-[#0F172A]">{faq.q}</span>
                  <HelpCircle size={16} className={`text-[#94A3B8] transition-transform shrink-0 ml-3 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-5"><p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#F7B31C]/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Your card is ready in minutes</h2>
            <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Start free for 30 days with every feature unlocked. No credit card, no risk.</p>
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Start Free Trial <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
