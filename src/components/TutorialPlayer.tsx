import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { TUTORIAL } from "@/data/tutorial";

/* The walkthrough video, everywhere it appears.

   Nothing from YouTube loads until the visitor presses play: until then this is
   a poster image and a button, so the homepage keeps its load time and no
   third-party cookie is set for someone who never watches. */

export default function TutorialPlayer({
  className = "", rounded = "rounded-2xl", start = false,
}: { className?: string; rounded?: string; /** already-pressed-play — skip the poster */ start?: boolean }) {
  const [playing, setPlaying] = useState(start);

  if (playing) {
    return (
      <div className={`relative aspect-video overflow-hidden bg-black ${rounded} ${className}`}>
        <iframe
          src={TUTORIAL.embedUrl}
          title={TUTORIAL.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play the walkthrough: ${TUTORIAL.title} (${TUTORIAL.lengthLabel})`}
      className={`group relative block aspect-video w-full overflow-hidden bg-[#0B1120] ${rounded} ${className}`}
    >
      <img
        src={TUTORIAL.poster}
        alt=""
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        /* maxresdefault exists for this video; hqdefault is the safety net if a
           future video id is swapped in and YouTube never rendered the big one. */
        onError={(e) => { const i = e.currentTarget; if (i.src !== TUTORIAL.posterFallback) i.src = TUTORIAL.posterFallback; }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/85 via-[#0B1120]/20 to-transparent" />

      {/* Play button */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A] shadow-[0_18px_40px_-12px_rgba(247,179,28,0.8)] transition-transform duration-300 group-hover:scale-110 sm:h-[72px] sm:w-[72px] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        <Play size={26} className="ml-1 fill-current" />
      </span>

      {/* The thumbnail carries the video&apos;s own title, so all this adds is how
          long the visitor is committing to. */}
      <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white ring-1 ring-white/15 sm:bottom-4 sm:right-4">
        {TUTORIAL.lengthShort}
      </span>
    </button>
  );
}

/* The same player in a dialog — for the "Watch tutorial" entries in the
   dashboard menus, where there is no room for it on the page itself. */
export function TutorialModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={TUTORIAL.title}>
      <div className="absolute inset-0 bg-[#0F172A]/75 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-3xl animate-scale-in">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
        >
          <X size={16} />
        </button>
        <TutorialPlayer rounded="rounded-2xl" className="shadow-2xl" start />
        <p className="mt-3 text-center text-[12.5px] text-white/70">
          {TUTORIAL.tagline}{" "}
          <a href={TUTORIAL.watchUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#F7B31C] hover:underline">
            Watch on YouTube
          </a>
        </p>
      </div>
    </div>
  );
}
