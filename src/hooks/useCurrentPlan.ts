/* The member's current plan and billing term — ONE place that decides, shared by
 * the Subscription page and the Dashboard's Plans box so the two can never
 * disagree (the Dashboard used to show every plan as "365 Days" at the yearly
 * price, so a 3-Year member saw the wrong plan marked Active).
 *
 * Where the answer comes from:
 *  · A plan in the subscriptions table (paid, or set by the admin): the server
 *    decides isActive and the term (its stored billing cycle).
 *  · A self-signup trial with no row: the trial clock (trial.me).
 *  · A legacy card with no row: the account's primary card record — term
 *    worked out from its activated/expired dates.
 *
 * Use it in components that render INSIDE the dashboard layout: the layout
 * loads the member's card before showing its children, so the card fallback
 * reads real data, never the first-render placeholder.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useCustomer, DEFAULT_CUSTOMER, readAccountCustomer } from "@/hooks/useCustomer";

export type Term = "monthly" | "yearly" | "triennial";
export const TERMS: Term[] = ["monthly", "yearly", "triennial"];

/* Milliseconds from a date that may arrive as a Date (tRPC/superjson sends DB
   timestamps as Date objects) or as a "YYYY-MM-DD HH:MM:SS" string (card
   records). NaN when missing or unparseable. The old String(v).replace(" ", "T")
   turned every Date into NaN. */
export const toMs = (v: unknown): number => {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" && v.trim()) return new Date(v.trim().replace(" ", "T")).getTime();
  return NaN;
};

export function useCurrentPlan() {
  const subQ = trpc.subscription.mySubscription.useQuery();
  const subscription = subQ.data;
  const { data: packages } = trpc.package.list.useQuery();
  const { data: customer } = useCustomer();
  // The plan is account-level: read it from the PRIMARY card's record. The
  // active card (customer) is only a fallback before that record exists.
  const [accountRec] = useState(() => readAccountCustomer());
  const planRec = (accountRec ?? customer) as Record<string, unknown>;
  // A self-signup trial has no subscriptions row — its clock is the trial record.
  const { data: trial } = trpc.trial.me.useQuery(undefined, { retry: false });

  // Re-check expiry each minute, so a plan that ends while the page is open
  // stops being treated as running.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const legacyPkgId = Number(planRec?.package_id) || 0;
  const currentPkgId = subscription?.package?.id ?? (legacyPkgId || undefined);
  const currentPlan = (packages || []).find((p) => p.id === currentPkgId);
  const currentPlanName = subscription?.package?.name || currentPlan?.name || "Free";
  const currentPaid = Number(subscription?.amount) || 0;

  const onSignupTrial = !subscription && Number(currentPkgId) === 7 && !!trial
    && trial.status !== "not_started" && trial.status !== "converted";
  const expiryMs = subscription ? toMs(subscription.currentPeriodEnd)
    : onSignupTrial ? toMs(trial!.endsAt)
    : toMs(planRec?.expired_on);
  const planExpired = subscription
    ? !subscription.isActive || !Number.isFinite(expiryMs) || expiryMs <= now
    : onSignupTrial
      ? trial!.status === "expired" || trial!.status === "grace" || trial!.status === "cancelled"
      : !!currentPkgId && Number.isFinite(expiryMs) && expiryMs < now;

  // The billing term the member is actually on (null when not known / expired).
  const userCycle = ((): Term | null => {
    if (!currentPkgId || planExpired) return null;
    if (subscription) return subscription.term ?? null;
    if (Number(currentPkgId) === 7) return "monthly"; // the free trial is a 30-day term
    const start = toMs(planRec?.activated_on), end = toMs(planRec?.expired_on);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const days = (end - start) / 86_400_000;
    if (days < 62) return "monthly";
    if (days < 550) return "yearly"; // up to ~18 months counts as yearly
    return "triennial";
  })();

  // True once the answer is based on data fetched since the page opened (a
  // cached subscription can be stale) and, for members without one, their real
  // card record rather than the placeholder.
  const dataReady = subQ.isFetchedAfterMount && subQ.isSuccess && (!!subscription || customer !== DEFAULT_CUSTOMER);

  return {
    // True once the subscription has loaded at least once (success or error), so
    // a plan display never shows a guess from the card while it is still loading.
    subLoaded: subQ.isFetched,
    subscription, packages, customer,
    currentPkgId, currentPlan, currentPlanName, currentPaid,
    expiryMs, planExpired, userCycle, dataReady,
  };
}
