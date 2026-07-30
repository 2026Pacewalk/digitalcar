import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState, useEffect } from "react";
import {
  Plus, Package, Check, X, Pencil, Trash2, Users, Building2, Crown, Sparkles, Star,
  ListChecks, Tag, Layers, ChevronUp, ChevronDown, ExternalLink, Loader2,
} from "lucide-react";
import { toast } from "sonner";

/* ══════════════════════════════════════════════════════════════════════════
   1) PACKAGE FEATURE LIST — dynamic (app_settings), read by the pricing page.
   ═══════════════════════════════════════════════════════════════════════ */
type Feat = { name: string; link?: string };
type Audience = "customer" | "reseller";

function PackageFeatureList() {
  const utils = trpc.useUtils();
  const { data: apiFeatures, isLoading } = trpc.package.features.useQuery();
  const save = trpc.package.setFeatures.useMutation({
    onSuccess: () => utils.package.features.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const [type, setType] = useState<Audience>("customer");
  const [sets, setSets] = useState<Record<Audience, Feat[]>>({ customer: [], reseller: [] });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (apiFeatures && !loaded) {
      setSets({ customer: apiFeatures.customer ?? [], reseller: apiFeatures.reseller ?? [] });
      setLoaded(true);
    }
  }, [apiFeatures, loaded]);

  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");

  const features = sets[type];
  const persist = (list: Feat[]) => {
    setSets((prev) => ({ ...prev, [type]: list }));
    save.mutate({ audience: type, features: list.map((f) => ({ name: f.name, link: f.link || undefined })) });
  };
  const addFeature = () => {
    const name = newName.trim();
    if (!name) { toast.error("Enter a feature name"); return; }
    persist([...features, { name, link: newLink.trim() || undefined }]);
    setNewName(""); setNewLink(""); toast.success("Feature added");
  };
  const saveEdit = (i: number) => {
    const name = editName.trim();
    if (!name) { toast.error("Name can't be empty"); return; }
    persist(features.map((f, idx) => (idx === i ? { name, link: editLink.trim() || undefined } : f)));
    setEditIdx(null); toast.success("Feature updated");
  };
  const removeFeature = (i: number) => { persist(features.filter((_, idx) => idx !== i)); toast.success("Feature removed"); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= features.length) return;
    const list = [...features]; [list[i], list[j]] = [list[j], list[i]]; persist(list);
  };

  const tabs = [
    { id: "customer" as const, label: "Customer", icon: Users, count: sets.customer.length },
    { id: "reseller" as const, label: "Reseller", icon: Building2, count: sets.reseller.length },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><ListChecks size={19} className="text-[#F7B31C]" /></div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              Feature List
              {save.isPending && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-[#94A3B8]"><Loader2 size={11} className="animate-spin" /> saving…</span>}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">Shown live on the pricing page. Add a link to deep-link each feature.</p>
          </div>
        </div>
        <div className="relative flex rounded-xl bg-[#F1F5F9] p-1 self-start">
          <span className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300" style={{ width: "calc((100% - 0.5rem) / 2)", left: `calc(0.25rem + ${type === "reseller" ? 1 : 0} * ((100% - 0.5rem) / 2))` }} />
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setType(t.id); setEditIdx(null); }} className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${type === t.id ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}>
              <t.icon size={14} /> {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${type === t.id ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#E2E8F0] text-[#64748B]"}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[#F1F5F9]">
        {isLoading && !loaded && <div className="px-5 py-10 text-center text-sm text-[#94A3B8]"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading…</div>}
        {loaded && features.length === 0 && <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">No features yet. Add one below.</div>}

        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3 group hover:bg-[#F8FAFC] transition-colors">
            <div className="flex flex-col items-center gap-0.5 pt-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-5 h-4 rounded text-[#CBD5E1] hover:text-[#0F172A] disabled:opacity-30 flex items-center justify-center" aria-label="Move up"><ChevronUp size={13} /></button>
              <span className="w-6 h-6 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-[#64748B]">{i + 1}</span>
              <button onClick={() => move(i, 1)} disabled={i === features.length - 1} className="w-5 h-4 rounded text-[#CBD5E1] hover:text-[#0F172A] disabled:opacity-30 flex items-center justify-center" aria-label="Move down"><ChevronDown size={13} /></button>
            </div>
            {editIdx === i ? (
              <div className="flex-1 space-y-2">
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Feature name" className="h-9 w-full rounded-lg bg-white border border-[#F7B31C] px-3 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#F7B31C]/20" />
                <input value={editLink} onChange={(e) => setEditLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(i); if (e.key === "Escape") setEditIdx(null); }} placeholder="Link (optional) — e.g. /templates" className="h-9 w-full rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]" />
              </div>
            ) : (
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-medium text-[#334155] flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> {f.name}</p>
                {f.link && <a href={f.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#F7B31C] mt-1 ml-6"><ExternalLink size={10} /> {f.link}</a>}
              </div>
            )}
            <div className="flex items-center gap-1 pt-0.5">
              {editIdx === i ? (
                <>
                  <button onClick={() => saveEdit(i)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center" aria-label="Save"><Check size={15} /></button>
                  <button onClick={() => setEditIdx(null)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] flex items-center justify-center" aria-label="Cancel"><X size={15} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditIdx(i); setEditName(f.name); setEditLink(f.link || ""); }} className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-white hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0] flex items-center justify-center" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => removeFeature(i)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center" aria-label="Delete"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-5 py-3 bg-[#F8FAFC]">
          <span className="hidden sm:flex w-6 h-6 rounded-lg bg-[#FEF3C7] items-center justify-center shrink-0"><Plus size={13} className="text-[#F7B31C]" /></span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFeature(); }} placeholder={`New ${type} feature…`} className="h-9 flex-1 rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 placeholder:text-[#94A3B8]" />
          <input value={newLink} onChange={(e) => setNewLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFeature(); }} placeholder="Link (optional)" className="h-9 sm:w-48 rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] placeholder:text-[#94A3B8]" />
          <button onClick={addFeature} className="h-9 px-4 gradient-gold text-[#0F172A] rounded-lg text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"><Plus size={15} /> Add</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2) PROMO — limited-time upgrade offer (§68), server-clamped.
   ═══════════════════════════════════════════════════════════════════════ */
function PromoOfferControl() {
  const { data, refetch } = trpc.subscription.getUpgradeOffer.useQuery();
  const save = trpc.subscription.setUpgradeOffer.useMutation({
    onSuccess: (r) => { toast.success(r.percent > 0 ? `Promo live — ${r.percent}% off upgrades` : "Promo turned off"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [pct, setPct] = useState<number | null>(null);
  const value = pct ?? data?.percent ?? 0;
  const max = data?.max ?? 25;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Tag size={15} className="text-[#F7B31C]" /> Limited-time upgrade offer</h3>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-md">A site-wide discount shown when users upgrade to a paid plan. Drag to set, 0 = off. Max {max}%.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <input type="range" min={0} max={max} value={value} onChange={(e) => setPct(Number(e.target.value))} className="w-36 accent-[#F7B31C]" aria-label="Offer percent" />
          <span className="w-12 text-center text-lg font-bold text-[#0F172A] tabular-nums">{value}%</span>
          <button onClick={() => save.mutate({ percent: value })} disabled={save.isPending} className="h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-60 active:scale-[0.98]">{save.isPending ? "Saving…" : "Save"}</button>
        </div>
      </div>
      {value > 0
        ? <p className="text-xs text-[#16A34A] mt-3 font-medium">● Promo active — customers see &ldquo;{value}% off&rdquo; when upgrading.</p>
        : <p className="text-xs text-[#94A3B8] mt-3">No promo running.</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   3) PLAN EDITOR — real create/update against the DB.
   ═══════════════════════════════════════════════════════════════════════ */
const FEATURE_FLAGS: { key: string; label: string }[] = [
  { key: "featureLeadCapture", label: "Lead capture / enquiry form" },
  { key: "featureAnalytics", label: "Analytics dashboard" },
  { key: "featureCRM", label: "Built-in CRM" },
  { key: "featureCustomDomain", label: "Custom domain" },
  { key: "featureSEO", label: "SEO settings" },
  { key: "featureRemoveBranding", label: "Remove DigitalCarda branding" },
  { key: "featureAI", label: "AI content generator" },
  { key: "featureMultilingual", label: "Multi-language card" },
  { key: "featureWhiteLabel", label: "White-label (reseller)" },
  { key: "featurePrioritySupport", label: "Priority support" },
];
type AnyPkg = Record<string, unknown>;
const n = (v: unknown, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };

function PlanEditorModal({ plan, onClose, onSaved }: { plan: AnyPkg | null; onClose: () => void; onSaved: () => void }) {
  const build = (): Record<string, string | number | boolean> => {
    const base: Record<string, string | number | boolean> = {
      name: "", description: "", monthlyPrice: "0", yearlyPrice: "0", trialDays: 30,
      maxCards: 1, maxProducts: 25, maxGalleryImages: 20, maxVideos: 8, storageLimitMB: 500,
      isActive: true, displayOrder: 0,
    };
    FEATURE_FLAGS.forEach((x) => (base[x.key] = false));
    if (plan) {
      Object.keys(base).forEach((k) => { if (plan[k] !== undefined && plan[k] !== null) base[k] = plan[k] as string | number | boolean; });
      base.monthlyPrice = String(plan.monthlyPrice ?? "0");
      base.yearlyPrice = String(plan.yearlyPrice ?? "0");
      base.description = String(plan.description ?? "");
    }
    return base;
  };
  const [f, setF] = useState(build);
  const set = (k: string, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));
  const create = trpc.package.create.useMutation();
  const update = trpc.package.update.useMutation();
  const saving = create.isPending || update.isPending;

  const submit = async () => {
    if (!String(f.name).trim()) return toast.error("Plan name is required");
    const payload: Record<string, unknown> = {
      name: String(f.name).trim(), description: String(f.description || "") || undefined,
      monthlyPrice: String(f.monthlyPrice || "0"), yearlyPrice: String(f.yearlyPrice || "0"),
      trialDays: n(f.trialDays), maxCards: n(f.maxCards), maxProducts: n(f.maxProducts),
      maxGalleryImages: n(f.maxGalleryImages), maxVideos: n(f.maxVideos), storageLimitMB: n(f.storageLimitMB),
      isActive: !!f.isActive, displayOrder: n(f.displayOrder),
    };
    FEATURE_FLAGS.forEach((x) => (payload[x.key] = !!f[x.key]));
    try {
      if (plan?.id) await update.mutateAsync({ id: plan.id as number, ...payload });
      else {
        const slug = String(f.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "plan";
        await create.mutateAsync({ ...payload, slug } as never);
      }
      toast.success(plan?.id ? "Plan updated" : "Plan created");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  };

  const numField = (label: string, key: string, hint?: string) => (
    <div>
      <label className="block text-[11px] font-semibold text-[#334155] mb-1">{label}</label>
      <input type="number" value={String(f[key])} onChange={(e) => set(key, e.target.value)} className="h-9 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:bg-white" />
      {hint && <p className="text-[10px] text-[#94A3B8] mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#F1F5F9] px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-[#0F172A]">{plan?.id ? `Edit ${plan.name as string}` : "New Plan"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basics */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Basics</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Plan name</label>
                <input value={String(f.name)} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Gold" className="h-9 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:bg-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Tagline / description</label>
                <input value={String(f.description)} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Everything a business needs" className="h-9 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:bg-white" />
              </div>
              {numField("Display order", "displayOrder", "Lower = shown first")}
              <label className="flex items-center gap-2 self-end h-9 cursor-pointer">
                <input type="checkbox" checked={!!f.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 rounded accent-[#F7B31C]" />
                <span className="text-sm text-[#334155]">Active (shown on pricing page)</span>
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Pricing</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {numField("Monthly price (₹)", "monthlyPrice")}
              {numField("Yearly price (₹)", "yearlyPrice")}
              {numField("Trial days", "trialDays")}
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Limits <span className="font-normal normal-case text-[#CBD5E1]">— 9999 = unlimited</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {numField("Max cards", "maxCards")}
              {numField("Max products", "maxProducts")}
              {numField("Gallery images", "maxGalleryImages")}
              {numField("Videos", "maxVideos")}
              {numField("Storage (MB)", "storageLimitMB")}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Premium features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEATURE_FLAGS.map((flag) => (
                <label key={flag.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                  <input type="checkbox" checked={!!f[flag.key]} onChange={(e) => set(flag.key, e.target.checked)} className="w-4 h-4 rounded accent-[#F7B31C]" />
                  <span className="text-sm text-[#334155]">{flag.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#F1F5F9] px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="h-10 px-5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={submit} disabled={saving} className="h-10 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-gold disabled:opacity-60">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : plan?.id ? "Save changes" : "Create plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   4) PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const PLAN_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { trial: Sparkles, gold: Star, platinum: Crown };
const lim = (v: unknown) => (n(v) >= 9999 ? "∞" : String(n(v)));

export default function AdminPackages() {
  const { data: packages, isLoading, refetch } = trpc.package.list.useQuery();
  const del = trpc.package.delete.useMutation({ onSuccess: () => { toast.success("Plan deleted"); refetch(); }, onError: (e) => toast.error(e.message) });
  const [editor, setEditor] = useState<{ open: boolean; plan: AnyPkg | null }>({ open: false, plan: null });

  const plans = (packages || []) as AnyPkg[];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Packages" subtitle="Plans, pricing, limits & features — all live on the pricing page" /></div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Subscription Plans</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Edits here update the pricing page, checkout &amp; entitlements — one source of truth.</p>
          </div>
          <button onClick={() => setEditor({ open: true, plan: null })} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]">
            <Plus size={16} /> New Plan
          </button>
        </div>

        <PromoOfferControl />

        {/* Plans table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-[#F1F5F9]">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><Package size={19} className="text-[#F7B31C]" /></div>
            <div><h2 className="text-base font-semibold text-[#0F172A]">Plans</h2><p className="text-xs text-[#64748B] mt-0.5">Prices in ₹. Limits: 9999 shows as ∞.</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  <th className="text-left px-5 py-2.5">Plan</th>
                  <th className="text-right px-3 py-2.5">Monthly</th>
                  <th className="text-right px-3 py-2.5">Yearly</th>
                  <th className="text-center px-3 py-2.5">Trial</th>
                  <th className="text-center px-2 py-2.5">Cards</th>
                  <th className="text-center px-2 py-2.5">Products</th>
                  <th className="text-center px-2 py-2.5">Gallery</th>
                  <th className="text-center px-2 py-2.5">Videos</th>
                  <th className="text-center px-2 py-2.5">Premium</th>
                  <th className="text-center px-2 py-2.5">Status</th>
                  <th className="text-right px-5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {isLoading && <tr><td colSpan={11} className="px-5 py-10 text-center text-[#94A3B8]"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading…</td></tr>}
                {!isLoading && plans.length === 0 && <tr><td colSpan={11} className="px-5 py-10 text-center text-[#94A3B8]">No plans yet. Click “New Plan”.</td></tr>}
                {plans.map((p) => {
                  const Icon = PLAN_ICON[String(p.slug || "").toLowerCase()] || Package;
                  const premiumCount = FEATURE_FLAGS.filter((x) => p[x.key]).length;
                  return (
                    <tr key={p.id as number} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><Icon size={15} className="text-[#F7B31C]" /></span>
                          <div><p className="font-semibold text-[#0F172A] leading-none">{p.name as string}</p><p className="text-[11px] text-[#94A3B8] mt-0.5">{p.slug as string}</p></div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-[#0F172A] whitespace-nowrap">{n(p.monthlyPrice) === 0 ? <span className="text-emerald-600">Free</span> : `₹${n(p.monthlyPrice).toLocaleString("en-IN")}`}</td>
                      <td className="px-3 py-3 text-right font-medium text-[#0F172A] whitespace-nowrap">{n(p.yearlyPrice) === 0 ? "—" : `₹${n(p.yearlyPrice).toLocaleString("en-IN")}`}</td>
                      <td className="px-3 py-3 text-center text-[#64748B]">{n(p.trialDays)}d</td>
                      <td className="px-2 py-3 text-center text-[#334155] font-medium">{lim(p.maxCards)}</td>
                      <td className="px-2 py-3 text-center text-[#334155] font-medium">{lim(p.maxProducts)}</td>
                      <td className="px-2 py-3 text-center text-[#334155] font-medium">{lim(p.maxGalleryImages)}</td>
                      <td className="px-2 py-3 text-center text-[#334155] font-medium">{lim(p.maxVideos)}</td>
                      <td className="px-2 py-3 text-center"><span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-bold">{premiumCount}</span></td>
                      <td className="px-2 py-3 text-center">
                        {p.isActive
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold"><Check size={11} /> Live</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#94A3B8] text-[11px] font-semibold">Hidden</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditor({ open: true, plan: p })} className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-white hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0] flex items-center justify-center" aria-label="Edit"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete the ${p.name as string} plan?`)) del.mutate({ id: p.id as number }); }} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center" aria-label="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 bg-[#F8FAFC] text-[11px] text-[#94A3B8] flex items-center gap-1.5 border-t border-[#F1F5F9]">
            <Layers size={12} /> Per-plan feature bullets on the pricing page are generated automatically from these limits &amp; premium features.
          </div>
        </div>

        <PackageFeatureList />
      </div>

      {editor.open && <PlanEditorModal plan={editor.plan} onClose={() => setEditor({ open: false, plan: null })} onSaved={() => { setEditor({ open: false, plan: null }); refetch(); }} />}
    </ResponsiveDashboardLayout>
  );
}
