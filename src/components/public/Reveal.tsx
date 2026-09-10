/*
 * Scroll-reveal primitives shared by the public marketing pages.
 *
 *  useReveal()      — fires once when the element scrolls into view.
 *  <Reveal>         — fades/rises its children in; `stagger` cascades the
 *                     direct children (delays live in index.css).
 *  <SectionHeading> — the eyebrow / title / subtitle block every section uses.
 *
 * Extracted from Home so Features (and any later page) animate identically
 * instead of each growing its own near-copy.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // Safety net: never leave content permanently hidden if the observer is
    // slow or blocked (background tab, non-painting renderer, etc.).
    const fallback = window.setTimeout(() => setVisible(true), 900);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            window.clearTimeout(fallback);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return { ref, visible };
}

export function Reveal({
  children,
  stagger,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  stagger?: boolean;
  className?: string;
  as?: "div" | "section";
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const base = stagger ? "reveal-stagger" : "reveal";
  return (
    <Tag ref={ref as never} className={`${base} ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="text-center max-w-3xl mx-auto mb-12">
      {eyebrow && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${light ? "bg-white/10 text-[#F7B31C] ring-1 ring-white/10" : "bg-[#FEF3C7] text-[#92400E]"}`}>
          <Sparkles size={12} /> {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl lg:text-[2.7rem] font-extrabold tracking-tight ${light ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-base leading-relaxed ${light ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{subtitle}</p>}
    </Reveal>
  );
}
