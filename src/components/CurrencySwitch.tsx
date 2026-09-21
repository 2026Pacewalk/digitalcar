/* ₹ / $ segmented control. Render it only when useCurrency().available is true;
   with USD switched off (the default) nothing currency-related appears anywhere.
   A radiogroup: Tab lands on the selected option, arrow keys move and select. */
import { useId, useRef, type KeyboardEvent } from "react";
import type { Currency } from "@contracts/money";

const OPTIONS: { id: Currency; symbol: string; label: string }[] = [
  { id: "INR", symbol: "₹", label: "Indian rupees" },
  { id: "USD", symbol: "$", label: "US dollars" },
];

const TONES = {
  // The dashboard's light term toggle (Subscription page).
  light: {
    group: "bg-white ring-1 ring-[#E2E8F0] shadow-premium",
    on: "gradient-gold text-[#0F172A] shadow-gold",
    off: "text-[#64748B] hover:text-[#0F172A]",
    focus: "focus-visible:ring-[#0F172A]/40",
  },
  // The /pricing hero's dark billing toggle.
  dark: {
    group: "bg-white/[0.07] ring-1 ring-white/15 backdrop-blur",
    on: "gradient-gold text-[#0F172A] shadow-gold",
    off: "text-[#CBD5E1] hover:text-white",
    focus: "focus-visible:ring-white",
  },
} as const;

type Props = {
  value: Currency;
  onChange: (c: Currency) => void;
  /** e.g. useCurrency().locked: the running plan fixes the currency. */
  disabled?: boolean;
  /** Why it is disabled; read out by screen readers and shown on hover. */
  note?: string;
  tone?: keyof typeof TONES;
  className?: string;
};

export default function CurrencySwitch({ value, onChange, disabled = false, note, tone = "light", className = "" }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const noteId = useId();
  const t = TONES[tone];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = OPTIONS.length - 1;
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Currency"
      aria-disabled={disabled || undefined}
      aria-describedby={note ? noteId : undefined}
      title={disabled && note ? note : undefined}
      className={`inline-flex items-center gap-1 p-1 rounded-2xl ${t.group} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {OPTIONS.map((o, i) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${o.label} (${o.symbol})`}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            onClick={() => { if (!on) onChange(o.id); }}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative inline-flex items-center justify-center gap-1 h-9 min-w-[3.5rem] px-3 rounded-xl text-[13px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${t.focus} disabled:cursor-not-allowed ${on ? t.on : t.off}`}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">{o.symbol}</span>
            <span aria-hidden="true" className={`text-[10.5px] font-extrabold tracking-wide ${on ? "text-[#0F172A]/70" : ""}`}>{o.id}</span>
          </button>
        );
      })}
      {note && <span id={noteId} className="sr-only">{note}</span>}
    </div>
  );
}
