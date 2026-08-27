import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, ImageOff, Tag, MousePointerClick, ChevronDown, Check, AlertTriangle, Type, Link2, Zap, Calendar, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Field, fieldCls, areaCls, ImagePick, LimitBar, Tip, SectionToggle } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, packageLimit } from "@/hooks/useCustomer";
import { contentSeeder, cleanPlain } from "@/lib/cardContent";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string; isOffer?: boolean; valid?: string };
const blank: Omit<Product, "id"> = { name: "", filename: "", price: "", offer_price: "", description: "", button: "", button_title: "Buy Now", isOffer: false, valid: "" };
const fmtDate = (s?: string) => { if (!s) return ""; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB").replace(/\//g, "-"); };

// Common business call-to-action labels (grouped for the dropdown)
const CTA_GROUPS: { label: string; options: string[] }[] = [
  { label: "Sales", options: ["Buy Now", "Order Now", "Shop Now", "Add to Cart", "Get Offer"] },
  { label: "Enquiry", options: ["Enquire Now", "Send Enquiry", "Get Quote", "Request Callback", "Know More", "Learn More"] },
  { label: "Booking", options: ["Book Now", "Book Appointment", "Book Site Visit", "Reserve Now"] },
  { label: "Contact", options: ["Call Now", "Contact Us", "WhatsApp Us", "Message Now", "Visit Us"] },
];
const CTA_OPTIONS = CTA_GROUPS.flatMap((g) => g.options);
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const DESC_MAX = 2000;

// Explains what a given button label will DO on the live card (smart actions)
const ctaHint = (title: string) => {
  const t = (title || "").toLowerCase();
  if (/call|phone|dial|ring/.test(t)) return "Dials your phone number";
  if (/whatsapp|chat/.test(t)) return "Opens WhatsApp with a ready message";
  if (/visit|map|location|direction|reach|near|store/.test(t)) return "Opens your Google Maps location";
  if (/mail|email/.test(t)) return "Opens the customer's email to you";
  if (/buy|order|shop|cart|book|reserve|site|web|learn|know|offer|quote|get/.test(t)) return "Opens your Button Link";
  return "Opens WhatsApp enquiry";
};

export default function CustomerProducts() {
  const { data } = useCustomer();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOfferTab = searchParams.get("tab") === "offers";
  const setTab = (t: "products" | "offers") => setSearchParams({ tab: t }, { replace: true });
  const { items: allItems, add, update, remove, persist, ready } = useLocalList<Product>("dc_products", [], contentSeeder("products"));
  const items = allItems.filter((p) => !!p.isOffer === isOfferTab);
  const productCount = allItems.filter((p) => !p.isOffer).length;
  const offerCount = allItems.filter((p) => p.isOffer).length;
  const limit = packageLimit(Number(data.package_id), isOfferTab ? "offer" : "product");

  // One-time merge of any legacy stand-alone offers (dc_offers) into this list as offers.
  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem("dc_offers::merged") === "1") return;
      localStorage.setItem("dc_offers::merged", "1");
      const raw = localStorage.getItem("dc_offers");
      const old = raw ? (JSON.parse(raw) as { title?: string; description?: string; filename?: string; valid?: string }[]) : [];
      if (Array.isArray(old) && old.length) {
        let nextId = Math.max(0, ...allItems.map((x) => x.id));
        const migrated: Product[] = old.map((o) => ({
          id: ++nextId, name: cleanPlain(o.title) || "Offer", filename: o.filename || "",
          price: "", offer_price: "", description: cleanPlain(o.description) || "",
          button: "", button_title: "Get Offer", isOffer: true, valid: o.valid || "",
        }));
        persist([...allItems, ...migrated]);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(blank);
  const [origDesc, setOrigDesc] = useState("");   // raw HTML description, preserved if untouched
  const [btCustom, setBtCustom] = useState(false); // whether the button title is a custom (non-preset) value
  const [ctaMenuFor, setCtaMenuFor] = useState<number | null>(null); // inline CTA editor open for product id
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null); // dimensions of the selected image
  const [confirm, setConfirm] = useState<number | null>(null);
  const full = items.length >= limit;

  const changeCta = (id: number, val: string) => { update(id, { button_title: val }); setCtaMenuFor(null); toast.success(`Button set to “${val}”`); };

  // Read the natural dimensions of the currently selected image
  useEffect(() => {
    if (!open || !form.filename) { setImgDim(null); return; }
    let cancelled = false;
    const im = new Image();
    im.onload = () => { if (!cancelled) setImgDim({ w: im.naturalWidth, h: im.naturalHeight }); };
    im.onerror = () => { if (!cancelled) setImgDim(null); };
    im.src = form.filename;
    return () => { cancelled = true; };
  }, [open, form.filename]);

  const dimStatus = (() => {
    if (!imgDim) return null;
    const ratio = imgDim.w / imgDim.h;
    if (imgDim.w < 300 || imgDim.h < 300) return { ok: false, msg: "Low resolution — use a larger image" };
    if (ratio < 0.8 || ratio > 1.25) return { ok: false, msg: "Best as a square (1:1) image" };
    return { ok: true, msg: "Great size!" };
  })();

  // Live pricing feedback inside the modal
  const fPrice = Number(String(form.price).replace(/[^\d.]/g, ""));
  const fOffer = Number(String(form.offer_price).replace(/[^\d.]/g, ""));
  const liveOff = fOffer > 0 && fPrice > 0 && fOffer < fPrice ? Math.round(((fPrice - fOffer) / fPrice) * 100) : 0;

  const openAdd = () => { if (full) { toast.error(`${isOfferTab ? "Offer" : "Product"} limit reached — upgrade your package.`); return; } setForm({ ...blank, isOffer: isOfferTab }); setOrigDesc(""); setBtCustom(false); setEditId(null); setOpen(true); };
  const openEdit = (p: Product) => { const { id, ...rest } = p; void id; setForm({ ...rest, description: cleanPlain(rest.description) }); setOrigDesc(rest.description); setBtCustom(!!rest.button_title && !CTA_OPTIONS.includes(rest.button_title)); setEditId(p.id); setOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error(`${form.isOffer ? "Offer" : "Product"} name is required`); return; }
    // Keep the original HTML (clickable link on the card) when the description wasn't edited
    const description = form.description === cleanPlain(origDesc) ? origDesc : form.description;
    const payload = { ...form, description };
    const label = form.isOffer ? "Offer" : "Product";
    if (editId !== null) { update(editId, payload); toast.success(`${label} updated`); }
    else { add(payload); toast.success(`${label} added`); }
    setOpen(false);
  };
  const set = (k: keyof Omit<Product, "id">, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleShell title={isOfferTab ? "Offers / Deals" : "Products / Services"} subtitle={isOfferTab ? "Promote limited-time offers on your card" : "Showcase what you sell on your card"} icon={isOfferTab ? Tag : ShoppingBag}
      actions={<button onClick={openAdd} disabled={full} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${full ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}><Plus size={16} /> {isOfferTab ? "Add Offer" : "Add Product"}</button>}>

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-[#F1F5F9] p-1 text-[13px] font-semibold">
        <button onClick={() => setTab("products")} className={`flex-1 h-9 rounded-lg transition-colors ${!isOfferTab ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>Products / Services{productCount ? ` (${productCount})` : ""}</button>
        <button onClick={() => setTab("offers")} className={`flex-1 h-9 rounded-lg transition-colors ${isOfferTab ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>Offers / Deals{offerCount ? ` (${offerCount})` : ""}</button>
      </div>

      {isOfferTab
        ? <SectionToggle flag="offer_on" label="Offers section" def={0} />
        : <SectionToggle flag="product_on" label="Products / Services section" />}
      <LimitBar used={items.length} limit={limit} unit={isOfferTab ? "offers" : "products"} />
      <Tip>{isOfferTab ? "Give every offer a deadline — a little urgency turns browsers into buyers. Convert any product into an offer with the ↻ button." : "Lead with your best-sellers and use sharp, square photos with a clear price and a \"Buy Now\" button — visitors decide in seconds."}</Tip>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">{isOfferTab ? <Tag size={24} className="text-[#94A3B8]" /> : <ShoppingBag size={24} className="text-[#94A3B8]" />}</div>
          <p className="text-sm font-medium text-[#0F172A]">No {isOfferTab ? "offers" : "products"} yet</p>
          <p className="text-xs text-[#94A3B8] mt-1 mb-4">Add {isOfferTab ? "offers to promote deals" : "products to display them"} on your digital card.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold"><Plus size={16} /> Add your first {isOfferTab ? "offer" : "product"}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => {
            const price = Number(String(p.price).replace(/[^\d.]/g, ""));
            const offer = Number(String(p.offer_price).replace(/[^\d.]/g, ""));
            const hasDiscount = offer > 0 && price > 0 && offer < price;
            const pct = hasDiscount ? Math.round(((price - offer) / price) * 100) : 0;
            const desc = cleanPlain(p.description);
            return (
              <div key={p.id} className="group relative bg-white rounded-2xl border border-[#F1F5F9] shadow-premium hover:shadow-gold/20 hover:-translate-y-1 hover:border-[#F7B31C]/40 transition-all duration-300 flex flex-col">
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-[#F8FAFC] to-[#EEF2F7] overflow-hidden rounded-t-2xl">
                  {p.filename
                    ? <img src={p.filename} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageOff size={28} className="text-[#CBD5E1]" /></div>}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.isOffer && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#F7B31C] to-[#D97706] text-white text-[9px] font-bold shadow-sm leading-none"><Sparkles size={8} /> OFFER</span>
                    )}
                    {hasDiscount && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white text-[9px] font-bold shadow-sm leading-none"><Tag size={8} /> {pct}% OFF</span>
                    )}
                  </div>

                  {/* Hover actions (always visible on mobile) */}
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-200">
                    <button onClick={() => { update(p.id, { isOffer: !p.isOffer }); toast.success(p.isOffer ? "Moved to Products / Services" : "Converted to Offer / Deal"); }} className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur shadow-md text-[#334155] hover:text-[#F7B31C] flex items-center justify-center" aria-label={p.isOffer ? "Move to products" : "Convert to offer"} title={p.isOffer ? "Move to Products / Services" : "Convert to Offer / Deal"}><Repeat size={14} /></button>
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur shadow-md text-[#334155] hover:text-[#F7B31C] flex items-center justify-center" aria-label="Edit"><Pencil size={14} /></button>
                    <button onClick={() => setConfirm(p.id)} className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur shadow-md text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center" aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-[#0F172A] line-clamp-1">{p.name}</h3>
                  {desc && <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed break-words">{desc}</p>}
                  {p.isOffer && p.valid && <p className="text-[10px] text-[#B45309] font-semibold mt-1.5 inline-flex items-center gap-1"><Calendar size={10} /> Valid till {fmtDate(p.valid)}</p>}

                  {/* Price */}
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-lg font-extrabold text-[#0F172A]">{inr(offer)}</span>
                          <span className="text-xs line-through text-[#94A3B8]">{inr(price)}</span>
                        </div>
                      ) : price > 0 ? (
                        <span className="text-lg font-extrabold text-[#0F172A]">{inr(price)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F7B31C] bg-[#FEF3C7] px-2 py-1 rounded-lg">Price on request</span>
                      )}
                    </div>
                    {hasDiscount && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">Save {inr(price - offer)}</span>}
                  </div>

                  {/* CTA — editable inline */}
                  <div className="mt-3 relative">
                    <button
                      onClick={() => setCtaMenuFor((m) => (m === p.id ? null : p.id))}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 hover:border-[#F7B31C] hover:text-[#0F172A] transition-colors"
                      title="Click to change the button label"
                    >
                      <MousePointerClick size={12} className="text-[#F7B31C]" /> {p.button_title || "Set button"} <ChevronDown size={12} className="text-[#94A3B8]" />
                    </button>
                    {ctaMenuFor === p.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setCtaMenuFor(null)} />
                        <div className="absolute left-0 bottom-full mb-1.5 z-30 w-52 max-h-64 overflow-y-auto bg-white rounded-xl shadow-premium-lg border border-[#F1F5F9] p-1.5">
                          {CTA_GROUPS.map((g) => (
                            <div key={g.label} className="mb-1 last:mb-0">
                              <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{g.label}</p>
                              {g.options.map((o) => (
                                <button key={o} onClick={() => changeCta(p.id, o)} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${o === p.button_title ? "bg-[#FEF3C7] text-[#B45309]" : "text-[#334155] hover:bg-[#F8FAFC]"}`}>
                                  <MousePointerClick size={12} className="text-[#F7B31C] shrink-0" /> {o}
                                  {o === p.button_title && <Check size={12} className="ml-auto text-emerald-500" />}
                                </button>
                              ))}
                            </div>
                          ))}
                          <div className="border-t border-[#F1F5F9] mt-1 pt-1">
                            <button onClick={() => { setCtaMenuFor(null); openEdit(p); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] text-left"><Pencil size={12} className="text-[#F7B31C]" /> Custom…</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-scale-in max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                {editId !== null ? <Pencil size={18} className="text-[#0F172A]" /> : <Plus size={18} className="text-[#0F172A]" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#0F172A]">{editId !== null ? "Edit" : "Add"} {form.isOffer ? "Offer / Deal" : "Product / Service"}</h3>
                <p className="text-xs text-[#64748B]">{form.isOffer ? "Promote a limited-time offer on your card" : "Showcase a product or service on your card"}</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0"><X size={18} /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Feature image — square 1:1 preview (recommended 600×600) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#334155]">Feature Image</label>
                  <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">1:1 · 600×600px</span>
                </div>
                <ImagePick value={form.filename} onChange={(u) => set("filename", u)} className="w-full max-w-[260px] aspect-square mx-auto" label="Upload feature image" fit="contain" />
                <div className="mt-1.5 text-center">
                  {dimStatus ? (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${dimStatus.ok ? "text-emerald-600" : "text-amber-600"}`}>
                      {dimStatus.ok ? <Check size={12} /> : <AlertTriangle size={12} />} {imgDim!.w}×{imgDim!.h}px — {dimStatus.msg}
                    </span>
                  ) : <span className="text-[11px] text-[#94A3B8]">Upload a square photo — recommended <b className="text-[#64748B]">600×600px</b></span>}
                </div>
              </div>

              {/* Product Name */}
              <Field label="Product Name">
                <div className="relative"><Type size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={form.name} onChange={(e) => set("name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="e.g. SEO Service" /></div>
              </Field>

              {/* Description */}
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set("description", e.target.value.slice(0, DESC_MAX))} className={areaCls} placeholder="Briefly describe this product or service…" />
                <div className="flex justify-end mt-1"><span className={`text-[10px] ${form.description.length >= DESC_MAX ? "text-amber-600 font-semibold" : "text-[#94A3B8]"}`}>{form.description.length}/{DESC_MAX}</span></div>
              </Field>

              {/* Convert to offer toggle */}
              <div className={`rounded-xl border px-3.5 py-3 transition-colors ${form.isOffer ? "border-[#F7B31C] bg-[#FEF3C7]/40" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                  <span className="text-xs font-semibold text-[#334155] flex items-center gap-2"><Sparkles size={15} className="text-[#F7B31C]" /> Mark as Offer / Deal <span className="font-normal text-[#94A3B8]">(shows in the Offers tab)</span></span>
                  <input type="checkbox" checked={!!form.isOffer} onChange={(e) => set("isOffer", e.target.checked)} className="w-4 h-4 accent-[#F7B31C]" />
                </label>
                {form.isOffer && (
                  <div className="mt-3">
                    <Field label="Valid Until"><div className="relative"><Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input type="date" value={form.valid || ""} onChange={(e) => set("valid", e.target.value)} className={`${fieldCls} pl-9`} /></div></Field>
                  </div>
                )}
              </div>

              {/* Price (MRP) + Offer Price */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (MRP)">
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">₹</span><input inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} className={`${fieldCls} pl-7`} placeholder="999" /></div>
                </Field>
                <Field label="Offer Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">₹</span>
                    <input inputMode="numeric" value={form.offer_price} onChange={(e) => set("offer_price", e.target.value)} className={`${fieldCls} pl-7 pr-14`} placeholder="799" />
                    {liveOff > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white bg-gradient-to-r from-[#EF4444] to-[#F97316] px-1.5 py-0.5 rounded-md">{liveOff}% OFF</span>}
                  </div>
                </Field>
              </div>
              {liveOff > 0 && <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 -mt-1"><Check size={12} /> Customers save {inr(fPrice - fOffer)} on this product</p>}

              {/* CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Button Title" hint="What should the button say?">
                  <select
                    value={btCustom ? "__custom__" : (form.button_title || "Buy Now")}
                    onChange={(e) => { if (e.target.value === "__custom__") { setBtCustom(true); set("button_title", ""); } else { setBtCustom(false); set("button_title", e.target.value); } }}
                    className={fieldCls}
                  >
                    {CTA_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </optgroup>
                    ))}
                    <option value="__custom__">✏️ Custom…</option>
                  </select>
                  {btCustom && <input autoFocus value={form.button_title} onChange={(e) => set("button_title", e.target.value)} className={`${fieldCls} mt-2`} placeholder="Type your own button text" />}
                </Field>
                <Field label="Button Link" hint="Where it takes customers (optional)">
                  <div className="relative"><Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={form.button} onChange={(e) => set("button", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://…" /></div>
                </Field>
              </div>

              {/* Live button preview + smart action */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] border border-dashed border-[#E2E8F0] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wide">Button preview</p>
                  <p className="text-[11px] text-[#475569] mt-1 flex items-center gap-1"><Zap size={11} className="text-[#F7B31C] shrink-0" /> {ctaHint(form.button_title || "")}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg gradient-gold text-[#0F172A] text-sm font-bold shadow-sm shrink-0"><MousePointerClick size={14} /> {form.button_title || "Button"}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 sm:px-6 py-4 border-t border-[#F1F5F9] sticky bottom-0 bg-white">
              <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
              <button onClick={save} className="flex-[1.5] h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"><Save size={16} /> {editId !== null ? "Save Changes" : "Add Product"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-[#0F172A]">Delete this product?</h3>
            <p className="text-sm text-[#64748B] mt-1.5">This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirm(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={() => { remove(confirm); setConfirm(null); toast.success("Product deleted"); }} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
