/* Loading and error states for the dashboard. The skeleton is shaped like the
   page it stands in for — navy hero, action list, reseller band, tiles — so
   nothing jumps when the numbers arrive. */
import { CloudOff, RefreshCw } from "lucide-react";
import { Skel } from "./bits";
import { FOCUS } from "./format";

const card = "bg-white rounded-2xl border border-[#F1F5F9] shadow-premium";

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5" aria-busy="true">
      <p role="status" className="sr-only">Loading the dashboard…</p>

      <div className="lg:col-span-8 rounded-2xl gradient-navy p-4 sm:p-6 lg:p-7 space-y-5">
        <Skel dark className="h-4 w-44" />
        <div className="space-y-3">
          <Skel dark className="h-12 w-60 sm:w-72" />
          <Skel dark className="h-4 w-52" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => <Skel key={i} dark className="h-14 rounded-xl last:col-span-2 sm:last:col-span-1" />)}
        </div>
        <Skel dark className="h-[200px] sm:h-[230px] rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} dark className="h-[68px] rounded-xl" />)}
        </div>
      </div>

      <div className={`lg:col-span-4 ${card} p-4 sm:p-5 space-y-3`}>
        <div className="flex items-center gap-2.5">
          <Skel className="w-8 h-8 rounded-xl" />
          <div className="space-y-1.5 flex-1"><Skel className="h-3.5 w-28" /><Skel className="h-3 w-40" /></div>
        </div>
        <Skel className="h-1.5 w-full rounded-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[#F1F5F9] p-3">
            <Skel className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5"><Skel className="h-3 w-3/5" /><Skel className="h-2.5 w-4/5" /></div>
            <Skel className="w-8 h-7 rounded-full" />
          </div>
        ))}
      </div>

      <div className={`lg:col-span-12 ${card} p-4 sm:p-6 space-y-4`}>
        <div className="flex items-center gap-2.5">
          <Skel className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5"><Skel className="h-3.5 w-32" /><Skel className="h-3 w-48" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} className="h-[74px] rounded-xl" />)}
        </div>
        <Skel className="h-2.5 w-full rounded-full" />
      </div>

      <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${card} p-4 space-y-3`}>
            <div className="flex items-center gap-2"><Skel className="w-8 h-8 rounded-lg" /><Skel className="h-3 w-20" /></div>
            <Skel className="h-7 w-20" />
            <Skel className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className={`max-w-md mx-auto mt-6 ${card} p-6 sm:p-8 text-center`}>
      <span className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center"><CloudOff size={22} /></span>
      <h2 className="font-display mt-3 text-base font-bold text-[#0F172A]">The dashboard didn't load</h2>
      <p className="text-sm text-[#64748B] mt-1">Check your connection and try again. If it keeps happening, the server may be restarting — give it a minute.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className={`btn-gold dc-press mt-5 inline-flex items-center gap-2 disabled:opacity-60 ${FOCUS}`}
      >
        <RefreshCw size={15} aria-hidden="true" className={retrying ? "animate-spin" : ""} /> Try again
      </button>
    </div>
  );
}

/** Stands in a section's slot when the server couldn't build that section this
    time (not when the viewer lacks access — those stay out). The page refetches
    every minute, so it says it's retrying; the button just does it now. */
export function SectionFailed({ what, onRetry, retrying, className = "" }: {
  what: string;
  onRetry: () => void;
  retrying: boolean;
  className?: string;
}) {
  return (
    <div role="status" className={`${card} p-4 sm:p-5 flex items-center gap-3 min-w-0 ${className}`}>
      <span className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0"><CloudOff size={16} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#0F172A]">Couldn't load {what}</p>
        <p className="text-[12px] text-[#64748B]">{retrying ? "Retrying now…" : "Retrying on its own every minute."}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className={`dc-press shrink-0 inline-flex items-center gap-1.5 h-8 rounded-full bg-white border border-[#E2E8F0] px-3 text-[12px] font-semibold text-[#334155] shadow-sm hover:text-[#0F172A] hover:border-[#CBD5E1] disabled:opacity-60 ${FOCUS}`}
      >
        <RefreshCw size={13} aria-hidden="true" className={retrying ? "animate-spin" : ""} /> Try again
      </button>
    </div>
  );
}
