/* The phone frame around a live card preview.

   The card is laid out at a real phone width (PHONE_W) and scaled to fit the
   frame, so it looks exactly like it does on a phone at any mockup size —
   instead of being squeezed into a narrow iframe. The preview's own scrollbar
   is hidden too: on a desktop browser it took ~15px from the card, leaving a
   white strip down the right and cutting off the card's bottom menu. */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject, type SyntheticEvent } from "react";

const PHONE_W = 390;

// Phones scroll with overlay scrollbars; hide the desktop ones inside the preview.
const NO_SCROLLBARS = "<style>*{scrollbar-width:none}*::-webkit-scrollbar{display:none}</style>";
export function withoutScrollbars(html: string) {
  if (!html) return html;
  const i = html.lastIndexOf("</head>");
  return i >= 0 ? html.slice(0, i) + NO_SCROLLBARS + html.slice(i) : NO_SCROLLBARS + html;
}

export default function PhoneMockup({ html, screenStyle, frameRef, onLoad, title = "Live preview" }: {
  html: string;
  /** Size of the screen area, e.g. { height: 700 } (width then fills the parent). */
  screenStyle: CSSProperties;
  frameRef?: RefObject<HTMLIFrameElement | null>;
  onLoad?: (e: SyntheticEvent<HTMLIFrameElement>) => void;
  title?: string;
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = screenRef.current; if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const doc = useMemo(() => withoutScrollbars(html), [html]);
  const scale = box.w > 0 ? box.w / PHONE_W : 1;

  return (
    <div className="relative rounded-[44px] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-[9px] shadow-premium-lg ring-1 ring-black/5">
      <div className="absolute top-[9px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-6 px-4 rounded-b-2xl bg-[#0F172A]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
        <span className="w-12 h-1 rounded-full bg-[#334155]" />
      </div>
      <div ref={screenRef} className="relative overflow-hidden rounded-[34px] bg-white" style={screenStyle}>
        {box.w > 0 && (
          <iframe ref={frameRef} onLoad={onLoad} srcDoc={doc} title={title}
            className="absolute left-0 top-0 block border-0 bg-white"
            style={{ width: PHONE_W, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "top left" }} />
        )}
      </div>
    </div>
  );
}
