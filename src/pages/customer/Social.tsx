import { useEffect, useRef, useState } from "react";
import { Share2, Save, Trash2, Palette, Plus, Check } from "lucide-react";
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
  const heading = val("social_title") || "Follow Us";
  const used = new Set(links.map((l) => l.platform));
  const websiteCount = links.filter((l) => l.platform === "website").length;
  // Website is a repeatable "custom link" (up to 6 total); every other platform once.
  const available = SOCIAL_PLATFORMS.filter((p) => (p.key === "website" ? websiteCount < 6 : !used.has(p.key)));

  const addPlatform = (key: string) => mutate([...links, { platform: key, url: "" }]);
  const setUrl = (i: number, url: string) => mutate(links.map((l, idx) => (idx === i ? { ...l, url } : l)));
  const removeLink = (i: number) => mutate(links.filter((_, idx) => idx !== i));

  // Preview icon colours — mirror how the card renders theme vs brand.
  const chipStyle = (p: SocialPlatform) => (style === "brand" ? { background: p.color, color: p.fg || "#fff" } : { background: "#F7B31C", color: "#fff" });

  const save = () => {
    const clean = links.filter((l) => l.platform && l.url.trim()).map((l) => ({ platform: l.platform, url: l.url.trim() }));
    update({ ...form, social_links: JSON.stringify(clean) });
    toast.success("Social links saved");
    setForm({});
  };

  return (
    <ModuleShell title="Social Links" subtitle="Add every profile you want on your card" icon={Share2}
      actions={<button onClick={save} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save</button>}>
      <Tip>Tap a platform to add it, then paste your profile link. Add as many as you like, choose your icon style, then Save — it all goes live instantly.</Tip>

      {/* Live preview — exactly how the "Follow Us" row appears on the card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-5 text-center shadow-premium">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Live preview</p>
        <p className="text-[13px] font-semibold text-[#475569] mb-3">{heading}</p>
        {links.length === 0 ? (
          <p className="text-[12px] text-[#94A3B8] py-2">Your icons will appear here as you add them.</p>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {links.map((l, i) => {
              const p = SOCIAL_BY_KEY[l.platform];
              if (!p) return null;
              return <span key={i} className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={chipStyle(p)}><PlatformIcon p={p} size={16} /></span>;
            })}
          </div>
        )}
      </div>

      <Panel title="Social Profiles" subtitle="Heading, icon style and your links">
        <Field label="Section Heading" hint="Shown above your social icons — e.g. “Follow Us” or “Follow Me”."><input value={val("social_title")} onChange={(e) => set("social_title", e.target.value)} className={fieldCls} placeholder="Follow Us" /></Field>

        {/* Icon style — theme colour vs real brand colours */}
        <div className="mt-4">
          <label className="text-[11px] font-medium text-[#64748B] mb-1.5 flex items-center gap-1.5"><Palette size={12} /> Icon style</label>
          <div className="grid grid-cols-2 gap-2.5 max-w-md">
            {([
              { id: "theme", title: "Theme colour", desc: "All icons in your card colour" },
              { id: "brand", title: "Brand colours", desc: "Each icon in its real colour" },
            ] as const).map((o) => {
              const active = style === o.id;
              return (
                <button key={o.id} type="button" onClick={() => set("social_icon_style", o.id)}
                  className={`relative text-left rounded-2xl border p-3.5 transition-all ${active ? "border-[#F7B31C] bg-[#FFFBEB] shadow-sm" : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"}`}>
                  {active && <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#F7B31C] flex items-center justify-center"><Check size={11} className="text-white" strokeWidth={3} /></span>}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    {["facebook", "instagram", "x", "youtube"].map((k) => {
                      const p = SOCIAL_BY_KEY[k];
                      return <span key={k} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: o.id === "brand" ? p.color : "#F7B31C", color: o.id === "brand" ? (p.fg || "#fff") : "#fff" }}><PlatformIcon p={p} size={12} /></span>;
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-[#64748B]">Your links</label>
            {links.length > 0 && <span className="text-[10px] font-semibold text-[#94A3B8] bg-[#F1F5F9] rounded-full px-2 py-0.5">{links.length}</span>}
          </div>
          {links.length === 0 ? (
            <p className="text-[12.5px] text-[#94A3B8] py-1">Pick a platform below to add your first link.</p>
          ) : (
            <div className="space-y-2.5">
              {links.map((l, i) => {
                const p = SOCIAL_BY_KEY[l.platform];
                if (!p) return null;
                return (
                  <div key={i} className="group flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-2.5 hover:border-[#CBD5E1] transition-colors">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: p.color, color: p.fg || "#fff" }}><PlatformIcon p={p} size={19} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">{p.key === "website" ? "Custom link" : p.label}</p>
                      <input value={l.url} onChange={(e) => setUrl(i, e.target.value)} className={`${fieldCls} h-8`} placeholder={p.ph} />
                    </div>
                    <button onClick={() => removeLink(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors" aria-label={`Remove ${p.label}`}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform picker */}
        {available.length > 0 && (
          <div className="mt-5">
            <label className="text-[11px] font-medium text-[#64748B] mb-2 flex items-center gap-1.5"><Plus size={12} /> Add a platform</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {available.map((p) => (
                <button key={p.key} type="button" onClick={() => addPlatform(p.key)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-3 hover:border-[#F7B31C] hover:-translate-y-0.5 hover:shadow-sm transition-all">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: p.color, color: p.fg || "#fff", boxShadow: "0 3px 8px rgba(15,23,42,.18)" }}><PlatformIcon p={p} size={18} /></span>
                  <span className="text-[10px] font-semibold text-[#475569] text-center leading-tight">{p.label === "Website" ? "Custom link" : p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Save size={16} /> Save Changes</button>
      </div>
    </ModuleShell>
  );
}
