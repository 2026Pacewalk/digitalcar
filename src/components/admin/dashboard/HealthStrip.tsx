/* The plumbing, at a glance (super admin only): is email going out, is the
   payment gateway on and live, did the lifecycle emails run, is the EARLY20
   offer on. Each chip opens the setting behind it. */
import { CreditCard, Gift, Mail, MailWarning, Repeat } from "lucide-react";
import type { HealthSection } from "@contracts/admin-dashboard";
import { MaybeLink, type IconType } from "./bits";
import { ago, nf, toMs, useNow } from "./format";

type State = "ok" | "warn" | "bad" | "off";
const DOT: Record<State, { dot: string; word: string }> = {
  ok: { dot: "#16A34A", word: "working" },
  warn: { dot: "#D97706", word: "needs a look" },
  bad: { dot: "#DC2626", word: "problem" },
  off: { dot: "#94A3B8", word: "off" },
};

// The lifecycle job runs daily; past a day and a bit it has probably stopped.
const STALE_MS = 26 * 3600 * 1000;
const DAY_MS = 86_400_000;

/* The job stamps the (UTC) date it last ran rather than a time, so a bare date
   is compared by calendar day. */
function lifecycle(v: string | null, now: number): { value: string; state: State } {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const days = Math.round((Date.parse(new Date(now).toISOString().slice(0, 10)) - Date.parse(v)) / DAY_MS);
    return { value: days <= 0 ? "Ran today" : days === 1 ? "Ran yesterday" : `Last ran ${days} d ago`, state: days <= 1 ? "ok" : "warn" };
  }
  const t = toMs(v);
  if (t == null) return { value: "Never ran", state: "bad" };
  return { value: `Ran ${ago(v, now)}`, state: now - t > STALE_MS ? "warn" : "ok" };
}

export function HealthStrip({ health: h, canOpen }: { health: HealthSection; canOpen: (path: string) => boolean }) {
  const now = useNow(60_000);
  const run = lifecycle(h.lifecycleLastRun, now);
  const live = h.razorpay.mode === "live";
  const chips: { key: string; icon: IconType; label: string; value: string; state: State; to: string }[] = [
    { key: "smtp", icon: Mail, label: "Email", value: h.smtp ? "SMTP ok" : "Not set up", state: h.smtp ? "ok" : "bad", to: "/admin/settings?tab=email" },
    {
      key: "sent",
      icon: MailWarning,
      label: "Emails · 24 h",
      value: h.emailsFailed24h > 0 ? `${nf(h.emailsFailed24h)} failed` : `${nf(h.emailsSent24h)} sent, none failed`,
      state: h.emailsFailed24h > 0 ? "bad" : "ok",
      to: "/admin/email-log",
    },
    {
      key: "razorpay",
      icon: CreditCard,
      label: "Razorpay",
      value: h.razorpay.enabled ? `On · ${live ? "Live" : "Test mode"}` : "Off",
      state: !h.razorpay.enabled ? "off" : live ? "ok" : "warn",
      to: "/admin/settings?tab=payment",
    },
    {
      key: "lifecycle",
      icon: Repeat,
      label: "Lifecycle emails",
      value: run.value,
      state: run.state,
      to: "/admin/settings?tab=email",
    },
    { key: "offer", icon: Gift, label: "EARLY20 offer", value: h.trialOfferOn ? "On" : "Off", state: h.trialOfferOn ? "ok" : "off", to: "/admin/settings?tab=cards" },
  ];

  return (
    <section aria-labelledby="dash-health" className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] bg-dots p-3 sm:p-4">
      <h2 id="dash-health" className="px-1 mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#64748B]">System health</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {chips.map((c) => {
          const s = DOT[c.state];
          return (
            <li key={c.key} className="min-w-0">
              <MaybeLink
                to={c.to}
                allowed={canOpen(c.to)}
                label={`${c.label}: ${c.value} — ${s.word}`}
                className="group flex items-center gap-2.5 h-full rounded-xl bg-white border border-[#F1F5F9] px-3 py-2.5 shadow-sm transition-colors hover:border-[#E2E8F0]"
              >
                <span className="relative w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#475569] flex items-center justify-center shrink-0">
                  <c.icon size={15} />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ background: s.dot }} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-medium text-[#64748B] truncate">{c.label}</span>
                  <span className={`block text-[12.5px] font-semibold truncate ${c.state === "bad" ? "text-[#B91C1C]" : c.state === "warn" ? "text-[#B45309]" : "text-[#0F172A]"}`}>{c.value}</span>
                </span>
                <span className="sr-only">— {s.word}</span>
              </MaybeLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
