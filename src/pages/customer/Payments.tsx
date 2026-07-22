import { useState } from "react";
import { Wallet, Save, Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

export default function CustomerPayments() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { update(form); toast.success("Payment details saved"); setForm({}); };

  const upi = [
    { k: "upi", label: "UPI ID", ph: "yourname@upi" },
    { k: "paytm_number", label: "Paytm Number", ph: "98765 43210" },
    { k: "phone_pe", label: "PhonePe Number", ph: "98765 43210" },
    { k: "google_pay", label: "Google Pay Number", ph: "98765 43210" },
  ];

  return (
    <ModuleShell title="Payments" subtitle="Let customers pay you directly from your card" icon={Wallet}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Panel title="UPI & Wallets" subtitle="One-tap payment options">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upi.map((u) => (
            <Field key={u.k} label={u.label}>
              <div className="relative">
                <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input value={val(u.k)} onChange={(e) => set(u.k, e.target.value)} className={`${fieldCls} pl-9`} placeholder={u.ph} />
              </div>
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Bank Account" subtitle="Shown in the payment section of your card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Account Holder Name"><div className="relative"><Landmark size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("account_holder")} onChange={(e) => set("account_holder", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Account holder" /></div></Field>
          <Field label="Bank Name"><input value={val("bank_name")} onChange={(e) => set("bank_name", e.target.value)} className={fieldCls} placeholder="e.g. HDFC Bank" /></Field>
          <Field label="Account Number"><input value={val("account_number")} onChange={(e) => set("account_number", e.target.value)} className={fieldCls} placeholder="XXXXXXXXXXXX" /></Field>
          <Field label="IFSC Code"><input value={val("ifsc")} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} className={fieldCls} placeholder="HDFC0001234" /></Field>
          <Field label="Account Type">
            <select value={val("account_type")} onChange={(e) => set("account_type", e.target.value)} className={fieldCls}>
              <option value="current">Current</option>
              <option value="savings">Savings</option>
            </select>
          </Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
