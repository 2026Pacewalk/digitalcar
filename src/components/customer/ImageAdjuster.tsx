/*
 * Adjust an uploaded image — drag to reposition, zoom, rotate — then save the
 * framed result.
 *
 * The framing is baked into the saved image itself rather than stored as
 * crop settings. Every card template draws the photo with object-fit: cover and
 * the logo with contain, so a pre-framed square image looks exactly as the owner
 * set it on every design, in the link preview (OG image) and on any template
 * added later — none of them need to know crops exist.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Move, Plus, RotateCw, Undo2, X } from "lucide-react";

export type AdjustShape = "circle" | "rounded" | "square";

export type AdjustOptions = {
  /** Names the browser-only memory of the untouched original ("logo", "photo"). */
  key: string;
  title: string;
  /** Guide drawn over the frame — matches how the card will show it. */
  shape: AdjustShape;
  /** First placement: fill the frame (photos) or show all of it (logos). */
  initialFit: "cover" | "contain";
  /** Photos are flattened onto white JPEG; logos keep their transparency. */
  format: "photo" | "logo";
};

const OUT = 800;       // saved image is OUT x OUT px — sharp on retina, small as a data URI
const MAX_ZOOM = 4;    // relative to "just fills the frame"

type Props = { src: string; options: AdjustOptions; onCancel: () => void; onSave: (dataUrl: string) => void };

export default function ImageAdjuster({ src, options, onCancel, onSave }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [view, setView] = useState(300);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  /* ── Geometry (all in on-screen px of the square frame) ── */
  const turned = rot % 180 !== 0;
  const rw = nat ? (turned ? nat.h : nat.w) : 1;
  const rh = nat ? (turned ? nat.w : nat.h) : 1;
  const cover = Math.max(view / rw, view / rh);
  const contain = Math.min(view / rw, view / rh);
  const minZoom = Math.min(1, contain / cover);
  const scale = cover * zoom;

  // Keep the picture where it belongs: covering the frame when it is bigger
  // than the frame, inside the frame when it is smaller. |dw - view| / 2 is the
  // travel allowed in both cases.
  const clampPos = (p: { x: number; y: number }, z: number) => {
    const dw = rw * cover * z, dh = rh * cover * z;
    const lx = Math.abs(dw - view) / 2, ly = Math.abs(dh - view) / 2;
    return { x: Math.max(-lx, Math.min(lx, p.x)), y: Math.max(-ly, Math.min(ly, p.y)) };
  };

  const applyZoom = (z: number) => {
    const nz = Math.max(minZoom, Math.min(MAX_ZOOM, z));
    const f = zoom > 0 ? nz / zoom : 1;
    setZoom(nz);
    // Scale the offset too, so the point under the frame centre stays put.
    setPos((p) => clampPos({ x: p.x * f, y: p.y * f }, nz));
  };

  const reset = (natural = nat) => {
    if (!natural) return;
    // The contain/cover ratio does not depend on the frame size, so this is
    // right even before the frame has been measured.
    const ratio = Math.min(natural.w, natural.h) / Math.max(natural.w, natural.h);
    setRot(0);
    setPos({ x: 0, y: 0 });
    setZoom(options.initialFit === "contain" ? Math.min(1, ratio) : 1);
  };

  /* ── Load the image ── */
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const n = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
      setNat(n);
      reset(n);
    };
    img.onerror = () => { if (!cancelled) setLoadFailed(true); };
    img.src = src;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  /* ── Measure the frame (it is fluid on small phones) ── */
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setView(el.clientWidth || 300);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-fit after the frame resizes or the image turns.
  useEffect(() => {
    if (!nat) return;
    const z = Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
    if (z !== zoom) setZoom(z);
    setPos((p) => clampPos(p, z));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, rot, nat]);

  /* ── Wheel zoom (needs a non-passive listener to stop the page scrolling) ── */
  const zoomBy = useRef<(factor: number) => void>(() => {});
  zoomBy.current = (factor) => applyZoom(zoom * factor);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => { ev.preventDefault(); zoomBy.current(Math.exp(-ev.deltaY * 0.0015)); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Esc closes; the page behind stays still while open ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onCancel]);

  /* ── Drag to move, two fingers to pinch-zoom ── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Some browsers throw here for a pointer they no longer consider active;
    // capture is a nicety (keeps the drag when the finger leaves the frame), so
    // never let it abort the drag itself.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* keep dragging */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.dist > 0) applyZoom(pinch.current.zoom * (d / pinch.current.dist));
      return;
    }
    setPos((p) => clampPos({ x: p.x + next.x - prev.x, y: p.y + next.y - prev.y }, zoom));
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setPos((p) => clampPos({ x: p.x + dx, y: p.y + dy }, zoom));
    } else if (e.key === "+" || e.key === "=") { e.preventDefault(); applyZoom(zoom * 1.1); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); applyZoom(zoom / 1.1); }
    else if (e.key === "Enter") { e.preventDefault(); save(); }
  };

  /* ── Save: redraw exactly what is framed, at OUT x OUT ── */
  const save = () => {
    const img = imgRef.current;
    if (!img || !nat) return;
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (options.format === "photo") { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, OUT, OUT); }
      const k = OUT / view;
      ctx.translate(OUT / 2 + pos.x * k, OUT / 2 + pos.y * k);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(img, -nat.w / 2, -nat.h / 2, nat.w, nat.h);
      let out = options.format === "photo" ? canvas.toDataURL("image/jpeg", 0.88) : canvas.toDataURL("image/png");
      // A detailed logo can make a heavy PNG; WebP keeps the transparency far smaller.
      if (options.format === "logo" && out.length > 700_000) out = canvas.toDataURL("image/webp", 0.92);
      onSave(out);
    } catch {
      // Cross-origin images taint the canvas and cannot be exported.
      setError("This image can't be adjusted here. Upload it again from your device, then adjust it.");
    }
  };

  const ready = !!nat && !loadFailed;
  const pct = Math.round(zoom * 100);
  const guideRadius = options.shape === "circle" ? "9999px" : options.shape === "rounded" ? "18%" : "0";
  const checker = options.format === "logo"
    ? { background: "repeating-conic-gradient(#E2E8F0 0% 25%, #FFFFFF 0% 50%) 50% / 18px 18px" }
    : { background: "#FFFFFF" };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="img-adjust-title">
      <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h3 id="img-adjust-title" className="text-[15px] font-bold text-[#0F172A]">{options.title}</h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">Drag to position · pinch, scroll or use the slider to zoom</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="w-9 h-9 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="px-5">
          <div
            ref={frameRef}
            tabIndex={0}
            aria-label="Image framing area. Drag, or use arrow keys to move and plus or minus to zoom."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            className={`relative w-full max-w-[340px] mx-auto aspect-square rounded-2xl overflow-hidden touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={checker}
          >
            {ready && (
              <img
                src={src}
                alt=""
                draggable={false}
                referrerPolicy="no-referrer"
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  width: nat!.w, height: nat!.h, maxWidth: "none", maxHeight: "none",
                  transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg) scale(${scale})`,
                  transformOrigin: "center",
                  pointerEvents: "none",
                }}
              />
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#94A3B8]">
                {loadFailed ? "Couldn't load this image" : "Loading…"}
              </div>
            )}

            {/* How the card will show it: outside the shape is dimmed. */}
            {ready && options.shape !== "square" && (
              <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: guideRadius, boxShadow: "0 0 0 9999px rgba(15,23,42,0.45)" }} />
            )}
            {ready && (
              <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: guideRadius, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.9)" }} />
            )}
            {ready && dragging && (
              <div className="absolute inset-0 pointer-events-none">
                {[33.333, 66.666].map((p) => (
                  <span key={`v${p}`} className="absolute top-0 bottom-0 w-px bg-white/45" style={{ left: `${p}%` }} />
                ))}
                {[33.333, 66.666].map((p) => (
                  <span key={`h${p}`} className="absolute left-0 right-0 h-px bg-white/45" style={{ top: `${p}%` }} />
                ))}
              </div>
            )}
            {ready && !dragging && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0F172A]/55 text-white text-[10px] font-semibold pointer-events-none">
                <Move size={11} /> Drag to move
              </span>
            )}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2.5 mt-4 max-w-[340px] mx-auto">
            <button type="button" onClick={() => applyZoom(zoom / 1.15)} disabled={!ready || zoom <= minZoom + 1e-6} aria-label="Zoom out"
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] text-[#334155] flex items-center justify-center hover:bg-[#F8FAFC] disabled:opacity-40"><Minus size={16} /></button>
            <input type="range" min={minZoom} max={MAX_ZOOM} step={0.01} value={zoom} disabled={!ready}
              onChange={(e) => applyZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[#F7B31C]" />
            <button type="button" onClick={() => applyZoom(zoom * 1.15)} disabled={!ready || zoom >= MAX_ZOOM - 1e-6} aria-label="Zoom in"
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] text-[#334155] flex items-center justify-center hover:bg-[#F8FAFC] disabled:opacity-40"><Plus size={16} /></button>
            <span className="w-11 text-right text-[11px] font-bold text-[#0F172A] tabular-nums">{pct}%</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <button type="button" onClick={() => setRot((r) => (r + 90) % 360)} disabled={!ready}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"><RotateCw size={14} /> Rotate</button>
            <button type="button" onClick={() => reset()} disabled={!ready}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"><Undo2 size={14} /> Reset</button>
          </div>

          {error && <p className="mt-3 text-[12px] text-[#B91C1C] text-center leading-snug">{error}</p>}
        </div>

        <div className="flex gap-2.5 px-5 py-4 mt-3 border-t border-[#F1F5F9] bg-[#FCFDFE]">
          <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button type="button" onClick={save} disabled={!ready}
            className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:shadow-gold disabled:opacity-50"><Check size={16} /> Apply</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
