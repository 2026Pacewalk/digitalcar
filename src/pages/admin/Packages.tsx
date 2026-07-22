import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import {
  Plus, Package, Check, X, Pencil, Trash2, Zap, Users, Building2, Crown,
  ListChecks, GripVertical, Search, ShoppingBag, Image, Video, Tag, Upload,
  Calendar, IndianRupee, Layers,
} from "lucide-react";
import { toast } from "sonner";

const planIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  starter: Zap, professional: Users, business: Building2, enterprise: Crown,
};

/* ── Real package features from digitalcarda.in (package_features table) ── */
type Feature = { id: number; name: string };
const CUSTOMER_FEATURES: Feature[] = [
  { id: 1, name: "Share cards with anyone, Unlimited times" },
  { id: 2, name: "Update card any time." },
  { id: 3, name: "Ecommerce Online Store" },
  { id: 4, name: "Company Logo / Profile Photo" },
  { id: 5, name: "Multiple Templates" },
  { id: 6, name: "Social Media Links" },
  { id: 7, name: "Payment Section" },
  { id: 8, name: "Contact Form Included" },
  { id: 9, name: "Special Page for Offers" },
  { id: 10, name: "Fully Dynamic Backend" },
];
const RESELLER_FEATURES: Feature[] = [
  { id: 101, name: "White-Label Reseller Panel" },
  { id: 102, name: "Add & Manage Customers" },
  { id: 103, name: "Assign Packages & Credits" },
  { id: 104, name: "Commission Reports" },
];

const toTitle = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

function PackageFeatureList() {
  const [type, setType] = useState<"customer" | "reseller">("customer");
  const [sets, setSets] = useState<Record<"customer" | "reseller", Feature[]>>({
    customer: CUSTOMER_FEATURES,
    reseller: RESELLER_FEATURES,
  });
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const features = sets[type];
  const setFeatures = (fn: (f: Feature[]) => Feature[]) =>
    setSets((prev) => ({ ...prev, [type]: fn(prev[type]) }));

  const addFeature = () => {
    const name = newName.trim();
    if (!name) { toast.error("Enter a feature name"); return; }
    const id = Math.max(0, ...Object.values(sets).flat().map((f) => f.id)) + 1;
    setFeatures((f) => [...f, { id, name }]);
    setNewName("");
    toast.success("Feature added");
  };

  const saveEdit = (id: number) => {
    const name = editName.trim();
    if (!name) { toast.error("Feature name can't be empty"); return; }
    setFeatures((f) => f.map((x) => (x.id === id ? { ...x, name } : x)));
    setEditId(null);
    toast.success("Feature updated");
  };

  const removeFeature = (id: number) => {
    setFeatures((f) => f.filter((x) => x.id !== id));
    toast.success("Feature deleted");
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
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
            <ListChecks size={19} className="text-[#F7B31C]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Package Feature List</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Features displayed across pricing plans &amp; cards</p>
          </div>
        </div>
        {/* Type tabs */}
        <div className="relative flex rounded-xl bg-[#F1F5F9] p-1 self-start">
          <span
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300"
            style={{ width: "calc((100% - 0.5rem) / 2)", left: `calc(0.25rem + ${type === "reseller" ? 1 : 0} * ((100% - 0.5rem) / 2))` }}
          />
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setType(t.id); setEditId(null); }} className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${type === t.id ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"}`}>
              <t.icon size={14} /> {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${type === t.id ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#E2E8F0] text-[#64748B]"}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-[#F1F5F9]">
        {/* Column header */}
        <div className="hidden sm:grid grid-cols-[48px_1fr_120px] items-center px-5 py-2.5 bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          <span>#</span><span>Feature Name</span><span className="text-right">Actions</span>
        </div>

        {features.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">No features yet. Add one below.</div>
        )}

        {features.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[36px_1fr_auto] sm:grid-cols-[48px_1fr_120px] items-center px-5 py-3 group hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <GripVertical size={14} className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              <span className="w-6 h-6 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-[#64748B]">{i + 1}</span>
            </div>

            {editId === f.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(f.id); if (e.key === "Escape") setEditId(null); }}
                className="h-9 w-full rounded-lg bg-white border border-[#F7B31C] px-3 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#F7B31C]/20 mr-3"
              />
            ) : (
              <span className="flex items-center gap-2 text-sm font-medium text-[#334155] pr-3">
                <Check size={14} className="text-emerald-500 shrink-0" /> {toTitle(f.name)}
              </span>
            )}

            <div className="flex items-center justify-end gap-1">
              {editId === f.id ? (
                <>
                  <button onClick={() => saveEdit(f.id)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors" aria-label="Save"><Check size={15} /></button>
                  <button onClick={() => setEditId(null)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors" aria-label="Cancel"><X size={15} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(f.id); setEditName(f.name); }} className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-white hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0] flex items-center justify-center transition-all" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => removeFeature(f.id)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" aria-label="Delete"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Add row */}
        <div className="flex items-center gap-2 px-5 py-3 bg-[#F8FAFC]">
          <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><Plus size={13} className="text-[#F7B31C]" /></span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFeature(); }}
            placeholder={`Add a new ${type} feature…`}
            className="h-9 flex-1 rounded-lg bg-white border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 transition-all placeholder:text-[#94A3B8]"
          />
          <button onClick={addFeature} className="h-9 px-4 gradient-gold text-[#0F172A] rounded-lg text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] flex items-center gap-1.5">
            <Plus size={15} /> Add
          </button>
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
  { id: 7, name: "Trial", duration: 7, amount: 0, seo: 0, product: 5, offer: 2, gallery: 5, video: 2, uploads: 1 },
  { id: 5, name: "Starter", duration: 365, amount: 1499, seo: 1, product: 15, offer: 5, gallery: 10, video: 5, uploads: 2 },
  { id: 6, name: "Standard", duration: 1095, amount: 2499, seo: 1, product: 20, offer: 10, gallery: 15, video: 10, uploads: 5 },
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
                  <td key={c.key} className="px-2 py-3 text-center text-[#334155] font-medium">{p[c.key]}</td>
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
              const Icon = planIcons[(pkg.code as string) || "starter"] || Package;
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
                      <p className="text-xs text-[#94A3B8]">{pkg.code as string}</p>
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
