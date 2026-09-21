/* Which currency a visitor sees prices in, plus the USD price table.
 *
 * Public pages are server-rendered and cached per path (and at the Cloudflare
 * edge), so their HTML is ₹ for everyone. This hook therefore returns INR on the
 * server render AND the first client render, so hydration always matches, and
 * only after mount asks the server (currency.context) whether $ is on and what
 * the visitor's country suggests. Then the currency is, in order:
 *   the running paid plan's currency (lockedTo) → the visitor's saved choice →
 *   the server's suggestion.
 * It only picks which prices to SHOW and which currency to ASK for at checkout;
 * the server re-prices and re-checks every payment.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../api/router";
import { trpc } from "@/providers/trpc";
import { isCurrency, type Currency, type CurrencyContext, type UsdPriceTable } from "@contracts/money";

/* currency.context lives in api/currency-router.ts. Until that router is
   registered in api/router.ts this falls back to the shared contract type; once
   it is, the router's real output type is used, so a shape mismatch fails the
   build here instead of at runtime. */
type ContextData = inferRouterOutputs<AppRouter> extends { currency: { context: infer D } } ? D : CurrencyContext;
type ContextProc = {
  useQuery: (
    input: { devCountry?: string },
    opts: { enabled: boolean; staleTime: number; retry: number; refetchOnWindowFocus: boolean },
  ) => { data?: ContextData; isFetched: boolean };
};

/* The visitor's own ₹/$ choice. Kept in one module-level store so every hook
   instance on the page (the switch, the plan cards, the pay modal) moves together.
   localStorage is only a convenience: private mode or blocked storage just means
   the choice lasts for this page view. */
const STORAGE_KEY = "dc_currency";
const listeners = new Set<() => void>();
let saved: Currency | null | undefined; // undefined = not read yet

function readSaved(): Currency | null {
  if (saved === undefined) {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      saved = isCurrency(v) ? v : null;
    } catch { saved = null; }
  }
  return saved;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab switched currency.
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) { saved = undefined; onChange(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(onChange); window.removeEventListener("storage", onStorage); };
}

function saveChoice(c: Currency) {
  saved = c;
  try { window.localStorage.setItem(STORAGE_KEY, c); } catch { /* storage blocked: keep it in memory */ }
  listeners.forEach((fn) => fn());
}

// The server render never knows the visitor's choice.
const serverSnapshot = () => null;

/** Is $ checkout switched on, per the flag the server bakes into the page shell
    (api/lib/vite.ts → window.__dcSettings.usd)? Only an explicit `false` stops
    the question: a shell without the flag (local dev) asks the server as before. */
const usdSwitchedOn = () =>
  (globalThis as unknown as { __dcSettings?: { usd?: boolean } }).__dcSettings?.usd !== false;

export type UseCurrency = {
  /** "INR" until mounted and the server says USD is available. */
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** USD can be charged right now: show the ₹/$ switch only when true. */
  available: boolean;
  /** A running paid plan fixes the currency: disable the switch and say why. */
  locked: boolean;
  /** Edge country code, e.g. "US"; null when unknown. */
  country: string | null;
  /** USD list prices; null unless USD is available. */
  prices: UsdPriceTable | null;
  /** The server has answered (or failed); before that the page is showing ₹. */
  ready: boolean;
};

/**
 * @param opts.lockedTo The currency of the member's CURRENT paid plan, only while
 *   it is still running (the server's `paidPlanActive`: amount > 0, active or
 *   trial status, period not ended). Leave it out on public pages and for
 *   members without a running paid plan.
 */
export function useCurrency(opts: { lockedTo?: string | null } = {}): UseCurrency {
  const [mounted, setMounted] = useState(false);
  const [devCountry, setDevCountry] = useState<string | undefined>();
  useEffect(() => {
    // Local dev has no Cloudflare country header, so ?geo=US stands in for it.
    // The server ignores devCountry in production.
    if (import.meta.env.DEV) {
      const g = new URLSearchParams(window.location.search).get("geo");
      if (g && /^[a-z]{2}$/i.test(g)) setDevCountry(g.toUpperCase());
    }
    setMounted(true);
  }, []);

  const api = (trpc as unknown as { currency: { context: ContextProc } }).currency.context;
  const q = api.useQuery(devCountry ? { devCountry } : {}, {
    // Never during the server render or hydration — and not at all when the page
    // shell says $ checkout is switched off (api/lib/vite.ts bakes the flag in).
    // The answer is private + no-store, so with USD off this would be one
    // uncacheable origin call per visit for a constant. Absent (local dev, a
    // shell served without the script) means "ask", as before.
    enabled: mounted && usdSwitchedOn(),
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const choice = useSyncExternalStore(subscribe, readSaved, serverSnapshot);

  // Gate on `mounted` too: cached data from an earlier page must not change the
  // hydration render.
  const data = mounted ? q.data : undefined;
  const available = !!data?.usdAvailable;
  // Anything that isn't a known currency is a pre-USD row, which is INR.
  const lock: Currency | null = opts.lockedTo == null ? null : isCurrency(opts.lockedTo) ? opts.lockedTo : "INR";
  const suggested: Currency = data && isCurrency(data.suggested) ? data.suggested : "INR";
  const currency: Currency = available ? lock ?? choice ?? suggested : "INR";

  const setCurrency = useCallback((c: Currency) => { if (isCurrency(c)) saveChoice(c); }, []);

  return {
    currency,
    setCurrency,
    available,
    locked: available && lock !== null,
    country: data?.country ?? null,
    prices: available ? data?.prices ?? null : null,
    ready: mounted && q.isFetched,
  };
}
