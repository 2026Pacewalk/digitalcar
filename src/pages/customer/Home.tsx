import { useState } from "react";
import { Home as HomeIcon, Save, Copy, Check, User, Building2, Mail, Globe, Link2, Phone } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

// Editable phone input — pre-fills "+91 " by default but the whole value can be edited.
function PhoneField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const shown = value && value.trim() ? value : "+91 ";
  return (
    <div className="relative">
      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
      <input value={shown} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${fieldCls} pl-9`} />
    </div>
  );
}

export default function CustomerHome() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { update(form); toast.success("Details saved"); setForm({}); };

  const cardUrl = `https://digitalcarda.in/${String(data.slug || "")}`;
  const copyLink = async () => { try { await navigator.clipboard.writeText(cardUrl); setCopied(true); toast.success("Card link copied"); setTimeout(() => setCopied(false), 1600); } catch { toast.error("Copy failed"); } };

  const SaveBtn = ({ big }: { big?: boolean }) => (
    <button onClick={save} className={`flex items-center gap-2 ${big ? "h-11 px-6 text-sm font-bold" : "h-10 px-4 text-sm font-semibold"} gradient-gold text-[#0F172A] rounded-xl hover:shadow-gold transition-all active:scale-[0.98]`}><Save size={16} /> Save {big ? "Changes" : ""}</button>
  );

  return (
    <ModuleShell title="Home — Profile & Business" subtitle="Your account and business details" icon={HomeIcon} actions={<SaveBtn />}>
      {/* Logo + Account Information */}
      <Panel title="Account Information" subtitle="Your identity & primary contact">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="text-center shrink-0">
            <ImagePick value={val("logo")} onChange={(u) => set("logo", u)} className="w-28 h-28" label="Logo" fit="contain" />
            <p className="text-[11px] text-[#94A3B8] mt-2">Logo / Photo</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Field label="Name"><div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("name")} onChange={(e) => set("name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Full name" /></div></Field>
            <Field label="Email ID"><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input type="email" value={val("email")} onChange={(e) => set("email", e.target.value)} className={`${fieldCls} pl-9`} placeholder="you@example.com" /></div></Field>
            <Field label="Call Number" full><PhoneField value={val("mobile1")} onChange={(v) => set("mobile1", v)} placeholder="98765 43210" /></Field>
          </div>
        </div>
      </Panel>

      {/* Business Information */}
      <Panel title="Business Information" subtitle="Details displayed on your digital card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name"><div className="relative"><Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("company_name")} onChange={(e) => set("company_name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Your Company" /></div></Field>
          <Field label="Designation / Slogan"><input value={val("designation")} onChange={(e) => set("designation", e.target.value)} className={fieldCls} placeholder="e.g. Director" /></Field>
          <Field label="GST Number"><input value={val("gst")} onChange={(e) => set("gst", e.target.value)} className={fieldCls} placeholder="GSTIN" /></Field>
          <Field label="Year of Est."><input value={val("establishment")} onChange={(e) => set("establishment", e.target.value)} className={fieldCls} placeholder="2014" /></Field>
          <Field label="Business Nature" full><input value={val("nature")} onChange={(e) => set("nature", e.target.value)} className={fieldCls} placeholder="e.g. Digital Marketing Agency" /></Field>

          <Field label="Card Link" full hint="Your public digital card URL (read-only)">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-2 h-11 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] px-3 text-sm text-[#475569] min-w-0"><Link2 size={15} className="text-[#94A3B8] shrink-0" /><span className="truncate">{cardUrl}</span></div>
              <button onClick={copyLink} className="h-11 px-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-1.5 shrink-0">{copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />} Copy</button>
            </div>
          </Field>

          <Field label="Website"><div className="relative"><Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("url")} onChange={(e) => set("url", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://yourbusiness.com" /></div></Field>
          <Field label="WhatsApp Number"><PhoneField value={val("mobile2")} onChange={(v) => set("mobile2", v)} placeholder="98765 43210" /></Field>
          <Field label="Address" full><textarea value={val("address")} onChange={(e) => set("address", e.target.value)} className={areaCls} placeholder="Full business address" /></Field>
        </div>
      </Panel>

      <div className="flex justify-end"><SaveBtn big /></div>
    </ModuleShell>
  );
}
