import { useState } from "react";
import { Star, Save, MapPin, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

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

export default function CustomerReviews() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { update(form); toast.success("Google review link saved"); setForm({}); };

  const reviewLink = val("google_review");

  return (
    <ModuleShell title="Google Reviews" subtitle="Let customers rate & review you on Google in one tap" icon={Star}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>

      <Panel title="Review Link" subtitle="Paste your Google 'Write a review' link">
        <div className="space-y-4">
          <Field label="Google Review Link" hint="From Google Business Profile → Get more reviews → copy your review link (e.g. https://g.page/…/review or https://search.google.com/local/writereview?placeid=…)">
            <div className="relative"><Star size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7B31C]" /><input value={val("google_review")} onChange={(e) => set("google_review", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://g.page/your-business/review" /></div>
          </Field>
          <Field label="Google Map Link" hint="Optional — your business location on Google Maps">
            <div className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14B8A6]" /><input value={val("google_map")} onChange={(e) => set("google_map", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://maps.google.com/…" /></div>
          </Field>
        </div>
      </Panel>

      <Panel title="Preview" subtitle="How the review button appears on your card">
        <div className="flex justify-center">
          <div className="w-full max-w-xs rounded-2xl border border-[#E2E8F0] p-5 text-center bg-gradient-to-b from-white to-[#F8FAFC]">
            <div className="flex items-center justify-center gap-2 mb-1"><GoogleG size={22} /><span className="font-semibold text-[#0F172A]">Google Reviews</span></div>
            <div className="flex items-center justify-center gap-0.5 my-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-[#FBBC05] text-[#FBBC05]" />)}
            </div>
            <p className="text-xs text-[#64748B] mb-3">Loved our service? Rate us on Google!</p>
            <a href={reviewLink || undefined} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold transition-all ${reviewLink ? "bg-[#4285F4] text-white hover:bg-[#3367D6]" : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed pointer-events-none"}`}>
              <Star size={16} className="fill-white" /> Write a Review
            </a>
            {!reviewLink && <p className="text-[11px] text-[#94A3B8] mt-2">Add your review link to activate this button.</p>}
          </div>
        </div>
      </Panel>

      <div className="rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] p-4 flex gap-3">
        <Info size={18} className="text-[#3B82F6] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1E40AF] leading-relaxed">
          <b>How to get your review link:</b> Open your <b>Google Business Profile</b> → <b>Get more reviews</b> → copy the short link. Paste it above. Customers who tap “Write a Review” on your card go straight to your Google review form.
          {reviewLink && <a href={reviewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-1 font-semibold underline">Test your link <ExternalLink size={11} /></a>}
        </div>
      </div>
    </ModuleShell>
  );
}
