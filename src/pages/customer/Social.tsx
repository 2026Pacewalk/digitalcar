import { useState } from "react";
import { Share2, Save, Facebook, Twitter, Instagram, Youtube, Linkedin, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, Tip } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";

const SOCIALS = [
  { k: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2", ph: "https://facebook.com/yourpage" },
  { k: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F", ph: "https://instagram.com/yourhandle" },
  { k: "twitter", label: "X (Twitter)", icon: Twitter, color: "#0F172A", ph: "https://x.com/yourhandle" },
  { k: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000", ph: "https://youtube.com/@yourchannel" },
  { k: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2", ph: "https://linkedin.com/in/you" },
  { k: "pinterest", label: "Pinterest", icon: Star, color: "#BD081C", ph: "https://pinterest.com/you" },
];

export default function CustomerSocial() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => { update(form); toast.success("Social links saved"); setForm({}); };

  return (
    <ModuleShell title="Social Links" subtitle="Connect all your social profiles" icon={Share2}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Tip>Link only your active profiles — a focused set looks more credible than a long list. WhatsApp and Instagram usually earn the most taps.</Tip>
      <Panel title="Social Profiles" subtitle="Section title and links">
        <Field label="Section Heading" hint="Shown above your social icons — e.g. “Follow Us” or “Follow Me”."><input value={val("social_title")} onChange={(e) => set("social_title", e.target.value)} className={fieldCls} placeholder="Follow Us" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {SOCIALS.map((s) => (
            <Field key={s.k} label={s.label}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: s.color }}><s.icon size={16} /></span>
                <input value={val(s.k)} onChange={(e) => set(s.k, e.target.value)} className={`${fieldCls} pl-9`} placeholder={s.ph} />
              </div>
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Google" subtitle="Map location and reviews link">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Google Map Link"><div className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14B8A6]" /><input value={val("google_map")} onChange={(e) => set("google_map", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://maps.google.com/…" /></div></Field>
          <Field label="Google Review Link"><div className="relative"><Star size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7B31C]" /><input value={val("google_review")} onChange={(e) => set("google_review", e.target.value)} className={`${fieldCls} pl-9`} placeholder="https://g.page/…/review" /></div></Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
