import { useState } from "react";
import { Link } from "react-router";
import { Gift, Clock, CalendarClock, AlertTriangle, Sparkles, ArrowRight, X } from "lucide-react";
import { trpc } from "@/providers/trpc";

/* One calm, persistent lifecycle banner (never a popup — §8), driven by the
   server-authoritative trial engine (Phase 13). Shows the right message per
   stage: live → running → "N days left" → "ends today" → grace → expired (§9). */

type Tone = { bg: string; border: string; fg: string; icon: typeof Gift };
const TONES: Record<string, Tone> = {
  gold: { bg: "#FEF3C7", border: "#FDE68A", fg: "#92400E", icon: Gift },
  amber: { bg: "#FFF7ED", border: "#FED7AA", fg: "#9A3412", icon: Clock },
  grace: { bg: "#FFF1F2", border: "#FECDD3", fg: "#9F1239", icon: CalendarClock },
  red: { bg: "#FEF2F2", border: "#FECACA", fg: "#991B1B", icon: AlertTriangle },
  info: { bg: "#EFF6FF", border: "#BFDBFE", fg: "#1E40AF", icon: Sparkles },
};
const today = () => new Date().toISOString().slice(0, 10);

/* `paidPlan` — the account is on a paid subscription (Gold/Platinum), so the
   trial lifecycle is irrelevant: never show trial messaging to a paying user
   (a Platinum card that is already live must not read "start your free trial"). */
export default function TrialLifecycleBanner({ paidPlan = false }: { paidPlan?: boolean }) {
  const { data: t } = trpc.trial.me.useQuery(undefined, { retry: false });
  const [hidden, setHidden] = useState(() => localStorage.getItem("dc_trial_dismiss") === today());
  if (!t || paidPlan) return null;

  const n = t.daysLeft;
  let tone = "gold", cta = "Keep My Card Active", ctaTo = "/dashboard/subscription", dismissible = false;
  let title = "", sub = "";

  switch (t.status) {
    case "not_started":
      tone = "info"; title = "Publish your card to start your free trial";
      sub = "Your 30-day trial begins the moment you go live.";
      cta = "Go to builder"; ctaTo = "/dashboard/build"; dismissible = true; break;
    case "active":
      dismissible = true; tone = "gold";
      if (n >= 24) { title = "🎉 Your card is live!"; sub = "Share it and start getting noticed."; cta = "Share my card"; ctaTo = "/dashboard/view"; }
      else if (n >= 16) { title = `Your free trial is running — ${n} days left`; sub = "Add your services and share your card widely."; cta = "View my card"; ctaTo = "/dashboard/view"; }
      else { title = `${n} days left in your free trial`; sub = "Keep building — you can activate anytime."; }
      break;
    case "expiring_soon":
      tone = "amber";
      if (n <= 1) { title = "Your free trial ends today"; sub = "Keep your card active so it stays online for everyone you've shared it with."; }
      else { title = `Only ${n} days left in your free trial`; sub = "Keep your card active so it never goes offline."; }
      break;
    case "grace":
      tone = "grace";
      title = `Your trial ended — ${t.graceDaysLeft} grace day${t.graceDaysLeft === 1 ? "" : "s"} left`;
      sub = "Activate now to avoid your card going offline. Everything is still saved."; break;
    case "expired":
      tone = "red"; title = "Your free trial has ended";
      sub = "Your card and all its content are safely saved — activate a plan to bring it back online.";
      cta = "Activate My Card"; break;
    default:
      return null; // converted / cancelled
  }

  if (hidden && dismissible) return null;
  const s = TONES[tone];
  const Icon = s.icon;
  const light = tone === "gold" || tone === "info";
  const dismiss = () => { localStorage.setItem("dc_trial_dismiss", today()); setHidden(true); };

  return (
    <div className="relative rounded-2xl px-4 py-3.5 flex items-center gap-3.5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white"><Icon size={19} style={{ color: s.fg }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold leading-tight" style={{ color: s.fg }}>{title}</p>
        <p className="text-[12px] mt-0.5" style={{ color: s.fg, opacity: 0.85 }}>{sub}</p>
      </div>
      <Link to={ctaTo} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-bold transition-all active:scale-95"
        style={{ background: light ? "#fff" : s.fg, color: light ? s.fg : "#fff", border: light ? `1px solid ${s.border}` : "none" }}>
        {cta} <ArrowRight size={14} />
      </Link>
      {dismissible && <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100" style={{ color: s.fg }}><X size={15} /></button>}
    </div>
  );
}
