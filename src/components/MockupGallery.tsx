import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, Play } from "lucide-react";

/* Template showcase gallery. Shows a template's marketing mockups as a carousel
   the visitor can move through (arrows, dots, thumbnails, keyboard, swipe) and
   click to zoom full-screen. Images are shown with object-contain so their
   native aspect ratio / resolution is preserved — never cropped or stretched.

   An optional `liveCard` node (the interactive/generated card preview) is
   appended as the LAST slide, so the real marketing mockups lead and the live
   preview sits at the end. */
export default function MockupGallery({ images, name, liveCard }: { images: string[]; name: string; liveCard?: React.ReactNode }) {
  const pics = (images || []).filter(Boolean);
  const hasLive = !!liveCard;
  const n = pics.length + (hasLive ? 1 : 0);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);

  const isLive = (idx: number) => hasLive && idx === n - 1;
  const go = useCallback((next: number) => setI(((next % n) + n) % n), [n]);
  const prev = useCallback(() => go(i - 1), [go, i]);
  const next = useCallback(() => go(i + 1), [go, i]);

  // Keyboard: arrows move, Esc closes the zoom overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // Lock background scroll while the full-screen zoom is open.
  useEffect(() => {
    if (!zoom) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [zoom]);

  // Basic touch swipe.
  const [touchX, setTouchX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    setTouchX(null);
  };

  if (n === 0) return null;

  const ArrowBtn = ({ dir, onClick }: { dir: "l" | "r"; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-label={dir === "l" ? "Previous image" : "Next image"}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === "l" ? "left-3" : "right-3"} z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-[#E2E8F0] shadow-premium flex items-center justify-center text-[#0F172A] hover:bg-white hover:scale-105 transition-all`}
    >
      {dir === "l" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );

  return (
    <div>
      {/* Stage */}
      <div
        className="relative rounded-2xl bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] border border-[#F1F5F9] overflow-hidden select-none aspect-[1148/1370] max-w-[440px] mx-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isLive(i) ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="h-full aspect-[375/560] max-w-full rounded-2xl overflow-hidden shadow-premium-lg border border-[#E2E8F0] bg-white">{liveCard}</div>
          </div>
        ) : (
          <button
            onClick={() => setZoom(true)}
            className="group block w-full h-full"
            aria-label="Zoom image"
          >
            <img
              src={pics[i]}
              alt={`${name} — digital business card mockup ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              className="w-full h-full object-contain"
            />
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] bg-white/90 backdrop-blur px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={12} /> Click to zoom</span>
          </button>
        )}
        {n > 1 && <><ArrowBtn dir="l" onClick={prev} /><ArrowBtn dir="r" onClick={next} /></>}
        {n > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {Array.from({ length: n }).map((_, k) => (
              <button key={k} onClick={() => go(k)} aria-label={`Go to image ${k + 1}`}
                className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[#F7B31C]" : "w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {n > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: n }).map((_, k) => (
            <button key={k} onClick={() => go(k)}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${k === i ? "border-[#F7B31C] ring-2 ring-[#F7B31C]/25" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
              {isLive(k)
                ? <span className="w-full h-full flex flex-col items-center justify-center gap-0.5 bg-[#0F172A] text-white"><Play size={15} className="text-[#F7B31C]" /><span className="text-[8px] font-bold uppercase tracking-wide">Live</span></span>
                : <img src={pics[k]} alt={`${name} thumbnail ${k + 1}`} loading="lazy" draggable={false} className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}

      {/* Zoom lightbox — rendered in a portal to <body> so it always covers the
          full viewport (above the nav) regardless of any positioned ancestor. */}
      {zoom && !isLive(i) && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-sm" onClick={() => setZoom(false)} />
          <button onClick={() => setZoom(false)} aria-label="Close" className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><X size={20} /></button>
          {n > 1 && <button onClick={prev} aria-label="Previous" className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><ChevronLeft size={22} /></button>}
          {n > 1 && <button onClick={next} aria-label="Next" className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><ChevronRight size={22} /></button>}
          <img src={pics[i]} alt={`${name} — digital business card mockup ${i + 1}`} draggable={false} className="relative max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full">{i + 1} / {n}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
