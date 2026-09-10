import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import {
  Sparkles, Wand2, RefreshCw, ArrowRight, ArrowLeft, Loader2, Check, Palette,
  Zap, Globe, PenLine, ChevronRight, FileText, ShoppingBag, Search, Layers,
  Clock, Rocket, Eye,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardHtml, buildCardThumb } from "@/card-template/buildCard";
import { toast } from "sonner";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

type AiCard = {
  tagline: string; about: string; services: { name: string; description: string }[];
  cta: string; seoTitle: string; seoDescription: string;
  theme: number; color: string; color2: string; avatarStyle: string; source: "ai" | "smart";
};
type WebExtract = {
  businessName: string; logo: string; color?: string; color2?: string;
  phone: string; email: string; address: string; city: string;
  url: string; socials: Record<string, string>;
};

const CARD_STYLES = 31;
const THUMB_W = 375, THUMB_H = 626;

/* Varied brand palettes so each template shows in its own colour — the spread of
   designs looks like the products/templates gallery, not one flat AI colour. */
const PALETTE: [string, string][] = [
  ["#F7B31C", "#0F172A"], ["#3B82F6", "#0f2b2e"], ["#16A34A", "#052e16"], ["#8B5CF6", "#2E1065"],
  ["#EF4444", "#450a0a"], ["#F97316", "#431407"], ["#EC4899", "#500724"], ["#0EA5E9", "#0C4A6E"],
  ["#14B8A6", "#042f2e"], ["#334155", "#0f172a"], ["#D946EF", "#4a044e"], ["#EAB308", "#422006"],
  ["#06B6D4", "#083344"], ["#DC2626", "#450a0a"], ["#7C3AED", "#2e1065"], ["#0D9488", "#042f2e"],
];
const colorForStyle = (s: number): [string, string] => PALETTE[(s - 1) % PALETTE.length];

/* A small, selectable template thumbnail (scaled card front). */
function TemplateThumb({ html, active, label, onClick }: { html: string; active: boolean; label: number; onClick: () => void }) {
  const W = 92;
  return (
    <button onClick={onClick} title={`Design ${label}`} className={`relative shrink-0 rounded-xl overflow-hidden bg-white transition-all ${active ? "ring-2 ring-[#F7B31C] shadow-gold" : "ring-1 ring-[#E2E8F0] hover:ring-[#F7B31C]/60"}`} style={{ width: W, aspectRatio: `${THUMB_W}/${THUMB_H}` }}>
      <iframe srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy" title={`Design ${label}`} className="pointer-events-none" style={{ width: THUMB_W, height: THUMB_H, border: 0, transform: `scale(${W / THUMB_W})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
      {active && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F7B31C] flex items-center justify-center"><Check size={10} className="text-[#0F172A]" /></span>}
    </button>
  );
}

const PROFESSIONS = ["Real Estate Agent", "Doctor", "Chartered Accountant", "Interior Designer", "Photographer", "Digital Marketer", "Salon & Spa", "Restaurant", "Lawyer", "Fitness Trainer", "Insurance Advisor", "Boutique"];
const GEN_MSGS = ["Understanding your business…", "Writing your bio & services…", "Matching a design & colours…", "Polishing your card…"];
const WEB_MSGS = ["Reading your website…", "Finding your logo & brand colours…", "Pulling your services & contact details…", "Designing your card…"];

/* Marketing content — rendered only on the form step, so it never competes
   with the tool once someone is actually generating or reviewing a card. */
const WRITES = [
  { icon: PenLine, accent: "#F7B31C", title: "Your tagline", desc: "One line that says what you do, in words a customer would actually use." },
  { icon: FileText, accent: "#8B5CF6", title: "Your about section", desc: "A short, credible introduction written from your own business details." },
  { icon: ShoppingBag, accent: "#EC4899", title: "Your services", desc: "Each one named and described, ready to show with pricing later." },
  { icon: Search, accent: "#3B82F6", title: "Your SEO text", desc: "Meta title and description so the card can be found on Google." },
  { icon: Palette, accent: "#14B8A6", title: "A matching design", desc: "A template and colour pair picked to suit your line of work." },
  { icon: Zap, accent: "#F97316", title: "Your call to action", desc: "The button text most likely to turn a visitor into an enquiry." },
];

const HOW = [
  { icon: PenLine, num: 1, title: "Describe it, or paste a link", desc: "Three details is enough. If you already have a website, the link alone will do." },
  { icon: Sparkles, num: 2, title: "AI writes and designs", desc: "Copy, services, SEO, template and colours — generated in about ten seconds." },
  { icon: Rocket, num: 3, title: "Preview, tweak, publish", desc: "Swap the design, change colours, regenerate any section, then save it free." },
];

const AI_FAQS = [
  { q: "Is the AI card generator free to use?", a: "Yes. You can generate a card and preview it live without signing up or entering any card details. You only create an account when you want to save it and publish it on your own link." },
  { q: "What does the AI actually write for me?", a: "It writes your tagline, about section, service names and descriptions, SEO title and description, and your call-to-action button text. It also picks a template and a colour pair that suit your profession." },
  { q: "Can I build a card from my existing website?", a: "Yes. Paste your website address and the AI reads the page — pulling your logo, brand colours, services, contact details and location — then writes the card content to match what is already on your site." },
  { q: "Can I change what the AI produced?", a: "Yes. Every section has a regenerate button, you can pick any of the 31 designs, and you can override the primary and secondary colours with your own brand shades before saving." },
  { q: "How long does it take?", a: "About five seconds when you describe your business, and around ten when the AI has to read your website first. The preview updates instantly after that." },
];

export default function AIGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [mode, setMode] = useState<"describe" | "website">("describe");
  const [website, setWebsite] = useState("");
  const [web, setWeb] = useState<WebExtract | null>(null);
  const [form, setForm] = useState({ businessName: "", profession: "", city: "", phone: "" });
  const [gen, setGen] = useState<AiCard | null>(null);
  const [theme, setTheme] = useState<number | null>(null); // user's override of the AI-picked design
  const [customColor, setCustomColor] = useState<string | null>(null);  // user's colour override (null = follow design)
  const [customColor2, setCustomColor2] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const genMut = trpc.ai.generate.useMutation();
  const regenMut = trpc.ai.regenerate.useMutation();
  const webMut = trpc.ai.fromWebsite.useMutation();
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    // Advance and hold on the last step. It used to wrap with `% length`, which
    // is fine for a rotating caption but wrong for a checklist — steps would
    // un-tick and start over while the request was still in flight.
    if (step === "generating") { timerRef.current = setInterval(() => setMsgIdx((i) => Math.min(i + 1, GEN_MSGS.length - 1)), 1100); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // FAQPage schema, matching the copy rendered below the tool.
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: AI_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    let s = document.getElementById("dc-ai-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-ai-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-ai-ld")?.remove(); };
  }, []);

  const generate = async () => {
    if (!form.businessName.trim() || !form.profession.trim()) { toast.error("Add your business name and profession"); return; }
    setStep("generating"); setMsgIdx(0);
    try {
      const res = await genMut.mutateAsync(form);
      setWeb(null);
      setGen(res as AiCard);
      setTheme(null); // adopt the AI's design pick; user can change it below
      setCustomColor(null); setCustomColor2(null); // adopt the AI/design colours
      setStep("result");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Generation failed"); setStep("form"); }
  };

  const generateFromWebsite = async () => {
    const url = website.trim();
    if (!url) { toast.error("Paste your website address"); return; }
    setStep("generating"); setMsgIdx(0);
    try {
      const res = await webMut.mutateAsync({ url });
      const { web: w, ...card } = res as AiCard & { web: WebExtract };
      setWeb(w);
      setGen(card as AiCard);
      setForm((f) => ({ ...f, businessName: w.businessName || f.businessName, city: w.city || f.city, phone: w.phone || f.phone }));
      setTheme(null); setCustomColor(null); setCustomColor2(null);
      setStep("result");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't read that website — try another URL."); setStep("form"); }
  };

  const regenSection = async (section: "tagline" | "about" | "services" | "cta") => {
    if (!gen) return;
    try {
      const r = await regenMut.mutateAsync({ ...form, section });
      setGen({ ...gen, [section]: r.value as never });
    } catch { toast.error("Couldn't regenerate — try again"); }
  };

  const effTheme = theme ?? gen?.theme ?? 1;
  // Base colours come from the chosen design (or the AI pick); a custom colour overrides.
  const [autoColor, autoColor2]: [string, string] = gen ? (theme !== null ? colorForStyle(theme) : [gen.color, gen.color2]) : ["#F7B31C", "#0F172A"];
  const effColor = customColor ?? autoColor;
  const effColor2 = customColor2 ?? autoColor2;

  // Selecting a design adopts that design's palette (drops any custom colour).
  const pickTheme = (sn: number) => { setTheme(sn); setCustomColor(null); setCustomColor2(null); };

  const contentRec = useMemo(() => gen ? ({
    name: web?.businessName || form.businessName || "Your Business", designation: form.profession || "",
    company_name: web?.businessName || form.businessName || "",
    logo: web?.logo || "", logo_shape: web?.logo ? "plain" : "square",
    address: web?.address || form.city || "", city: web?.city || form.city || "",
    about: gen.about, about_on: 1, specialities: gen.services.map((s) => s.name).join(", "),
    product_on: 1, enquiry_on: 1,
    slug: "ai-preview", mobile1: web?.phone || form.phone || "+91 98765 43210", mobile2: web?.phone || "",
    email: web?.email || "hello@yourbusiness.in", url: web?.url || "yourbusiness.in", social_title: gen.tagline,
    ...(web?.socials || {}),
  }) : null, [gen, form, web]);

  const previewHtml = useMemo(() => {
    if (!gen || !contentRec) return "";
    const rec = { ...contentRec, theme: effTheme, color: effColor, color2: effColor2 } as unknown as Parameters<typeof buildCardHtml>[0];
    const products = gen.services.map((s, i) => ({ id: i + 1, name: s.name, description: s.description, filename: "", price: "", offer_price: "", button: "", button_title: gen.cta }));
    return buildCardHtml(rec, products as unknown as Parameters<typeof buildCardHtml>[1], [], [], [], [], []);
  }, [gen, contentRec, effTheme, effColor, effColor2]);

  const thumbs = useMemo(() => {
    if (!contentRec) return [];
    return Array.from({ length: CARD_STYLES }, (_, i) => i + 1).map((sn) => {
      const [col, col2] = colorForStyle(sn);
      return { style: sn, html: buildCardThumb({ ...contentRec, theme: sn, color: col, color2: col2 } as unknown as Parameters<typeof buildCardThumb>[0], sn) };
    });
  }, [contentRec]);

  const saveAndSignup = () => {
    if (!gen) return;
    try { localStorage.setItem("dc_ai_draft", JSON.stringify({ form, web, gen: { ...gen, theme: effTheme, color: effColor, color2: effColor2 }, at: Date.now() })); } catch { /* ignore */ }
    navigate("/signup?ai=1");
  };

  const regenBtn = (section: "tagline" | "about" | "services" | "cta") => (
    <button onClick={() => regenSection(section)} disabled={regenMut.isPending} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8] hover:text-[#F7B31C] disabled:opacity-50 transition-colors" title="Regenerate">
      {regenMut.isPending && regenMut.variables?.section === section ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Regenerate
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBEB] via-white to-white pt-24 pb-20 relative">
      {/* Ambient backdrop — decorative only, and already covered by the
          reduced-motion kill list via animate-aurora-drift. */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid mask-fade-b opacity-60 pointer-events-none" />
      <div aria-hidden="true" className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift pointer-events-none" />
      <div aria-hidden="true" className="absolute top-40 left-0 w-[380px] h-[380px] bg-[#8B5CF6]/10 rounded-full blur-3xl -translate-x-1/3 animate-aurora-drift pointer-events-none" style={{ animationDelay: "3s" }} />

      <div className="max-w-6xl mx-auto px-4 relative">
        <Reveal stagger className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F172A] text-[#F7B31C] text-[11px] font-bold uppercase tracking-wider"><Sparkles size={13} /> AI Powered</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.08]">
            Your digital card,{" "}
            <span className="relative inline-block text-gradient-gold">
              written by AI
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-base text-[#64748B] leading-relaxed">Tell us three things — our AI writes your bio, services and SEO, and picks a design. Preview it live, then save &amp; publish free.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Free to try</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> No signup to preview</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-emerald-500" /> About 10 seconds</span>
          </div>
        </Reveal>

        {step === "form" && (
          <div className="mt-10 max-w-xl mx-auto bg-white rounded-3xl shadow-premium-lg border border-[#F1F5F9] p-7">
            <div className="flex gap-1.5 p-1 bg-[#F1F5F9] rounded-xl mb-6">
              {([["describe", "Describe my business", PenLine], ["website", "I have a website", Globe]] as const).map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold transition-all ${mode === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {mode === "website" ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Your website address</label>
                  <div className="relative">
                    <Globe size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input value={website} onChange={(e) => setWebsite(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") generateFromWebsite(); }} placeholder="e.g. yourbusiness.com" inputMode="url" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">Paste your website link — our AI reads it and pulls your <strong>logo, brand colours, services, contact details &amp; location</strong>, then designs your card automatically.</p>
                </div>
                <button onClick={generateFromWebsite} className="w-full py-3.5 rounded-xl gradient-gold text-[#0F172A] font-bold text-base flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.99]">
                  <Wand2 size={19} /> Build my card from my website
                </button>
                <p className="text-center text-[11px] text-[#94A3B8]">Free · No signup needed to preview · Takes ~10 seconds</p>
              </div>
            ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Business / your name</label>
                <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. Sharma Real Estate" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Profession / industry</label>
                <input value={form.profession} onChange={(e) => set("profession", e.target.value)} placeholder="e.g. Real Estate Agent" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {PROFESSIONS.slice(0, 8).map((p) => (
                    <button key={p} onClick={() => set("profession", p)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${form.profession === p ? "bg-[#FEF3C7] border-[#F7B31C] text-[#92400E]" : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#F7B31C]"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">City <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Jaipur" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Mobile number</label>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s-]/g, ""))} inputMode="tel" maxLength={20} placeholder="e.g. +91 98765 43210" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                </div>
              </div>
              <button onClick={generate} className="w-full py-3.5 rounded-xl gradient-gold text-[#0F172A] font-bold text-base flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.99]">
                <Wand2 size={19} /> Generate my card
              </button>
              <p className="text-center text-[11px] text-[#94A3B8]">Free · No signup needed to preview · Takes ~5 seconds</p>
            </div>
            )}
          </div>
        )}

        {step === "generating" && (() => {
          const msgs = mode === "website" ? WEB_MSGS : GEN_MSGS;
          const pct = Math.round(((msgIdx + 1) / msgs.length) * 100);
          return (
            <div className="mt-14 max-w-md mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-[#F7B31C]/20 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full gradient-gold flex items-center justify-center shadow-gold"><Sparkles size={38} className="text-[#0F172A] animate-pulse" /></div>
                </div>
                <h2 className="mt-7 text-xl font-bold text-[#0F172A]">Creating your card…</h2>
                <p className="mt-1.5 text-[13px] text-[#94A3B8]">This usually takes a few seconds.</p>
              </div>

              {/* Checklist: done steps tick, the current one spins. Far easier to
                  wait through than a single caption that keeps changing. */}
              <div className="mt-8 rounded-2xl bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-5">
                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#F7B31C] to-[#D97706] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                </div>
                <ul className="mt-5 space-y-3.5" aria-live="polite">
                  {msgs.map((m, i) => {
                    const done = i < msgIdx;
                    const now = i === msgIdx;
                    return (
                      <li key={m} className={`flex items-center gap-3 transition-all duration-500 ${done || now ? "opacity-100" : "opacity-40"}`}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                          done ? "bg-emerald-50 text-emerald-600" : now ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#F1F5F9] text-[#CBD5E1]"
                        }`}>
                          {done ? <Check size={14} strokeWidth={3} /> : now ? <Loader2 size={14} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </span>
                        <span className={`text-[13.5px] leading-snug ${now ? "font-bold text-[#0F172A]" : done ? "font-medium text-[#475569]" : "text-[#94A3B8]"}`}>{m}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })()}

        {step === "result" && gen && (
          <div className="mt-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#16A34A]"><Check size={12} /> {gen.source === "ai" ? "AI-generated" : "Generated"}</span>
                <h2 className="text-xl font-bold text-[#0F172A] mt-1">Your card is ready 🎉</h2>
              </div>
              <button onClick={mode === "website" ? generateFromWebsite : generate} className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-2"><RefreshCw size={15} /> Regenerate all</button>
            </div>

            {/* Design / template picker — on top, full width, each in its own colour */}
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] flex items-center gap-1.5"><Palette size={12} /> Choose your design ({CARD_STYLES} styles)</p>
                <span className="text-[11px] font-medium text-[#64748B]">Design #{effTheme}{theme === null ? " · AI pick" : ""}</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
                {thumbs.map((t) => (
                  <TemplateThumb key={t.style} html={t.html} label={t.style} active={effTheme === t.style} onClick={() => pickTheme(t.style)} />
                ))}
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">Scroll & tap any design — the preview and colours update instantly.</p>
            </div>

            {/* Preview + content */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-8 items-start">
              <div className="lg:sticky lg:top-24">
                <div className="mx-auto w-full max-w-[360px] bg-white rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-[#1E293B]" style={{ height: "min(72vh, 720px)" }}>
                  <iframe srcDoc={previewHtml} title="AI card preview" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms allow-modals allow-top-navigation-by-user-activation" className="w-full h-full border-0 bg-white" />
                </div>
                <p className="text-center text-[11px] text-[#94A3B8] mt-3">Live preview · sample contact — you'll add yours after signup</p>
              </div>

              <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
                <div className="flex items-center justify-between mb-1"><p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Tagline</p>{regenBtn("tagline")}</div>
                <p className="text-sm font-semibold text-[#0F172A]">{gen.tagline}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
                <div className="flex items-center justify-between mb-1"><p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">About</p>{regenBtn("about")}</div>
                <p className="text-sm text-[#334155] leading-relaxed">{gen.about}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
                <div className="flex items-center justify-between mb-2"><p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Services ({gen.services.length})</p>{regenBtn("services")}</div>
                <div className="space-y-2">
                  {gen.services.map((s, i) => (
                    <div key={i} className="flex gap-2.5"><span className="w-5 h-5 rounded-md bg-[#FEF3C7] flex items-center justify-center shrink-0 mt-0.5"><Check size={12} className="text-[#F7B31C]" /></span><div><p className="text-sm font-medium text-[#0F172A]">{s.name}</p><p className="text-[12px] text-[#64748B]">{s.description}</p></div></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] flex items-center gap-1.5"><Palette size={12} /> Colours <span className="text-[#CBD5E1] normal-case font-medium">· Design #{effTheme}</span></p>
                  {(customColor !== null || customColor2 !== null) && (
                    <button onClick={() => { setCustomColor(null); setCustomColor2(null); }} className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#F7B31C] inline-flex items-center gap-1"><RefreshCw size={11} /> Reset</button>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="relative w-9 h-9 rounded-lg border border-black/10 overflow-hidden shrink-0" style={{ background: effColor }}>
                      <input type="color" value={effColor} onChange={(e) => setCustomColor(e.target.value)} className="absolute -inset-2 opacity-0 cursor-pointer" title="Primary colour" />
                    </span>
                    <span className="text-xs leading-tight"><span className="block font-semibold text-[#0F172A]">Primary</span><span className="block text-[#94A3B8] uppercase">{effColor}</span></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="relative w-9 h-9 rounded-lg border border-black/10 overflow-hidden shrink-0" style={{ background: effColor2 }}>
                      <input type="color" value={effColor2} onChange={(e) => setCustomColor2(e.target.value)} className="absolute -inset-2 opacity-0 cursor-pointer" title="Secondary colour" />
                    </span>
                    <span className="text-xs leading-tight"><span className="block font-semibold text-[#0F172A]">Secondary</span><span className="block text-[#94A3B8] uppercase">{effColor2}</span></span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {PALETTE.map(([c], i) => (
                    <button key={i} onClick={() => setCustomColor(c)} title={c} aria-label={`Use ${c}`} className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${effColor.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-[#0F172A]" : "border border-black/10"}`} style={{ background: c }} />
                  ))}
                </div>
                <p className="text-[12px] text-[#64748B] mt-3">{gen.avatarStyle}</p>
              </div>

              <div className="bg-[#0F172A] rounded-2xl p-5 text-center">
                <p className="text-white font-bold text-lg">Love it? Make it yours.</p>
                <p className="text-white/60 text-[13px] mt-1">Sign up free — your card is saved, add your real details, and publish. 30-day free trial, no card needed.</p>
                <button onClick={saveAndSignup} className="mt-4 w-full h-12 rounded-xl gradient-gold text-[#0F172A] font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all"><Zap size={18} /> Save &amp; Sign Up Free <ArrowRight size={17} /></button>
              </div>
              <button onClick={() => setStep("form")} className="w-full text-sm text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center gap-1.5 transition-colors"><ArrowLeft size={14} /> Start over</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Below the tool. Only on the form step: once someone is generating
            or reviewing a card, this would just be noise under their result. ── */}
        {step === "form" && (
          <div className="mt-24 space-y-24">
            {/* What the AI writes */}
            <section>
              <SectionHeading
                eyebrow="What you get"
                title={<>Six Things Written <span className="text-gradient-gold">For You</span></>}
                subtitle="Not a blank template — a finished card with the words already in it."
              />
              <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {WRITES.map((w) => (
                  <div key={w.title} className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40">
                    <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${w.accent}2E` }} />
                    <span className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${w.accent}18`, color: w.accent }}>
                      <w.icon size={19} />
                    </span>
                    <h3 className="relative text-[14.5px] font-bold text-[#0F172A] mb-1.5">{w.title}</h3>
                    <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{w.desc}</p>
                  </div>
                ))}
              </Reveal>
            </section>

            {/* How it works */}
            <section className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 px-6 py-14 sm:px-10 overflow-hidden">
              <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
              <div aria-hidden="true" className="absolute -top-16 -right-16 w-64 h-64 bg-[#F7B31C]/20 rounded-full blur-3xl" />
              <div className="relative">
                <SectionHeading
                  eyebrow="How it works"
                  title={<>Three Steps, <span className="text-gradient-gold">Ten Seconds</span></>}
                  subtitle="No brief to write, no designer to book, nothing to install."
                  light
                />
                <Reveal stagger className="grid sm:grid-cols-3 gap-8 relative">
                  <div aria-hidden="true" className="hidden sm:block absolute top-10 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/20" />
                  {HOW.map((s) => (
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
            <section className="max-w-3xl mx-auto">
              <SectionHeading
                eyebrow="Questions"
                title={<>Before You <span className="text-gradient-gold">Generate</span></>}
                subtitle="What people ask about the AI generator."
              />
              <Reveal stagger className="space-y-3">
                {AI_FAQS.map((f, i) => {
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

              <Reveal className="mt-9 text-center">
                <p className="text-[13.5px] text-[#64748B]">
                  Prefer to build it yourself?{" "}
                  <Link to="/digital-business-cards-templates" className="font-semibold text-[#B45309] hover:underline inline-flex items-center gap-1">
                    <Eye size={13} /> Browse the templates
                  </Link>
                  {" "}or{" "}
                  <Link to="/features" className="font-semibold text-[#B45309] hover:underline inline-flex items-center gap-1">
                    <Layers size={13} /> see every feature
                  </Link>.
                </p>
              </Reveal>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
