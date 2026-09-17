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
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { EDIT_CARD_STEPS, currentStepIndex } from "./editCardSteps";
import { readCustomer, scopedKey } from "@/hooks/useCustomer";

/* Which steps are genuinely finished.

   The strip used to tick every chip BEFORE the current one, so opening
   "Reviews" ticked Basics through Gallery whether or not the owner had entered
   anything, and the progress bar measured position rather than work done.
   Completion is now read from the card itself, using the same checks as the
   dashboard guide. */
function listCount(base: string): number {
  try {
    const raw = localStorage.getItem(scopedKey(base));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

function useStepsDone(pathname: string): Record<string, boolean> {
  // Recheck when content changes anywhere in the app, and on every step change
  // (the page just left may have added something).
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("dc:content-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("dc:content-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  return useMemo(() => {
    const c = readCustomer() as unknown as Record<string, unknown>;
    const v = (k: string) => String(c[k] ?? "").trim();
    const done: Record<string, boolean> = {
      build: !!(v("name") && v("mobile1")),
      // A brand-new card carries no template until its owner picks one.
      templates: !!v("theme"),
      social: ["facebook", "twitter", "instagram", "youtube", "pinterest", "linkedin"].some((k) => v(k)),
      about: !!(v("about_us") || v("specialities") || v("nature")),
      products: listCount("dc_products") > 0,
      payments: !!(v("upi") || v("bank_name") || v("paytm_number") || v("phone_pe") || v("google_pay"))
        || listCount("dc_upi") + listCount("dc_banks") + listCount("dc_qrcode") > 0,
      media: listCount("dc_gallery") + listCount("dc_videos") > 0,
      reviews: !!v("google_review"),
      uploads: listCount("dc_uploads") > 0,
    };
    // "View Card" is nothing to fill in - it ticks once everything else is done.
    done.view = EDIT_CARD_STEPS.every((st) => st.key === "view" || done[st.key]);
    return done;
  }, [pathname, version]);
}

export function JourneyStrip() {
  const { pathname } = useLocation();
  // The unified editor has its own grouped navigation; a second step strip
  // there would just offer a way to leave the editor mid-edit.
  const inEditor = pathname.startsWith("/dashboard/build");
  const navigate = useNavigate();
  const idx = currentStepIndex(pathname);
  const doneMap = useStepsDone(pathname);
  const scroller = useRef<HTMLDivElement>(null);
  const activeChip = useRef<HTMLButtonElement>(null);

  // Keep the current step centred in the scroll strip as you move through.
  useEffect(() => {
    if (activeChip.current) activeChip.current.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [idx]);

  if (idx < 0 || inEditor) return null;
  const total = EDIT_CARD_STEPS.length;
  const doneCount = EDIT_CARD_STEPS.filter((s) => doneMap[s.key]).length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1 pb-2.5 bg-[#F8FAFC]/85 backdrop-blur-md border-b border-[#EEF2F7]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#B45309]"><Sparkles size={13} className="text-[#F7B31C]" /> Build your card</span>
        <span className="text-[11px] font-medium text-[#94A3B8] tabular-nums">{doneCount} of {total} done</span>
      </div>
      <div ref={scroller} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        {EDIT_CARD_STEPS.map((s, i) => {
          const active = i === idx;
          const done = !!doneMap[s.key];
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
        ) : null}

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
