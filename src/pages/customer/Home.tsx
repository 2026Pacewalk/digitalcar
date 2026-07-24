import { useState } from "react";
import { Home as HomeIcon, Save, Copy, Check, User, Building2, Mail, Globe, Link2, Phone } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls, ImagePick } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

// Phone input: editable country code (defaults to +91) + editable 10-digit number.
// Stored as "{code} {number}", e.g. "+91 9876543210".
function PhoneField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const v = String(value || "");
  let code = "+91", number = "";
  if (v.includes(" ")) {
    const [c, ...rest] = v.trim().split(/\s+/);
    code = c.startsWith("+") ? "+" + c.replace(/\D/g, "").slice(0, 4) : "+91";
    number = rest.join("").replace(/\D/g, "").slice(-10);
  } else if (v.trim()) {
    const d = v.replace(/\D/g, "");
    number = d.slice(-10);
    const cd = d.slice(0, Math.max(0, d.length - 10));
    code = cd ? "+" + cd : "+91";
  }

  const setCode = (raw: string) => {
    const clean = "+" + raw.replace(/\D/g, "").slice(0, 4);
    onChange(number ? `${clean} ${number}` : `${clean} `);
  };
  const setNumber = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    onChange(d ? `${code} ${d}` : "");
  };

  return (
    <div className="flex items-stretch h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden transition-all focus-within:border-[#F7B31C] focus-within:ring-2 focus-within:ring-[#F7B31C]/15 focus-within:bg-white">
      <div className="flex items-center gap-1 pl-3 pr-1.5 shrink-0 border-r border-[#E2E8F0] bg-[#F1F5F9]/60">
        <Phone size={14} className="text-[#94A3B8]" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="tel"
          maxLength={5}
          aria-label="Country code"
          className="w-11 bg-transparent text-[13px] font-semibold text-[#475569] outline-none"
        />
      </div>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder || "XXXXX XXXXX"}
        className="flex-1 min-w-0 bg-transparent px-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
      />
    </div>
  );
}

// Website input with a fixed https:// prefix. Strips any http(s):// or www.
// the user types/pastes, and always stores as "https://{domain}".
function WebsiteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const strip = (s: string) => s.replace(/^\s*https?:\/\//i, "").replace(/^www\./i, "").replace(/\s/g, "");
  const domain = strip(String(value || ""));
  const handle = (raw: string) => {
    const clean = strip(raw);
    onChange(clean ? `https://${clean}` : "");
  };
  return (
    <div className="flex items-stretch h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden transition-all focus-within:border-[#F7B31C] focus-within:ring-2 focus-within:ring-[#F7B31C]/15 focus-within:bg-white">
      <span className="flex items-center gap-1.5 pl-3 pr-2.5 shrink-0 border-r border-[#E2E8F0] bg-[#F1F5F9]/60 text-[#475569] select-none">
        <Globe size={14} className="text-[#94A3B8]" />
        <span className="text-[13px] font-medium">https://</span>
      </span>
      <input
        value={domain}
        onChange={(e) => handle(e.target.value)}
        placeholder="yourbusiness.com"
        className="flex-1 min-w-0 bg-transparent px-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
      />
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
          <div className="shrink-0">
            <ImagePick value={val("logo")} onChange={(u) => set("logo", u)} className="w-28 h-28 mx-auto" label="Logo / Photo" fit="contain" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Field label="Name"><div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input value={val("name")} onChange={(e) => set("name", e.target.value)} className={`${fieldCls} pl-9`} placeholder="Full name" /></div></Field>
            <Field label="Email ID"><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input type="email" value={val("email")} onChange={(e) => set("email", e.target.value)} className={`${fieldCls} pl-9`} placeholder="you@example.com" /></div></Field>
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
              <div className="flex-1 flex items-center gap-2 h-10 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#475569] min-w-0"><Link2 size={15} className="text-[#94A3B8] shrink-0" /><span className="truncate">@{String(data.slug || "")}</span></div>
              <button onClick={copyLink} title="Copy card link" aria-label="Copy card link" className="w-10 h-10 rounded-xl border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] flex items-center justify-center shrink-0 transition-colors">{copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}</button>
            </div>
          </Field>

          <Field label="Website" full><WebsiteField value={val("url")} onChange={(v) => set("url", v)} /></Field>
          <Field label="Call Number"><PhoneField value={val("mobile1")} onChange={(v) => set("mobile1", v)} placeholder="XXXXX XXXXX" /></Field>
          <Field label="WhatsApp Number"><PhoneField value={val("mobile2")} onChange={(v) => set("mobile2", v)} placeholder="XXXXX XXXXX" /></Field>
          <Field label="Address" full><textarea value={val("address")} onChange={(e) => set("address", e.target.value)} className={areaCls} placeholder="Full business address" /></Field>
        </div>
      </Panel>

      <div className="flex justify-end"><SaveBtn big /></div>
    </ModuleShell>
  );
}
