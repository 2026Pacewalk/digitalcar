/* The bar above the phone preview while a template is being tried:
   "Previewing Indigo" with Cancel and Apply. Renders nothing otherwise.
   Desktop only — on phones the Templates editor keeps its bottom Apply bar,
   because the preview isn't beside the list there. */
import { Check, Eye, X } from "lucide-react";
import { useDesignDraft } from "@/lib/designDraft";

export default function DraftDesignBar({ className = "" }: { className?: string }) {
  const draft = useDesignDraft();
  if (!draft) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`hidden lg:flex items-center gap-2 rounded-2xl bg-[#0F172A] pl-3 pr-1.5 py-1.5 shadow-premium-lg ring-1 ring-black/5 dc-enter ${className}`}
    >
      <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
        <span className="w-3 h-3 rounded-full ring-1 ring-white/30" style={{ background: draft.color }} />
        {draft.color2 && <span className="w-3 h-3 rounded-full ring-1 ring-white/30 -ml-1.5" style={{ background: draft.color2 }} />}
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] text-[#CBD5E1] leading-tight">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#F7B31C]"><Eye size={11} /> Previewing</span>
        <span className="block truncate font-semibold text-white">{draft.name}</span>
      </span>
      <button type="button" onClick={draft.cancel}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-[12.5px] font-semibold text-[#CBD5E1] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
        <X size={14} /> Cancel
      </button>
      <button type="button" onClick={draft.apply}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl gradient-gold text-[#0F172A] text-[13px] font-bold hover:shadow-gold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Check size={15} /> Apply
      </button>
    </div>
  );
}
