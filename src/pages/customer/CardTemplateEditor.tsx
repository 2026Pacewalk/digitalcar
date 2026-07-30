import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { buildCardHtml, buildCardThumb } from "@/card-template/buildCard";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Check, Palette, ExternalLink, User, Building2, Phone, Mail, Globe, FileText } from "lucide-react";

/* Template-based editor for a relational (bulk / team) card — the SAME design
   engine as every other DigitalCarda card, replacing the old block builder.
   Edits the card's core fields + design, previews with buildCardHtml, and saves
   back to the card's profile/contact blocks + templateId. */

const THUMB_W = 375, THUMB_H = 560;
function ThumbFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={title} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px`, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

type Blk = { id: number; type: string; content?: Record<string, unknown> };
const s = (v: unknown) => String(v ?? "");

export default function CardTemplateEditor() {
  const { cardId } = useParams();
  const id = Number(cardId);
  const navigate = useNavigate();

  const { data: card, isLoading, refetch } = trpc.card.getById.useQuery({ id }, { enabled: !!id, retry: false });
  const { data: presetData } = trpc.template.presets.useQuery();
  const presets = useMemo(() => (presetData?.list ?? []).filter((p) => p.active), [presetData]);
  const updateBlock = trpc.block.update.useMutation();
  const updateCard = trpc.card.update.useMutation();

  const [form, setForm] = useState({ name: "", designation: "", company: "", about: "", phone: "", email: "", website: "" });
  const [style, setStyle] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!card || ready) return;
    const blocks = ((card as { blocks?: Blk[] }).blocks) || [];
    const p = (blocks.find((b) => b.type === "profile_header")?.content) || {};
    const c = (blocks.find((b) => b.type === "contact_info")?.content) || {};
    setForm({
      name: s(p.name) || s((card as { title?: string }).title), designation: s(p.title), company: s(p.company), about: s(p.bio),
      phone: s(c.phone), email: s(c.email), website: s(c.website),
    });
    setStyle(Number((card as { templateId?: number }).templateId) || presets[0]?.style || 1);
    setPublished((card as { status?: string }).status === "published");
    setReady(true);
  }, [card, ready, presets]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const preset = presets.find((p) => p.style === style);
  const cust = useMemo(() => ({
    name: form.name, designation: form.designation, company_name: form.company, about_us: form.about,
    mobile1: form.phone, mobile2: form.phone, email: form.email, url: form.website,
    theme: String(style || 1), color: preset?.primary || "#F7B31C", color2: preset?.secondary || "",
  }), [form, style, preset]);
  const previewHtml = useMemo(() => buildCardHtml(cust as unknown as Parameters<typeof buildCardHtml>[0], [], [], [], [], []), [cust]);
  const thumbs = useMemo(() => presets.map((p) => ({ ...p, html: buildCardThumb({ ...(cust as Record<string, unknown>), color: p.primary, color2: p.secondary } as unknown as Parameters<typeof buildCardThumb>[0], p.style) })), [presets, cust]);

  const save = async () => {
    const blocks = ((card as { blocks?: Blk[] }).blocks) || [];
    const pb = blocks.find((b) => b.type === "profile_header");
    const cb = blocks.find((b) => b.type === "contact_info");
    setSaving(true);
    try {
      if (pb) await updateBlock.mutateAsync({ id: pb.id, content: { name: form.name, title: form.designation, company: form.company, bio: form.about } });
      if (cb) await updateBlock.mutateAsync({ id: cb.id, content: { phone: form.phone, email: form.email, website: form.website, address: s(cb.content?.address) } });
      await updateCard.mutateAsync({ id, title: form.name || "Untitled", templateId: style || undefined, status: published ? "published" : "draft" });
      toast.success("Card saved");
      refetch();
    } catch { toast.error("Could not save — please try again."); }
    finally { setSaving(false); }
  };

  if (isLoading || !ready) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 size={22} className="animate-spin text-[#94A3B8]" /></div>;
  }
  if (!card) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-3"><p className="text-sm text-[#64748B]">Card not found.</p><button onClick={() => navigate("/dashboard/cards")} className="text-sm font-semibold text-[#B45309]">← Back to My Cards</button></div>;
  }

  const field = (label: string, k: keyof typeof form, icon: React.ReactNode, ph: string, area = false) => (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B] mb-1">{icon} {label}</label>
      {area
        ? <textarea value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} rows={3} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 resize-none" />
        : <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="w-full h-10 rounded-xl border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#F1F5F9] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/dashboard/cards")} className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#334155] hover:bg-[#F8FAFC] shrink-0"><ArrowLeft size={17} /></button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#0F172A] truncate">{form.name || "Edit card"}</h1>
            <p className="text-[11px] text-[#94A3B8]">Team card · design & details</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={`/${(card as { slug?: string }).slug || ""}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"><ExternalLink size={15} /> <span className="hidden sm:inline">View</span></a>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
        </div>
      </header>

      <div className="p-4 sm:p-6 grid lg:grid-cols-[1fr_380px] gap-5 max-w-6xl mx-auto items-start">
        {/* Left: fields + design */}
        <div className="space-y-5 order-2 lg:order-1">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-4 flex items-center gap-1.5"><User size={16} className="text-[#F7B31C]" /> Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {field("Full name", "name", <User size={12} />, "e.g. Divya Menon")}
              {field("Designation", "designation", <FileText size={12} />, "e.g. Support Executive")}
              {field("Company", "company", <Building2 size={12} />, "Company name")}
              {field("Phone", "phone", <Phone size={12} />, "+91 XXXXX XXXXX")}
              {field("Email", "email", <Mail size={12} />, "you@company.com")}
              {field("Website", "website", <Globe size={12} />, "https://…")}
              <div className="sm:col-span-2">{field("About", "about", <FileText size={12} />, "A short line about this person / role.", true)}</div>
            </div>
            <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 accent-[#F7B31C]" />
              <span className="text-sm text-[#334155]">Published <span className="text-[#94A3B8]">(live at your public link)</span></span>
            </label>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-[15px] font-semibold text-[#0F172A] mb-4 flex items-center gap-1.5"><Palette size={16} className="text-[#F7B31C]" /> Design</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {thumbs.map((t) => {
                const active = style === t.style;
                return (
                  <button key={t.id} onClick={() => setStyle(t.style)} title={t.name}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${active ? "border-[#F7B31C] ring-2 ring-[#F7B31C]/25 scale-[1.02]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
                    <ThumbFrame html={t.html} title={t.name} />
                    {active && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#F7B31C] text-[#0F172A] flex items-center justify-center shadow"><Check size={12} /></span>}
                    <span className="block text-[9px] font-semibold text-[#475569] truncate px-1 py-1 bg-white">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9]">
            <p className="text-[11px] font-semibold text-[#94A3B8] mb-2.5 text-center">Live preview</p>
            <div className="mx-auto w-full max-w-[340px] h-[620px] rounded-[32px] bg-[#0F172A] p-2 shadow-premium-lg">
              <iframe title="preview" srcDoc={previewHtml} className="w-full h-full rounded-[26px] bg-white border-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
