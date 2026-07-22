import { useState } from "react";
import { Home as HomeIcon, Save } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

export default function CustomerHome() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => { update(form); toast.success("Business details saved"); setForm({}); };

  return (
    <ModuleShell title="Home — Business Details" subtitle="Your core profile shown at the top of your card" icon={HomeIcon}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Panel title="Profile" subtitle="Name, logo and business identity">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="text-center">
            <ImagePick value={val("logo")} onChange={(u) => set("logo", u)} className="w-28 h-28" label="Logo" />
            <p className="text-[11px] text-[#94A3B8] mt-2">Company logo</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Field label="Full Name"><input value={val("name")} onChange={(e) => set("name", e.target.value)} className={fieldCls} placeholder="John Doe" /></Field>
            <Field label="Designation"><input value={val("designation")} onChange={(e) => set("designation", e.target.value)} className={fieldCls} placeholder="Director" /></Field>
            <Field label="Company Name"><input value={val("company_name")} onChange={(e) => set("company_name", e.target.value)} className={fieldCls} placeholder="Your Company" /></Field>
            <Field label="GST Number"><input value={val("gst")} onChange={(e) => set("gst", e.target.value)} className={fieldCls} placeholder="GSTIN" /></Field>
          </div>
        </div>
      </Panel>

      <Panel title="Contact" subtitle="How customers reach you">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Mobile 1 (Primary)"><input value={val("mobile1")} onChange={(e) => set("mobile1", e.target.value)} className={fieldCls} placeholder="+91 98765 43210" /></Field>
          <Field label="Mobile 2 (WhatsApp)"><input value={val("mobile2")} onChange={(e) => set("mobile2", e.target.value)} className={fieldCls} placeholder="91XXXXXXXXXX" /></Field>
          <Field label="Email"><input value={val("email")} onChange={(e) => set("email", e.target.value)} className={fieldCls} placeholder="you@example.com" type="email" /></Field>
          <Field label="Website URL"><input value={val("url")} onChange={(e) => set("url", e.target.value)} className={fieldCls} placeholder="https://yourbusiness.com" /></Field>
          <Field label="Establishment Year"><input value={val("establishment")} onChange={(e) => set("establishment", e.target.value)} className={fieldCls} placeholder="2014" /></Field>
          <Field label="Nature of Business"><input value={val("nature")} onChange={(e) => set("nature", e.target.value)} className={fieldCls} placeholder="e.g. Digital Marketing Agency" /></Field>
          <Field label="Address" full><textarea value={val("address")} onChange={(e) => set("address", e.target.value)} className={areaCls} placeholder="Full business address" /></Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
