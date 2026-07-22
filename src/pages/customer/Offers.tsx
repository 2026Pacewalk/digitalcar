import { useMemo, useState } from "react";
import { Tag, Plus, Trash2, Pencil, X, Save, Search, ImageOff, Calendar } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Field, fieldCls, areaCls, ImagePick, LimitBar } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, packageLimit } from "@/hooks/useCustomer";

type Offer = { id: number; title: string; description: string; valid: string; filename: string };
const blank: Omit<Offer, "id"> = { title: "", description: "", valid: "", filename: "" };
const fmt = (s: string) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB").replace(/\//g, "-"); };

export default function CustomerOffers() {
  const { data } = useCustomer();
  const limit = packageLimit(Number(data.package_id), "offer");
  const { items, add, update, remove } = useLocalList<Offer>("dc_offers");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Offer, "id">>(blank);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const full = items.length >= limit;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((o) => o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q));
  }, [items, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => { if (full) { toast.error("Offer limit reached — upgrade your package."); return; } setForm(blank); setEditId(null); setOpen(true); };
  const openEdit = (o: Offer) => { const { id, ...rest } = o; void id; setForm(rest); setEditId(o.id); setOpen(true); };
  const save = () => {
    if (!form.title && !form.description) { toast.error("Add a title or description"); return; }
    if (editId !== null) { update(editId, form); toast.success("Offer updated"); }
    else { add(form); toast.success("Offer added"); }
    setOpen(false);
  };
  const set = (k: keyof Omit<Offer, "id">, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModuleShell title="Offers / Deals" subtitle="Promote your offers and deals on your card" icon={Tag}
      actions={<button onClick={openAdd} disabled={full} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${full ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}><Plus size={16} /> Add More</button>}>
      <LimitBar used={items.length} limit={limit} unit="offers" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          Show
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-9 bg-white rounded-lg px-2 border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select>
          entries
        </div>
        <div className="relative w-full sm:w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search offers…" className="w-full h-9 bg-white rounded-lg pl-9 pr-3 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="bg-[#F8FAFC]">
              {["SN", "Title", "Valid Date", "Description", "Image", "Action"].map((h) => <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pageRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#94A3B8]">No offers yet. Click “Add More”.</td></tr>
              ) : pageRows.map((o, i) => (
                <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors align-top">
                  <td className="px-4 py-3 text-[#94A3B8]">{(safePage - 1) * pageSize + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{o.title || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{fmt(o.valid)}</td>
                  <td className="px-4 py-3 text-xs text-[#475569] max-w-[260px]"><span className="line-clamp-2">{o.description || "—"}</span></td>
                  <td className="px-4 py-3">
                    <div className="w-14 h-14 rounded-lg bg-[#F8FAFC] overflow-hidden flex items-center justify-center">
                      {o.filename ? <img src={o.filename} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <ImageOff size={18} className="text-[#CBD5E1]" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(o)} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold hover:bg-[#1E293B]"><Pencil size={12} /> Update</button>
                      <button onClick={() => setConfirm(o.id)} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600"><Trash2 size={12} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC]">
            <p className="text-xs text-[#64748B]">Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-white disabled:opacity-40">Previous</button>
              <span className="w-8 h-8 rounded-lg gradient-gold text-[#0F172A] text-xs font-bold flex items-center justify-center">{safePage}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-white disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-[#0F172A]">{editId !== null ? "Update Offer" : "Add Offer"}</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <ImagePick value={form.filename} onChange={(u) => set("filename", u)} className="w-24 h-24" label="Image" />
                <div className="flex-1 space-y-3">
                  <Field label="Title"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} placeholder="Offer title" /></Field>
                  <Field label="Valid Date"><div className="relative"><Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input type="date" value={form.valid} onChange={(e) => set("valid", e.target.value)} className={`${fieldCls} pl-9`} /></div></Field>
                </div>
              </div>
              <Field label="Description"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={areaCls} placeholder="Offer details" /></Field>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-[#F1F5F9]">
              <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={save} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold flex items-center justify-center gap-2"><Save size={16} /> {editId !== null ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {confirm !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-[#0F172A]">Delete this offer?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirm(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={() => { remove(confirm); setConfirm(null); toast.success("Deleted"); }} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
