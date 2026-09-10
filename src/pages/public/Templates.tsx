/*
 * /templates — the browse-and-pick page for card designs.
 *
 * Every tile is a real card rendered by the same engine that builds the live
 * card, so what a visitor sees here is genuinely what they get. Around that:
 * a sliding category filter, a page-level story about what every template
 * includes, and a FAQ that also feeds FAQPage schema.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Eye, ArrowRight, Palette, X, Sparkles, Check, Phone, ShoppingBag,
  QrCode, ImageIcon, Star, MessageSquare, Share2, Download, Wallet,
  ChevronRight, Paintbrush, Rocket, MousePointerClick,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, buildCardHtml } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

type Preset = { id: number; name: string; style: number; primary: string; secondary: string; active: boolean; category?: string; featured?: boolean };
const CATS = ["all", "featured", "basic", "modern", "bio", "professional", "premium"] as const;
type Cat = (typeof CATS)[number];

/* Everything every card comes with — shown on the page and in the preview. */
const CARD_FEATURES = [
  { icon: Phone, label: "Click-to-call & WhatsApp" },
  { icon: ShoppingBag, label: "Products / Services" },
  { icon: Wallet, label: "Payments & UPI" },
  { icon: QrCode, label: "Payment QR codes" },
  { icon: ImageIcon, label: "Photo & video gallery" },
  { icon: Star, label: "Google reviews" },
  { icon: MessageSquare, label: "Enquiry form" },
  { icon: Share2, label: "Social links" },
  { icon: Download, label: "Save to contacts (vCard)" },
];

const STEPS = [
  { icon: MousePointerClick, num: 1, title: "Pick a design", desc: "Every template is a real card, not a mockup — what you preview is what publishes." },
  { icon: Paintbrush, num: 2, title: "Make it yours", desc: "Add your details and logo, then shift the colours to your own brand shades." },
  { icon: Rocket, num: 3, title: "Publish and share", desc: "You get a link and a permanent QR the same day. Change the design later, both keep working." },
];

/* Built from the LIVE preset count so the answer can never contradict the
   grid above it (the catalogue grows, a hard-coded number would go stale). */
const faqsFor = (count: number) => [
  { q: "Can I change the template after I publish?", a: "Yes, as often as you like. Your link and QR code stay exactly the same, so anything you have already printed or shared keeps working — only the design changes." },
  { q: "Do the colours have to stay as shown?", a: "No. Each template ships with its own colour pair, but you can set your own primary and secondary colours, and the card can even pick them up automatically from your uploaded logo." },
  { q: "Are all the features available on every template?", a: "Yes. Products, payments, gallery, videos, Google reviews, the enquiry form and the QR are available on every design — the template decides how it looks, not what it can do." },
  { q: "Is what I see in the preview what I actually get?", a: "Yes. Every thumbnail and preview on this page is rendered by the same engine that builds the live card, using sample business details in place of yours." },
  { q: "How many templates are there?", a: `There are ${count} designs across classic, modern, link-in-bio and premium styles, and new ones are added regularly. Every plan gets access to all of them.` },
];

/* A polished sample business shown inside every template preview */
const DEMO = {
  ...DEFAULT_CUSTOMER,
  name: "Aarav Sharma", designation: "Founder & CEO", company_name: "Acme Digital",
  mobile1: "+91 98765 43210", email: "hello@acmedigital.example", url: "https://acmedigital.example",
  address: "MG Road, Bengaluru, Karnataka 560001",
  about_us: "Acme Digital is a full-service marketing agency helping brands grow online.",
  facebook: "#", instagram: "#", youtube: "#", linkedin: "#",
};

/* Fixed-width preview that shows the COMPLETE first page (375×560 → scaled to fit) */
const CARD_W = 210, SCALE = CARD_W / 375, CARD_H = Math.round(560 * SCALE);
function Thumb({ style, primary, secondary }: { style: number; primary: string; secondary: string }) {
  const html = useMemo(() => buildCardThumb({ ...DEMO, color: primary, color2: secondary }, style), [style, primary, secondary]);
  return (
    <div className="relative overflow-hidden bg-[#F8FAFC] pointer-events-none" style={{ width: CARD_W, height: CARD_H }}>
      <iframe title={`Style ${style}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: "375px", height: "560px", border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

export default function Templates() {
  const { data } = trpc.template.presets.useQuery();
  const presets = useMemo(() => ((data?.list ?? []) as Preset[]).filter((p) => p.active), [data]);
  const [preview, setPreview] = useState<Preset | null>(null);
  const [cat, setCat] = useState<Cat>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const FAQS = useMemo(() => faqsFor(presets.length || 31), [presets.length]);

  const catCount = (c: Cat) => c === "all" ? presets.length
    : c === "featured" ? presets.filter((p) => p.featured).length
    : presets.filter((p) => (p.category || "modern") === c).length;
  const shownCats = useMemo(() => CATS.filter((c) => catCount(c) > 0 || c === "all"), [presets]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => presets.filter((p) =>
    cat === "all" ? true : cat === "featured" ? !!p.featured : (p.category || "modern") === cat
  ), [presets, cat]);

  // Sliding indicator on the category filter, measured so it tracks labels of
  // different widths (and re-measures when the list arrives from the server).
  const catRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const catIdx = shownCats.indexOf(cat);
  useLayoutEffect(() => {
    const measure = () => {
      const el = catRefs.current[catIdx];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [catIdx, shownCats.length]);

  const previewHtml = useMemo(
    () => (preview ? buildCardHtml({ ...DEMO, color: preview.primary, color2: preview.secondary }, [], [], [], [], [], []) : ""),
    [preview]
  );

  /* Modal behaviour the old version was missing: Escape closes it, the page
     behind stops scrolling, and focus returns to whatever opened it. */
  const openerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!preview) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [preview]);

  const openPreview = (p: Preset, e: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = e.currentTarget;
    setPreview(p);
  };

  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    let s = document.getElementById("dc-templates-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-templates-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-templates-ld")?.remove(); };
  }, [FAQS]);

  return (
    <div className="pt-24 pb-20 relative">
      <div aria-hidden="true" className="absolute inset-0 bg-grid mask-fade-b opacity-55 pointer-events-none" />
      <div aria-hidden="true" className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/14 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift pointer-events-none" />
      <div aria-hidden="true" className="absolute top-52 left-0 w-[380px] h-[380px] bg-[#14B8A6]/10 rounded-full blur-3xl -translate-x-1/3 animate-aurora-drift pointer-events-none" style={{ animationDelay: "3s" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <Reveal stagger className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E]"><Palette size={12} /> Templates</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.08]">
            {presets.length || 31}{" "}
            <span className="relative inline-block text-gradient-gold">
              Ready-to-Use
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>{" "}
            Card Designs
          </h1>
          <p className="mt-6 text-base text-[#64748B] leading-relaxed">
            Every tile below is a real card, rendered live — not a mockup. Pick one, add your details, and publish in minutes, or shift the colours to match your brand.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2 text-base">Start free <ArrowRight size={17} /></Link>
            <Link to="/pricing" className="btn-navy h-12 px-8 inline-flex items-center justify-center gap-2 text-base">View pricing</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Every feature on every design</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Switch design anytime</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Your QR never changes</span>
          </div>
        </Reveal>

        {/* Category filter */}
        {presets.length > 0 && (
          <Reveal className="flex justify-center mb-10">
            <div className="relative inline-flex gap-1 p-1.5 rounded-2xl bg-[#F1F5F9] ring-1 ring-[#E2E8F0] max-w-full overflow-x-auto no-scrollbar">
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 rounded-xl bg-[#0F172A] shadow-premium transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
                style={{ left: pill.left, width: pill.width }}
              />
              {shownCats.map((c, i) => {
                const on = cat === c;
                return (
                  <button
                    key={c}
                    ref={(el) => { catRefs.current[i] = el; }}
                    onClick={() => setCat(c)}
                    aria-pressed={on}
                    className={`relative z-10 shrink-0 h-10 px-4 rounded-xl text-sm font-semibold capitalize transition-colors duration-300 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}
                  >
                    {c === "featured" ? "★ Featured" : c}
                    <span className={`text-[11px] font-bold tabular-nums ${on ? "text-[#F7B31C]" : "text-[#94A3B8]"}`}>{catCount(c)}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* Grid */}
        {presets.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <Palette size={32} className="text-[#CBD5E1] mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-[#94A3B8]">Loading templates…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <Palette size={32} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm text-[#94A3B8]">No templates in this category yet.</p>
          </div>
        ) : (
          /* keyed so switching category cross-fades instead of snapping */
          <div key={cat} className="dc-swap-in flex flex-wrap justify-center gap-4">
            {visible.map((p) => (
              <div key={p.id} className="group relative bg-white rounded-2xl ring-1 ring-[#E8ECF3] shadow-premium overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg hover:ring-[#F7B31C]/50" style={{ width: CARD_W }}>
                <div className="relative">
                  {p.featured && <span className="absolute top-2 left-2 z-20 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F7B31C] text-[#0F172A] shadow">★ FEATURED</span>}
                  <Thumb style={p.style} primary={p.primary} secondary={p.secondary} />
                  <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/45 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                    <button
                      onClick={(e) => openPreview(p, e)}
                      aria-label={`Preview ${p.name}`}
                      className="h-9 px-4 bg-white text-[#0F172A] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                    >
                      <Eye size={14} /> Preview
                    </button>
                  </div>
                </div>
                <div className="p-3 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: p.primary }} />
                    <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: p.secondary }} />
                    <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">{p.name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Every template includes */}
        <section className="mt-24">
          <SectionHeading
            eyebrow="On every design"
            title={<>The Template Decides the Look, <span className="text-gradient-gold">Not the Limits</span></>}
            subtitle="Every feature works on every design — so pick the one you like, not the one that does the most."
          />
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CARD_FEATURES.map((f) => (
              <div key={f.label} className="group flex items-center gap-3 rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium hover:ring-[#F7B31C]/40">
                <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"><f.icon size={17} /></span>
                <span className="text-[13.5px] font-semibold text-[#0F172A] flex-1">{f.label}</span>
                <Check size={15} className="text-emerald-500 shrink-0" />
              </div>
            ))}
          </Reveal>
        </section>

        {/* How it works */}
        <section className="mt-24 relative rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 px-6 py-14 sm:px-10 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
          <div aria-hidden="true" className="absolute -top-16 -right-16 w-64 h-64 bg-[#F7B31C]/20 rounded-full blur-3xl" />
          <div className="relative">
            <SectionHeading
              eyebrow="How it works"
              title={<>From Design to <span className="text-gradient-gold">Live Card</span></>}
              subtitle="Three steps, and nothing you pick now locks you in later."
              light
            />
            <Reveal stagger className="grid sm:grid-cols-3 gap-8 relative">
              <div aria-hidden="true" className="hidden sm:block absolute top-10 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/20" />
              {STEPS.map((s) => (
                <div key={s.num} className="text-center relative z-10 group">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                      <s.icon size={28} className="text-[#D97706]" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#0F172A] border-2 border-[#F7B31C] flex items-center justify-center">
                      <span className="text-xs font-bold text-[#F7B31C]">{s.num}</span>
                    </div>
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-[12.5px] text-[#94A3B8] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-24 max-w-3xl mx-auto">
          <SectionHeading
            eyebrow="Questions"
            title={<>Before You <span className="text-gradient-gold">Pick One</span></>}
            subtitle="What people check before choosing a design."
          />
          <Reveal stagger className="space-y-3">
            {FAQS.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/45 shadow-premium-lg" : "ring-[#E2E8F0] shadow-premium hover:ring-[#CBD5E1]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(on ? null : i)}
                    aria-expanded={on}
                    className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                  >
                    <h3 className="flex-1 text-[14.5px] font-bold text-[#0F172A] leading-snug">{f.q}</h3>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${on ? "bg-[#F7B31C] text-[#0F172A] rotate-90" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      <ChevronRight size={15} />
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-5 text-[13.5px] text-[#64748B] leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </section>

        {/* AI CTA */}
        <Reveal className="mt-24 relative text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 rounded-3xl p-10 sm:p-14 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
          <div aria-hidden="true" className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#8B5CF6]/20 rounded-full blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F7B31C]/15 text-[#F7B31C] ring-1 ring-[#F7B31C]/25"><Sparkles size={11} /> AI powered</span>
            <h2 className="mt-4 text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Can&apos;t find the perfect template?</h2>
            <p className="mt-3 text-sm text-[#94A3B8] mb-7 max-w-lg mx-auto leading-relaxed">Paste your website or describe your business, and AI builds a card — copy, services and colours included — in about ten seconds.</p>
            <Link to="/ai-card-generator" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2 text-base">Try AI Card Generator <ArrowRight size={17} /></Link>
          </div>
        </Reveal>
      </div>

      {/* Preview modal — phone mockup + features */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={`${preview.name} preview`}>
          <div className="absolute inset-0 bg-[#0F172A]/75 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="dc-enter relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8">
            <button ref={closeBtnRef} onClick={() => setPreview(null)} aria-label="Close preview" className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl bg-[#0F172A]/5 hover:bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"><X size={18} /></button>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Phone mockup */}
              <div className="bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] p-6 sm:p-8 flex justify-center relative overflow-hidden">
                <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-[#F7B31C]/20 blur-3xl pointer-events-none" />
                {/* Samsung Galaxy Note mockup */}
                <div className="relative w-[236px] shrink-0" style={{ height: "500px" }}>
                  {/* side buttons */}
                  <div className="absolute -right-[2px] top-28 w-[3px] h-9 rounded-r-sm bg-[#2a2f3a]" />
                  <div className="absolute -right-[2px] top-44 w-[3px] h-14 rounded-r-sm bg-[#2a2f3a]" />
                  <div className="absolute -left-[2px] top-40 w-[3px] h-11 rounded-l-sm bg-[#2a2f3a]" />
                  {/* body — slim symmetric bezel, softly squared corners */}
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-[#20242e] to-[#0a0c11] p-[5px] shadow-2xl ring-1 ring-white/10">
                    <div className="relative w-full h-full rounded-[1.7rem] overflow-hidden bg-white ring-1 ring-black/50">
                      {/* Infinity-O centre punch-hole camera */}
                      <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#05070b] z-20 ring-[1.5px] ring-[#11141b] shadow-inner" />
                      <iframe title={preview.name} srcDoc={previewHtml} style={{ width: "375px", height: "780px", border: 0, transform: "scale(0.6)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preview.primary }} />
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preview.secondary }} />
                  <h3 className="text-xl font-bold text-[#0F172A]">{preview.name}</h3>
                </div>
                <p className="text-[13px] text-[#64748B] mb-5">A one-page digital card with its own colour combination — packed with everything you need to convert visitors.</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2.5">What&apos;s included</p>
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {CARD_FEATURES.map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><f.icon size={14} className="text-[#D97706]" /></span>
                      <span className="text-[13px] text-[#334155] font-medium">{f.label}</span>
                      <Check size={14} className="text-emerald-500 ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
                <Link to={`/signup?theme=${preview.style}&color=${encodeURIComponent(preview.primary)}&color2=${encodeURIComponent(preview.secondary || "")}`} className="btn-gold h-12 w-full inline-flex items-center justify-center gap-2">Use this template <ArrowRight size={16} /></Link>
                <p className="text-[11px] text-[#94A3B8] text-center mt-2">30 Days Free Cardless Trial</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
