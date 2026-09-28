/* The greeting strip: who, what day it is in India, and how fresh the numbers
   are. The clock ticks only here, so the rest of the page doesn't re-render
   every second. */
import { RefreshCw } from "lucide-react";
import { FOCUS, istDate, istParts, useNow } from "./format";

export function DashboardHeader({ name, updatedAt, fetching, failed, partial, onRefresh }: {
  name: string;
  updatedAt: number;
  fetching: boolean;
  /** The last request failed. With no data yet (updatedAt 0) nothing loaded at all. */
  failed: boolean;
  /** Loaded, but some sections came back as "couldn't load". */
  partial: boolean;
  onRefresh: () => void;
}) {
  const now = useNow(1000);
  const { hour } = istParts(now);
  const greet = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000));
  const fresh = !updatedAt ? "loading…" : secs < 5 ? "just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)} min ago`;
  const state = failed ? (updatedAt ? "stale" : "down") : partial ? "partial" : "live";

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#64748B]">{istDate(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="font-display text-[22px] sm:text-[26px] font-extrabold tracking-tight text-[#0F172A] leading-tight truncate">
          {greet}{name ? `, ${name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 h-9 rounded-full bg-white border border-[#E2E8F0] px-3 text-[12px] text-[#475569] shadow-sm tabular-nums">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${state === "live" ? "dc-live-dot bg-[#14B8A6]" : state === "down" ? "bg-[#DC2626]" : "bg-[#D97706]"}`} />
          {state === "down" ? <span className="text-[#B91C1C] font-medium">Couldn't load</span>
            : state === "stale" ? <span className="text-[#B45309] font-medium">Couldn't refresh</span>
            : state === "partial" ? <span className="text-[#B45309] font-medium">Some sections didn't load</span>
            : <span className="font-semibold text-[#0F172A]">Live</span>}
          {/* The longer "some sections" line drops the time on a phone so the pill keeps to one line. */}
          {state !== "down" && (
            <span className={`${state === "partial" ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-2`}>
              <span className="text-[#94A3B8]">·</span> updated {fresh}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={fetching}
          aria-label="Refresh the dashboard"
          title="Refresh"
          className={`dc-press w-9 h-9 rounded-full bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1] disabled:opacity-60 ${FOCUS}`}
        >
          <RefreshCw size={15} aria-hidden="true" className={fetching ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}
