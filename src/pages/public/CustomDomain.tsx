import { Globe, Check, ArrowRight, Shield, TrendingUp, Zap, Server } from "lucide-react";
import { Link } from "react-router";

const benefits = [
  { icon: Shield, title: "Stronger Brand Identity", desc: "Your customers see your brand name in the URL, not a third-party domain." },
  { icon: TrendingUp, title: "Better SEO Rankings", desc: "Custom domains rank better on Google and other search engines." },
  { icon: Zap, title: "Instant Trust", desc: "Visitors trust a branded domain more than a generic link." },
  { icon: Server, title: "Full DNS Control", desc: "Configure CNAME records and manage your domain settings easily." },
];

const examples = [
  "card.yourbusiness.com",
  "profile.yourbusiness.com",
  "me.yourbusiness.com",
  "link.yourbusiness.com",
  "digital.yourbrand.in",
  "vcard.yourcompany.com",
];

const steps = [
  { title: "Choose Your Domain", desc: "Pick a subdomain like card.yourbusiness.com or use your root domain." },
  { title: "Add DNS Record", desc: "Add a simple CNAME record pointing to our servers. We guide you through it." },
  { title: "Verify & Activate", desc: "Our system verifies the DNS record and activates your custom domain instantly." },
];

export default function CustomDomain() {
  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#CCFBF1] text-[#115E59] mb-4">Custom Domain</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Use Your Own Domain</h1>
          <p className="mt-4 text-base text-[#64748B]">
            Connect your own domain or subdomain with your digital business card for stronger branding and trust.
          </p>
        </div>

        {/* Domain Examples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16 max-w-4xl mx-auto">
          {examples.map((domain, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-premium border border-[#F1F5F9]">
              <Globe size={18} className="text-[#14B8A6] shrink-0" />
              <span className="text-sm font-medium text-[#0F172A] font-mono">{domain}</span>
              <Check size={16} className="text-emerald-500 ml-auto shrink-0" />
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover text-center">
              <div className="w-12 h-12 rounded-xl bg-[#CCFBF1] flex items-center justify-center mx-auto mb-4">
                <b.icon size={22} className="text-[#14B8A6]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{b.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="bg-white rounded-3xl p-8 shadow-premium border border-[#F1F5F9] mb-16">
          <h2 className="text-xl font-bold text-[#0F172A] text-center mb-8">Setup in 3 Easy Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-[#0F172A]">{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">{s.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Connect Your Domain?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Upgrade to Premium and start using your own custom domain today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/pricing" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
              View Pricing <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
