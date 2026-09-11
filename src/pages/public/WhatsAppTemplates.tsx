import { useMemo, useState } from "react";
import { Link } from "react-router";
import { MessageCircle, Copy, Check, RotateCcw, ArrowRight, Send, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import { SEO_WHATSAPP_TEMPLATES } from "@/lib/publicSeo";
import { copyText } from "@/lib/clipboard";
import { WA_TEMPLATES, buildWaMessage, waPreviewHtml, WA_SOFT_LIMIT, type WaData } from "@/lib/whatsappMessage";

/* A filled-in example, not blank fields: twelve empty bubbles tell a visitor
   nothing about which message to choose. They overwrite it with their own. */
const SAMPLE = {
  name: "Aarav Mehta",
  designation: "Director",
  company: "Nayara Interiors",
  phone: "+91 98110 24680",
  email: "aarav@nayarainteriors.in",
  website: "https://nayarainteriors.in",
  address: "504 Trident Tower, Sector 44, Gurugram",
  cardUrl: "",
};

const field = "w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-shadow";

export default function WhatsAppTemplates() {
  usePageSeo({
    ...SEO_WHATSAPP_TEMPLATES,
    canonical: "/whatsapp-message-templates",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "WhatsApp Business Message Templates",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      description: "Twelve free WhatsApp Business message templates — greeting, away and quick replies.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: "DigitalCarda", url: "https://digitalcarda.in" },
    },
  });

  const [f, setF] = useState(SAMPLE);
  const [templateId, setTemplateId] = useState("welcome");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof SAMPLE) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const wa: WaData = useMemo(() => ({
    name: f.name, designation: f.designation, company: f.company, phone: f.phone,
    email: f.email, website: f.website, address: f.address,
    cardUrl: f.cardUrl.trim(), mapUrl: "", reviewUrl: "", upi: "",
  }), [f]);

  const generated = useMemo(() => buildWaMessage(templateId, wa), [templateId, wa]);
  const text = edits[templateId] ?? generated;
  const edited = edits[templateId] !== undefined && edits[templateId] !== generated;
  const active = WA_TEMPLATES.find((t) => t.id === templateId);

  const setText = (v: string) => setEdits((e) => ({ ...e, [templateId]: v }));
  const reset = () => setEdits((e) => { const n = { ...e }; delete n[templateId]; return n; });

  const doCopy = async () => {
    if (await copyText(text)) {
      setCopied(true); toast.success("Message copied — paste it into WhatsApp");
      setTimeout(() => setCopied(false), 2200);
    } else toast.error("Copy failed — select the text and copy it manually");
  };

  return (
    <div className="bg-[#F8FAFC]">
      {/* ── Hero ── */}
      <section className="bg-[#0F172A] pt-28 pb-14 sm:pt-32 sm:pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white/10 text-[#25D366] text-[12px] font-semibold mb-5">
            <MessageCircle size={13} /> Free · No sign-up
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.12]">
            WhatsApp Business Message Templates
          </h1>
          <p className="text-[15px] sm:text-base text-[#CBD5E1] mt-4 max-w-2xl mx-auto leading-relaxed">
            Twelve ready-made replies — greeting, away and quick replies. Fill in your details, change the
            wording to sound like you, and copy them into WhatsApp Business.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Copy and paste in a minute</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-8">

        {/* ── Details ── */}
        <Reveal>
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Your details</h2>
            <p className="text-[12px] text-[#64748B] mb-4">
              Used to fill in the messages below. Nothing is sent to us or stored anywhere.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={field} value={f.name} onChange={set("name")} placeholder="Your name" aria-label="Your name" />
              <input className={field} value={f.designation} onChange={set("designation")} placeholder="Job title" aria-label="Job title" />
              <input className={field} value={f.company} onChange={set("company")} placeholder="Business name" aria-label="Business name" />
              <input className={field} value={f.phone} onChange={set("phone")} placeholder="Phone" aria-label="Phone" />
              <input className={`${field} sm:col-span-2`} value={f.address} onChange={set("address")} placeholder="Address (optional)" aria-label="Address" />
              <div className="sm:col-span-2">
                <input className={field} value={f.cardUrl} onChange={set("cardUrl")}
                  placeholder="Your digital card or website link (optional)" aria-label="Card or website link" />
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  Add a link and every reply shares it automatically. Don't have one?
                  {" "}<Link to="/signup" className="text-[#B45309] font-semibold underline">Create your card free</Link>.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Messages ── */}
        <Reveal>
          <SectionHeading eyebrow="Step 2" title="Pick a message" subtitle="Each one is already filled in with your details — click to open and edit it." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {WA_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} aria-pressed={templateId === t.id}
                className={`text-left rounded-2xl p-4 transition-all bg-white ${
                  templateId === t.id ? "ring-2 ring-[#25D366] shadow-premium" : "ring-1 ring-[#E2E8F0] hover:ring-[#25D366]/60 hover:shadow-premium"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold text-[#0F172A]">{t.name}</span>
                  {templateId === t.id && <Check size={13} className="text-[#16A34A] ml-auto shrink-0" />}
                </div>
                <p className="text-[11.5px] text-[#64748B] leading-snug">{t.blurb}</p>
                <span className="inline-block mt-2 text-[10px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">{t.slot}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* ── Edit + preview ── */}
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#F1F5F9]">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-bold text-[#0F172A] truncate">{active?.name}</h2>
                  <p className="text-[11px] text-[#94A3B8]">Edit it so it sounds like you</p>
                </div>
                {edited && (
                  <button type="button" onClick={reset}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F1F5F9] text-[#334155] text-[11px] font-semibold hover:bg-[#E2E8F0] transition-colors shrink-0">
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
              </div>
              <div className="p-4">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={13} spellCheck
                  aria-label="Message text"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-[13px] leading-relaxed text-[#0F172A] font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] resize-y" />
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <p className="text-[11px] text-[#94A3B8]">
                    <code className="font-mono">*bold*</code> · <code className="font-mono">_italic_</code> · <code className="font-mono">~strike~</code>
                  </p>
                  <p className={`text-[11px] font-semibold ${text.length > WA_SOFT_LIMIT ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                    {text.length} characters
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#F1F5F9]">
                  <h2 className="text-[14px] font-bold text-[#0F172A]">How it looks in the chat</h2>
                </div>
                <div className="p-4" style={{ background: "#EFE7DE" }}>
                  <div className="max-w-[320px] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                    <div className="text-[13px] leading-[1.45] text-[#111B21] whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: waPreviewHtml(text) }} />
                    <div className="text-[10px] text-[#8696A0] text-right mt-1 select-none">10:24</div>
                  </div>
                </div>
              </div>

              <button onClick={doCopy} type="button"
                className="w-full h-12 rounded-xl bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1FB855] transition-colors active:scale-[0.98]">
                {copied ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy message</>}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
                className="w-full h-10 rounded-xl bg-[#F1F5F9] text-[#334155] text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-[#E2E8F0] transition-colors">
                <Send size={14} /> Send it to yourself as a test
              </a>
            </div>
          </div>
        </Reveal>

        {/* ── Where to put it ── */}
        <Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { c: "Greeting message", s: "WhatsApp Business → Settings → Business tools → Greeting message → turn on → paste → Save." },
              { c: "Away message", s: "Business tools → Away message → turn on → paste → set your schedule → Save." },
              { c: "Quick replies", s: "Business tools → Quick replies → add → paste → give it a shortcut like /services." },
            ].map((x) => (
              <div key={x.c} className="bg-white rounded-2xl border border-[#F1F5F9] p-4">
                <p className="text-[13px] font-bold text-[#0F172A] mb-1">{x.c}</p>
                <p className="text-[12px] text-[#64748B] leading-relaxed">{x.s}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Conversion ── */}
        <Reveal>
          <div className="rounded-2xl bg-[#0F172A] p-6 sm:p-8 text-center">
            <MessageCircle size={26} className="text-[#25D366] mx-auto mb-3" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Give every reply somewhere to go</h2>
            <p className="text-[14px] text-[#CBD5E1] mt-3 max-w-xl mx-auto leading-relaxed">
              A good reply answers the question. A digital card answers the next five — your services,
              photos, prices, directions and payment — from one link, and tells you who looked.
            </p>
            <Link to="/signup" className="btn-gold inline-flex items-center gap-2 mt-6">
              Create your free card <ArrowRight size={16} />
            </Link>
            <p className="text-[11px] text-[#64748B] mt-3">Free trial · No card details needed</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
