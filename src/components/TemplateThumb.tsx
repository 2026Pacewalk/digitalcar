import { useMemo, useState, useEffect, useRef } from "react";
import { buildCardThumb } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { demoForProduct } from "@/lib/demoData";

export const THUMB_W = 375, THUMB_H = 626;   // fixed preview size — matches the Midnight Gold front (looks right in any browser)

/* Card-front preview using the SAME engine the real cards use. Every card is
   rendered at its native width and shown top-aligned in a fixed 375×626 frame —
   so all designs appear at the same, correct size, never shrunk to fit.
   Shared by the marketplace grid and the homepage Templates section. */
export default function TemplateThumb({ style, primary, secondary, category, name }: { style: number; primary?: string | null; secondary?: string | null; category?: string | null; name?: string | null }) {
  /* The preview document is built only in the browser. Each one is a complete
     card page (~37 KB); rendered on the server, the templates page shipped all
     51 of them inside its HTML — about 2 MB before anything else loaded. The
     frame keeps its exact size meanwhile, so nothing shifts when it fills in. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const html = useMemo(() => {
    if (!mounted) return undefined;
    const demo = demoForProduct({ styleNumber: style, category });
    return buildCardThumb({ ...DEFAULT_CUSTOMER, ...demo.customer, color: primary || "#F7B31C", color2: secondary || "" } as Parameters<typeof buildCardThumb>[0], style);
  }, [mounted, style, primary, secondary, category]);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={name ? `${name} digital business card preview` : `Digital business card design ${style} preview`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: THUMB_W, height: THUMB_H, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}
