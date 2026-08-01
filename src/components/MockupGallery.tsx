import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

/* Template showcase gallery. Shows a template's marketing mockups as a carousel
   the visitor can move through (arrows, dots, thumbnails, keyboard, swipe) and
   click to zoom full-screen. Images are shown with object-contain so their
   native aspect ratio / resolution is preserved — never cropped or stretched. */
export default function MockupGallery({ images, name }: { images: string[]; name: string }) {
  const pics = (images || []).filter(Boolean);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = pics.length;

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
      aria-label={dir === "l" ? "Previous mockup" : "Next mockup"}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === "l" ? "left-3" : "right-3"} z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-[#E2E8F0] shadow-premium flex items-center justify-center text-[#0F172A] hover:bg-white hover:scale-105 transition-all`}
    >
      {dir === "l" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );

  return (
    <div>
      {/* Stage */}
      <div
        className="relative rounded-2xl bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] border border-[#F1F5F9] overflow-hidden select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          onClick={() => setZoom(true)}
          className="group block w-full"
          aria-label="Zoom mockup"
        >
          <img
            src={pics[i]}
            alt={`${name} mockup ${i + 1} of ${n}`}
            loading="lazy"
            draggable={false}
            className="w-full max-h-[560px] object-contain mx-auto"
          />
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] bg-white/90 backdrop-blur px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={12} /> Click to zoom</span>
        </button>
        {n > 1 && <><ArrowBtn dir="l" onClick={prev} /><ArrowBtn dir="r" onClick={next} /></>}
        {n > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {pics.map((_, k) => (
              <button key={k} onClick={() => go(k)} aria-label={`Go to mockup ${k + 1}`}
                className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[#F7B31C]" : "w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {n > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
          {pics.map((src, k) => (
            <button key={k} onClick={() => go(k)}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${k === i ? "border-[#F7B31C] ring-2 ring-[#F7B31C]/25" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
              <img src={src} alt={`${name} thumbnail ${k + 1}`} loading="lazy" draggable={false} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Zoom lightbox — full-resolution, aspect preserved */}
      {zoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/85 backdrop-blur-sm" onClick={() => setZoom(false)} />
          <button onClick={() => setZoom(false)} aria-label="Close" className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><X size={20} /></button>
          {n > 1 && <button onClick={prev} aria-label="Previous" className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><ChevronLeft size={22} /></button>}
          {n > 1 && <button onClick={next} aria-label="Next" className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><ChevronRight size={22} /></button>}
          <img src={pics[i]} alt={`${name} mockup ${i + 1}`} draggable={false} className="relative max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          {n > 1 && <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full">{i + 1} / {n}</span>}
        </div>
      )}
    </div>
  );
}
