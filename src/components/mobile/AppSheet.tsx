import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* A phone-style bottom sheet: slides up over a dimmed page, drag the handle
   down (or tap outside, or press Esc) to close. Rendered into <body> so no
   transformed/blurred parent can trap it. */
export default function AppSheet({
  open, onClose, title, children, tall = false, footer, labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Take most of the screen (previews) instead of fitting the content. */
  tall?: boolean;
  /** Pinned under the scrolling content (e.g. a primary button). */
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Parents pass inline handlers; keep the latest without re-running effects
  // (which would steal focus from a field inside the sheet on every render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = window.setTimeout(() => { setMounted(false); setClosing(false); }, 220);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    panel.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [mounted]);

  const onStart = useCallback((y: number) => { startY.current = y; }, []);
  const onMove = useCallback((y: number) => {
    if (startY.current == null) return;
    setDrag(Math.max(0, y - startY.current));
  }, []);
  const onEnd = useCallback(() => {
    if (startY.current == null) return;
    startY.current = null;
    if (drag > 90) onClose();
    setDrag(0);
  }, [drag, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const dragProps = {
    onTouchStart: (e: React.TouchEvent) => onStart(e.touches[0].clientY),
    onTouchMove: (e: React.TouchEvent) => onMove(e.touches[0].clientY),
    onTouchEnd: onEnd,
    onTouchCancel: onEnd,
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#020617]/45 backdrop-blur-[2px] ${closing ? "animate-sheet-fade-out" : "animate-fade-in"}`}
        style={drag ? { opacity: Math.max(0.2, 1 - drag / 400) } : undefined}
      />
      <div
        ref={panel}
        tabIndex={-1}
        className={`relative mx-auto flex w-full max-w-lg flex-col rounded-t-[26px] bg-[#F6F7F9] shadow-[0_-12px_40px_-12px_rgba(2,6,23,0.35)] outline-none ${
          tall ? "h-[92dvh]" : "max-h-[88dvh]"} ${closing ? "animate-slide-down" : "animate-slide-up"}`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div {...dragProps} className="shrink-0 touch-none cursor-grab pt-2.5">
          <div className="mx-auto h-[5px] w-10 rounded-full bg-[#CBD5E1]" />
          {title != null && (
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
              <div className="min-w-0 flex-1 text-[17px] font-bold tracking-tight text-[#0F172A]">{title}</div>
              <button type="button" onClick={onClose} aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9ECF1] text-[#475569] active:scale-95">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 scrollbar-hide">{children}</div>
        {footer && <div className="shrink-0 border-t border-[#E7EAF0] bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
        {!footer && <div className="h-safe-bottom shrink-0" />}
      </div>
    </div>,
    document.body,
  );
}
