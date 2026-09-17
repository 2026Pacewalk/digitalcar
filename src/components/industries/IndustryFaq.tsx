/* FAQ accordion for the industry pages and the hub (blueprint §4a).

   Native <details>/<summary>, so every answer is in the server HTML and works
   without JavaScript. The first item is open. Each question is an h3 (the
   page renders the h2 above). Answers use the two RichText marks.

   The answer wrapper carries .dc-swap-in (index.css): a <details> child goes
   from display:none to block when opened, which restarts that keyframe, so
   each answer rises in. index.css already disables it under reduced motion. */
import { ChevronDown } from "lucide-react";
import RichText from "@/components/blog/RichText";

export default function IndustryFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-[#E2E8F0] overflow-hidden rounded-3xl bg-white ring-1 ring-[#E2E8F0] shadow-premium">
      {faqs.map((f, i) => (
        <details key={i} className="group open:bg-[#FBFCFE]" open={i === 0}>
          <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F7B31C] sm:px-6 [&::-webkit-details-marker]:hidden">
            <h3 className="flex min-w-0 items-start gap-3 font-display text-[16px] font-bold leading-snug text-[#0F172A] [text-wrap:balance] sm:text-[17px]">
              <span aria-hidden="true" className="mt-[3px] w-6 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--ind-ink,#B45309)] opacity-80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{f.q}</span>
            </h3>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-all duration-300 group-open:rotate-180 group-open:text-[color:var(--ind-ink,#0F172A)] group-hover:bg-[#E2E8F0] motion-reduce:transition-none"
            >
              <ChevronDown size={18} />
            </span>
          </summary>
          {/* Indented to the question text: padding + the 1.5rem number + the 0.75rem gap. */}
          <div className="dc-swap-in px-5 pb-6 pl-14 sm:px-6 sm:pl-[3.75rem]">
            <p className="text-[15.5px] leading-relaxed text-[#475569]"><RichText text={f.a} /></p>
          </div>
        </details>
      ))}
    </div>
  );
}
