import { Link } from "react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";

/* The ADMIN portal's left panel.

   A separate file (rather than conditionals inside SignInPanel) so that
   "zero marketing, zero trust-badges, zero customer copy on the admin route"
   is a structural guarantee instead of a rule someone has to keep re-checking
   every time the customer panel is edited. */

export default function AdminPanel() {
  return (
    <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center px-12 py-10 overflow-y-auto bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-40" />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#334155] to-transparent" />

      <div className="relative z-10 w-full max-w-[440px]">
        <span className="w-12 h-12 rounded-2xl bg-[#334155] flex items-center justify-center">
          <ShieldCheck size={24} className="text-[#CBD5E1]" aria-hidden="true" />
        </span>

        <p className="mt-7 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">Restricted Area</p>
        <p className="font-display text-[1.75rem] leading-[1.15] font-extrabold text-white tracking-tight mt-2">
          DigitalCarda Admin Console
        </p>

        <p className="mt-4 text-[14px] leading-relaxed text-[#94A3B8]">
          This portal is for authorised staff only. Every sign-in attempt is recorded.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]">
          Customer and reseller accounts must sign in from the main sign-in page.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#CBD5E1] hover:text-white transition-colors duration-150 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#94A3B8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
        >
          Go to the main sign-in page <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
