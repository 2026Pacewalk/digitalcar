import { useEffect, useRef, useState } from "react";
import { Share2, Save, MapPin, Star, Trash2, Palette, Plus } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel, Field, fieldCls, Tip } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { SOCIAL_PLATFORMS, SOCIAL_BY_KEY, readSocialLinks, type SocialLink, type SocialPlatform } from "@/lib/socialPlatforms";

// Render a platform's real brand glyph — an inline SVG (X, TikTok) or a Font
// Awesome icon (loaded in index.html). `currentColor` picks up the parent colour.
function PlatformIcon({ p, size = 16 }: { p: SocialPlatform; size?: number }) {
  if (p.svg) return <span style={{ width: size, height: size, display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: p.svg.replace("<svg", `<svg width="${size}" height="${size}"`) }} />;
  return <i className={p.fa} style={{ fontSize: Math.round(size * 0.92) }} aria-hidden />;
}

export default function CustomerSocial() {
  const { data, update } = useCustomer();
  const [form, setForm] = useState<Record<string, string>>({});
  const val = (k: string) => (form[k] !== undefined ? form[k] : String(data[k] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Seed the list from the saved record, re-seeding as the record hydrates —
  // until the user edits (then we stop so their changes aren't overwritten).
  const [links, setLinks] = useState<SocialLink[]>([]);
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setLinks(readSocialLinks(data as Record<string, unknown>)); }, [data]);
  const mutate = (next: SocialLink[]) => { dirty.current = true; setLinks(next); };

  const style = val("social_icon_style") === "brand" ? "brand" : "theme";
  const used = new Set(links.map((l) => l.platform));
  const available = SOCIAL_PLATFORMS.filter((p) => !used.has(p.key));

  const addPlatform = (key: string) => mutate([...links, { platform: key, url: "" }]);
  const setUrl = (i: number, url: string) => mutate(links.map((l, idx) => (idx === i ? { ...l, url } : l)));
  const removeLink = (i: number) => mutate(links.filter((_, idx) => idx !== i));

  const save = () => {
    const clean = links.filter((l) => l.platform && l.url.trim()).map((l) => ({ platform: l.platform, url: l.url.trim() }));
    update({ ...form, social_links: JSON.stringify(clean) });
    toast.success("Social links saved");
    setForm({});
  };

  return (
    <ModuleShell title="Social Links" subtitle="Add every profile you want on your card" icon={Share2}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Tip>Tap a platform below to add it, then paste your profile link. Add as many as you like, choose your icon style, then Save — changes go live instantly.</Tip>

      <Panel title="Social Profiles" subtitle="Heading, icon style and your links">
        <Field label="Section Heading" hint="Shown above your social icons — e.g. “Follow Us” or “Follow Me”."><input value={val("social_title")} onChange={(e) => set("social_title", e.target.value)} className={fieldCls} placeholder="Follow Us" /></Field>

        {/* Icon style — theme colour vs real brand colours */}
        <div className="mt-4">
          <label className="text-[11px] font-medium text-[#64748B] mb-1.5 flex items-center gap-1.5"><Palette size={12} /> Icon style</label>
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
                      return <span key={k} className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: o.id === "brand" ? p.color : "#F7B31C", color: o.id === "brand" ? (p.fg || "#fff") : "#0F172A" }}><PlatformIcon p={p} size={12} /></span>;
                    })}
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#0F172A]">{o.title}</p>
                  <p className="text-[11px] text-[#94A3B8]">{o.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Your links */}
        <div className="mt-5">
          <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">Your links</label>
          {links.length === 0 ? (
            <p className="text-[12.5px] text-[#94A3B8] py-1">Pick a platform below to add your first link.</p>
          ) : (
            <div className="space-y-2.5">
              {links.map((l, i) => {
                const p = SOCIAL_BY_KEY[l.platform];
                if (!p) return null;
                return (
                  <div key={l.platform} className="flex items-center gap-3 rounded-xl border border-[#F1F5F9] bg-white p-2.5">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.color, color: p.fg || "#fff" }}><PlatformIcon p={p} size={17} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#334155] mb-0.5">{p.label}</p>
                      <input value={l.url} onChange={(e) => setUrl(i, e.target.value)} className={`${fieldCls} h-8`} placeholder={p.ph} />
                    </div>
                    <button onClick={() => removeLink(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors self-end" aria-label={`Remove ${p.label}`}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform picker */}
        {available.length > 0 && (
          <div className="mt-5">
            <label className="block text-[11px] font-medium text-[#64748B] mb-2 flex items-center gap-1.5"><Plus size={12} /> Add a platform</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {available.map((p) => (
                <button key={p.key} type="button" onClick={() => addPlatform(p.key)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[#F1F5F9] p-2.5 hover:border-[#F7B31C] hover:bg-[#FFFBEB] transition-colors">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: p.color, color: p.fg || "#fff" }}><PlatformIcon p={p} size={17} /></span>
                  <span className="text-[10px] font-semibold text-[#475569] text-center leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
