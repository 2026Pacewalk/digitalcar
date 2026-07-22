import { useState } from "react";
import { QrCode, Plus, Trash2, Pencil, X, Save, ImageOff } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Field, fieldCls, ImagePick, LimitBar } from "@/components/customer/ModuleShell";
import { useCustomer, useLocalList, packageLimit } from "@/hooks/useCustomer";
import { contentSeeder } from "@/lib/cardContent";

type Qr = { id: number; name: string; filename: string };
const blank: Omit<Qr, "id"> = { name: "Pay Online", filename: "" };

export default function CustomerQRCode() {
  const { data } = useCustomer();
  const limit = packageLimit(Number(data.package_id), "qrcode");
  const { items, add, update, remove } = useLocalList<Qr>("dc_qrcode", [], contentSeeder("qrcodes"));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Qr, "id">>(blank);
  const [confirm, setConfirm] = useState<number | null>(null);
  const full = items.length >= limit;

  const openAdd = () => { if (full) { toast.error("QR limit reached — upgrade your package."); return; } setForm(blank); setEditId(null); setOpen(true); };
  const openEdit = (q: Qr) => { setForm({ name: q.name, filename: q.filename }); setEditId(q.id); setOpen(true); };
  const save = () => {
    if (!form.filename) { toast.error("Please upload a QR image"); return; }
    if (editId !== null) { update(editId, form); toast.success("QR updated"); }
    else { add(form); toast.success("QR added"); }
    setOpen(false);
  };

  return (
    <ModuleShell title="Payment QR Codes" subtitle="Add QR codes so customers can scan & pay you directly" icon={QrCode}
      actions={<button onClick={openAdd} disabled={full} className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${full ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}><Plus size={16} /> Add More</button>}>
      <LimitBar used={items.length} limit={limit} unit="QR codes" />

      <div className="rounded-xl bg-[#FEF3C7]/50 border border-[#FDE68A] px-4 py-3 text-sm text-[#92400E]">
        Add your payment QR code details so customers can scan and pay directly to your bank/wallets.
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><QrCode size={24} className="text-[#94A3B8]" /></div>
          <p className="text-sm font-medium text-[#0F172A]">No payment QR codes yet</p>
          <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold"><Plus size={16} /> Add your first QR</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
              <div className="aspect-square bg-[#F8FAFC] flex items-center justify-center p-3">
                {q.filename ? <img src={q.filename} alt={q.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" /> : <ImageOff size={26} className="text-[#CBD5E1]" />}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-[#0F172A] text-center mb-2">{q.name}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(q)} className="flex-1 h-8 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center gap-1"><Pencil size={13} /> Update</button>
                  <button onClick={() => setConfirm(q.id)} className="w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center"><X size={18} /></button>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{editId !== null ? "Update QR" : "Add QR Code"}</h3>
            <div className="flex flex-col items-center gap-3">
              <ImagePick value={form.filename} onChange={(u) => setForm((f) => ({ ...f, filename: u }))} className="w-40 h-40" label="QR image" />
              <div className="w-full"><Field label="Label"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={fieldCls} placeholder="e.g. Pay Online" /></Field></div>
            </div>
            <div className="flex gap-3 mt-6">
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
            <h3 className="text-lg font-bold text-[#0F172A]">Delete this QR code?</h3>
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
