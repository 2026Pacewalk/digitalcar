import { useState } from "react";
import { Star, MapPin, ExternalLink, Info, Plus, Trash2, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls , AutoSaveBadge } from "@/components/customer/ModuleShell";
import { useLocalList } from "@/hooks/useCustomer";
import { useCardAutosave } from "@/hooks/useCardAutosave";

type Review = { id: number; name: string; rating: number; text: string; date?: string };

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/* Interactive / read-only star row */
function Stars({ value, onPick, size = 18 }: { value: number; onPick?: (n: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)}
          className={onPick ? "cursor-pointer active:scale-90 transition-transform" : "cursor-default"}>
          <Star size={size} className={n <= Math.round(value) ? "fill-[#FBBC05] text-[#FBBC05]" : "fill-[#E2E8F0] text-[#E2E8F0]"} />
        </button>
      ))}
    </div>
  );
}

export default function CustomerReviews() {
  const { val, set, status } = useCardAutosave();
  const reviews = useLocalList<Review>("dc_reviews", []);

  const reviewLink = val("google_review");
  const rating = Number(val("google_rating")) || 0;
  const count = val("google_review_count");
  const fillPct = Math.max(0, Math.min(100, (rating / 5) * 100));

  const MAX_REVIEWS = 5;
  const atLimit = reviews.items.length >= MAX_REVIEWS;
  const [draft, setDraft] = useState<{ name: string; rating: number; text: string }>({ name: "", rating: 5, text: "" });
  const addReview = () => {
    if (atLimit) return toast.error(`You can feature up to ${MAX_REVIEWS} reviews`);
    if (!draft.name.trim()) return toast.error("Add the reviewer's name");
    reviews.add({ name: draft.name.trim(), rating: draft.rating, text: draft.text.trim(), date: "" });
    setDraft({ name: "", rating: 5, text: "" });
    toast.success("Review added");
  };

  return (
    <ModuleShell title="Google Reviews" subtitle="Show your rating, featured reviews & a one-tap review button" icon={Star}
      actions={<AutoSaveBadge status={status} />}>

      {/* ── Rating summary ── */}
      <Panel title="Your Google Rating" subtitle="Shown as a summary at the top of the reviews section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Average rating (out of 5)" hint="e.g. 4.8 — copy it from your Google Business Profile">
            <input value={val("google_rating")} onChange={(e) => set("google_rating", e.target.value.replace(/[^\d.]/g, "").slice(0, 3))} inputMode="decimal" className={fieldCls} placeholder="4.8" />
          </Field>
          <Field label="Total number of reviews" hint="e.g. 127">
            <input value={val("google_review_count")} onChange={(e) => set("google_review_count", e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className={fieldCls} placeholder="127" />
          </Field>
        </div>
        {rating > 0 && (
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#4285F4]/[0.06] border border-[#4285F4]/15 p-4">
            <span className="text-4xl font-extrabold text-[#0F172A] leading-none">{rating.toFixed(1)}</span>
            <div>
              <div className="relative inline-block text-[19px] leading-none tracking-[2px] text-[#E2E5EA]">
                <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#FBBC05]" style={{ width: `${fillPct}%` }}>★★★★★</span>★★★★★
              </div>
              {count && <p className="text-xs text-[#64748B] mt-1.5 flex items-center gap-1.5"><GoogleG size={13} /> Based on {count} Google reviews</p>}
            </div>
          </div>
        )}
      </Panel>

      {/* ── Featured reviews ── */}
      <Panel title="Featured Reviews"
        subtitle="Optional — hand-pick up to 5 of your best reviews to showcase on the card"
        right={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${atLimit ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{reviews.items.length}/{MAX_REVIEWS}</span>}>
        {atLimit ? (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7]/50 px-4 py-3 mb-4 text-xs text-[#92400E] font-medium">
            You've added the maximum of {MAX_REVIEWS} featured reviews. Remove one to add another.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={fieldCls} placeholder="Reviewer name (e.g. Rohit K.)" />
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] font-medium">Rating</span>
                <Stars value={draft.rating} onPick={(n) => setDraft((d) => ({ ...d, rating: n }))} size={17} />
              </div>
            </div>
            <textarea value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} className={areaCls} placeholder="What did they say? (optional)" rows={2} />
            <button onClick={addReview} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors"><Plus size={15} /> Add review</button>
          </div>
        )}

        {reviews.items.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquareQuote size={22} className="mx-auto text-[#CBD5E1] mb-1.5" />
            <p className="text-xs text-[#94A3B8]">No featured reviews yet — this section is optional. Add a few above, or skip it.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reviews.items.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl border border-[#F1F5F9] p-3">
                <span className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0 text-[#0F172A] text-sm font-bold">{(r.name[0] || "G").toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[#0F172A] truncate">{r.name}</p>
                    <Stars value={r.rating} size={13} />
                  </div>
                  {r.text && <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed">{r.text}</p>}
                </div>
                <button onClick={() => reviews.remove(r.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-[#94A3B8] flex items-center justify-center shrink-0 transition-colors"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Review link ── */}
      <Panel title="Review Link" subtitle="Where the 'Write a Review' button sends customers">
        <div className="space-y-4">
          <Field label="Google Review Link" hint="Google Business Profile → Get more reviews → copy your review link">
            <div className="relative"><Star size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7B31C]" /><input value={val("google_review")} onChange={(e) => set("google_review", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://g.page/your-business/review" /></div>
          </Field>
          <Field label="Google Map Link" hint="Optional — your business location on Google Maps">
            <div className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14B8A6]" /><input value={val("google_map")} onChange={(e) => set("google_map", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://maps.google.com/…" /></div>
          </Field>
        </div>
      </Panel>

      {/* ── Preview ── */}
      <Panel title="Preview" subtitle="How the reviews section appears on your card">
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-2xl border border-[#E2E8F0] p-5 bg-gradient-to-b from-white to-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-3"><GoogleG size={20} /><span className="font-semibold text-[#0F172A] text-sm">Google Reviews</span></div>
            {rating > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-[#4285F4]/[0.06] border border-[#4285F4]/15 p-3 mb-3">
                <span className="text-2xl font-extrabold text-[#0F172A] leading-none">{rating.toFixed(1)}</span>
                <div>
                  <div className="relative inline-block text-[15px] leading-none tracking-[1px] text-[#E2E5EA]">
                    <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#FBBC05]" style={{ width: `${fillPct}%` }}>★★★★★</span>★★★★★
                  </div>
                  {count && <p className="text-[10px] text-[#64748B] mt-1">Based on {count} reviews</p>}
                </div>
              </div>
            )}
            {reviews.items.slice(0, 2).map((r) => (
              <div key={r.id} className="rounded-xl border border-[#F1F5F9] p-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#F7B31C] text-white flex items-center justify-center text-[10px] font-bold">{(r.name[0] || "G").toUpperCase()}</span>
                  <span className="text-[11px] font-bold text-[#0F172A]">{r.name}</span>
                  <Stars value={r.rating} size={10} />
                </div>
                {r.text && <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">{r.text}</p>}
              </div>
            ))}
            <a href={reviewLink || undefined} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold transition-all mt-1 ${reviewLink ? "bg-[#4285F4] text-white hover:bg-[#3367D6]" : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed pointer-events-none"}`}>
              <GoogleG size={16} /> Write a Review
            </a>
            {!reviewLink && <p className="text-[11px] text-[#94A3B8] mt-2 text-center">Add your review link to activate this button.</p>}
          </div>
        </div>
      </Panel>

      <div className="rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] p-4 flex gap-3">
        <Info size={18} className="text-[#3B82F6] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1E40AF] leading-relaxed">
          <b>Tip:</b> Enter your live Google rating &amp; review count, hand-pick a few of your best reviews, and paste your review link. Customers who tap “Write a Review” go straight to your Google review form.
          {reviewLink && <a href={reviewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-1 font-semibold underline">Test your link <ExternalLink size={11} /></a>}
        </div>
      </div>
    </ModuleShell>
  );
}
