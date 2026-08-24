import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Star, Pencil, Copy, X, Save, Eye, EyeOff, Archive, ShoppingBag, IndianRupee,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { demoForProduct } from "@/lib/demoData";

const THUMB_W = 375, THUMB_H = 626;

type Product = {
  id: number; slug: string; name: string; tagline?: string | null; description?: string | null;
  styleNumber: number; category?: string | null; price: string; salePrice?: string | null;
  currency: string; trialDays: number; primaryColor?: string | null; secondaryColor?: string | null;
  images?: string[] | null; seoTitle?: string | null; seoDescription?: string | null;
  templateCategory?: "basic" | "modern" | "bio" | "professional" | "premium";
  status: "draft" | "published" | "archived"; isFeatured: boolean; displayOrder: number;
};
type Draft = Partial<Product> & { name: string; styleNumber: number };

// Template taxonomy — the same categories the customer Templates page filters by.
const TEMPLATE_CATEGORIES = ["basic", "modern", "bio", "professional", "premium"] as const;
const CATEGORIES = ["Real Estate", "Doctors & Clinics", "Consultants", "Insurance", "Loan Advisors",
  "Chartered Accountants", "Lawyers", "Digital Marketers", "Photographers", "Beauty & Salon",
  "Education", "Restaurants", "Business Owners", "Corporate", "Freelancers"];

const inr = (v?: string | number | null) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* Card-front preview — same engine and industry-persona demo data as the public
   store, so the admin catalogue shows the exact card customers see. */
function Thumb({ style, primary, secondary, category }: { style: number; primary?: string | null; secondary?: string | null; category?: string | null }) {
  const html = useMemo(
    () => {
      const demo = demoForProduct({ styleNumber: style, category });
      return buildCardThumb({ ...DEFAULT_CUSTOMER, ...demo.customer, color: primary || "#F7B31C", color2: secondary || "" }, style);
    },
    [style, primary, secondary, category],
  );
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={`Style ${style}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: THUMB_W, height: THUMB_H, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-600", draft: "bg-amber-50 text-amber-600", archived: "bg-slate-100 text-slate-500",
};

export default function AdminProducts() {
  const utils = trpc.useUtils();
  const { data: list = [] } = trpc.product.listAll.useQuery(undefined);
  const create = trpc.product.create.useMutation();
  const update = trpc.product.update.useMutation();
  const clone = trpc.product.clone.useMutation();
  const setStatus = trpc.product.setStatus.useMutation();
  const setFeatured = trpc.product.setFeatured.useMutation();
  const refresh = () => utils.product.listAll.invalidate();

  const [filter, setFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [draft, setDraft] = useState<Draft | null>(null);

  const rows = filter === "all" ? list : list.filter((p) => p.status === filter);
  const counts = useMemo(() => ({
    all: list.length,
    published: list.filter((p) => p.status === "published").length,
    draft: list.filter((p) => p.status === "draft").length,
    archived: list.filter((p) => p.status === "archived").length,
  }), [list]);

  const save = async () => {
    if (!draft) return;
    if (!draft.name?.trim()) return toast.error("Give the product a name");
    try {
      if (draft.id) { await update.mutateAsync({ ...draft, id: draft.id }); toast.success("Product updated"); }
      else { await create.mutateAsync(draft); toast.success("Product created"); }
      setDraft(null); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
  };
  const doClone = async (id: number) => { try { await clone.mutateAsync({ id }); toast.success("Product cloned (draft)"); refresh(); } catch { toast.error("Clone failed"); } };
  const doStatus = async (id: number, status: Product["status"]) => { try { await setStatus.mutateAsync({ id, status }); refresh(); toast.success(status === "published" ? "Published" : status === "archived" ? "Archived" : "Set to draft"); } catch { toast.error("Failed"); } };
  const doFeature = async (p: Product) => { try { await setFeatured.mutateAsync({ id: p.id, featured: !p.isFeatured }); refresh(); } catch { toast.error("Failed"); } };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Products" subtitle="Your ecommerce catalogue — what customers browse, try and buy" /></div>
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#F1F5F9] rounded-xl p-1">
            {(["all", "published", "draft", "archived"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === k ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {k} <span className="opacity-60">{counts[k]}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setDraft({ name: "", styleNumber: 1, price: "999", trialDays: 30, currency: "INR", status: "draft", isFeatured: false })}
            className="h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-gold transition-all shrink-0">
            <Plus size={16} /> New product
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {rows.map((p) => (
            <div key={p.id} className={`relative rounded-2xl border-2 overflow-hidden bg-white transition-all ${p.isFeatured ? "border-[#F7B31C] shadow-gold" : "border-[#F1F5F9]"} ${p.status === "archived" ? "opacity-60" : ""}`}>
              {p.isFeatured && <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F7B31C] text-[#0F172A]"><Star size={10} /> Featured</span>}
              <span className={`absolute top-2 right-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>{p.status}</span>
              <Thumb style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} />
              <div className="p-2.5">
                <p className="text-[10px] font-semibold text-[#F7B31C] uppercase tracking-wide truncate">{p.category || "Uncategorised"}</p>
                <p className="text-[12.5px] font-bold text-[#0F172A] leading-tight line-clamp-2 min-h-[32px]">{p.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{p.templateCategory || "modern"}</span>
                  {p.isFeatured && <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded">★</span>}
                  <span className="text-[10px] text-[#94A3B8]">Style #{p.styleNumber}</span>
                </div>
                <div className="flex items-center gap-1 mt-2.5">
                  <button onClick={() => setDraft({ ...p, images: p.images ?? [] })} className="flex-1 h-7 rounded-lg bg-[#F1F5F9] text-[#334155] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#E2E8F0]"><Pencil size={11} /> Edit</button>
                  <button onClick={() => doClone(p.id)} title="Clone" className="w-7 h-7 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center hover:bg-[#E2E8F0]"><Copy size={12} /></button>
                  <button onClick={() => doFeature(p)} title="Feature" className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.isFeatured ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#0F172A] text-white hover:bg-[#1E293B]"}`}><Star size={12} /></button>
                  {p.status === "published"
                    ? <button onClick={() => doStatus(p.id, "draft")} title="Unpublish" className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"><EyeOff size={12} /></button>
                    : <button onClick={() => doStatus(p.id, "published")} title="Publish" className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"><Eye size={12} /></button>}
                  <button onClick={() => doStatus(p.id, "archived")} title="Archive" className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><Archive size={12} /></button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-[#F1F5F9] p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><ShoppingBag size={22} className="text-[#94A3B8]" /></div>
              <p className="text-sm font-medium text-[#0F172A]">No {filter === "all" ? "" : filter} products</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Create your first product to start selling.</p>
            </div>
          )}
        </div>
      </div>

      {draft && <ProductEditor draft={draft} setDraft={setDraft} onSave={save} saving={create.isPending || update.isPending} onClose={() => setDraft(null)} />}
    </ResponsiveDashboardLayout>
  );
}

function ProductEditor({ draft, setDraft, onSave, saving, onClose }: {
  draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; saving: boolean; onClose: () => void;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-[11px] font-semibold text-[#64748B] mb-1">{label}</label>{children}</div>
  );
  const inputCls = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-4xl relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9] shrink-0">
          <p className="text-base font-bold text-[#0F172A]">{draft.id ? "Edit product" : "New product"}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>

        <div className="flex flex-col sm:flex-row overflow-y-auto">
          {/* Live preview */}
          <div className="sm:w-[40%] bg-[#F8FAFC] p-4 flex flex-col items-center gap-3 shrink-0">
            <div className="w-[170px] rounded-xl overflow-hidden shadow-premium border border-[#E2E8F0]">
              <Thumb style={draft.styleNumber} primary={draft.primaryColor} secondary={draft.secondaryColor} category={draft.category} />
            </div>
            <F label={`Design (1–${TEMPLATE_COUNT})`}>
              <div className="flex flex-wrap gap-1 justify-center max-w-[220px]">
                {Array.from({ length: TEMPLATE_COUNT }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => set({ styleNumber: n })} className={`w-6 h-6 rounded-md text-[10px] font-bold ${draft.styleNumber === n ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"}`}>{n}</button>
                ))}
              </div>
            </F>
          </div>

          {/* Fields */}
          <div className="flex-1 p-5 space-y-3.5">
            <F label="Product name"><input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Luxury Real Estate Digital Business Card" className={inputCls} /></F>
            <F label="Tagline"><input value={draft.tagline || ""} onChange={(e) => set({ tagline: e.target.value })} placeholder="One-line hook shown on the product" className={inputCls} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Category"><select value={draft.category || ""} onChange={(e) => set({ category: e.target.value })} className={inputCls}><option value="">Uncategorised</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></F>
              <F label="Status"><select value={draft.status || "draft"} onChange={(e) => set({ status: e.target.value as Draft["status"] })} className={inputCls}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></F>
            </div>
            {/* Designs carry no individual price — the subscription covers them
                all, and ID/Membership are add-ons. Only the trial length here. */}
            <div className="grid grid-cols-2 gap-3">
              <F label="Template category"><select value={draft.templateCategory || "modern"} onChange={(e) => set({ templateCategory: e.target.value as Draft["templateCategory"] })} className={inputCls}>{TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}</select></F>
              <F label="Trial days"><input value={draft.trialDays ?? 30} onChange={(e) => set({ trialDays: Number(e.target.value) || 0 })} inputMode="numeric" className={inputCls} /></F>
            </div>
            <p className="text-[11px] text-[#94A3B8] -mt-1">No per-design price: every template is included in the customer&apos;s plan. ID &amp; Membership cards are paid add-ons.</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Primary colour"><div className="flex items-center gap-2"><input type="color" value={draft.primaryColor || "#F7B31C"} onChange={(e) => set({ primaryColor: e.target.value })} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" /><input value={draft.primaryColor || ""} onChange={(e) => set({ primaryColor: e.target.value })} placeholder="#F7B31C" className={`${inputCls} font-mono`} /></div></F>
              <F label="Secondary colour"><div className="flex items-center gap-2"><input type="color" value={draft.secondaryColor || "#0F172A"} onChange={(e) => set({ secondaryColor: e.target.value })} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" /><input value={draft.secondaryColor || ""} onChange={(e) => set({ secondaryColor: e.target.value })} placeholder="optional" className={`${inputCls} font-mono`} /></div></F>
            </div>
            <F label="Description"><textarea value={draft.description || ""} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="About this card — what's included, who it's for" className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#F7B31C] resize-y" /></F>
            <F label="Product images (one URL per line)"><textarea value={(draft.images || []).join("\n")} onChange={(e) => set({ images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={2} placeholder="https://…/mockup.png" className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#F7B31C] resize-y font-mono text-xs" /></F>
            <div className="grid grid-cols-1 gap-3">
              <F label="SEO title"><input value={draft.seoTitle || ""} onChange={(e) => set({ seoTitle: e.target.value })} placeholder="Defaults to product name" className={inputCls} /></F>
              <F label="SEO description"><input value={draft.seoDescription || ""} onChange={(e) => set({ seoDescription: e.target.value })} className={inputCls} /></F>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!draft.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} className="rounded accent-[#F7B31C]" /><span className="text-xs text-[#334155] font-medium">Feature on the storefront</span></label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[#F1F5F9] shrink-0">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-[#64748B] text-sm font-semibold hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-50">
            <Save size={16} /> {draft.id ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}
