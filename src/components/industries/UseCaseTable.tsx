/* The "What your card does for {audience}" table (blueprint §4b-5).

   One <table> at every size. Below sm each row becomes a white card: the
   thead is screen-reader only, the plan pill sits in the card's top-right
   corner and the feature link runs under the need. From sm up it is a normal
   three-column table. The markup is identical at every size, so the server
   HTML and the browser agree and nothing is duplicated.

   The display changes (max-sm:block / max-sm:grid) strip the native table
   semantics in some browsers, so every element also carries its explicit
   ARIA table role.

   Colours come from the page's --ind / --ind-ink variables (with fallbacks so
   the table also reads correctly outside an industry page). */
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import RichText from "@/components/blog/RichText";
import { FEATURES, PLAN_LABEL, type FeaturePlan, type IndustryPage } from "@/data/industries";
import { FeatureIcon } from "./IndustryIcon";

const PLAN_PILL: Record<FeaturePlan, string> = {
  "all-plans": "bg-[#F1F5F9] text-[#334155] ring-[#E2E8F0]",
  platinum: "bg-[#0F172A] text-[#FCD34D] ring-[#0F172A]",
  "add-on": "bg-[#FEF3C7] text-[#92400E] ring-[#FDE68A]",
  bulk: "bg-[#EEF2FF] text-[#3730A3] ring-[#E0E7FF]",
  "free-tool": "bg-[#ECFDF5] text-[#047857] ring-[#D1FAE5]",
};

const CELL = "align-top max-sm:block max-sm:p-0 sm:px-5 sm:py-5 lg:px-6";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]";

export default function UseCaseTable({ ind }: { ind: IndustryPage }) {
  const tint = `${ind.theme.accent}1A`;
  return (
    <div className="sm:overflow-hidden sm:rounded-3xl sm:bg-white sm:ring-1 sm:ring-[#E2E8F0] sm:shadow-premium">
      <table role="table" className="w-full border-collapse text-left max-sm:block">
        <caption className="sr-only">
          What your card does for {ind.audience}: what you need, how the card does it and the plan it is on.
        </caption>
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row" className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
            <th role="columnheader" scope="col" className="px-5 py-3.5 lg:px-6 sm:w-[30%]">What you need</th>
            <th role="columnheader" scope="col" className="px-5 py-3.5 lg:px-6">How your card does it</th>
            <th role="columnheader" scope="col" className="px-5 py-3.5 lg:px-6 sm:w-[12%]">Plan</th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block">
          {ind.useCases.map((uc, i) => {
            const f = FEATURES[uc.feature];
            return (
              <tr
                role="row"
                key={`${uc.feature}-${i}`}
                className="max-sm:relative max-sm:mb-3 max-sm:grid max-sm:gap-2.5 max-sm:rounded-2xl max-sm:bg-white max-sm:p-4 max-sm:ring-1 max-sm:ring-[#E2E8F0] max-sm:shadow-premium sm:border-b sm:border-[#E2E8F0] sm:transition-colors sm:hover:bg-[#FAFBFD] sm:last:border-b-0"
              >
                <th role="rowheader" scope="row" className={`${CELL} font-display text-[15.5px] font-bold leading-snug text-[#0F172A] max-sm:pr-[6.5rem]`}>
                  {/* Row number: a quiet accent counter, decorative only (sm and up). */}
                  <span aria-hidden="true" className="mr-2 hidden w-5 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--ind-ink,#0F766E)] opacity-70 sm:inline-block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {uc.need}
                </th>
                <td role="cell" className={`${CELL} text-[14.5px] leading-relaxed text-[#475569]`}>
                  {/* Icon tile + label make one 44px-tall link to the feature's page. */}
                  <Link
                    to={f.href}
                    className={`group/f -ml-1.5 inline-flex min-h-[44px] max-w-full items-center gap-2.5 rounded-xl pl-1.5 pr-2.5 font-semibold text-[#0F172A] transition-colors hover:bg-[#F1F5F9] active:bg-[#E9EDF3] ${FOCUS}`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--ind-ink,#0F766E)] transition-transform duration-300 group-hover/f:-rotate-6 group-hover/f:scale-110 motion-reduce:transition-none motion-reduce:group-hover/f:transform-none"
                      style={{ background: tint }}
                      aria-hidden="true"
                    >
                      <FeatureIcon name={f.icon} size={17} />
                    </span>
                    <span className="underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors group-hover/f:decoration-[color:var(--ind,#F7B31C)]">
                      {f.label}
                    </span>
                    <ArrowUpRight
                      size={13}
                      strokeWidth={2.5}
                      className="-translate-x-1 opacity-0 transition-all duration-300 group-hover/f:translate-x-0 group-hover/f:opacity-100 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                  <p className="mt-1"><RichText text={uc.how} /></p>
                </td>
                <td role="cell" className={`${CELL} max-sm:absolute max-sm:right-4 max-sm:top-4`}>
                  <span className={`inline-flex h-7 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] ring-1 ${PLAN_PILL[f.plan]}`}>
                    {PLAN_LABEL[f.plan]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
