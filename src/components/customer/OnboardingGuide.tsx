import type { ComponentType } from "react";
import { ArrowRight, Check, Sparkles, Share2, Zap, TrendingUp } from "lucide-react";

export type GuideStep = {
  key: string;
  done: boolean;
  title: string;
  impact: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
};

function Ring({ pct }: { pct: number }) {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
        <circle cx="38" cy="38" r={R} fill="none" stroke="#F7B31C" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-extrabold text-white leading-none tabular-nums">{pct}%</span>
        <span className="text-[8px] font-semibold uppercase tracking-wider text-white/50 mt-0.5">ready</span>
      </div>
    </div>
  );
}

export default function OnboardingGuide({
  steps, firstName, onNavigate, onShare,
}: {
  steps: GuideStep[];
  firstName: string;
  onNavigate: (path: string) => void;
  onShare: () => void;
}) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const pending = steps.filter((s) => !s.done);
  const complete = pending.length === 0;
  const [primary, ...rest] = pending;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-5 shadow-premium-lg ring-1 ring-black/5">
      <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-[#F7B31C]/20 blur-3xl pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Ring pct={pct} />
          <div className="min-w-0 flex-1">
            {complete ? (
              <>
                <p className="text-[15px] font-bold text-white flex items-center gap-1.5">Your card is 100% ready 🎉</p>
                <p className="text-[12px] text-white/60 mt-1 leading-snug">Now share it everywhere — every view is a potential customer.</p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-bold text-white">Let's finish your card, {firstName} 👋</p>
                <p className="text-[12px] text-white/60 mt-1 leading-snug">
                  {doneCount} of {total} done. Complete cards get up to <span className="text-[#F7B31C] font-semibold">3× more enquiries</span> — a few quick steps and you're ready to win leads.
                </p>
              </>
            )}
          </div>
        </div>

        {complete ? (
          <button onClick={onShare} className="mt-4 w-full h-12 rounded-2xl gradient-gold text-[#0F172A] font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
            <Share2 size={17} /> Share your card
          </button>
        ) : (
          <div className="mt-4 space-y-2.5">
            {/* Primary "start here" step */}
            {primary && (
              <button onClick={() => onNavigate(primary.path)}
                className="w-full text-left rounded-2xl bg-white p-3.5 flex items-center gap-3 shadow-premium hover:shadow-premium-lg transition-all active:scale-[0.98] ring-2 ring-[#F7B31C]/40">
                <span className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center shrink-0 shadow-gold">
                  <primary.icon size={20} className="text-[#0F172A]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"><Zap size={9} /> Start here</span>
                  </span>
                  <p className="text-[13px] font-bold text-[#0F172A] mt-1 truncate">{primary.title}</p>
                  <p className="text-[11px] text-[#64748B] leading-snug">{primary.impact}</p>
                </span>
                <ArrowRight size={18} className="text-[#F7B31C] shrink-0" />
              </button>
            )}

            {/* Remaining pending steps */}
            {rest.map((s) => (
              <button key={s.key} onClick={() => onNavigate(s.path)}
                className="w-full text-left rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/10 p-3 flex items-center gap-3 transition-colors active:scale-[0.98]">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <s.icon size={16} className="text-white/80" />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white truncate">{s.title}</p>
                  <p className="text-[10px] text-white/45 leading-snug truncate">{s.impact}</p>
                </span>
                <ArrowRight size={15} className="text-white/30 shrink-0" />
              </button>
            ))}

            {doneCount > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 px-1 pt-0.5">
                <Check size={13} /> {doneCount} step{doneCount > 1 ? "s" : ""} completed — nice work!
              </p>
            )}
          </div>
        )}

        {/* Motivational footer */}
        {!complete && (
          <div className="mt-3.5 flex items-center gap-2 text-[10px] text-white/40">
            <TrendingUp size={12} className="text-[#F7B31C]" />
            <span>Tip: a complete card with products, photos & reviews turns more visitors into paying customers.</span>
            <Sparkles size={12} className="text-[#F7B31C] shrink-0 ml-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
