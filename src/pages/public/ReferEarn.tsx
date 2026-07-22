import {
  Gift, Share2, UserCheck, Wallet, Banknote, ArrowRight, ArrowDownToLine,
  Check, HelpCircle, Sparkles, Link2, Users, Percent, ShieldCheck, Send,
} from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { trpc } from "@/providers/trpc";

export default function ReferEarnPublic() {
  const { data: rates } = trpc.referral.publicRates.useQuery();
  const commission = rates?.commissionPercent ?? 15;
  const discount = rates?.discountPercent ?? 15;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    { icon: Share2, title: "Share your link", desc: "Every DigitalCarda account gets a unique referral link and code. Share it with friends, clients, and your network." },
    { icon: UserCheck, title: "Your friend joins & upgrades", desc: `They sign up through your link and get ${discount}% off their first paid plan — an instant reason to say yes.` },
    { icon: Banknote, title: "You earn cash", desc: `The moment they go paid, you earn ${commission}% of what they pay — credited straight to your in-app wallet.` },
    { icon: Wallet, title: "Withdraw anytime", desc: "Cash out your wallet balance to your bank account or UPI whenever you like. No lock-in, no minimum tiers." },
  ];

  const perks = [
    { icon: Percent, title: `${discount}% off for your friend`, desc: `New users who join with your link save ${discount}% on their first paid plan.` },
    { icon: Banknote, title: `${commission}% cash for you`, desc: `Earn a flat ${commission}% commission on every paid plan your referrals purchase.` },
    { icon: Wallet, title: "Built-in wallet", desc: "Track every reward in your dashboard wallet with a full statement of earnings." },
    { icon: ArrowDownToLine, title: "Bank / UPI payouts", desc: "Request a payout to your bank account or UPI ID and get paid by our team." },
    { icon: Users, title: "Unlimited referrals", desc: "There's no cap — refer as many people as you like and keep earning." },
    { icon: ShieldCheck, title: "Transparent & fair", desc: "One reward per referred user, clearly shown, with a full audit trail in your wallet." },
  ];

  const faqs = [
    { q: "Who can join the Refer & Earn program?", a: "Every DigitalCarda user gets a referral link automatically — just sign in and open the Refer & Earn page in your dashboard." },
    { q: "When do I earn my commission?", a: `You earn when someone you referred upgrades to a paid plan. You get ${commission}% of what they pay, credited to your wallet once confirmed.` },
    { q: "What does my friend get?", a: `Your friend gets ${discount}% off their first paid plan when they sign up using your referral link.` },
    { q: "How do I get paid?", a: "Your rewards collect in your in-app wallet. Request a payout to your bank account or UPI, and our team processes it — you'll see it marked paid with a reference." },
    { q: "Is there a limit on how much I can earn?", a: "No. There's no cap on referrals or earnings. The more people you refer who go paid, the more you earn." },
    { q: "Do I earn again if my friend upgrades later?", a: "The reward is one-time per referred user, on their first paid plan. Future upgrades simply adjust their existing balance toward the new plan." },
  ];

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4"><Gift size={13} /> Refer &amp; Earn</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A] leading-tight">Give {discount}%, get {commission}% cash</h1>
          <p className="mt-4 text-base text-[#64748B]">
            Share DigitalCarda with your network. Your friends save {discount}% on their first paid plan, and you earn a flat {commission}% cash commission — paid to your wallet and withdrawable to bank or UPI.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
              Get your referral link <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-ghost h-12 px-8 inline-flex items-center justify-center gap-2 border border-[#E2E8F0]">
              Sign in to refer
            </Link>
          </div>
        </div>

        {/* Give/Get visual */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-6 sm:p-8 shadow-premium-lg">
            <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-[#F7B31C]/25 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-[#14B8A6]/15 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/10 p-5 text-center">
                <span className="inline-flex w-11 h-11 rounded-xl bg-[#F7B31C]/20 items-center justify-center mb-3"><Percent size={20} className="text-[#F7B31C]" /></span>
                <p className="text-3xl font-extrabold text-white">{discount}% OFF</p>
                <p className="text-[13px] text-white/60 mt-1">Your friend saves on their first paid plan</p>
              </div>
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/10 p-5 text-center">
                <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-400/20 items-center justify-center mb-3"><Banknote size={20} className="text-emerald-300" /></span>
                <p className="text-3xl font-extrabold text-white">{commission}% CASH</p>
                <p className="text-[13px] text-white/60 mt-1">You earn on every paid plan they buy</p>
              </div>
            </div>
            <div className="relative mt-4 flex items-center justify-center gap-2 text-[12px] text-white/50">
              <Sparkles size={13} className="text-[#F7B31C]" /> Withdrawable to bank or UPI — no cap on earnings
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] text-center mb-10">How Refer &amp; Earn works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((w, i) => (
              <div key={i} className="text-center">
                <div className="relative w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
                  <w.icon size={22} className="text-[#0F172A]" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0F172A] mb-2">{w.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {perks.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-4">
                <f.icon size={22} className="text-[#F7B31C]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{f.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Wallet highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center mb-20">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4"><Wallet size={13} /> Your earnings wallet</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-3">Track every reward, cash out on your terms</h2>
            <p className="text-sm text-[#64748B] leading-relaxed mb-5">
              Every referral reward lands in your DigitalCarda wallet with a clear statement. When you're ready, request a payout to your bank account or UPI — our team processes it and marks it paid with a reference you can see.
            </p>
            <div className="space-y-2.5">
              {["Real-time wallet balance & statement", "Payout by bank transfer or UPI", "No cap — refer and earn as much as you like", "One transparent reward per referred user"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#334155]"><Check size={15} className="text-emerald-500 shrink-0" /> {t}</div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-white border border-[#F1F5F9] shadow-premium-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5"><Wallet size={13} className="text-[#F7B31C]" /> Wallet balance</p>
                <p className="text-3xl font-extrabold text-[#0F172A] mt-1">₹2,650.00</p>
              </div>
              <span className="h-9 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-1.5"><ArrowDownToLine size={15} /> Withdraw</span>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Banknote, label: "Referral reward — Priya S.", amt: "+₹127.37", pos: true },
                { icon: Banknote, label: "Referral reward — Rahul M.", amt: "+₹299.85", pos: true },
                { icon: ArrowDownToLine, label: "Payout to UPI · paid", amt: "−₹500.00", pos: false },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.pos ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}><r.icon size={15} /></span>
                  <p className="text-[13px] font-medium text-[#0F172A] flex-1 truncate">{r.label}</p>
                  <p className={`text-[13px] font-bold ${r.pos ? "text-emerald-600" : "text-red-500"}`}>{r.amt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Share channels strip */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-8 sm:p-10 text-center mb-20">
          <h2 className="text-2xl font-bold text-white mb-2">Share in seconds, earn for months</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Send your link over WhatsApp, social media, or email — one tap from your dashboard.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[{ i: Send, t: "WhatsApp" }, { i: Share2, t: "Social" }, { i: Link2, t: "Copy link" }].map((c, i) => (
              <span key={i} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 ring-1 ring-white/10 text-white text-sm font-semibold"><c.i size={15} /> {c.t}</span>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-[#0F172A] text-center mb-8">Refer &amp; Earn FAQs</h2>
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

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Start earning today</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Create your free card, grab your referral link, and turn your network into real cash rewards.</p>
          <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
            Create your free card <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
