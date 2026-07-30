import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState, useEffect } from "react";
import {
  Plus, Package, Check, X, Pencil, Trash2, Zap, Users, Building2, Crown,
  ListChecks, Search, ShoppingBag, Image, Video, Tag, Upload,
  Calendar, IndianRupee, Layers, ChevronUp, ChevronDown, ExternalLink, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const planIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  starter: Zap, professional: Users, business: Building2, enterprise: Crown,
  trial: Zap, gold: Crown, platinum: Building2,
};

/* ── Package Feature List — dynamic, DB-backed (app_settings), editable here and
   read by the public pricing page. Each feature can deep-link to its real page. */
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><ListChecks size={19} className="text-[#F7B31C]" /></div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              Package Feature List
              {save.isPending && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-[#94A3B8]"><Loader2 size={11} className="animate-spin" /> saving…</span>}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">Shown live on the pricing page &amp; cards. Add a link to deep-link each feature.</p>
          </div>
        </div>
        {/* Audience tabs */}
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

      {/* List */}
      <div className="divide-y divide-[#F1F5F9]">
        {isLoading && !loaded && <div className="px-5 py-10 text-center text-sm text-[#94A3B8]"><Loader2 size={18} className="animate-spin mx-auto mb-2" /> Loading…</div>}
        {loaded && features.length === 0 && <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">No features yet. Add one below.</div>}

        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3 group hover:bg-[#F8FAFC] transition-colors">
            {/* reorder + number */}
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

        {/* Add row */}
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

/* ── Real packages from digitalcarda.in (package table) ── */
type Plan = {
  id: number; name: string; duration: number; amount: number; seo: number;
  product: number; offer: number; gallery: number; video: number; uploads: number;
};
const REAL_PACKAGES: Plan[] = [
  { id: 7, name: "Trial", duration: 30, amount: 0, seo: 0, product: 25, offer: 15, gallery: 20, video: 8, uploads: 5 },
  { id: 5, name: "Gold", duration: 365, amount: 999, seo: 0, product: 25, offer: 15, gallery: 20, video: 8, uploads: 5 },
  { id: 6, name: "Platinum", duration: 365, amount: 1999, seo: 1, product: 9999, offer: 9999, gallery: 60, video: 25, uploads: 20 },
];

const durationLabel = (d: number) => {
  const base = `${d} ${d > 1 ? "Days" : "Day"}`;
  if (d === 365) return `${base} · 1 Year`;
  if (d === 1095) return `${base} · 3 Years`;
  if (d % 365 === 0) return `${base} · ${d / 365} Years`;
  return base;
};

const blankPlan: Omit<Plan, "id"> = { name: "", duration: 365, amount: 0, seo: 1, product: 0, offer: 0, gallery: 0, video: 0, uploads: 0 };

function PackageList() {
  const [plans, setPlans] = useState<Plan[]>(REAL_PACKAGES);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Plan, "id">>(blankPlan);

  const openAdd = () => { setForm(blankPlan); setEditId(null); setShowForm(true); };
  const openEdit = (p: Plan) => { const { id, ...rest } = p; void id; setForm(rest); setEditId(p.id); setShowForm(true); };

  const save = () => {
    if (!form.name.trim()) { toast.error("Enter a package name"); return; }
    if (editId !== null) {
      setPlans((ps) => ps.map((p) => (p.id === editId ? { ...form, id: editId } : p)));
      toast.success("Package updated");
    } else {
      const id = Math.max(0, ...plans.map((p) => p.id)) + 1;
      setPlans((ps) => [...ps, { ...form, id }]);
      toast.success("Package added");
    }
    setShowForm(false); setEditId(null);
  };

  const remove = (id: number) => { setPlans((ps) => ps.filter((p) => p.id !== id)); toast.success("Package deleted"); };

  const numField = (label: string, key: keyof Omit<Plan, "id" | "name" | "seo">, icon: React.ComponentType<{ size?: number; className?: string }>) => {
    const Icon = icon;
    return (
      <div>
        <label className="block text-xs font-semibold text-[#334155] mb-1.5 flex items-center gap-1.5"><Icon size={13} className="text-[#94A3B8]" /> {label}</label>
        <input type="number" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))} className="h-10 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
      </div>
    );
  };

  const limitCols: { key: keyof Plan; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "product", label: "Products", icon: ShoppingBag },
    { key: "gallery", label: "Gallery", icon: Image },
    { key: "video", label: "Videos", icon: Video },
    { key: "offer", label: "Offers", icon: Tag },
    { key: "uploads", label: "Uploads", icon: Upload },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center"><Package size={19} className="text-[#F7B31C]" /></div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Package List</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Customer subscription plans, pricing &amp; content limits</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]">
          <Plus size={15} /> Add More
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="p-5 bg-[#F8FAFC] border-b border-[#F1F5F9]">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">{editId !== null ? "Edit Package" : "New Package"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium" className="h-10 w-full rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5 flex items-center gap-1.5"><IndianRupee size={13} className="text-[#94A3B8]" /> Amount</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="h-10 w-full rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5 flex items-center gap-1.5"><Calendar size={13} className="text-[#94A3B8]" /> Duration (days)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} className="h-10 w-full rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 transition-all" />
            </div>
            {numField("Products", "product", ShoppingBag)}
            {numField("Gallery", "gallery", Image)}
            {numField("Videos", "video", Video)}
            {numField("Offers", "offer", Tag)}
            {numField("Uploads", "uploads", Upload)}
            <label className="flex items-center gap-2 cursor-pointer self-end h-10">
              <input type="checkbox" checked={form.seo === 1} onChange={(e) => setForm((f) => ({ ...f, seo: e.target.checked ? 1 : 0 }))} className="rounded border-[#E2E8F0] accent-[#F7B31C] w-4 h-4" />
              <span className="text-xs font-semibold text-[#334155] flex items-center gap-1"><Search size={13} className="text-[#94A3B8]" /> SEO</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-ghost h-10">Cancel</button>
            <button onClick={save} className="btn-gold h-10">{editId !== null ? "Save Changes" : "Add Package"}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              <th className="text-left px-5 py-2.5 w-12">SN</th>
              <th className="text-left px-3 py-2.5">Name</th>
              <th className="text-center px-3 py-2.5">SEO</th>
              <th className="text-right px-3 py-2.5">Amount</th>
              <th className="text-left px-3 py-2.5">Duration</th>
              {limitCols.map((c) => (
                <th key={c.key} className="text-center px-2 py-2.5"><span className="inline-flex flex-col items-center gap-0.5"><c.icon size={13} className="text-[#94A3B8]" />{c.label}</span></th>
              ))}
              <th className="text-right px-5 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {plans.map((p, i) => (
              <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-5 py-3 text-[#94A3B8] font-medium">{i + 1}</td>
                <td className="px-3 py-3">
                  <span className="font-semibold text-[#0F172A]">{p.name}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {p.seo === 1
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold"><Check size={11} /> Yes</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold"><X size={11} /> No</span>}
                </td>
                <td className="px-3 py-3 text-right font-bold text-[#0F172A] whitespace-nowrap">
                  {p.amount === 0 ? <span className="text-emerald-600">Free</span> : <>₹{p.amount.toLocaleString("en-IN")}</>}
                </td>
                <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">{durationLabel(p.duration)}</td>
                {limitCols.map((c) => (
                  <td key={c.key} className="px-2 py-3 text-center text-[#334155] font-medium">{(p[c.key] as number) >= 9999 ? "∞" : p[c.key]}</td>
                ))}
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-white hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0] flex items-center justify-center transition-all" aria-label="Edit"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={11} className="px-5 py-10 text-center text-sm text-[#94A3B8]">No packages. Click “Add More”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 bg-[#F8FAFC] text-[11px] text-[#94A3B8] flex items-center gap-1.5 border-t border-[#F1F5F9]">
        <Layers size={12} /> All plans include the 10 core card features. Limits are per-card maximums.
      </div>
    </div>
  );
}

// Limited-time upgrade offer (§68) — a site-wide promo % shown to users upgrading
// to a paid plan. Server-clamped to the hard cap; 0 turns it off.
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
    <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Tag size={15} className="text-[#F7B31C]" /> Limited-time upgrade offer</h3>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-md">A site-wide discount shown to users upgrading to a paid plan. Drag to set, or 0 to turn it off. Capped at {max}%.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <input type="range" min={0} max={max} value={value} onChange={(e) => setPct(Number(e.target.value))} className="w-36 accent-[#F7B31C]" aria-label="Offer percent" />
          <span className="w-12 text-center text-lg font-bold text-[#0F172A] tabular-nums">{value}%</span>
          <button onClick={() => save.mutate({ percent: value })} disabled={save.isPending} className="h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all disabled:opacity-60 active:scale-[0.98]">
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {value > 0
        ? <p className="text-xs text-[#16A34A] mt-3 font-medium">● Promo active — customers see &ldquo;{value}% off&rdquo; when upgrading.</p>
        : <p className="text-xs text-[#94A3B8] mt-3">No promo running.</p>}
    </div>
  );
}

export default function AdminPackages() {
  const { data: packages, isLoading, refetch } = trpc.package.list.useQuery();
  const deleteMutation = trpc.package.delete.useMutation({
    onSuccess: () => { toast.success("Package deleted"); refetch(); },
  });
  const [showForm, setShowForm] = useState(false);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Packages" subtitle="Manage subscription plans & features" /></div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Subscription Plans</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Define pricing tiers and features</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]">
            <Plus size={16} /> Create Plan
          </button>
        </div>

        <PromoOfferControl />

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">New Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input placeholder="Plan Name" className="input-premium" />
              <input placeholder="Price (monthly)" type="number" className="input-premium" />
              <input placeholder="Price (yearly)" type="number" className="input-premium" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => { setShowForm(false); toast.success("Plan created"); }} className="btn-gold">Create Plan</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(packages || []).map((pkg: Record<string, unknown>) => {
              const Icon = planIcons[(pkg.slug as string) || "starter"] || Package;
              const features = (pkg.features as string[]) || [];
              return (
                <div key={pkg.id as number} className={`bg-white rounded-2xl p-6 shadow-premium border-2 ${pkg.isPopular ? "border-[#F7B31C]" : "border-[#F1F5F9]"} card-hover relative`}>
                  {Boolean(pkg.isPopular) && (
                    <span className="absolute -top-3 left-6 px-3 py-1 gradient-gold text-[#0F172A] text-[11px] font-bold rounded-full">MOST POPULAR</span>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                      <Icon size={20} className="text-[#F7B31C]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A]">{pkg.name as string}</h3>
                      <p className="text-xs text-[#94A3B8]">{pkg.slug as string}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-[#0F172A]">₹{Number(pkg.monthlyPrice || 0).toLocaleString("en-IN")}</span>
                    <span className="text-sm text-[#94A3B8]">/month</span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {features.slice(0, 6).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                        <Check size={14} className="text-emerald-500 shrink-0" /> {f}
                      </div>
                    ))}
                    {features.length > 6 && <p className="text-xs text-[#94A3B8] pl-6">+{features.length - 6} more</p>}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-[#F1F5F9]">
                    <button className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this package?")) deleteMutation.mutate({ id: pkg.id as number }); }}
                      className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Package List ── */}
        <PackageList />

        {/* ── Package Feature List ── */}
        <PackageFeatureList />
      </div>
    </ResponsiveDashboardLayout>
  );
}
