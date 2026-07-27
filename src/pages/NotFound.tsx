import { Link } from "react-router";
import {
  Home, ArrowRight, Compass, CreditCard, Phone, Globe, Mail,
  QrCode, Unplug, Sparkles, LifeBuoy,
} from "lucide-react";

const QUICK_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Templates", to: "/digital-business-cards-templates" },
  { label: "Pricing", to: "/pricing" },
  { label: "Refer & Earn", to: "/refer-earn" },
  { label: "Contact", to: "/contact" },
];

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/12 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#14B8A6]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

      {/* Logo */}
      <header className="relative z-10 px-6 sm:px-10 py-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
            <CreditCard size={18} className="text-[#0F172A]" />
          </div>
          <span className="text-xl font-bold text-white">
            Digital<span className="text-gradient-gold">Carda</span>
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F7B31C] ring-1 ring-white/10 mb-8">
          <Unplug size={12} /> Error 404
        </span>

        {/* 404 visual */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-6 mb-2 select-none">
          <span className="font-display text-[6rem] sm:text-[9rem] font-extrabold leading-none text-gradient-gold">4</span>

          {/* Tilted "broken" digital card as the 0 */}
          <div className="relative animate-float">
            <div className="w-[92px] h-[132px] sm:w-[128px] sm:h-[184px] rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-premium-lg rotate-6 p-3 sm:p-4 flex flex-col">
              <div className="h-5 sm:h-7 rounded-md gradient-gold mb-2.5" />
              <div className="space-y-1.5 mb-auto">
                {[Phone, Globe, Mail].map((Ic, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-[#F7B31C]/80 flex items-center justify-center shrink-0">
                      <Ic size={9} className="text-[#0F172A]" />
                    </span>
                    <span className="h-1.5 rounded-full bg-white/15 flex-1" />
                  </div>
                ))}
              </div>
              {/* broken QR */}
              <div className="mt-2 w-9 h-9 sm:w-12 sm:h-12 mx-auto rounded-lg border-2 border-dashed border-white/25 flex items-center justify-center">
                <QrCode size={18} className="text-white/25" />
              </div>
            </div>
            {/* unplugged badge */}
            <div className="absolute -top-2 -right-2 bg-[#EF4444] rounded-full px-2 py-1 shadow-lg flex items-center gap-1 rotate-6">
              <Unplug size={10} className="text-white" />
              <span className="text-[9px] font-bold text-white">Link broken</span>
            </div>
          </div>

          <span className="font-display text-[6rem] sm:text-[9rem] font-extrabold leading-none text-gradient-gold">4</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">Page Not Found</h1>
        <p className="mt-4 text-base text-[#94A3B8] leading-relaxed max-w-md">
          The page you're looking for doesn't exist, was moved, or the link is broken. Let's get you back on track.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn-gold h-12 px-7 inline-flex items-center justify-center gap-2 text-base">
            <Home size={18} /> Back to Home
          </Link>
          <Link to="/digital-business-cards-templates" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
            <Compass size={18} /> Explore Templates
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 w-full max-w-lg">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-4">Or jump to</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#CBD5E1] hover:text-white hover:border-[#F7B31C]/40 hover:bg-white/10 transition-all"
              >
                {l.label}
                <ArrowRight size={13} className="text-[#64748B] group-hover:text-[#F7B31C] -translate-x-0.5 group-hover:translate-x-0 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer help */}
      <footer className="relative z-10 pb-8 px-6">
        <p className="text-center text-sm text-[#64748B] flex items-center justify-center gap-2">
          <LifeBuoy size={14} className="text-[#64748B]" />
          Still lost? <Link to="/contact" className="text-[#F7B31C] font-medium hover:underline inline-flex items-center gap-1">Contact support <Sparkles size={11} /></Link>
        </p>
      </footer>
    </div>
  );
}
