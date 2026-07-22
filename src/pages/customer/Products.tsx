import { useState } from "react";
import { ShoppingBag, Plus, Pencil, Trash2, X, Save, ImageOff } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Field, fieldCls, areaCls, ImagePick, LimitBar } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, packageLimit } from "@/hooks/useCustomer";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
const blank: Omit<Product, "id"> = { name: "", filename: "", price: "", offer_price: "", description: "", button: "", button_title: "Buy Now" };

export default function CustomerProducts() {
  const { data } = useCustomer();
  const limit = packageLimit(Number(data.package_id), "product");
  const { items, add, update, remove } = useLocalList<Product>("dc_products");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(blank);
  const [confirm, setConfirm] = useState<number | null>(null);
  const full = items.length >= limit;

  const openAdd = () => { if (full) { toast.error("Product limit reached — upgrade your package."); return; } setForm(blank); setEditId(null); setOpen(true); };
  const openEdit = (p: Product) => { const { id, ...rest } = p; void id; setForm(rest); setEditId(p.id); setOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (editId !== null) { update(editId, form); toast.success("Product updated"); }
    else { add(form); toast.success("Product added"); }
    setOpen(false);
  };
  const set = (k: keyof Omit<Product, "id">, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleShell title="Products & Services" subtitle="Showcase what you sell on your card" icon={ShoppingBag}
      actions={<button onClick={openAdd} disabled={full} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${full ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}><Plus size={16} /> Add Product</button>}>
      <LimitBar used={items.length} limit={limit} unit="products" />

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><ShoppingBag size={24} className="text-[#94A3B8]" /></div>
          <p className="text-sm font-medium text-[#0F172A]">No products yet</p>
          <p className="text-xs text-[#94A3B8] mt-1 mb-4">Add products to display them on your digital card.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold"><Plus size={16} /> Add your first product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden card-hover">
              <div className="h-36 bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
                {p.filename ? <img src={p.filename} alt={p.name} className="w-full h-full object-cover" /> : <ImageOff size={26} className="text-[#CBD5E1]" />}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[#0F172A] truncate">{p.name}</h3>
                {p.description && <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {p.offer_price && <span className="text-sm font-bold text-[#0F172A]">₹{p.offer_price}</span>}
                  {p.price && <span className={`text-xs ${p.offer_price ? "line-through text-[#94A3B8]" : "font-bold text-[#0F172A] text-sm"}`}>₹{p.price}</span>}
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#F1F5F9]">
                  <button onClick={() => openEdit(p)} className="flex-1 h-8 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center gap-1"><Pencil size={13} /> Edit</button>
                  <button onClick={() => setConfirm(p.id)} className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-[#0F172A]">{editId !== null ? "Edit Product" : "Add Product"}</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="text-center"><ImagePick value={form.filename} onChange={(u) => set("filename", u)} className="w-24 h-24" label="Image" /></div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Field label="Name" full><input value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} placeholder="Product name" /></Field>
                  <Field label="Price (₹)"><input value={form.price} onChange={(e) => set("price", e.target.value)} className={fieldCls} placeholder="999" /></Field>
                  <Field label="Offer Price (₹)"><input value={form.offer_price} onChange={(e) => set("offer_price", e.target.value)} className={fieldCls} placeholder="799" /></Field>
                </div>
              </div>
              <Field label="Description"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={areaCls} placeholder="Short product description" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Button Title"><input value={form.button_title} onChange={(e) => set("button_title", e.target.value)} className={fieldCls} placeholder="Buy Now" /></Field>
                <Field label="Button Link"><input value={form.button} onChange={(e) => set("button", e.target.value)} className={fieldCls} placeholder="https://…" /></Field>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-[#F1F5F9]">
              <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={save} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold flex items-center justify-center gap-2"><Save size={16} /> {editId !== null ? "Save" : "Add"}</button>
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
