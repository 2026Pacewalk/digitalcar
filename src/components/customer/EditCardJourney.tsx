/*
 * Interlinked, app-like navigation for the whole "Edit Card" journey.
 *
 *  <JourneyStrip>    — a sticky, horizontally-scrollable strip of numbered step
 *                      chips (current highlighted, done ones ticked). Tap any chip
 *                      to jump. Acts like a mobile app's segmented tab bar.
 *  <JourneyContinue> — a Back / "Continue → <next>" bar at the foot of each
 *                      section, turning the scattered pages into one guided flow.
 *
 * Both render nothing when the current route isn't part of the journey, so
 * ModuleShell can mount them unconditionally.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { EDIT_CARD_STEPS, currentStepIndex } from "./editCardSteps";

export function JourneyStrip() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const idx = currentStepIndex(pathname);
  const scroller = useRef<HTMLDivElement>(null);
  const activeChip = useRef<HTMLButtonElement>(null);

  // Keep the current step centred in the scroll strip as you move through.
  useEffect(() => {
    if (activeChip.current) activeChip.current.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [idx]);

  if (idx < 0) return null;
  const total = EDIT_CARD_STEPS.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1 pb-2.5 bg-[#F8FAFC]/85 backdrop-blur-md border-b border-[#EEF2F7]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#B45309]"><Sparkles size={13} className="text-[#F7B31C]" /> Build your card</span>
        <span className="text-[11px] font-medium text-[#94A3B8] tabular-nums">Step {idx + 1} of {total}</span>
      </div>
      <div ref={scroller} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        {EDIT_CARD_STEPS.map((s, i) => {
          const active = i === idx;
          const done = i < idx;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              ref={active ? activeChip : undefined}
              type="button"
              onClick={() => navigate(s.path)}
              className={`group flex items-center gap-1.5 shrink-0 h-8 pl-1.5 pr-3 rounded-full border transition-all ${
                active
                  ? "bg-[#0F172A] border-[#0F172A] text-white shadow-sm"
                  : done
                    ? "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]"
                    : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                active ? "bg-white text-[#0F172A]" : done ? "bg-[#F59E0B] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"
              }`}>
                {done ? <Check size={12} /> : <Icon size={12} strokeWidth={2.4} />}
              </span>
              <span className="text-[12px] font-semibold whitespace-nowrap">{s.short}</span>
            </button>
          );
        })}
      </div>
      <div className="h-1 rounded-full bg-[#E9EEF5] overflow-hidden mt-1.5">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#F7B31C,#D97706)" }} />
      </div>
    </div>
  );
}

export function JourneyContinue() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const idx = currentStepIndex(pathname);
  if (idx < 0) return null;

  const total = EDIT_CARD_STEPS.length;
  const prev = idx > 0 ? EDIT_CARD_STEPS[idx - 1] : null;
  const next = idx < total - 1 ? EDIT_CARD_STEPS[idx + 1] : null;
  const last = idx === total - 1;

  return (
    <div className="mt-6 mb-24 lg:mb-4">
      <div className="flex items-center gap-3">
        {prev ? (
          <button type="button" onClick={() => navigate(prev.path)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#475569] hover:bg-[#F8FAFC] active:scale-[0.98] transition-all">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">{prev.short}</span><span className="sm:hidden">Back</span>
          </button>
        ) : <span className="hidden sm:block" />}

        {last ? (
          <button type="button" onClick={() => navigate("/dashboard/view")} className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold active:scale-[0.98] transition-all">
            <Check size={17} /> All done — you're ready to share
          </button>
        ) : (
          <button type="button" onClick={() => navigate(next!.path)} className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold active:scale-[0.98] transition-all">
            <span className="truncate">Continue to {next!.label}</span> <ChevronRight size={17} className="shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
