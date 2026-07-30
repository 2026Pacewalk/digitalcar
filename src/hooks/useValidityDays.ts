import { trpc } from "@/providers/trpc";

/**
 * The account's remaining validity — a single source of truth for "days left"
 * shown on the Dashboard, Card Builder, Profile and Settings.
 *
 * While the user is on a trial/grace period the SERVER trial clock (trial.me)
 * wins, so the number always matches the Card Builder and a stale local
 * `expired_on` (e.g. an imported multi-year value) can never override an
 * active 30-day trial. Only once the trial is converted (a real paid plan) do
 * we fall back to the stored plan expiry.
 */
export function useValidityDays(storedExpiredOn: unknown, fallbackDays: number) {
  const { data: trial } = trpc.trial.me.useQuery(undefined, { retry: false });

  const stored = (() => {
    const exp = String(storedExpiredOn || "");
    if (!exp || exp === "0000-00-00") return fallbackDays;
    const d = new Date(exp.replace(" ", "T"));
    return isNaN(d.getTime()) ? fallbackDays : Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  })();

  const s = trial?.status;
  const onTrial = s === "active" || s === "expiring_soon" || s === "grace";
  const days =
    s === "active" || s === "expiring_soon" ? trial!.daysLeft
    : s === "grace" ? trial!.graceDaysLeft
    : s === "expired" ? 0
    : stored; // not_started / converted (paid) / still loading

  // Effective end date — the trial end while on trial, else the stored expiry.
  const storedDate = (() => {
    const exp = String(storedExpiredOn || "");
    if (!exp || exp === "0000-00-00") return null;
    const d = new Date(exp.replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  })();
  const endsAt = onTrial && trial?.endsAt ? new Date(trial.endsAt) : storedDate;

  return { days, active: days > 0, onTrial, endsAt };
}
