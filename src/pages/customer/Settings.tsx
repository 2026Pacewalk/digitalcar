import { useState } from "react";
import { Settings as SettingsIcon, Save, Search, Palette, ToggleRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, areaCls } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

const MODULES = [
  { on: "about_on", key: "about", name: "About Us", def: "About Us" },
  { on: "product_on", key: "product", name: "Products", def: "Products" },
  { on: "payment_on", key: "payment", name: "Payment", def: "Payment" },
  { on: "gallery_on", key: "gallery", name: "Gallery", def: "Our Gallery" },
  { on: "video_on", key: "video", name: "Video", def: "Video Gallery" },
  { on: "offer_on", key: "offer", name: "Offers", def: "Offers" },
  { on: "enquiry_on", key: "enquiry", name: "Enquiry Form", def: "Enquiry Form" },
  { on: "feedback_on", key: "feedback", name: "Feedback", def: "Feedbacks" },
  { on: "qrcode_on", key: "qrcode", name: "QR Code", def: "QR Code" },
  { on: "uploads_on", key: "uploads", name: "Uploads", def: "Uploads" },
];
const THEME_COLORS = ["#F7B31C", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#0F172A", "#22C55E"];

export default function CustomerSettings() {
  const { data, update } = useCustomer();
  const [tab, setTab] = useState<"seo" | "design" | "modules" | "account">("seo");
  const [form, setForm] = useState<Record<string, string>>({});
  const [pwd, setPwd] = useState("");
  const val = (k: string, dflt = "") => (form[k] !== undefined ? form[k] : String(data[k] ?? dflt));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isOn = (k: string) => (form[k] !== undefined ? form[k] === "1" : Number(data[k] ?? 1) === 1);
  const toggle = (k: string) => set(k, isOn(k) ? "0" : "1");

  const save = () => { update(form); toast.success("Settings saved"); setForm({}); };
  const savePassword = () => { if (pwd.length < 6) { toast.error("Min 6 characters"); return; } update({ password: pwd }); toast.success("Password updated"); setPwd(""); };

  const tabs = [
    { id: "seo" as const, label: "SEO", icon: Search },
    { id: "design" as const, label: "Design", icon: Palette },
    { id: "modules" as const, label: "Modules", icon: ToggleRight },
    { id: "account" as const, label: "Account", icon: KeyRound },
  ];

  return (
    <ModuleShell title="Settings" subtitle="SEO, design, sections & account" icon={SettingsIcon}
      actions={tab !== "account" ? <button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button> : undefined}>
      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 h-10 rounded-xl text-sm font-semibold transition-colors ${tab === t.id ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "seo" && (
        <Panel title="SEO Settings" subtitle="Help your card rank on Google">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Meta Title"><input value={val("seo_title")} onChange={(e) => set("seo_title", e.target.value)} className={fieldCls} placeholder="Your Business — Digital Card" /></Field>
            <Field label="Meta Description"><textarea value={val("seo_description")} onChange={(e) => set("seo_description", e.target.value)} className={areaCls} placeholder="A short description of your business for search engines" /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <Field key={n} label={`Keyword ${n}`}><input value={val(`keyword${n}`)} onChange={(e) => set(`keyword${n}`, e.target.value)} className={fieldCls} placeholder={`keyword ${n}`} /></Field>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {tab === "design" && (
        <Panel title="Design & Theme" subtitle="Personalise your card's look">
          <Field label="Theme">
            <select value={val("theme", "1")} onChange={(e) => set("theme", e.target.value)} className={fieldCls}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Theme {n}</option>)}
            </select>
          </Field>
          <div className="mt-5">
            <label className="block text-xs font-semibold text-[#334155] mb-2">Primary Color</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {THEME_COLORS.map((c) => (
                <button key={c} onClick={() => set("color", c)} className={`w-9 h-9 rounded-full ring-2 transition-all ${val("color", "#F7B31C").toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent hover:scale-105"}`} style={{ background: c }} aria-label={c} />
              ))}
              <input type="color" value={val("color", "#F7B31C")} onChange={(e) => set("color", e.target.value)} className="w-9 h-9 rounded-full border border-[#E2E8F0] cursor-pointer bg-transparent" />
            </div>
          </div>
        </Panel>
      )}

      {tab === "modules" && (
        <Panel title="Card Sections" subtitle="Turn sections on/off and rename them">
          <div className="divide-y divide-[#F1F5F9]">
            {MODULES.map((m) => (
              <div key={m.on} className="flex items-center gap-3 py-3">
                <button onClick={() => toggle(m.on)} className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${isOn(m.on) ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`} aria-label={`Toggle ${m.name}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn(m.on) ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <span className="text-sm font-medium text-[#0F172A] w-28 shrink-0">{m.name}</span>
                <input value={val(m.key, m.def)} onChange={(e) => set(m.key, e.target.value)} disabled={!isOn(m.on)} className={`${fieldCls} h-9 flex-1 disabled:opacity-50`} placeholder={`Display title (${m.def})`} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "account" && (
        <Panel title="Account & Password" subtitle="Login credentials for your card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Username"><input value={val("username")} onChange={(e) => set("username", e.target.value)} className={fieldCls} /></Field>
            <Field label="Email"><input value={val("email")} onChange={(e) => set("email", e.target.value)} className={fieldCls} type="email" /></Field>
          </div>
          <div className="flex justify-end mt-4"><button onClick={save} className="flex items-center gap-2 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold"><Save size={15} /> Save Account</button></div>
          <hr className="my-5 border-[#F1F5F9]" />
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <Field label="New Password"><input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" className={fieldCls} placeholder="Min 6 characters" /></Field>
            <button onClick={savePassword} className="h-11 px-5 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] shrink-0 flex items-center gap-2"><KeyRound size={15} /> Update Password</button>
          </div>
        </Panel>
      )}
    </ModuleShell>
  );
}
