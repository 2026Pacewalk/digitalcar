import { useState } from "react";
import { PlayCircle, X, Clock, ExternalLink } from "lucide-react";
import TutorialPlayer from "@/components/TutorialPlayer";
import { TUTORIAL } from "@/data/tutorial";
import { scopedKey } from "@/hooks/useCustomer";

/* "Watch how it's done" on the dashboard.

   New members land here not knowing where to start, so the walkthrough sits
   right under the setup checklist. Once it's been opened (or hidden) it stays
   out of the way — the menu keeps a permanent "Watch tutorial" entry for
   anyone who wants it again. */

const KEY = "dc_tutorial_seen";

const seen = (): boolean => {
  try { return localStorage.getItem(scopedKey(KEY)) === "1"; } catch { return false; }
};
const markSeen = () => {
  try { localStorage.setItem(scopedKey(KEY), "1"); } catch { /* private mode — it just shows again */ }
};

export default function TutorialCard() {
  const [hidden, setHidden] = useState(seen);
  const [open, setOpen] = useState(false);
  if (hidden) return null;

  const dismiss = () => { markSeen(); setHidden(true); };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-4 shadow-premium-lg ring-1 ring-black/5 sm:p-5">
      {/* Kept inside the bottom edge: an overflowing decoration makes this box
          scrollable, and a scrollIntoView anywhere below would then slide the
          thumbnail up out of sight. */}
      <div className="pointer-events-none absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-[#14B8A6]/15 blur-3xl" />
      <button
        onClick={dismiss}
        aria-label="Hide the tutorial"
        /* It sits over the thumbnail on a phone, so it needs its own dark chip. */
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/45 text-white/80 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
      >
        <X size={14} />
      </button>

      <div className="relative sm:flex sm:items-center sm:gap-5">
        <div className="sm:w-[46%] sm:shrink-0">
          {open
            ? <TutorialPlayer rounded="rounded-2xl" start />
            : (
              <button type="button" onClick={() => { markSeen(); setOpen(true); }} className="block w-full text-left">
                <span className="relative block aspect-video w-full overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
                  <img src={TUTORIAL.poster} alt="" width={1280} height={720} loading="lazy" decoding="async"
                    onError={(e) => { const i = e.currentTarget; if (i.src !== TUTORIAL.posterFallback) i.src = TUTORIAL.posterFallback; }}
                    className="h-full w-full object-cover" />
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-[#0B1120]/35">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full gradient-gold text-[#0F172A] shadow-gold">
                      <PlayCircle size={22} />
                    </span>
                  </span>
                </span>
              </button>
            )}
        </div>

        <div className="mt-3.5 min-w-0 sm:mt-0 sm:flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7B31C]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F7B31C] ring-1 ring-[#F7B31C]/20">
            <Clock size={10} /> {TUTORIAL.lengthLabel}
          </span>
          <p className="mt-2 text-[15px] font-bold leading-snug text-white">New here? Watch this first.</p>
          <p className="mt-1 text-[12px] leading-snug text-white/60">{TUTORIAL.tagline}</p>
          <div className="mt-3 flex items-center gap-2">
            {!open && (
              <button
                onClick={() => { markSeen(); setOpen(true); }}
                className="h-9 rounded-lg gradient-gold px-3.5 text-[11.5px] font-bold text-[#0F172A] transition-all hover:shadow-gold active:scale-[0.98]"
              >
                Play tutorial
              </button>
            )}
            <a
              href={TUTORIAL.watchUrl} target="_blank" rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[11.5px] font-semibold text-white/90 ring-1 ring-white/10 transition-colors hover:bg-white/20"
            >
              YouTube <ExternalLink size={12} />
            </a>
            {open && (
              <button onClick={dismiss} className="h-9 px-2 text-[11.5px] font-semibold text-white/50 transition-colors hover:text-white/80">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
