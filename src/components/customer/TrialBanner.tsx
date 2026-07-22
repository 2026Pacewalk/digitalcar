import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Clock, Lock, Zap, TrendingUp, ArrowRight, AlertTriangle, Users, Eye, MessageSquare, BadgePercent } from "lucide-react";
import { getOfferExpiry, OFFER_PERCENT } from "@/lib/upgradeOffer";

/* FOMO-driven trial banner: live countdown, loss-aversion (their views/leads
   at risk), social proof, and urgency — nudging trial users to upgrade. */
export default function TrialBanner({ isTrial, expiredOn, days, views, leads }: {
  isTrial: boolean; expiredOn: string | null; days: number; views: number; leads: number;
}) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const [offerExp, setOfferExp] = useState<number>(0);
  useEffect(() => { if (isTrial) setOfferExp(getOfferExpiry()); }, [isTrial]);

  if (!isTrial) return null;

  const offerMs = offerExp - now;
  const offerActive = offerExp > 0 && offerMs > 0;
  const offerH = Math.floor(offerMs / 3_600_000);
  const offerM = Math.floor((offerMs % 3_600_000) / 60_000);

  const expiry = expiredOn && expiredOn !== "0000-00-00"
    ? new Date(String(expiredOn).replace(" ", "T").slice(0, 10) + "T23:59:59").getTime()
    : now + Math.max(0, days) * 86_400_000;
  const ms = expiry - now;
  const expired = ms <= 0;
  const dd = Math.max(0, Math.floor(ms / 86_400_000));
  const hh = Math.max(0, Math.floor((ms % 86_400_000) / 3_600_000));
  const mm = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const urgent = !expired && dd <= 7;

  // Only escalate to the FOMO banner when the trial is ending or over.
  if (!expired && !urgent) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FFF7E6] border border-[#FDE68A] p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0"><Zap size={17} /></span>
        <p className="text-xs text-[#92400E] flex-1 leading-snug"><b>{dd} days left</b> on your 30-day free trial. Upgrade anytime to unlock every feature.</p>
        <button onClick={() => navigate("/dashboard/subscription")} className="h-9 px-3.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors shrink-0">Upgrade</button>
      </div>
    );
  }

  const Chip = ({ n, l }: { n: number; l: string }) => (
    <div className="flex flex-col items-center bg-white/15 rounded-lg px-2.5 py-1.5 min-w-[46px]">
      <span className="text-lg font-extrabold text-white leading-none tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/60">{l}</span>
    </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 shadow-premium-lg ring-1 ring-black/5 ${expired ? "bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#450a0a]" : "bg-gradient-to-br from-[#b45309] via-[#c2410c] to-[#7c2d12]"}`}>
      <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${expired ? "bg-white/15" : "bg-white/15"} ${expired ? "" : "animate-pulse"}`}>
            {expired ? <Lock size={20} className="text-white" /> : <AlertTriangle size={20} className="text-white" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{expired ? "Trial ended" : "Trial ending soon"}</p>
            <h2 className="text-lg font-extrabold text-white leading-tight mt-0.5">
              {expired ? "Your card is paused — reactivate it now" : `Only ${dd > 0 ? `${dd} day${dd === 1 ? "" : "s"}` : `${hh}h`} left to keep your card live`}
            </h2>
            <p className="text-[12px] text-white/70 mt-1 leading-relaxed">
              {expired
                ? "Your public card is offline and no longer capturing leads. Upgrade to bring it back instantly — your data is safe."
                : "When your free trial ends, your card goes offline and stops collecting enquiries. Upgrade now to keep everything running."}
            </p>
          </div>
        </div>

        {/* Countdown (only while still ticking) */}
        {!expired && (
          <div className="flex items-center gap-2 mt-3.5">
            <Clock size={14} className="text-white/60 shrink-0" />
            <Chip n={dd} l="days" /><span className="text-white/40 font-bold">:</span>
            <Chip n={hh} l="hrs" /><span className="text-white/40 font-bold">:</span>
            <Chip n={mm} l="min" />
          </div>
        )}

        {/* Loss aversion — what's at risk */}
        {(views > 0 || leads > 0) && (
          <div className="flex items-center gap-4 mt-3.5 text-[11px] text-white/80">
            <span className="inline-flex items-center gap-1.5"><Eye size={13} className="text-white/60" /> <b>{views.toLocaleString("en-IN")}</b> views at risk</span>
            <span className="inline-flex items-center gap-1.5"><MessageSquare size={13} className="text-white/60" /> <b>{leads.toLocaleString("en-IN")}</b> leads at risk</span>
          </div>
        )}

        {/* Limited-time offer */}
        {offerActive && (
          <div className="flex items-center gap-2 mt-3.5 rounded-xl bg-white/12 ring-1 ring-white/15 px-3 py-2">
            <BadgePercent size={16} className="text-white shrink-0" />
            <p className="text-[12px] text-white flex-1 leading-tight"><b>{OFFER_PERCENT}% OFF</b> if you upgrade now</p>
            <span className="text-[11px] font-bold text-white bg-white/15 rounded-md px-2 py-1 tabular-nums">ends in {offerH}h {String(offerM).padStart(2, "0")}m</span>
          </div>
        )}

        {/* CTA + social proof */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mt-4">
          <button onClick={() => navigate("/dashboard/subscription")} className="flex-1 h-12 rounded-2xl bg-white text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-xl active:scale-[0.98] transition-all">
            {expired ? <><Zap size={17} /> Reactivate my card</> : <><TrendingUp size={17} /> Upgrade &amp; keep it live</>} <ArrowRight size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-white/70 justify-center sm:justify-start">
            <Users size={13} className="text-white/50" /> Join <b className="text-white">12,000+</b> businesses on paid plans
          </div>
        </div>
      </div>
    </div>
  );
}
