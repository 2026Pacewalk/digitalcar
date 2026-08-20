import { useEffect, useRef, useState } from "react";
import { Share2, Save, MapPin, Star, Plus, Trash2, GripVertical, Palette } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, Tip } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { SOCIAL_PLATFORMS, SOCIAL_BY_KEY, readSocialLinks, type SocialLink } from "@/lib/socialPlatforms";

export default function CustomerSocial() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Seed the editable link list from the saved record once it has loaded (the
  // customer record hydrates asynchronously, so we wait for a real one).
  const [links, setLinks] = useState<SocialLink[]>([]);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (data && (data.username || data.slug || data.social_links || data.facebook || data.instagram)) {
      setLinks(readSocialLinks(data as Record<string, unknown>));
      seeded.current = true;
    }
  }, [data]);

  const style = val("social_icon_style") === "brand" ? "brand" : "theme";
  const setLink = (i: number, patch: Partial<SocialLink>) => setLinks((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((ls) => ls.filter((_, idx) => idx !== i));
  const addLink = () => {
    const used = new Set(links.map((l) => l.platform));
    const next = SOCIAL_PLATFORMS.find((p) => !used.has(p.key)) || SOCIAL_PLATFORMS[0];
    setLinks((ls) => [...ls, { platform: next.key, url: "" }]);
  };

  const save = () => {
    const clean = links.filter((l) => l.platform && l.url.trim()).map((l) => ({ platform: l.platform, url: l.url.trim() }));
    update({ ...form, social_links: JSON.stringify(clean) });
    toast.success("Social links saved");
    setForm({});
  };

  return (
    <ModuleShell title="Social Links" subtitle="Add every profile you want on your card" icon={Share2}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Tip>Add as many profiles as you like — pick a platform, paste the link. Choose your icon style below, then Save. Changes go live on your card instantly.</Tip>

      <Panel title="Social Profiles" subtitle="Heading, icon style and your links">
        <Field label="Section Heading" hint="Shown above your social icons — e.g. “Follow Us” or “Follow Me”."><input value={val("social_title")} onChange={(e) => set("social_title", e.target.value)} className={fieldCls} placeholder="Follow Us" /></Field>

        {/* Icon style — theme colour vs real brand colours */}
        <div className="mt-4">
          <label className="block text-[11px] font-medium text-[#64748B] mb-1.5 flex items-center gap-1.5"><Palette size={12} /> Icon style</label>
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {([
              { id: "theme", title: "Theme colour", desc: "All icons in your card colour" },
              { id: "brand", title: "Brand colours", desc: "Each icon in its real colour" },
            ] as const).map((o) => {
              const active = style === o.id;
              return (
                <button key={o.id} type="button" onClick={() => set("social_icon_style", o.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${active ? "border-[#F7B31C] bg-[#FFFBEB]" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {["facebook", "instagram", "x", "youtube"].map((k) => {
                      const p = SOCIAL_BY_KEY[k];
                      return <span key={k} className="w-4 h-4 rounded-full" style={{ background: o.id === "brand" ? p.color : "#F7B31C" }} />;
                    })}
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#0F172A]">{o.title}</p>
                  <p className="text-[11px] text-[#94A3B8]">{o.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Flexible list of links */}
        <div className="mt-5 space-y-2.5">
          {links.length === 0 && <p className="text-[12.5px] text-[#94A3B8] py-2">No links yet — add your first profile below.</p>}
          {links.map((l, i) => {
            const p = SOCIAL_BY_KEY[l.platform] || SOCIAL_PLATFORMS[0];
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-[#F1F5F9] bg-white p-2">
                <GripVertical size={15} className="text-[#CBD5E1] shrink-0" />
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[11px] font-bold" style={{ background: p.color }}>{p.label.slice(0, 1)}</span>
                <select value={l.platform} onChange={(e) => setLink(i, { platform: e.target.value })} className={`${fieldCls} h-9 w-32 sm:w-40 shrink-0`}>
                  {SOCIAL_PLATFORMS.map((op) => <option key={op.key} value={op.key}>{op.label}</option>)}
                </select>
                <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} className={`${fieldCls} h-9 flex-1`} placeholder={p.ph} />
                <button onClick={() => removeLink(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors" aria-label="Remove"><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
        <button onClick={addLink} className="mt-3 flex items-center gap-2 h-9 px-4 rounded-xl border border-dashed border-[#CBD5E1] text-[#334155] text-[13px] font-semibold hover:border-[#F7B31C] hover:text-[#B45309] transition-colors"><Plus size={15} /> Add social link</button>
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
