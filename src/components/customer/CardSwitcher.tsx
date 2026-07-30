import { useState, useEffect, useRef } from "react";
import { CreditCard, ChevronDown, Plus, Check, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  getCards, getActiveCardId, setActiveCardId, createCard, deleteCard,
  accountPackageId, packageLimit, type CardMeta,
} from "@/hooks/useCustomer";

/* Multi-card switcher for the customer dashboard. Lets one login switch between
   its template cards and create new ones (gated by the plan's card limit). */
export default function CardSwitcher() {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [cards, setCards] = useState<CardMeta[]>([]);
  const [activeId, setActiveId] = useState(1);
  const [max, setMax] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  // Which cards are actually published live (have a public URL).
  const { data: published } = trpc.publish.myCards.useQuery(undefined, { retry: false });
  const removePub = trpc.publish.removeCard.useMutation();
  const liveIds = new Set((published || []).map((p) => Number(p.cardId)));
  // Super-admin per-user override wins over the plan default when set.
  const { data: limitInfo } = trpc.card.myLimit.useQuery(undefined, { retry: false });

  useEffect(() => {
    setCards(getCards());
    setActiveId(getActiveCardId());
  }, []);
  useEffect(() => {
    const override = limitInfo?.override;
    setMax(override != null ? override : packageLimit(accountPackageId(), "cards"));
  }, [limitInfo]);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const active = cards.find((c) => c.id === activeId) || cards[0];
  const atLimit = cards.length >= max;

  const switchTo = (id: number) => {
    if (id === activeId) { setOpen(false); return; }
    setActiveCardId(id);
    window.location.reload();               // re-read all card-scoped data
  };

  const submitNew = () => {
    const label = name.trim();
    if (!label) { inputRef.current?.focus(); return; }
    const meta = createCard(label);
    if (!meta) { toast.error(`Your plan includes ${max} card${max === 1 ? "" : "s"}. Upgrade to add more.`); return; }
    window.location.reload();
  };

  const removeCard = (id: number, label: string) => {
    if (!confirm(`Delete the card "${label}"? This can't be undone.`)) return;
    // Take its public URL offline too (best-effort), then drop local content.
    removePub.mutate({ cardId: id });
    deleteCard(id);
    window.location.reload();
  };

  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#F7B31C]/60 hover:bg-[#FFFBEB] transition-all max-w-[190px]"
        title="Switch card"
      >
        <span className="w-6 h-6 rounded-lg gradient-gold flex items-center justify-center shrink-0"><CreditCard size={13} className="text-[#0F172A]" /></span>
        <span className="text-xs font-semibold text-[#0F172A] truncate">{active.name}</span>
        {cards.length > 1 && <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] rounded-full px-1.5 shrink-0">{cards.length}</span>}
        <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setAdding(false); }} />
          <div className="absolute left-0 top-11 w-64 bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] p-2 z-20">
            <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Your cards ({cards.length}/{max})</p>
            <div className="max-h-64 overflow-y-auto">
              {cards.map((c) => (
                <div key={c.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => switchTo(c.id)}
                    className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${c.id === activeId ? "bg-[#FEF3C7]" : "hover:bg-[#F8FAFC]"}`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.id === activeId ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}><CreditCard size={13} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-[#0F172A] truncate">{c.name}</span>
                      <span className="block text-[10px] text-[#94A3B8] truncate">/{c.slug}</span>
                    </span>
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${liveIds.has(c.id) ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{liveIds.has(c.id) ? "Live" : "Draft"}</span>
                    {c.id === activeId && <Check size={14} className="text-[#16A34A] shrink-0" />}
                  </button>
                  {c.id !== 1 && (
                    <button onClick={() => removeCard(c.id, c.name)} aria-label="Delete card" className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#F1F5F9] mt-1.5 pt-1.5">
              {atLimit ? (
                <Link to="/dashboard/settings?tab=package" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#F8FAFC] transition-all">
                  <span className="w-7 h-7 rounded-lg bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center shrink-0"><Lock size={13} /></span>
                  <span>
                    <span className="block text-xs font-semibold text-[#0F172A]">Add another card</span>
                    <span className="block text-[10px] text-[#94A3B8]">Upgrade to Platinum for up to 3 cards</span>
                  </span>
                </Link>
              ) : adding ? (
                <div className="flex items-center gap-1.5 px-1.5 py-1">
                  <input
                    ref={inputRef} value={name} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setAdding(false); setName(""); } }}
                    placeholder="New card name…"
                    className="flex-1 h-9 px-2.5 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-[#F7B31C]"
                  />
                  <button onClick={submitNew} className="h-9 px-3 rounded-lg gradient-gold text-[#0F172A] text-xs font-bold shrink-0">Add</button>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#FEF3C7]/40 transition-all">
                  <span className="w-7 h-7 rounded-lg gradient-gold text-[#0F172A] flex items-center justify-center shrink-0"><Plus size={14} /></span>
                  <span className="text-xs font-semibold text-[#0F172A]">New card</span>
                </button>
              )}
            </div>
            <p className="px-2.5 pt-2 text-[10px] leading-snug text-[#94A3B8]">Switch to a card, fill it in <Link to="/dashboard/build" onClick={() => setOpen(false)} className="font-semibold text-[#B45309] hover:underline">Edit Card</Link>, then hit Publish — each card gets its own link &amp; QR. Set a custom link in <Link to="/dashboard/settings?tab=password" onClick={() => setOpen(false)} className="font-semibold text-[#B45309] hover:underline">Settings</Link>.</p>
          </div>
        </>
      )}
    </div>
  );
}
