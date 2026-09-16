import { Link } from "react-router";
import { useState } from "react";
import { CreditCard, Star, Sparkles, QrCode, MessageCircle } from "lucide-react";
import SignupLiveCard, { type LiveCardData } from "./SignupLiveCard";
import { AUTH_TRUST } from "./authMockData";

/* The signup page's left panel (desktop). Sticky, so the live card stays in
   view while the visitor works down the form — the whole point is that they
   watch their card appear as they type. */

const STEPS = [
  { title: "Create your account", body: "Free for 30 days — no payment details asked." },
  { title: "Make it yours", body: "Add your photo, services, products and payment details." },
  { title: "Share and get enquiries", body: "Send your link or QR — every enquiry lands in your dashboard." },
];

export default function SignupPanel({ card }: { card: LiveCardData }) {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 lg:sticky lg:top-0 lg:h-screen relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-[460px] h-[460px] rounded-full blur-3xl bg-[#F7B31C]/15 animate-aurora-drift" />
      <div aria-hidden="true" className="absolute -bottom-28 -left-24 w-[400px] h-[400px] rounded-full blur-3xl bg-[#14B8A6]/12 animate-aurora-drift" style={{ animationDelay: "3s" }} />
      {/* The accent the visitor picks washes faintly behind their card. */}
      <div aria-hidden="true" className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full blur-3xl opacity-25 transition-colors duration-500" style={{ background: card.color }} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#F7B31C]/45 to-transparent" />

      <div className="relative z-10 w-full h-full overflow-y-auto px-10 xl:px-14 py-9 flex flex-col">
        <Link to="/" aria-label="DigitalCarda home" className="dc-enter inline-flex items-center gap-3 self-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]">
          {logoOk ? (
            <img src="/logo.png" alt="" className="h-9 w-auto object-contain" onError={() => setLogoOk(false)} />
          ) : (
            <>
              <span className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center"><CreditCard size={22} className="text-[#0F172A]" /></span>
              <span className="text-2xl font-bold text-white">Digital<span className="text-gradient-gold">Carda</span></span>
            </>
          )}
        </Link>

        {/* Single column on laptops: intro → CARD → steps, so the live card sits
            right under the headline instead of below the fold. Very wide screens
            put the card beside the text. */}
        <div className="mt-8 flex-1 grid 2xl:grid-cols-[minmax(0,1fr)_auto] gap-x-10 gap-y-7 content-center">
          <div className="min-w-0 2xl:col-start-1 2xl:row-start-1 2xl:self-end">
            <span className="dc-enter dc-enter-1 inline-flex items-center gap-1.5 rounded-full bg-[#F7B31C]/12 border border-[#F7B31C]/30 px-3 py-1 text-[11.5px] font-semibold text-[#FCD34D]">
              <Sparkles size={12} aria-hidden="true" /> 30-day free trial · ₹0 today
            </span>
            {/* <p> styled as a display heading so the form's <h1> stays the page's first heading. */}
            <p className="dc-enter dc-enter-1 font-display mt-4 text-[2.15rem] 2xl:text-[2.5rem] leading-[1.08] font-extrabold text-white tracking-tight">
              Your card is <span className="text-gradient-gold">taking shape.</span>
            </p>
            <p className="dc-enter dc-enter-2 mt-3 text-[15px] leading-relaxed text-[#94A3B8] max-w-[440px]">
              Type your details and watch your digital business card build itself — live, before you&apos;ve even finished signing up.
            </p>
          </div>

          <div className="relative flex justify-center 2xl:col-start-2 2xl:row-start-1 2xl:row-span-2 2xl:self-center py-1">
            <div className="relative">
              <SignupLiveCard data={card} />
              {/* Badges sit over the card's empty header/avatar band — never over
                  the visitor's own name, number, email or link. */}
              <div aria-hidden="true" className="absolute -left-12 top-[58px] bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "0.6s" }}>
                <QrCode size={13} className="text-[#0F172A]" />
                <span className="text-[10.5px] font-bold text-[#0F172A]">QR code included</span>
              </div>
              <div aria-hidden="true" className="absolute -right-12 top-[128px] bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "1.4s" }}>
                <MessageCircle size={13} className="text-[#22C55E]" />
                <span className="text-[10.5px] font-bold text-[#0F172A]">Share on WhatsApp</span>
              </div>
            </div>
          </div>

          <ol className="dc-enter dc-enter-3 space-y-4 max-w-[440px] 2xl:col-start-1 2xl:row-start-2 2xl:self-start">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3.5">
                <span className="w-8 h-8 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-[13px] font-bold text-[#FCD34D] shrink-0">{i + 1}</span>
                <span>
                  <span className="block text-[14px] font-semibold text-white">{s.title}</span>
                  <span className="block text-[12.5px] text-[#94A3B8] leading-snug mt-0.5">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
          <div aria-hidden="true" className="flex -space-x-2">
            {["#F7B31C", "#14B8A6", "#8B5CF6", "#3B82F6"].map((c, i) => (
              <span key={i} className="w-8 h-8 rounded-full ring-2 ring-[#1E293B] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>{["A", "B", "E", "S"][i]}</span>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-0.5" role="img" aria-label={AUTH_TRUST.ratingLabel}>
              {[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-[#F7B31C] text-[#F7B31C]" />)}
              <span className="ml-1 text-[11px] font-bold text-white">{AUTH_TRUST.rating}</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Trusted by <span className="text-white font-semibold">{AUTH_TRUST.businesses}</span> businesses</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
