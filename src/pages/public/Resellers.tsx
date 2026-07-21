import {
  Users, CreditCard, BarChart3, DollarSign, Shield, Palette,
  FileText, TrendingUp, Check, ArrowRight, Store, HelpCircle,
} from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";

const features = [
  { icon: Users, title: "Add Customers", desc: "Create and manage unlimited customer accounts from your reseller dashboard." },
  { icon: CreditCard, title: "Assign Packages", desc: "Allocate Starter, Standard, or Premium plans to each customer easily." },
  { icon: ClockIcon, title: "Track Expiry", desc: "Monitor subscription expiry dates and send renewal reminders automatically." },
  { icon: BarChart3, title: "Manage Leads", desc: "View and manage leads captured through all your customers' digital cards." },
  { icon: Palette, title: "White Label Branding", desc: "Rebrand the platform with your logo, colors, and custom domain." },
  { icon: DollarSign, title: "Commission Reports", desc: "Track earnings, commissions, and payouts with detailed financial reports." },
  { icon: TrendingUp, title: "Customer Analytics", desc: "Monitor card views, clicks, and engagement across all your customers." },
  { icon: FileText, title: "Marketing Materials", desc: "Access ready-made brochures, email templates, and sales collateral." },
];

const howItWorks = [
  { step: "1", title: "Apply as Reseller", desc: "Fill out the reseller application form and our team will review and approve your account." },
  { step: "2", title: "Set Up Your Branding", desc: "Add your logo, choose colors, configure your domain, and customize the experience." },
  { step: "3", title: "Add Your Customers", desc: "Start adding customers, assigning packages, and managing their digital cards." },
  { step: "4", title: "Earn Commissions", desc: "Earn recurring commissions on every customer subscription. Grow your revenue month after month." },
];

const faqs = [
  { q: "How much commission do resellers earn?", a: "Resellers earn 20-30% recurring commission on every customer subscription, depending on their tier." },
  { q: "Is there a minimum commitment?", a: "No minimum commitment required. Start with as few as 5 customer accounts." },
  { q: "Can I use my own domain?", a: "Yes, full white-label support allows you to use your own domain and branding." },
  { q: "How do I get paid?", a: "Commissions are paid monthly via bank transfer or UPI once you reach the minimum threshold." },
];

function ClockIcon(props: {size?: number; className?: string}) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

export default function Resellers() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Reseller Program</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Start Your Own Digital Card Business</h1>
          <p className="mt-4 text-base text-[#64748B]">
            DigitalCarda gives agencies and resellers a complete white-label system to create and manage cards for their customers. Build a recurring revenue stream with minimal effort.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
              Apply as Reseller <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn-ghost h-12 px-8 inline-flex items-center justify-center gap-2 border border-[#E2E8F0]">
              Contact Sales
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-4">
                <f.icon size={22} className="text-[#F7B31C]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{f.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] text-center mb-10">How the Reseller Program Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((w, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-[#0F172A]">{w.step}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0F172A] mb-2">{w.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {[
            { label: "Active Resellers", value: "200+" },
            { label: "Cards Created", value: "15,000+" },
            { label: "Avg. Commission", value: "25%" },
            { label: "Countries", value: "15+" },
          ].map((s, i) => (
            <div key={i} className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-center">
              <p className="text-2xl font-bold text-[#F7B31C]">{s.value}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-8">Reseller FAQs</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-medium text-[#0F172A]">{faq.q}</span>
                  <HelpCircle size={16} className={`text-[#94A3B8] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-5"><p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Become a Reseller?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Apply today and start building your digital card business with our white-label platform.</p>
          <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
            Apply Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
