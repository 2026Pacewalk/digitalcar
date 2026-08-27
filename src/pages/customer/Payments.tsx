import { useState } from "react";
import { Wallet, Save, Landmark, Smartphone, QrCode, Plus, Trash2, Pencil, X, ImageOff, Link2, AtSign } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, ImagePick, LimitBar, Tip, AutoSaveBadge } from "@/components/customer/ModuleShell";
import { useLocalList, packageLimit } from "@/hooks/useCustomer";
import { useCardAutosave } from "@/hooks/useCardAutosave";
import { contentSeeder } from "@/lib/cardContent";

type Upi = { id: number; label: string; upi: string };
type Bank = { id: number; holder: string; bank: string; account: string; ifsc: string; type: string };
type Qr = { id: number; name: string; filename: string };
const blankQr: Omit<Qr, "id"> = { name: "Pay Online", filename: "" };

export default function CustomerPayments() {
  const { data, val, set, status } = useCardAutosave();

  // ── Multiple UPI IDs ──
  const { items: upis, add: addUpi, update: updateUpi, remove: removeUpi } = useLocalList<Upi>("dc_upi", []);
  // ── Multiple bank accounts ──
  const { items: banks, add: addBank, update: updateBank, remove: removeBank } = useLocalList<Bank>("dc_banks", []);

  // ── Payment QR codes ──
  const qrLimit = packageLimit(Number(data.package_id), "qrcode");
  const { items: qrs, add: addQr, update: updateQr, remove: removeQr } = useLocalList<Qr>("dc_qrcode", [], contentSeeder("qrcodes"));
  const [qrOpen, setQrOpen] = useState(false);
  const [qrEditId, setQrEditId] = useState<number | null>(null);
  const [qrForm, setQrForm] = useState<Omit<Qr, "id">>(blankQr);
  const [qrConfirm, setQrConfirm] = useState<number | null>(null);
  const qrFull = qrs.length >= qrLimit;

  const openAddQr = () => { if (qrFull) { toast.error("QR limit reached — upgrade your package."); return; } setQrForm(blankQr); setQrEditId(null); setQrOpen(true); };
  const openEditQr = (q: Qr) => { setQrForm({ name: q.name, filename: q.filename }); setQrEditId(q.id); setQrOpen(true); };
  const saveQr = () => {
    if (!qrForm.filename) { toast.error("Please upload a QR image"); return; }
    if (qrEditId !== null) { updateQr(qrEditId, qrForm); toast.success("QR updated"); }
    else { addQr(qrForm); toast.success("QR added"); }
    setQrOpen(false);
  };

  const addBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} className="flex items-center gap-1.5 h-9 px-3 rounded-lg gradient-gold text-[#0F172A] text-xs font-semibold hover:shadow-gold transition-all active:scale-95">
      <Plus size={14} /> {label}
    </button>
  );

  return (
    <ModuleShell title="Payments" subtitle="Let customers pay you directly from your card" icon={Wallet}
      actions={<AutoSaveBadge status={status} />}>

      <Tip>Offer more than one way to pay — multiple UPI IDs, bank accounts, wallets, links and a scannable QR. The easier you make paying, the faster you get paid.</Tip>

      {/* ── UPI IDs (multiple) ── */}
      <Panel title="UPI IDs" subtitle="Add one or more UPI addresses" right={addBtn("Add UPI", () => addUpi({ label: "", upi: "" }))}>
        {upis.length === 0 ? (
          <button onClick={() => addUpi({ label: "", upi: "" })} className="w-full h-11 rounded-xl border border-dashed border-[#CBD5E1] text-sm font-semibold text-[#64748B] hover:border-[#F7B31C] hover:text-[#0F172A] hover:bg-[#FEF3C7]/30 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Add your first UPI ID
          </button>
        ) : (
          <div className="space-y-2.5">
            {upis.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <input value={u.label} onChange={(e) => updateUpi(u.id, { label: e.target.value })} placeholder="Label" className={`${fieldCls} w-24 sm:w-32 shrink-0`} />
                <div className="relative flex-1 min-w-0">
                  <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input value={u.upi} onChange={(e) => updateUpi(u.id, { upi: e.target.value })} placeholder="yourname@upi" className={`${fieldCls} pl-9 w-full`} />
                </div>
                <button onClick={() => removeUpi(u.id)} aria-label="Remove UPI" className="w-10 h-10 shrink-0 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Wallets & payment links ── */}
      <Panel title="Wallets & Payment Links" subtitle="One-tap options and international links">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Paytm Number"><div className="relative"><Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("paytm_number")} onChange={(e) => set("paytm_number", e.target.value)} className={`${fieldCls} pl-9`} placeholder="XXXXX XXXXX" /></div></Field>
          <Field label="PhonePe Number"><div className="relative"><Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("phone_pe")} onChange={(e) => set("phone_pe", e.target.value)} className={`${fieldCls} pl-9`} placeholder="XXXXX XXXXX" /></div></Field>
          <Field label="Google Pay Number"><div className="relative"><Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("google_pay")} onChange={(e) => set("google_pay", e.target.value)} className={`${fieldCls} pl-9`} placeholder="XXXXX XXXXX" /></div></Field>
          <Field label="PayPal Link"><div className="relative"><Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("paypal")} onChange={(e) => set("paypal", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://paypal.me/yourname" /></div></Field>
          <Field label="Stripe Payment Link" full><div className="relative"><Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("stripe")} onChange={(e) => set("stripe", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://buy.stripe.com/…" /></div></Field>
        </div>
      </Panel>

      {/* ── Bank accounts (multiple) ── */}
      <Panel title="Bank Accounts" subtitle="Add one or more bank accounts" right={addBtn("Add Bank", () => addBank({ holder: "", bank: "", account: "", ifsc: "", type: "current" }))}>
        {banks.length === 0 ? (
          <button onClick={() => addBank({ holder: "", bank: "", account: "", ifsc: "", type: "current" })} className="w-full h-11 rounded-xl border border-dashed border-[#CBD5E1] text-sm font-semibold text-[#64748B] hover:border-[#F7B31C] hover:text-[#0F172A] hover:bg-[#FEF3C7]/30 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Add your first bank account
          </button>
        ) : (
          <div className="space-y-3">
            {banks.map((b, i) => (
              <div key={b.id} className="rounded-xl border border-[#E2E8F0] p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5"><Landmark size={13} className="text-[#F7B31C]" /> Bank {i + 1}</p>
                  <button onClick={() => removeBank(b.id)} aria-label="Remove bank" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Account Holder"><input value={b.holder} onChange={(e) => updateBank(b.id, { holder: e.target.value })} className={fieldCls} placeholder="Account holder" /></Field>
                  <Field label="Bank Name"><input value={b.bank} onChange={(e) => updateBank(b.id, { bank: e.target.value })} className={fieldCls} placeholder="e.g. HDFC Bank" /></Field>
                  <Field label="Account Number"><input value={b.account} onChange={(e) => updateBank(b.id, { account: e.target.value.replace(/\D/g, "").slice(0, 18) })} inputMode="numeric" maxLength={18} className={fieldCls} placeholder="XXXXXXXXXXXX" /></Field>
                  <Field label="IFSC Code"><input value={b.ifsc} onChange={(e) => updateBank(b.id, { ifsc: e.target.value.toUpperCase() })} className={fieldCls} placeholder="HDFC0001234" /></Field>
                  <Field label="Account Type">
                    <select value={b.type} onChange={(e) => updateBank(b.id, { type: e.target.value })} className={fieldCls}>
                      <option value="current">Current</option>
                      <option value="savings">Savings</option>
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Payment QR Codes (multiple) ── */}
      <Panel title="Payment QR Codes" subtitle="Customers scan to pay you instantly" right={
        <button onClick={openAddQr} disabled={qrFull} className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 ${qrFull ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" : "gradient-gold text-[#0F172A] hover:shadow-gold"}`}><Plus size={14} /> Add QR</button>}>
        <LimitBar used={qrs.length} limit={qrLimit} unit="QR codes" />
        {qrs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E2E8F0] p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><QrCode size={22} className="text-[#94A3B8]" /></div>
            <p className="text-sm font-medium text-[#0F172A]">No payment QR codes yet</p>
            <p className="text-xs text-[#94A3B8] mt-0.5 mb-4">Upload your UPI/GPay/Paytm QR so customers can scan & pay.</p>
            <button onClick={openAddQr} className="inline-flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold"><Plus size={16} /> Add your first QR</button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {qrs.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden">
                <div className="aspect-square bg-[#F8FAFC] flex items-center justify-center p-3">
                  {q.filename ? <img src={q.filename} alt={q.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" /> : <ImageOff size={24} className="text-[#CBD5E1]" />}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-[#0F172A] text-center mb-2 truncate">{q.name}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEditQr(q)} className="flex-1 h-8 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center gap-1"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setQrConfirm(q.id)} className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>


      {/* QR add/edit modal */}
      {qrOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setQrOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <button onClick={() => setQrOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] flex items-center justify-center"><X size={18} /></button>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{qrEditId !== null ? "Update QR" : "Add Payment QR"}</h3>
            <div className="flex flex-col items-center gap-3">
              <ImagePick value={qrForm.filename} onChange={(u) => setQrForm((f) => ({ ...f, filename: u }))} className="w-40 h-40" label="QR image" />
              <div className="w-full"><Field label="Label"><input value={qrForm.name} onChange={(e) => setQrForm((f) => ({ ...f, name: e.target.value }))} className={fieldCls} placeholder="e.g. Pay Online" /></Field></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setQrOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={saveQr} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold flex items-center justify-center gap-2"><Save size={16} /> {qrEditId !== null ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR delete confirm */}
      {qrConfirm !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={() => setQrConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-[#0F172A]">Delete this QR code?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setQrConfirm(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={() => { removeQr(qrConfirm); setQrConfirm(null); toast.success("Deleted"); }} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
