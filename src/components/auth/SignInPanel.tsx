import { Link } from "react-router";
import { useState } from "react";
import type { CSSProperties } from "react";
import { CreditCard, Eye, Share2, Phone, Globe, Mail, MessageCircle, Star } from "lucide-react";
import { AUTH_MOCK_CARD, AUTH_TRUST, SUPPORT } from "./authMockData";

/* The LOGIN left panel (customer portal, desktop only).

   Deliberately a fork of AuthBrandPanel rather than an edit of it: that
   component is shared with Signup, and "login-only" changes would silently
   restyle the signup page. See the DO-NOT list in the build spec.

   The emotional job of /login is not "log in", it is "prove I haven't lost my
   card" — a shopkeeper who printed 500 QR stickers needs to know his link, his
   QR and his enquiries all kept working while he was away. Hence the status
   strip rather than a feature list. */

const STATUS: { strong: string; rest: string }[] = [
  { strong: "Your link", rest: " — the same URL you printed. Unchanged." },
  { strong: "Your QR", rest: " — scan it a year from now, it still opens your card." },
  { strong: "Your enquiries", rest: " — every lead is waiting in your dashboard." },
];

export default function SignInPanel() {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <aside
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center
                 px-12 py-10 overflow-y-auto
                 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"
    >
      {/* Backdrop — all decorative. Both blobs use animate-aurora-drift, which is
          already in the reduced-motion kill list, so no new motion risk. */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
      <div aria-hidden="true" className="absolute top-0 right-0 w-[440px] h-[440px] rounded-full blur-3xl bg-[#F7B31C]/12 -translate-y-1/4 translate-x-1/4 animate-aurora-drift" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full blur-3xl bg-[#14B8A6]/10 translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />
      {/* The "fold" — a hairline where the two halves of the card meet. */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#F7B31C]/45 to-transparent" />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col min-h-[560px]">
        <Link to="/" aria-label="DigitalCarda home" className="inline-flex items-center gap-3 self-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]">
          {logoOk ? (
            /* alt="" — the link itself is already labelled, so a filled alt would
               announce the brand twice. */
            <img src="/logo.png" alt="" className="h-9 w-auto object-contain" onError={() => setLogoOk(false)} />
          ) : (
            <>
              <span className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center"><CreditCard size={22} className="text-[#0F172A]" /></span>
              <span className="text-2xl font-bold text-white">Digital<span className="text-gradient-gold">Carda</span></span>
            </>
          )}
        </Link>

        {/* A <p>.font-display renders identically to an <h2> here, while leaving
            the form's <h1> as the document's first heading. */}
        <p className="font-display text-[2rem] leading-[1.15] font-extrabold text-white tracking-tight mt-8">
          Your Card Never Went Offline.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[#94A3B8]">
          While you were away, your link kept working, your QR kept scanning and your enquiries kept arriving. Sign in and pick up exactly where you left off.
        </p>

        <ul className="mt-7 space-y-3.5">
          {STATUS.map((s, i) => (
            <li key={s.strong} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="dc-live-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#14B8A6]"
                style={{ "--dc-delay": `${i * 0.8}s` } as CSSProperties}
              />
              <span className="text-[13.5px] leading-snug text-[#CBD5E1]">
                <strong className="font-semibold text-white">{s.strong}</strong>{s.rest}
              </span>
            </li>
          ))}
        </ul>

        {/* Decorative card mockup — the founder's own published card. Wrapped in a
            single aria-hidden so a screen reader never reads a fake person's
            details as if they were the user's. */}
        <div aria-hidden="true" className="relative flex justify-center my-8">
          <div className="relative w-[240px] animate-float">
            <div className="rounded-[22px] bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-2xl overflow-hidden">
              <div className="bg-[#F7B31C] px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white flex items-center gap-1"><Eye size={11} /> {AUTH_MOCK_CARD.views}</span>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><Share2 size={11} className="text-white" /></span>
              </div>
              <div className="p-4">
                <div className="text-center mb-3">
                  <p className="text-sm font-bold text-white tracking-wide">{AUTH_MOCK_CARD.name}</p>
                  <p className="text-[9px] text-[#F7B31C] font-medium mt-0.5">{AUTH_MOCK_CARD.role}</p>
                </div>
                <div className="space-y-1.5">
                  {[{ i: Phone, t: AUTH_MOCK_CARD.phone }, { i: Globe, t: AUTH_MOCK_CARD.site }, { i: Mail, t: AUTH_MOCK_CARD.email }].map((r, k) => (
                    <div key={k} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                      <span className="w-6 h-6 rounded-md bg-[#F7B31C] flex items-center justify-center shrink-0"><r.i size={11} className="text-[#0F172A]" /></span>
                      <span className="text-[10px] text-white/80 truncate">{r.t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="h-8 rounded-lg bg-[#F7B31C] flex items-center justify-center gap-1"><Phone size={11} className="text-[#0F172A]" /><span className="text-[10px] font-bold text-[#0F172A]">Call</span></div>
                  <div className="h-8 rounded-lg bg-[#22C55E] flex items-center justify-center gap-1"><MessageCircle size={11} className="text-white" /><span className="text-[10px] font-bold text-white">Chat</span></div>
                </div>
              </div>
            </div>

            {/* Chips are deliberately NOT numbered: "QR +128" reads as a real
                metric on a trust surface, and it isn't one. */}
            <div className="absolute -left-6 top-10 bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "0.6s" }}>
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
              <span className="text-[10px] font-bold text-[#0F172A]">QR scanned</span>
            </div>
            <div className="absolute -right-5 bottom-14 bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "1.4s" }}>
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-[10px] font-bold text-[#0F172A]">New lead</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

        {/* A real human escape hatch — the person who genuinely cannot get in is
            the one this page fails hardest. */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">Locked out?</p>
          <div className="mt-2.5 flex flex-col gap-2">
            <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer"
               className="text-[13px] text-[#CBD5E1] hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]">
              <MessageCircle size={14} className="text-[#22C55E]" aria-hidden="true" /> {SUPPORT.whatsappLabel}
            </a>
            <a href={`mailto:${SUPPORT.email}`}
               className="text-[13px] text-[#CBD5E1] hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]">
              <Mail size={14} className="text-[#F7B31C]" aria-hidden="true" /> {SUPPORT.email}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
