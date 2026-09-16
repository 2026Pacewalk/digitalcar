import { Link } from "react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, CreditCard, Mail, MailOpen, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import { SUPPORT } from "./authMockData";

/* Shared shell for the password-recovery pages (/forgot-password and
   /reset-password), in the same visual system as sign-in and sign-up: a sticky
   navy panel on desktop, a navy header on phones and tablets, and the page's own
   form card overlapping it.

   Both pages show the same three-step journey with the current step lit, so a
   locked-out owner always knows how far they are from getting back in. */

export type RecoveryStep = 1 | 2 | 3;

const STEPS: { icon: typeof Mail; title: string; body: string }[] = [
  { icon: Mail, title: "Enter your email", body: "The one you use to sign in to DigitalCarda." },
  { icon: MailOpen, title: "Open the link we send", body: "It arrives in about a minute and works for 1 hour." },
  { icon: KeyRound, title: "Choose a new password", body: "Then sign in — your card, link and QR are untouched." },
];

function StepList({ step, dark }: { step: RecoveryStep; dark: boolean }) {
  return (
    <ol className="space-y-3.5">
      {STEPS.map((s, i) => {
        const n = (i + 1) as RecoveryStep;
        const done = n < step;
        const current = n === step;
        return (
          <li key={s.title} className="flex gap-3" aria-current={current ? "step" : undefined}>
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                done ? "bg-[#16A34A] text-white"
                  : current ? "gradient-gold text-[#0F172A] shadow-gold"
                  : dark ? "bg-white/[0.06] border border-white/10 text-[#64748B]" : "bg-[#F1F5F9] text-[#94A3B8]"
              }`}
            >
              {done ? <Check size={16} aria-hidden="true" /> : <s.icon size={16} aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className={`block text-[14px] font-semibold ${current ? (dark ? "text-white" : "text-[#0F172A]") : dark ? "text-[#CBD5E1]" : "text-[#475569]"}`}>
                <span className="sr-only">{done ? "Done: " : current ? "Current step: " : ""}</span>{s.title}
              </span>
              <span className={`block text-[12.5px] leading-snug mt-0.5 ${dark ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{s.body}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function RecoveryLayout({ step, eyebrow, headline, children }: {
  step: RecoveryStep;
  eyebrow: string;
  headline: ReactNode;
  children: ReactNode;
}) {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex lg:items-start">
      <a href="#recovery-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-[#0F172A] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to form
      </a>

      {/* ── Desktop panel ── */}
      <aside className="hidden lg:flex lg:w-1/2 lg:sticky lg:top-0 lg:h-screen relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-[440px] h-[440px] rounded-full blur-3xl bg-[#F7B31C]/15 animate-aurora-drift" />
        <div aria-hidden="true" className="absolute -bottom-28 -left-24 w-[380px] h-[380px] rounded-full blur-3xl bg-[#14B8A6]/12 animate-aurora-drift" style={{ animationDelay: "3s" }} />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#F7B31C]/45 to-transparent" />

        <div className="relative z-10 w-full h-full overflow-y-auto px-12 py-10 flex flex-col">
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

          <div className="flex-1 flex flex-col justify-center max-w-[440px] py-8">
            <p className="dc-enter dc-enter-1 text-[13px] font-semibold text-[#FCD34D]">{eyebrow}</p>
            <p className="dc-enter dc-enter-1 font-display mt-2 text-[2.1rem] leading-[1.1] font-extrabold text-white tracking-tight">{headline}</p>

            <div className="dc-enter dc-enter-2 mt-8">
              <StepList step={step} dark />
            </div>

            {/* The reassurance that matters most to a locked-out shop owner. */}
            <div className="dc-enter dc-enter-3 mt-8 flex items-start gap-3 rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-3.5">
              <span className="w-9 h-9 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center shrink-0">
                <ShieldCheck size={17} className="text-[#2DD4BF]" aria-hidden="true" />
              </span>
              <p className="text-[13px] leading-snug text-[#CBD5E1]">
                <span className="font-semibold text-white">Your card stays live the whole time.</span>{" "}
                Customers can still open your link, scan your QR and send enquiries while you reset.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">No access to your email?</p>
            <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[#CBD5E1] hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <MessageCircle size={14} className="text-[#22C55E]" aria-hidden="true" /> {SUPPORT.whatsappLabel} — we&apos;ll verify it&apos;s you
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* ── Phone & tablet header ── */}
        <header className="lg:hidden relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4 sm:px-8 pt-4 pb-24">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
          <div aria-hidden="true" className="absolute -top-20 -right-16 w-72 h-72 rounded-full blur-3xl bg-[#F7B31C]/20" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl bg-[#14B8A6]/15" />
          <div className="relative max-w-[460px] mx-auto">
            <div className="flex items-center justify-between">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#CBD5E1] hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <ArrowLeft size={15} aria-hidden="true" /> Sign in
              </Link>
              <Link to="/" aria-label="DigitalCarda home" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
              </Link>
              <span className="w-[58px]" aria-hidden="true" />
            </div>

            <p className="dc-enter mt-6 text-[13px] font-semibold text-[#FCD34D]">{eyebrow}</p>
            <p className="dc-enter dc-enter-1 font-display mt-1.5 text-[1.7rem] sm:text-[2rem] leading-[1.1] font-extrabold text-white tracking-tight">{headline}</p>

            {/* Compact step progress */}
            <div className="dc-enter dc-enter-2 mt-4 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1.5 rounded-full transition-all ${n < step ? "w-8 bg-[#16A34A]" : n === step ? "w-12 bg-[#F7B31C]" : "w-8 bg-white/15"}`} />
              ))}
              <span className="ml-1 text-[12px] font-medium text-[#94A3B8]">Step {step} of 3 · {STEPS[step - 1].title}</span>
            </div>
          </div>
        </header>

        <main id="recovery-main" className="relative px-4 sm:px-8 lg:px-10 pb-12 -mt-14 lg:mt-0 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-12">
          <div aria-hidden="true" className="hidden lg:block absolute inset-0 bg-dots opacity-50 pointer-events-none" />
          <div className="hidden lg:flex relative items-center max-w-[440px] w-full mx-auto mb-5">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
              <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
            </Link>
          </div>

          <div className="relative max-w-[440px] w-full mx-auto">
            <div className="dc-enter relative rounded-[24px] bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden">
              <div aria-hidden="true" className="h-[5px] w-full gradient-gold" />
              <div className="p-5 sm:p-8">{children}</div>
            </div>

            <div className="lg:hidden mt-5 rounded-2xl bg-white/70 border border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
              <MessageCircle size={16} className="text-[#16A34A] shrink-0" aria-hidden="true" />
              <p className="text-[12.5px] text-[#475569] leading-snug">
                No access to your email?{" "}
                <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#B45309] hover:text-[#92400E]">WhatsApp us</a>{" "}
                and we&apos;ll verify it&apos;s you.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
