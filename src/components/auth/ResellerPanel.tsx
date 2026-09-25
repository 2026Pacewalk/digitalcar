import { Link } from "react-router";
import { useState } from "react";
import type { CSSProperties } from "react";
import { CreditCard, Store, MessageCircle, Mail, ArrowRight, Check, UserPlus } from "lucide-react";
import { SUPPORT } from "./authMockData";
import PartnerPass from "./PartnerPass";

/* The PARTNER portal's left panel (/resellers-login, desktop only).

   A separate file for the same reason AdminPanel is one: the customer panel's
   promises ("your card never went offline", the trust badges) are about a card
   owner's card, and none of them belong in front of a reseller.

   It shows the partner pass the applicant saw fill in on /become-reseller —
   blank here, since we don't know who is signing in yet — so applying and
   signing in read as one journey. Every line names something the partner
   portal really has today: the customer list, the per-order commission
   statement, and wallet payouts. Keep it that way — no rate (each partner's is
   set individually), no bands, no white-label, no figures. */

const INSIDE: { strong: string; rest: string }[] = [
  { strong: "Your customers", rest: " — everyone you've brought on, in one list." },
  { strong: "Your commission", rest: " — itemised customer by customer, order by order." },
  { strong: "Your payouts", rest: " — withdraw your balance to your bank or UPI." },
];

const focusRing = "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]";

export default function ResellerPanel() {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <aside
      className="hidden lg:flex lg:w-1/2 lg:sticky lg:top-0 lg:h-screen relative overflow-hidden
                 px-12 py-10 overflow-y-auto
                 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"
    >
      {/* Backdrop — decorative. animate-aurora-drift is in the reduced-motion kill list.
          /[0.12], not /12: Tailwind 3's opacity scale has no 12, so "/12" emits nothing. */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
      <div aria-hidden="true" className="absolute top-0 right-0 w-[440px] h-[440px] rounded-full blur-3xl bg-[#F7B31C]/[0.12] -translate-y-1/4 translate-x-1/4 animate-aurora-drift" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full blur-3xl bg-[#14B8A6]/10 translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#F7B31C]/45 to-transparent" />

      {/* m-auto rather than items-center on the aside: auto margins centre the
          column when it fits and let it scroll from the top when it doesn't —
          items-center would push the logo above the scroll area on short screens. */}
      <div className="relative z-10 m-auto w-full max-w-[440px] flex flex-col min-h-[560px]">
        <Link to="/" aria-label="DigitalCarda home" className={`dc-enter inline-flex items-center gap-3 self-start ${focusRing}`}>
          {logoOk ? (
            <img src="/logo.png" alt="" className="h-9 w-auto object-contain" onError={() => setLogoOk(false)} />
          ) : (
            <>
              <span className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center"><CreditCard size={22} className="text-[#0F172A]" /></span>
              <span className="text-2xl font-bold text-white">Digital<span className="text-gradient-gold">Carda</span></span>
            </>
          )}
        </Link>

        <p className="dc-enter mt-8 inline-flex items-center gap-2 self-start rounded-full bg-[#F7B31C]/10 border border-[#F7B31C]/30 px-3 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FCD34D]">
          <Store size={12} aria-hidden="true" /> Partner portal
        </p>
        {/* A <p>.font-display, so the form's <h1> stays the page's first heading. */}
        <p className="dc-enter dc-enter-1 font-display text-[2rem] leading-[1.15] font-extrabold text-white tracking-tight mt-4">
          Your customers and commission, <span className="text-gradient-gold">in one place.</span>
        </p>
        <p className="dc-enter dc-enter-2 mt-3 text-[15px] leading-relaxed text-[#94A3B8]">
          Sign in to add customers, see what each one has earned you, and request a payout when you&apos;re ready.
        </p>

        <ul className="dc-enter dc-enter-3 mt-7 space-y-3.5">
          {INSIDE.map((s, i) => (
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

        {/* The pass, with two event chips — deliberately unnumbered, like the
            customer panel's, so nothing reads as a real metric. */}
        <div aria-hidden="true" className="relative flex justify-center my-10">
          <div className="relative w-[330px] animate-float">
            <PartnerPass blank />
            <div className="absolute -left-7 top-[18%] bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "0.6s" }}>
              <UserPlus size={11} className="text-[#3B82F6]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-[#0F172A]">Customer added</span>
            </div>
            <div className="absolute -right-6 -bottom-3 bg-white rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-1.5 animate-float" style={{ animationDelay: "1.4s" }}>
              <Check size={11} className="text-[#16A34A]" strokeWidth={3} />
              <span className="text-[10px] font-bold text-[#0F172A]">Commission credited</span>
            </div>
          </div>
        </div>

        <Link to="/become-reseller" className={`self-start inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#FCD34D] hover:text-white transition-colors duration-150 ${focusRing}`}>
          Not a partner yet? Apply to resell DigitalCarda <ArrowRight size={14} aria-hidden="true" />
        </Link>

        <div className="mt-auto pt-6 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">Partner support</p>
          <div className="mt-2.5 flex flex-col gap-2">
            <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer"
               className={`text-[13px] text-[#CBD5E1] hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 ${focusRing}`}>
              <MessageCircle size={14} className="text-[#22C55E]" aria-hidden="true" /> {SUPPORT.whatsappLabel}
            </a>
            <a href={`mailto:${SUPPORT.email}`}
               className={`text-[13px] text-[#CBD5E1] hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 ${focusRing}`}>
              <Mail size={14} className="text-[#F7B31C]" aria-hidden="true" /> {SUPPORT.email}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
