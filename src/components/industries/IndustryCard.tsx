/* A link card for one industry (blueprint §4c-3).

   variant="hub": the directory card. One markup at every size: below sm it
   is a row (icon tile, name, excerpt, chevron); from sm up the same elements
   become a card with a tinted top band, the motif art in the accent colour,
   a phone peeking in at the corner, three feature tags and "See the card".
   The phone is the persona mockup <picture> where the page has one, and
   otherwise a small HTML card (MiniCard) drawn from ind.sample in the same
   spot, so every card in the grid gets the same peek. The <picture> sits
   inside the hidden band, so phones never download it.

   variant="related": the compact row used under "Related professions".

   The card sets --ind / --ind-ink on itself, so it reads its own colours
   wherever it is placed (hub or another industry's page). The link is named
   by its heading (aria-labelledby), so screen readers hear the profession,
   not the excerpt, tags and image alt run together. */
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { FEATURES, PERSONA_IMAGE_DIR, industryPath, type IndustryPage } from "@/data/industries";
import { Avatar } from "./HeroCard";
import IndustryArt from "./IndustryArt";
import { IndustryIcon } from "./IndustryIcon";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2";

/** The peek at the band's corner: the same box for the mockup and the mini card. */
const PEEK = "absolute bottom-0 right-4 block w-[92px] translate-y-[30%] drop-shadow-[0_16px_24px_rgba(15,23,42,0.22)] transition-transform duration-500 group-hover:translate-y-[18%] motion-reduce:transition-none";

/** A tiny sample card (initials, name, role, the three buttons) for pages
    without a mockup image: about a dozen nodes and no request. Decorative;
    the card is named by its heading. */
function MiniCard({ ind }: { ind: IndustryPage }) {
  const { accent, ink } = ind.theme;
  const s = ind.sample;
  return (
    <span aria-hidden="true" className={`${PEEK} aspect-[2/3] overflow-hidden rounded-[14px] bg-[#0B1120] p-[3px]`}>
      <span className="block h-full overflow-hidden rounded-[11px] bg-[#F8FAFC]">
        <span className="block px-2 pb-2 pt-3 text-center text-white" style={{ background: `linear-gradient(165deg, ${accent}, ${ink} 55%)` }}>
          <Avatar name={s.name} className="mx-auto h-6 w-6 text-[8px] ring-2 ring-white/40" style={{ color: ink }} />
          <span className="mt-1 block truncate text-[7px] font-bold leading-tight">{s.name}</span>
          <span className="block truncate text-[5.5px] leading-tight text-white/85">{s.role}</span>
        </span>
        <span className="grid grid-cols-3 gap-1 px-1.5 pt-1.5">
          {[0, 1, 2].map((j) => <span key={j} className="h-3 rounded-[4px] bg-white ring-1 ring-[#E2E8F0]" />)}
        </span>
        <span className="mx-1.5 mt-1.5 block h-[5px] w-[80%] rounded-full bg-[#E2E8F0]" />
        <span className="mx-1.5 mt-1 block h-[5px] w-[55%] rounded-full bg-[#E2E8F0]" />
      </span>
    </span>
  );
}

export default function IndustryCard({ ind, variant }: { ind: IndustryPage; variant: "hub" | "related" }) {
  const { accent, ink } = ind.theme;
  const vars = { "--ind": accent, "--ind-ink": ink } as CSSProperties;
  const titleId = `ind-card-${variant}-${ind.slug}`;

  if (variant === "related") {
    return (
      <Link
        to={industryPath(ind.slug)}
        aria-labelledby={titleId}
        style={vars}
        className={`group flex min-h-[76px] items-center gap-3.5 rounded-2xl bg-white p-4 ring-1 ring-[#E2E8F0] transition-all duration-300 hover:shadow-premium-lg hover:ring-[color:var(--ind)] active:scale-[0.99] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${FOCUS}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3"
          style={{ background: `${accent}1A`, color: ink }}
          aria-hidden="true"
        >
          <IndustryIcon name={ind.theme.icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-display text-[15px] font-bold leading-tight text-[#0F172A]">{ind.name}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#64748B]">{ind.excerpt}</p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-[#94A3B8] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[color:var(--ind-ink)] motion-reduce:transition-none" aria-hidden="true" />
      </Link>
    );
  }

  const tags = ind.useCases.slice(0, 3).map((u) => FEATURES[u.feature].label);
  return (
    <Link
      to={industryPath(ind.slug)}
      aria-labelledby={titleId}
      style={vars}
      className={`group relative flex items-center gap-3.5 rounded-2xl bg-white p-3.5 ring-1 ring-[#E2E8F0] transition-all duration-300 hover:shadow-premium-lg hover:ring-[color:var(--ind)] active:scale-[0.99] motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:block sm:rounded-3xl sm:p-0 ${FOCUS}`}
    >
      {/* Top band (sm and up): tint, motif art in the accent, mockup peeking from the corner. */}
      <div className="relative hidden h-28 overflow-hidden rounded-t-3xl sm:block" style={{ background: `${accent}14` }}>
        <div className="absolute inset-0 overflow-hidden text-[color:var(--ind)]">
          <IndustryArt motif={ind.theme.motif} className="dc-ind-wipe h-full w-full opacity-50" />
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/60 to-transparent" />
        {!ind.mockup && <MiniCard ind={ind} />}
        {ind.mockup && (
          <picture className={PEEK}>
            <source type="image/webp" srcSet={`${PERSONA_IMAGE_DIR}/${ind.mockup.img}.webp`} />
            <img
              src={`${PERSONA_IMAGE_DIR}/${ind.mockup.img}.png`}
              width={640}
              height={960}
              loading="lazy"
              decoding="async"
              alt={ind.mockup.alt}
              className="block h-auto w-full rounded-[14px]"
            />
          </picture>
        )}
      </div>

      {/* Icon tile: inline in the mobile row; overlapping the band's edge on sm+. */}
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3 sm:absolute sm:left-5 sm:top-[5.5rem] sm:h-12 sm:w-12 sm:rounded-2xl sm:shadow-premium sm:ring-4 sm:ring-white"
        style={{ background: `${accent}1A`, color: ink }}
        aria-hidden="true"
      >
        <IndustryIcon name={ind.theme.icon} size={22} />
      </span>

      <div className="min-w-0 flex-1 sm:p-5 sm:pt-9">
        <h3 id={titleId} className="font-display text-[15px] font-bold leading-tight text-[#0F172A] sm:text-[17px] sm:font-extrabold sm:tracking-tight">{ind.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#64748B] sm:mt-1.5 sm:text-[14px] sm:leading-relaxed">{ind.excerpt}</p>
        <ul className="mt-3.5 hidden flex-wrap gap-1.5 sm:flex" aria-label="Features that matter most">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] transition-colors group-hover:bg-white">{t}</li>
          ))}
        </ul>
        <span className="mt-4 hidden items-center gap-1 text-[13.5px] font-semibold sm:inline-flex" style={{ color: ink }}>
          See the card
          <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </div>

      <ChevronRight size={18} className="shrink-0 text-[#94A3B8] transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none sm:hidden" aria-hidden="true" />
    </Link>
  );
}
