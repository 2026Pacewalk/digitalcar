/*
 * The templates carousel on the home page: a 3D "coverflow" — the chosen
 * design stands upright in the middle, its neighbours fan away on both sides,
 * and the row loops in either direction.
 *
 * Hand-rolled rather than a carousel library: the whole effect is one
 * transform per card (translate + rotateY + scale + depth) worked out from how
 * far that card sits from the middle, so there is nothing to download and
 * nothing to fight when a card has to stay a real link.
 *
 * It behaves like a list of links first and an animation second: every card is
 * reachable by keyboard, arrow keys move the row, the autoplay stops on hover,
 * on focus, when the section scrolls out of view and whenever the visitor takes
 * over, and a visitor who asks for reduced motion gets a plain scrolling row
 * with no 3D and no autoplay at all.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Eye, Pause, Play } from "lucide-react";

export type CoverflowItem = {
  id: number | string;
  name: string;
  slug: string;
  category?: string | null;
  /** Preview image; falls back to `art` when missing. */
  image?: string | null;
  imageWebp?: string | null;
  featured?: boolean;
  /** Drawn preview used when there is no image. */
  art?: React.ReactNode;
};

/** How the card at `offset` places away from the middle is drawn. */
function placement(offset: number, depth: number, rotate: number, gap: number) {
  const side = Math.sign(offset);
  const far = Math.abs(offset);
  return {
    // The -50%/-50% has to live in here: this transform replaces the one the
    // centring classes would set, so without it the card hangs off the middle.
    transform: `translate(-50%, -50%) translateX(${offset * gap}%) translateZ(${-far * depth}px) rotateY(${-side * rotate}deg) scale(${Math.max(0.6, 1 - far * 0.12)})`,
    zIndex: 50 - far,
    opacity: far === 0 ? 1 : far === 1 ? 0.72 : 0.45,
    // Out of focus, literally: the eye lands on the middle card first.
    filter: far === 0 ? "none" : `saturate(${1 - far * 0.2}) brightness(${1 - far * 0.06}) blur(${far * 0.7}px)`,
  };
}

const AUTOPLAY_MS = 4000;

export default function TemplateCoverflow({ items, ariaLabel = "Card templates" }: { items: CoverflowItem[]; ariaLabel?: string }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [held, setHeld] = useState(false);          // hover / focus / dragging
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const count = items.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Only animate while the section is actually on screen.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback((dir: number) => setActive((i) => (count ? (i + dir + count) % count : 0)), [count]);

  useEffect(() => {
    if (!playing || held || reduced || !onScreen || count < 2) return;
    const t = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [playing, held, reduced, onScreen, count, go]);

  // How far from the middle each card sits, counting the shorter way round.
  const offsetOf = useCallback((i: number) => {
    const raw = i - active;
    const half = count / 2;
    return raw > half ? raw - count : raw < -half ? raw + count : raw;
  }, [active, count]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setPlaying(false); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPlaying(false); go(1); }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, moved: false };
    setHeld(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 45) {           // one card per swipe, like the real thing
      go(dx < 0 ? 1 : -1);
      drag.current = { x: e.clientX, moved: true };
      setPlaying(false);
    }
  };
  const endDrag = () => { drag.current = null; setHeld(false); };

  // Wider screens show more of the fan and a gentler angle.
  const [w, setW] = useState(1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener("resize", on, { passive: true });
    return () => window.removeEventListener("resize", on);
  }, []);
  const { depth, rotate, gap, visible } = useMemo(() => (
    w < 640 ? { depth: 110, rotate: 10, gap: 66, visible: 1 }
      : w < 1024 ? { depth: 130, rotate: 13, gap: 72, visible: 2 }
        : { depth: 150, rotate: 15, gap: 78, visible: 3 }
  ), [w]);

  if (!count) return null;

  /* Reduced motion: the same cards as a plain swipeable row. */
  if (reduced) {
    return (
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar" aria-label={ariaLabel}>
        {items.map((it) => (
          <li key={it.id} className="w-[min(260px,70vw)] shrink-0 snap-center">
            <Card item={it} active />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="relative" onKeyDown={onKey}>
      <div
        ref={frame}
        /* Height follows the card (375:626 portrait) plus room for its shadow,
           so the middle card is never cut off. Clipped, so the cards waiting
           off-stage cannot widen the page. */
        className="relative mx-auto h-[calc(min(250px,62vw)*1.67+2rem)] select-none overflow-hidden sm:h-[calc(260px*1.67+2.25rem)] lg:h-[calc(278px*1.67+2.5rem)]"
        style={{ perspective: "1400px" }}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => { setHeld(false); endDrag(); }}
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={() => setHeld(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
      >
        {/* a soft floor the fan appears to stand on */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 h-10 w-[62%] -translate-x-1/2 rounded-[50%] bg-[#0F172A]/12 blur-2xl" />
        {items.map((it, i) => {
          const offset = offsetOf(i);
          const far = Math.abs(offset);
          const hidden = far > visible;
          const isActive = offset === 0;
          return (
            <div
              key={it.id}
              className="absolute left-1/2 top-1/2 w-[min(250px,62vw)] transition-[transform,opacity] duration-[850ms] ease-[cubic-bezier(.22,.85,.25,1)] motion-reduce:transition-none sm:w-[260px] lg:w-[278px]"
              style={{
                ...placement(offset, depth, rotate, gap),
                visibility: hidden ? "hidden" : "visible",
                pointerEvents: hidden ? "none" : "auto",
                cursor: isActive ? "default" : "pointer",
              }}
              aria-hidden={hidden || undefined}
              onClick={(e) => {
                // A card to the side steps across instead of opening.
                if (!isActive) { e.preventDefault(); setPlaying(false); setActive(i); }
              }}
            >
              <Card item={it} active={isActive} tabbable={!hidden} />
            </div>
          );
        })}
      </div>

      {/* controls */}
      <button type="button" onClick={() => { setPlaying(false); go(-1); }} aria-label="Previous template"
        className="absolute left-0 top-1/2 z-[60] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#E2E8F0] bg-white/95 text-[#0F172A] shadow-premium backdrop-blur transition hover:border-[#F7B31C] hover:text-[#B45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:left-2 lg:left-6">
        <ChevronLeft size={20} />
      </button>
      <button type="button" onClick={() => { setPlaying(false); go(1); }} aria-label="Next template"
        className="absolute right-0 top-1/2 z-[60] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#E2E8F0] bg-white/95 text-[#0F172A] shadow-premium backdrop-blur transition hover:border-[#F7B31C] hover:text-[#B45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:right-2 lg:right-6">
        <ChevronRight size={20} />
      </button>

      <div className="mt-5 flex items-center justify-center gap-3">
        <ul className="flex items-center gap-2" aria-label="Choose a template">
          {items.map((it, i) => (
            <li key={it.id}>
              <button type="button" aria-current={i === active ? "true" : undefined} aria-label={`Show ${it.name}`}
                onClick={() => { setPlaying(false); setActive(i); }}
                className={`block h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${
                  i === active ? "w-6 bg-[#F7B31C]" : "w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]"}`} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] transition hover:border-[#F7B31C] hover:text-[#B45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>
    </div>
  );
}

/** One template card: its preview, its name, and — when it's the one in the
    middle — the button that opens it. */
function Card({ item, active, tabbable = true }: { item: CoverflowItem; active: boolean; tabbable?: boolean }) {
  const href = `/digital-business-cards-templates/${item.slug}`;
  return (
    <article
      className={`relative overflow-hidden rounded-[22px] bg-white ring-1 transition-shadow duration-500 ${
        active ? "shadow-[0_40px_80px_-30px_rgba(15,23,42,0.55)] ring-[#F7B31C]/60" : "shadow-[0_20px_45px_-28px_rgba(15,23,42,0.5)] ring-[#E8EDF3]"}`}
    >
      <Link to={href} tabIndex={tabbable ? 0 : -1} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]" aria-label={`${item.name} — see this template`}>
        <div className="relative aspect-[375/626] w-full bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7]">
          {item.image ? (
            <picture>
              {item.imageWebp && <source srcSet={item.imageWebp} type="image/webp" />}
              <img src={item.image} alt={`${item.name} — digital business card template`} loading="lazy" draggable={false}
                className="h-full w-full object-cover object-top" />
            </picture>
          ) : item.art}

          {/* Badge and caption belong to the card in the middle only. On the
              ones behind, overlapping labels just sliced each other up. */}
          {item.featured && active && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10px] font-bold text-[#F7B31C] shadow-sm">★ Featured</span>
          )}

          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B1120]/92 via-[#0B1120]/55 to-transparent px-4 pb-3.5 pt-10 text-left transition-opacity duration-300 ${
            active ? "opacity-100" : "opacity-0"}`}>
            <h3 className="text-[15px] font-extrabold leading-tight text-white">
              {item.name.replace(/\s*Digital Business Card$/, "").replace(/\s*Link-in-Bio Card$/, "")}
            </h3>
            {item.category && <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#FCD34D]">{item.category}</p>}
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#0F172A]">
              <Eye size={13} /> Live preview
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
