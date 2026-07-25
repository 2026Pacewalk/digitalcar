import { Check, ArrowRight, HelpCircle } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";

const plans = [
  {
    name: "Trial", price: "Rs. 0", period: "30 Days", popular: false,
    features: ["1 Digital Card", "Basic Template", "Basic Contact Buttons", "Shareable Link", "Limited Features"],
    cta: "Start Free Trial",
  },
  {
    name: "Starter", price: "Rs. 1,499", period: "/ Year", popular: true,
    features: ["1 Digital Card", "Products & Services", "Social Links", "WhatsApp Button", "QR Code", "Enquiry Form", "Basic Analytics", "SEO Settings"],
    cta: "Get Started",
  },
  {
    name: "Standard", price: "Rs. 2,499", period: "/ 3 Years", popular: false,
    features: ["Everything in Starter", "Gallery", "Videos", "Payment QR", "Offers", "PDF Downloads", "Advanced Analytics", "Google Reviews", "Priority Support"],
    cta: "Choose Standard",
  },
  {
    name: "Premium", price: "Custom", period: "Pricing", popular: false,
    features: ["Custom Domain", "AI Content Tools", "Multilingual Card", "CRM Sync", "Advanced Integrations", "Team Access", "Premium Templates", "Dedicated Support"],
    cta: "Contact Sales",
  },
];

const faqs = [
  { q: "Can I upgrade or downgrade my plan?", a: "Yes, you can upgrade or downgrade your plan at any time. The difference will be prorated." },
  { q: "Is there a free trial?", a: "Absolutely! We offer a 30-day free trial that requires no credit card details upfront, with full access to all Starter features." },
  { q: "What payment methods do you accept?", a: "We accept UPI, credit/debit cards, net banking, Paytm, and GPay." },
  { q: "Can I get a refund?", a: "Yes, we offer a 7-day money-back guarantee on all paid plans." },
  { q: "Do you offer discounts for annual billing?", a: "Our Starter and Standard plans are already priced annually for the best value." },
  { q: "Is there a reseller or white-label option?", a: "Yes! Our Premium plan includes full reseller capabilities with white-label branding." },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Simple Pricing for Every Business</h1>
          <p className="mt-4 text-base text-[#64748B]">Start a 30-day free trial that requires no credit card details upfront. Upgrade when you are ready. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-premium border-2 ${plan.popular ? "border-[#F7B31C]" : "border-[#F1F5F9]"} card-hover relative`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full whitespace-nowrap">MOST POPULAR</span>}
              <h3 className="text-base font-semibold text-[#0F172A]">{plan.name}</h3>
              <div className="mt-3 mb-5">
                <span className="text-3xl font-bold text-[#0F172A]">{plan.price}</span>
                <span className="text-sm text-[#94A3B8]">{plan.period}</span>
              </div>
              <div className="space-y-2.5 mb-6">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Check size={13} className="text-emerald-500 shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Link to={plan.name === "Premium" ? "/contact" : "/signup"} className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${plan.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-medium text-[#0F172A]">{faq.q}</span>
                  <HelpCircle size={16} className={`text-[#94A3B8] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Still Have Questions?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Our team is happy to help you choose the right plan for your business.</p>
          <Link to="/contact" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
            Contact Sales <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
