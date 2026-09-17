/* The closing dark CTA (blueprint §4b-11 and §4c-8). Two aurora blobs drift
   behind the copy: one gold, one in the page's accent (gold again on the
   hub), offset by a negative delay so they never move in step. The blur is
   static; only transform animates, and index.css stops it under reduced
   motion. */
import { Link } from "react-router";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { SIGNUP_HREF, UPGRADE_LINE } from "@/data/industries";
import { CONTACT } from "@/lib/publicNav";

const GOLD = "#F7B31C";

/** The site's WhatsApp number with a canned message, from CONTACT. */
const whatsappHref = (text: string) => `${CONTACT.whatsappHref.split("?")[0]}?text=${encodeURIComponent(text)}`;

export default function CtaPanel({ title, text, accent, whatsappText, bulkFit }: {
  title: string; text?: string; accent?: string; whatsappText: string; bulkFit?: boolean;
}) {
  const tint = accent ?? GOLD;
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-6 py-12 text-center ring-1 ring-white/10 sm:px-12 sm:py-16">
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full blur-3xl animate-aurora-drift will-change-transform" style={{ background: `${GOLD}33` }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl animate-aurora-drift will-change-transform" style={{ background: `${tint}33`, animationDelay: "-7s" }} />

      <div className="relative mx-auto max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] ring-1 ring-white/10">
          <Sparkles size={12} aria-hidden="true" /> 30-day free trial
        </span>
        <h2 className="mt-5 font-display text-[1.9rem] font-extrabold leading-[1.1] tracking-tight text-white [text-wrap:balance] sm:text-[2.6rem]">{title}</h2>
        {text && <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#94A3B8] sm:text-[16px]">{text}</p>}

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to={SIGNUP_HREF}
            className="btn-gold group inline-flex h-12 items-center justify-center gap-2 px-7 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A] motion-safe:hover:-translate-y-0.5"
          >
            Start free for 30 days
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
          <a
            href={whatsappHref(whatsappText)}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-6 text-[15px] font-semibold text-white ring-1 ring-white/15 transition-all duration-200 hover:bg-white/[0.14] hover:ring-white/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] motion-reduce:transition-none"
          >
            <MessageCircle size={17} className="text-[#25D366] transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6" aria-hidden="true" />
            Ask on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        <p className="mt-5 text-[13px] text-[#94A3B8]">
          {bulkFit ? (
            <>
              Cards for 10 or more staff?{" "}
              <Link to="/bulk-cards" className="inline-flex min-h-[28px] items-center font-semibold text-white underline decoration-[#F7B31C] decoration-2 underline-offset-[5px] transition-colors hover:text-[#FCD34D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                Bulk cards for teams
              </Link>
            </>
          ) : UPGRADE_LINE}
        </p>
      </div>
    </div>
  );
}
