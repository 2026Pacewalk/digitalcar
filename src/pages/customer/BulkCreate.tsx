import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { buildCardThumb } from "@/card-template/buildCard";
import { useCustomer, getAuthUser } from "@/hooks/useCustomer";
import { toast } from "sonner";
import {
  Plus, Trash2, FileSpreadsheet, X, Building2, IdCard,
  Rocket, AlertTriangle, ArrowRight, CreditCard, CheckCircle2,
  Users, Briefcase, ShoppingCart, TrendingDown, Loader2, Check, Palette, Sparkles,
} from "lucide-react";

type Member = { id: string; name: string; designation: string; phone: string; email: string };
let idCounter = 0;
const newMember = (): Member => ({ id: `m-${++idCounter}`, name: "", designation: "", phone: "", email: "" });

// Volume pricing — mirrors the public /bulk-cards page (per-card / year).
const GST_RATE = 0.18;
const TIERS = [
  { min: 10, max: 24, price: 799 }, { min: 25, max: 49, price: 699 },
  { min: 50, max: 99, price: 599 }, { min: 100, max: 249, price: 499 },
  { min: 250, max: Infinity, price: 399 },
];
const resolveTier = (qty: number) => TIERS.find((t) => qty >= t.min && qty <= t.max) ?? TIERS[0];
const BUNDLES = [
  { name: "Team", icon: Users, qty: 10, pricePerCard: 799, tagline: "Small teams & startups", accent: "#14B8A6", popular: false },
  { name: "Business", icon: Briefcase, qty: 25, pricePerCard: 699, tagline: "Growing companies & agencies", accent: "#F7B31C", popular: true },
  { name: "Enterprise", icon: Building2, qty: 100, pricePerCard: 499, tagline: "Large orgs & partners", accent: "#6366F1", popular: false },
];
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// Card thumbnails are FULL HTML documents (with their own <style>) — they MUST
// render inside an iframe, or their global `main{max-width}` CSS leaks into the
// dashboard layout. Scaled to fill the frame.
const THUMB_W = 375, THUMB_H = 560;
function ThumbFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={title} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px`, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

export default function BulkCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: cardsData } = trpc.card.list.useQuery();
  const { data: sub } = trpc.subscription.mySubscription.useQuery();
  const { data: me } = useCustomer();

  // ── Buy bulk cards (request → team invoices) ──
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyQty, setBuyQty] = useState(25);
  const [buyBundle, setBuyBundle] = useState<string>("Custom");
  const [buyForm, setBuyForm] = useState({ company: "", contactName: "", phone: "", email: "" });
  const bulkOrder = trpc.bulkOrder.create.useMutation({
    onSuccess: (r) => {
      if ((r as { ok?: boolean; error?: string })?.ok === false) { toast.error((r as { error?: string }).error || "Please add a phone or email."); return; }
      toast.success("Request sent! Our team will contact you with a quote within 24 hours.");
      setBuyOpen(false);
    },
    onError: () => toast.error("Could not send your request — please try again."),
  });
  const openBuy = (bundleName: string, qty: number) => {
    const au = getAuthUser();
    setBuyBundle(bundleName);
    setBuyQty(qty);
    setBuyForm({
      company: String(me.company_name || ""),
      contactName: String(me.name || au?.fullName || ""),
      phone: String(me.mobile1 || ""),
      email: String(me.email || au?.email || ""),
    });
    setBuyOpen(true);
  };
  const buyTier = resolveTier(buyQty);
  const buySubtotal = buyQty * buyTier.price;
  const buyTotal = buySubtotal * (1 + GST_RATE);
  const submitBuy = () => {
    if (!buyForm.phone.trim() && !buyForm.email.trim()) { toast.error("Add a phone or email so we can reach you."); return; }
    bulkOrder.mutate({
      company: buyForm.company.trim() || undefined,
      contactName: buyForm.contactName.trim() || undefined,
      phone: buyForm.phone.trim() || undefined,
      email: buyForm.email.trim() || undefined,
      quantity: buyQty,
      pricePerCard: buyTier.price,
      totalEstimate: Math.round(buyTotal),
      packageName: buyBundle,
    });
  };

  // All card designs live in the frontend TEMPLATES data (same source the
  // Templates page uses). Group them by category for the picker.
  // Designs come from the SAME admin-managed template presets as the Templates
  // page (super-admin controls these) — not a separate hardcoded list.
  const { data: presetData } = trpc.template.presets.useQuery();
  const presets = useMemo(() => (presetData?.list ?? []).filter((p) => p.active), [presetData]);
  const defaultStyle = useMemo(() => {
    const def = presets.find((p) => p.id === (presetData?.defaultId ?? 1));
    return def?.style ?? presets[0]?.style ?? null;
  }, [presets, presetData]);

  const used = cardsData?.total ?? 0;
  const maxCards: number = (sub as { package?: { maxCards?: number } } | undefined)?.package?.maxCards ?? 0;
  const remaining = maxCards > 0 ? Math.max(0, maxCards - used) : Infinity;

  const [companyName, setCompanyName] = useState("");
  const [selStyle, setSelStyle] = useState<number | null>(null);
  useEffect(() => { setSelStyle((cur) => (cur == null ? defaultStyle : cur)); }, [defaultStyle]);
  // Thumbnails previewed with the user's own details (stable — not per keystroke).
  const thumbs = useMemo(
    () => presets.map((p) => ({ ...p, html: buildCardThumb({ ...me, color: p.primary, color2: p.secondary }, p.style) })),
    [presets, me]
  );
  const [publish, setPublish] = useState(false);
  const [members, setMembers] = useState<Member[]>([newMember(), newMember(), newMember()]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const filled = members.filter((m) => m.name.trim());
  const overQuota = maxCards > 0 && filled.length > remaining;

  const bulkCreate = trpc.card.bulkCreate.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.count} card${res.count !== 1 ? "s" : ""} created successfully`);
      utils.card.list.invalidate();
      navigate("/dashboard/cards");
    },
    onError: (err) => toast.error(err.message || "Could not create cards"),
  });

  const updateMember = (id: string, key: keyof Member, val: string) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [key]: val } : m)));
  const addMember = () => setMembers((prev) => [...prev, newMember()]);
  const removeMember = (id: string) =>
    setMembers((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));

  const applyPaste = () => {
    const rows = pasteText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name = "", designation = "", phone = "", email = ""] = line.split(",").map((s) => s.trim());
      return { ...newMember(), name, designation, phone, email };
    });
    if (!rows.length) { toast.error("Nothing to import. Add one person per line."); return; }
    setMembers(rows);
    setPasteOpen(false); setPasteText("");
    toast.success(`${rows.length} member${rows.length > 1 ? "s" : ""} imported`);
  };

  const submit = () => {
    const payload = filled.map((m) => ({
      name: m.name.trim(),
      designation: m.designation.trim() || undefined,
      phone: m.phone.trim() || undefined,
      email: m.email.trim() || undefined,
    }));
    if (!payload.length) { toast.error("Add at least one member with a name."); return; }
    if (overQuota) { toast.error("You've exceeded your plan's card limit."); return; }
    bulkCreate.mutate({
      companyName: companyName.trim() || undefined,
      templateId: selStyle ?? undefined,
      publish,
      members: payload,
    });
  };

  const quotaLabel = useMemo(() => {
    if (maxCards <= 0) return "Unlimited on your current plan";
    return `${used} of ${maxCards} used · ${remaining} remaining`;
  }, [used, maxCards, remaining]);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Bulk Create Cards" subtitle="Create digital cards for your whole team at once" /></div>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        {/* How it works */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 sm:p-6 text-white shadow-premium">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-[#F7B31C]" /> Create cards for your whole team in minutes</h2>
          <p className="text-[12px] text-white/60 mt-1">One shared design & company — each person gets their own personalized card, link & QR.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { n: 1, icon: Palette, t: "Pick a design", d: "Choose one template — applied to every card." },
              { n: 2, icon: IdCard, t: "Add your team", d: "Type or paste names, phones & emails." },
              { n: 3, icon: Rocket, t: "Create & share", d: "We generate every card, ready to edit & send." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#F7B31C] text-[#0F172A] font-bold flex items-center justify-center shrink-0 text-sm">{s.n}</span>
                <div>
                  <p className="text-[13px] font-semibold flex items-center gap-1.5"><s.icon size={13} className="text-[#F7B31C]" /> {s.t}</p>
                  <p className="text-[11px] text-white/55 mt-0.5 leading-snug">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quota banner */}
        <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] flex items-center gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-[#F7B31C]" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold text-[#0F172A]">Card allowance</p>
            <p className="text-xs text-[#64748B] mt-0.5">{quotaLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#0F172A]">{filled.length}</p>
            <p className="text-[11px] text-[#94A3B8]">to create now</p>
          </div>
        </div>

        {/* Buy bulk cards — available to every user (request → team invoices) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#F7B31C]" />
              <h3 className="text-base font-semibold text-[#0F172A]">Buy bulk cards</h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><TrendingDown size={12} /> up to 60% off</span>
            </div>
            <p className="text-[12px] text-[#94A3B8]">No upfront payment — we send a quote & invoice.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BUNDLES.map((b) => (
              <div key={b.name} className={`rounded-2xl border p-4 flex flex-col ${b.popular ? "border-[#F7B31C] bg-[#FFFBEB]" : "border-[#E2E8F0] bg-white"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${b.accent}1a`, color: b.accent }}><b.icon size={16} /></span>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A] leading-none">{b.name}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{b.tagline}</p>
                  </div>
                  {b.popular && <span className="ml-auto text-[9px] font-bold text-[#92400E] bg-[#FDE68A] px-1.5 py-0.5 rounded-full">POPULAR</span>}
                </div>
                <p className="text-[22px] font-extrabold text-[#0F172A] mt-1">{inr(b.pricePerCard)}<span className="text-[11px] font-medium text-[#94A3B8]"> /card/yr</span></p>
                <p className="text-[11px] text-[#64748B] mb-3">{b.qty} cards · {inr(b.qty * b.pricePerCard)}/yr</p>
                <button onClick={() => openBuy(b.name, b.qty)} className={`mt-auto h-10 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${b.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"}`}>
                  Buy {b.name} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => openBuy("Custom", 25)} className="mt-3 text-[12px] font-semibold text-[#B45309] hover:underline">Need a custom quantity? Request a quote →</button>
        </div>

        {overQuota && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Over your plan limit</p>
              <p className="text-xs text-red-600 mt-0.5">
                You're trying to create {filled.length} cards but only {remaining} remain on your plan.
                Remove some members or{" "}
                <button onClick={() => navigate("/dashboard/subscription")} className="underline font-medium">upgrade your plan</button>.
              </p>
            </div>
          </div>
        )}

        {/* Step 1 — Choose a design (admin-managed templates) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <h3 className="text-[15px] font-semibold text-[#0F172A] flex items-center gap-1.5"><Palette size={16} className="text-[#F7B31C]" /> Choose a design</h3>
              <p className="text-[11px] text-[#94A3B8]">This template is applied to every card. {presets.length} designs available.</p>
            </div>
          </div>
          {presets.length === 0 ? (
            <div className="text-center py-8"><Palette size={24} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-xs text-[#94A3B8]">Loading designs…</p></div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {thumbs.map((t) => {
                const active = selStyle === t.style;
                return (
                  <button key={t.id} onClick={() => setSelStyle(t.style)} title={t.name}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${active ? "border-[#F7B31C] ring-2 ring-[#F7B31C]/25 scale-[1.02]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
                    <ThumbFrame html={t.html} title={t.name} />
                    {active && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#F7B31C] text-[#0F172A] flex items-center justify-center shadow"><Check size={12} /></span>}
                    <span className="block text-[9px] font-semibold text-[#475569] truncate px-1 py-1 bg-white">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2 — Company + publish */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <h3 className="text-[15px] font-semibold text-[#0F172A] flex items-center gap-1.5"><Building2 size={16} className="text-[#F7B31C]" /> Company details</h3>
          </div>
          <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Company name <span className="text-[#94A3B8] font-normal">(appears on every card)</span></label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Kumar Sweets Pvt. Ltd." className="input-premium w-full sm:max-w-md" />
          <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-4 h-4 accent-[#F7B31C]" />
            <span className="text-sm text-[#334155]">Publish all cards immediately <span className="text-[#94A3B8]">(otherwise saved as drafts you can edit first)</span></span>
          </label>
        </div>

        {/* Step 3 — Team members */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <h3 className="text-[15px] font-semibold text-[#0F172A] flex items-center gap-1.5"><IdCard size={16} className="text-[#F7B31C]" /> Add your team</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">{filled.length} ready</span>
            </div>
            <button onClick={() => setPasteOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors">
              <FileSpreadsheet size={14} className="text-[#F7B31C]" /> Bulk paste
            </button>
          </div>

          {pasteOpen && (
            <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#0F172A]">One person per line: <span className="text-[#94A3B8]">Name, Designation, Phone, Email</span></p>
                <button onClick={() => setPasteOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={15} /></button>
              </div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4}
                placeholder={"Rahul Sharma, Sales Manager, +91 XXXXX XXXXX, rahul@company.com\nPriya Nair, Designer, +91 XXXXX XXXXX, priya@company.com"}
                className="input-premium w-full resize-none font-mono text-xs" />
              <div className="flex justify-end mt-3">
                <button onClick={applyPaste} className="btn-gold h-9 px-4 inline-flex items-center gap-1.5"><Plus size={14} /> Import list</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 px-1">
              {["Name *", "Designation", "Phone", "Email", ""].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {members.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 items-center">
                <input value={m.name} onChange={(e) => updateMember(m.id, "name", e.target.value)} placeholder={`Member ${idx + 1} name`} className="input-premium w-full" />
                <input value={m.designation} onChange={(e) => updateMember(m.id, "designation", e.target.value)} placeholder="Designation" className="input-premium w-full" />
                <input value={m.phone} onChange={(e) => updateMember(m.id, "phone", e.target.value)} placeholder="Phone" className="input-premium w-full" />
                <div className="flex items-center gap-2">
                  <input value={m.email} onChange={(e) => updateMember(m.id, "email", e.target.value)} placeholder="Email" type="email" className="input-premium w-full" />
                  <button onClick={() => removeMember(m.id)} aria-label="Remove member" className="w-9 h-9 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addMember} className="mt-4 w-full h-11 rounded-xl border border-dashed border-[#CBD5E1] text-sm font-semibold text-[#64748B] hover:border-[#F7B31C] hover:text-[#0F172A] hover:bg-[#FEF3C7]/30 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Add another member
          </button>
        </div>

        {/* Submit */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Each member gets a personalized card with a profile + contact block, ready to edit.
          </div>
          <button
            onClick={submit}
            disabled={bulkCreate.isPending || !filled.length || overQuota}
            className="h-12 px-7 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {bulkCreate.isPending ? (
              <><span className="w-4 h-4 border-2 border-[#0F172A]/40 border-t-[#0F172A] rounded-full animate-spin" /> Creating…</>
            ) : (
              <><Rocket size={16} /> Create {filled.length || ""} Card{filled.length !== 1 ? "s" : ""} <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      {/* Buy bulk cards — request modal */}
      {buyOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" onClick={() => setBuyOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[#0F172A]">Request bulk cards</h3>
              <button onClick={() => setBuyOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={18} /></button>
            </div>
            <p className="text-xs text-[#64748B] mb-4">Tell us your details — our team confirms and shares an invoice. No payment now.</p>

            {/* Quantity + live price */}
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 mb-4">
              <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">How many cards?</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty((q) => Math.max(10, q - 5))} className="w-9 h-9 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white shrink-0">−</button>
                <input type="number" min={10} value={buyQty} onChange={(e) => setBuyQty(Math.max(10, Number(e.target.value) || 10))} className="input-premium w-full text-center" />
                <button onClick={() => setBuyQty((q) => q + 5)} className="w-9 h-9 rounded-lg gradient-gold text-[#0F172A] shrink-0">+</button>
              </div>
              <div className="flex items-center justify-between mt-3 text-[13px]">
                <span className="text-[#64748B]">{inr(buyTier.price)}/card · {buyQty} cards</span>
                <span className="font-bold text-[#0F172A]">{inr(buyTotal)} <span className="text-[10px] font-normal text-[#94A3B8]">incl. GST</span></span>
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-1">Minimum 10 cards. Price drops automatically as quantity grows.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">Company</label>
                <input value={buyForm.company} onChange={(e) => setBuyForm((f) => ({ ...f, company: e.target.value }))} placeholder="Your company" className="input-premium w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Contact name</label>
                  <input value={buyForm.contactName} onChange={(e) => setBuyForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Your name" className="input-premium w-full" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Phone</label>
                  <input value={buyForm.phone} onChange={(e) => setBuyForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="input-premium w-full" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">Email</label>
                <input value={buyForm.email} onChange={(e) => setBuyForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@company.com" type="email" className="input-premium w-full" />
              </div>
            </div>

            <button onClick={submitBuy} disabled={bulkOrder.isPending} className="mt-5 w-full h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all disabled:opacity-60">
              {bulkOrder.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send request for {buyQty} cards <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      )}
    </ResponsiveDashboardLayout>
  );
}
