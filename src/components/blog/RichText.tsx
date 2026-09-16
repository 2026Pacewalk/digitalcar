/* Renders the two inline marks blog articles use — **bold** and
   [label](href) — as React elements. No HTML strings, so article text can
   never inject markup. Site paths stay inside the app; full URLs are external
   sources, open in a new tab and are marked as such. */
import { Fragment } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

export default function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) return <strong key={i} className="font-semibold text-[#0F172A]">{bold[1]}</strong>;
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const cls = "font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-[5px] transition-colors hover:text-[#B45309]";
          if (href.startsWith("/")) return <Link key={i} to={href} className={cls}>{label}</Link>;
          // Only real web links — never javascript: or other schemes.
          if (!/^https:\/\//i.test(href)) return <Fragment key={i}>{label}</Fragment>;
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
              {label}
              <ArrowUpRight size={14} strokeWidth={2.5} className="ml-0.5 inline-block align-[-1px] text-[#B45309]" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
