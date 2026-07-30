import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Wand2, RefreshCw, ArrowRight, ArrowLeft, Loader2, Check, Palette, Zap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardHtml, buildCardThumb } from "@/card-template/buildCard";
import { toast } from "sonner";

type AiCard = {
  tagline: string; about: string; services: { name: string; description: string }[];
  cta: string; seoTitle: string; seoDescription: string;
  theme: number; color: string; color2: string; avatarStyle: string; source: "ai" | "smart";
};

const CARD_STYLES = 31;
const THUMB_W = 375, THUMB_H = 626;

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

export default function AIGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [form, setForm] = useState({ businessName: "", profession: "", city: "" });
  const [gen, setGen] = useState<AiCard | null>(null);
  const [theme, setTheme] = useState<number | null>(null); // user's override of the AI-picked design
  const [msgIdx, setMsgIdx] = useState(0);
  const genMut = trpc.ai.generate.useMutation();
  const regenMut = trpc.ai.regenerate.useMutation();
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (step === "generating") { timerRef.current = setInterval(() => setMsgIdx((i) => (i + 1) % GEN_MSGS.length), 1100); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const generate = async () => {
    if (!form.businessName.trim() || !form.profession.trim()) { toast.error("Add your business name and profession"); return; }
    setStep("generating"); setMsgIdx(0);
    try {
      const res = await genMut.mutateAsync(form);
      setGen(res as AiCard);
      setTheme(null); // adopt the AI's design pick; user can change it below
      setStep("result");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Generation failed"); setStep("form"); }
  };

  const regenSection = async (section: "tagline" | "about" | "services" | "cta") => {
    if (!gen) return;
    try {
      const r = await regenMut.mutateAsync({ ...form, section });
      setGen({ ...gen, [section]: r.value as never });
    } catch { toast.error("Couldn't regenerate — try again"); }
  };

  const effTheme = theme ?? gen?.theme ?? 1;

  const baseRec = useMemo(() => gen ? ({
    name: form.businessName || "Your Business", designation: form.profession || "",
    company_name: form.businessName || "", address: form.city || "", city: form.city || "",
    about: gen.about, about_on: 1, specialities: gen.services.map((s) => s.name).join(", "),
    product_on: 1, enquiry_on: 1, color: gen.color, color2: gen.color2,
    slug: "ai-preview", mobile1: "+91 98765 43210", mobile2: "+91 98765 43210",
    email: "hello@yourbusiness.in", url: "yourbusiness.in", social_title: gen.tagline,
  }) : null, [gen, form]);

  const previewHtml = useMemo(() => {
    if (!gen || !baseRec) return "";
    const rec = { ...baseRec, theme: effTheme } as unknown as Parameters<typeof buildCardHtml>[0];
    const products = gen.services.map((s, i) => ({ id: i + 1, name: s.name, description: s.description, filename: "", price: "", offer_price: "", button: "", button_title: gen.cta }));
    return buildCardHtml(rec, products as unknown as Parameters<typeof buildCardHtml>[1], [], [], [], [], []);
  }, [gen, baseRec, effTheme]);

  const thumbs = useMemo(() => {
    if (!baseRec) return [];
    return Array.from({ length: CARD_STYLES }, (_, i) => i + 1).map((sn) => ({
      style: sn, html: buildCardThumb({ ...baseRec, theme: sn } as unknown as Parameters<typeof buildCardThumb>[0], sn),
    }));
  }, [baseRec]);

  const saveAndSignup = () => {
    if (!gen) return;
    try { localStorage.setItem("dc_ai_draft", JSON.stringify({ form, gen: { ...gen, theme: effTheme }, at: Date.now() })); } catch { /* ignore */ }
    navigate("/signup?ai=1");
  };

  const regenBtn = (section: "tagline" | "about" | "services" | "cta") => (
    <button onClick={() => regenSection(section)} disabled={regenMut.isPending} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8] hover:text-[#F7B31C] disabled:opacity-50 transition-colors" title="Regenerate">
      {regenMut.isPending && regenMut.variables?.section === section ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Regenerate
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBEB] via-white to-white pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F172A] text-[#F7B31C] text-[11px] font-bold uppercase tracking-wider"><Sparkles size={13} /> AI Powered</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Your digital card, written by AI</h1>
          <p className="mt-4 text-base text-[#64748B]">Tell us three things — our AI writes your bio, services and SEO, and picks a design. Preview it live, then save &amp; publish free.</p>
        </div>

        {step === "form" && (
          <div className="mt-10 max-w-xl mx-auto bg-white rounded-3xl shadow-premium-lg border border-[#F1F5F9] p-7">
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
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">City <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Jaipur" className="h-12 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
              </div>
              <button onClick={generate} className="w-full py-3.5 rounded-xl gradient-gold text-[#0F172A] font-bold text-base flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.99]">
                <Wand2 size={19} /> Generate my card
              </button>
              <p className="text-center text-[11px] text-[#94A3B8]">Free · No signup needed to preview · Takes ~5 seconds</p>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-[#F7B31C]/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-full gradient-gold flex items-center justify-center"><Sparkles size={38} className="text-[#0F172A] animate-pulse" /></div>
            </div>
            <h2 className="mt-8 text-xl font-bold text-[#0F172A]">Creating your card…</h2>
            <p className="mt-2 text-sm text-[#64748B] h-5 transition-all">{GEN_MSGS[msgIdx]}</p>
          </div>
        )}

        {step === "result" && gen && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-8 items-start">
            <div className="lg:sticky lg:top-24">
              <div className="mx-auto w-full max-w-[360px] bg-white rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-[#1E293B]" style={{ height: "min(72vh, 720px)" }}>
                <iframe srcDoc={previewHtml} title="AI card preview" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms allow-modals allow-top-navigation-by-user-activation" className="w-full h-full border-0 bg-white" />
              </div>
              <p className="text-center text-[11px] text-[#94A3B8] mt-3">Live preview · sample contact details — you'll add yours after signup</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#16A34A]"><Check size={12} /> {gen.source === "ai" ? "AI-generated" : "Generated"}</span>
                  <h2 className="text-xl font-bold text-[#0F172A] mt-1">Your card is ready 🎉</h2>
                </div>
                <button onClick={generate} className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-2"><RefreshCw size={15} /> Regenerate all</button>
              </div>

              {/* Design / template picker */}
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-premium">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] flex items-center gap-1.5"><Palette size={12} /> Choose your design</p>
                  <span className="text-[11px] font-medium text-[#64748B]">Design #{effTheme}{theme === null ? " · AI pick" : ""}</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
                  {thumbs.map((t) => (
                    <TemplateThumb key={t.style} html={t.html} label={t.style} active={effTheme === t.style} onClick={() => setTheme(t.style)} />
                  ))}
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1">Tap any design — the preview updates instantly.</p>
              </div>

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
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-2 flex items-center gap-1.5"><Palette size={12} /> AI-matched design</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#334155]"><span className="w-5 h-5 rounded-md border border-black/5" style={{ background: gen.color }} /> {gen.color}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#334155]"><span className="w-5 h-5 rounded-md border border-black/5" style={{ background: gen.color2 }} /> {gen.color2}</span>
                  <span className="text-xs text-[#64748B]">· Design style #{effTheme}</span>
                </div>
                <p className="text-[12px] text-[#64748B] mt-2">{gen.avatarStyle}</p>
              </div>

              <div className="bg-[#0F172A] rounded-2xl p-5 text-center">
                <p className="text-white font-bold text-lg">Love it? Make it yours.</p>
                <p className="text-white/60 text-[13px] mt-1">Sign up free — your card is saved, add your real details, and publish. 30-day free trial, no card needed.</p>
                <button onClick={saveAndSignup} className="mt-4 w-full h-12 rounded-xl gradient-gold text-[#0F172A] font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all"><Zap size={18} /> Save &amp; Sign Up Free <ArrowRight size={17} /></button>
              </div>
              <button onClick={() => setStep("form")} className="w-full text-sm text-[#94A3B8] hover:text-[#0F172A] flex items-center justify-center gap-1.5 transition-colors"><ArrowLeft size={14} /> Start over</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
