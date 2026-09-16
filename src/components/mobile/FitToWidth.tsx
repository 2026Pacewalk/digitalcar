import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* Shows wide fixed-layout content (an email signature, an invoice) whole on a
   narrow screen: it lays out at `base` px or the available width, whichever is
   larger, then scales down to fit — no sideways scrolling. */
export default function FitToWidth({ children, base = 460 }: { children: ReactNode; base?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; scale: number; height?: number }>({ width: 0, scale: 1 });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const avail = o.clientWidth;
      if (!avail) return;
      const width = Math.max(avail, base);
      const natural = Math.max(width, i.scrollWidth);
      const scale = Math.min(1, avail / natural);
      setBox((b) => {
        const height = Math.ceil(i.offsetHeight * scale);
        return b.width === width && b.scale === scale && b.height === height ? b : { width, scale, height };
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    measure();
    return () => ro.disconnect();
  }, [base]);

  return (
    <div ref={outer} style={{ height: box.height, overflow: "hidden" }}>
      <div ref={inner} style={{
        width: box.width || undefined,
        transform: box.scale < 1 ? `scale(${box.scale})` : undefined,
        transformOrigin: "top left",
      }}>
        {children}
      </div>
    </div>
  );
}
