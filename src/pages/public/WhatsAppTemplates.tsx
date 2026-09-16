import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  MessageCircle, Copy, Check, RotateCcw, ArrowRight, Send, ShieldCheck, Zap, Info, X,
  CheckCheck, Phone, Video, MoreVertical, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { SEO_WHATSAPP_TEMPLATES } from "@/lib/publicSeo";
import { copyText } from "@/lib/clipboard";
import { WA_TEMPLATES, buildWaMessage, waPreviewHtml, WA_SOFT_LIMIT, type WaData, type WaTemplate } from "@/lib/whatsappMessage";

const ORIGIN = "https://digitalcarda.in";

/* A complete, made-up business shown before the visitor types anything — the
   same fields a customer's dashboard fills from their card (card link, map,
   review link), so every message shows exactly what a customer gets. Aarav
   Mehta and Nayara Interiors are fictional; the card link opens a real
   template demo. No sample UPI ID: a realistic-looking one could belong to a
   real person, so the payment message shows its fill-in note instead. */
const SAMPLE = {
  name: "Aarav Mehta",
  designation: "Director",
  company: "Nayara Interiors",
  phone: "+91 98110 24680",
  email: "aarav@nayarainteriors.in",
  website: "https://nayarainteriors.in",
  address: "504 Trident Tower, Sector 44, Gurugram",
  cardUrl: `${ORIGIN}/demo/midnight-gold-card`,
  mapUrl: "https://maps.google.com/?q=Trident+Tower+Sector+44+Gurugram",
  reviewUrl: "https://g.page/r/nayara-interiors/review",
  upi: "",
};
type Fields = typeof SAMPLE;

/* What the customer said just before the reply, so the preview reads as a chat. */
const PROMPT: Record<WaTemplate["slot"], string> = {
  "Greeting message": "Hi! Is this Nayara Interiors?",
  "Away message": "Hello, are you open right now?",
  "Quick reply": "Can you share more details please?",
  "Any chat": "Thanks for the call earlier!",
};

const field = "w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-shadow";

function Input({ label, value, onChange, placeholder, wide }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] font-semibold text-[#475569]">{label}</span>
      <input className={field} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WhatsApp Business Message Templates",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: "Twelve free WhatsApp Business message templates — greeting, away and quick replies.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: { "@type": "Organization", name: "DigitalCarda", url: "https://digitalcarda.in" },
};

export default function WhatsAppTemplates() {
  usePageSeo({
    ...SEO_WHATSAPP_TEMPLATES,
    canonical: "/whatsapp-message-templates",
  });

  const [f, setF] = useState<Fields>(SAMPLE);
  const [templateId, setTemplateId] = useState("welcome");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const set = (k: keyof Fields) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const isSample = f === SAMPLE;
  const clearSample = () => setF(Object.fromEntries(Object.keys(SAMPLE).map((k) => [k, ""])) as Fields);

  const wa: WaData = useMemo(() => ({
    name: f.name, designation: f.designation, company: f.company, phone: f.phone,
    email: f.email, website: f.website, address: f.address,
    cardUrl: f.cardUrl.trim(), mapUrl: f.mapUrl.trim(), reviewUrl: f.reviewUrl.trim(), upi: f.upi.trim(),
  }), [f]);

  const messages = useMemo(() => WA_TEMPLATES.map((t) => {
    const generated = buildWaMessage(t.id, wa);
    const text = edits[t.id] ?? generated;
    return { ...t, generated, text, edited: edits[t.id] !== undefined && edits[t.id] !== generated };
  }), [wa, edits]);

  const current = messages.find((m) => m.id === templateId) ?? messages[0];
  const setText = (v: string) => setEdits((e) => ({ ...e, [current.id]: v }));
  const reset = () => setEdits((e) => { const n = { ...e }; delete n[current.id]; return n; });
  const business = f.company || f.name || "Your business";

  const doCopy = async () => {
    if (await copyText(current.text)) {
      setCopied(true); toast.success("Message copied — paste it into WhatsApp");
      setTimeout(() => setCopied(false), 2200);
    } else toast.error("Copy failed — select the text and copy it manually");
  };

  return (
    <div className="bg-[#F8FAFC]">
      <JsonLd id="page-jsonld" data={PAGE_LD} />
      {/* ── Hero ── */}
      <section className="bg-[#0F172A] px-4 pb-14 pt-28 sm:pb-16 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mb-5 inline-flex h-8 items-center gap-2 rounded-full bg-white/10 px-3.5 text-[12px] font-semibold text-[#25D366]">
            <MessageCircle size={13} /> Free · No sign-up
          </span>
          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl">
            WhatsApp Business Message Templates
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1] sm:text-base">
            Twelve ready-made replies — greeting, away and quick replies. Fill in your details, change the
            wording to sound like you, and copy them into WhatsApp Business.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Copy and paste in a minute</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:py-14">
        {/* ── Details + editor | chat preview ── */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <Reveal>
              <section className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium sm:p-6" aria-labelledby="wa-details">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="wa-details" className="text-[15px] font-bold text-[#0F172A]">Your details</h2>
                    <p className="mt-1 text-[12px] text-[#64748B]">Used to fill in every message. Nothing is sent to us or stored.</p>
                  </div>
                  {isSample && (
                    <button type="button" onClick={clearSample}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">
                      <X size={12} /> Clear sample
                    </button>
                  )}
                </div>
                {isSample && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-[12px] leading-snug text-[#166534] ring-1 ring-[#BBF7D0]">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    You're looking at a sample business. Type over any field and all twelve messages update.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Your name" value={f.name} onChange={set("name")} placeholder="Your name" />
                  <Input label="Job title" value={f.designation} onChange={set("designation")} placeholder="e.g. Owner" />
                  <Input label="Business name" value={f.company} onChange={set("company")} placeholder="Business name" />
                  <Input label="Phone" value={f.phone} onChange={set("phone")} placeholder="+91 …" />
                  <Input label="Address" value={f.address} onChange={set("address")} placeholder="Shop or office address" wide />
                  <Input label="Digital card or website link" value={f.cardUrl} onChange={set("cardUrl")} placeholder="digitalcarda.in/yourname" wide />
                  <Input label="Google Maps link" value={f.mapUrl} onChange={set("mapUrl")} placeholder="https://maps.google.com/…" />
                  <Input label="Google review link" value={f.reviewUrl} onChange={set("reviewUrl")} placeholder="https://g.page/r/…" />
                  <Input label="UPI ID (for payment messages)" value={f.upi} onChange={set("upi")} placeholder="yourname@bank" wide />
                </div>
                <p className="mt-3 text-[11px] text-[#94A3B8]">
                  No digital card yet? <Link to="/signup" className="font-semibold text-[#B45309] underline">Create one free</Link> — every reply then shares it.
                </p>
              </section>
            </Reveal>

            <Reveal>
              <section className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium" aria-labelledby="wa-edit">
                <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-5 py-3">
                  <div className="min-w-0">
                    <h2 id="wa-edit" className="truncate text-[14px] font-bold text-[#0F172A]">{current.name}</h2>
                    <p className="text-[11px] text-[#94A3B8]">{current.slot} · edit it so it sounds like you</p>
                  </div>
                  {current.edited && (
                    <button type="button" onClick={reset}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <textarea value={current.text} onChange={(e) => setText(e.target.value)} rows={12} spellCheck aria-label="Message text"
                    className="w-full resize-y rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 font-mono text-[13px] leading-relaxed text-[#0F172A] focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40" />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-[#94A3B8]">
                      <code className="font-mono">*bold*</code> · <code className="font-mono">_italic_</code> · <code className="font-mono">~strike~</code>
                    </p>
                    <p className={`text-[11px] font-semibold ${current.text.length > WA_SOFT_LIMIT ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                      {current.text.length} characters
                    </p>
                  </div>
                </div>
              </section>
            </Reveal>
          </div>

          {/* The phone: the reply as the customer receives it */}
          <aside className="space-y-3 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[30px] border-[7px] border-[#0B1120] bg-[#0B1120] shadow-[0_30px_60px_-30px_rgba(2,6,23,0.6)]">
              <div className="flex items-center gap-2.5 bg-[#075E54] px-3 py-2.5 text-white">
                <ArrowLeft size={18} className="shrink-0 opacity-90" />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7B31C] text-[15px] font-bold text-[#0B1120]">
                  {business.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{business}</span>
                  <span className="block text-[11px] text-white/75">Business account</span>
                </span>
                <Video size={18} className="shrink-0 opacity-90" />
                <Phone size={16} className="shrink-0 opacity-90" />
                <MoreVertical size={17} className="shrink-0 opacity-90" />
              </div>
              <div className="max-h-[540px] space-y-2 overflow-y-auto px-3 py-4" style={{ background: "#EFE7DE" }}>
                <p className="mx-auto w-fit rounded-md bg-[#E1F2FB] px-2 py-0.5 text-[10.5px] text-[#54656F]">Today</p>
                <div className="max-w-[80%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-[13px] text-[#111B21] shadow-sm">
                  {PROMPT[current.slot]}
                  <span className="float-right ml-2 mt-1.5 text-[10px] text-[#667781]">10:23</span>
                </div>
                <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-2.5 py-1.5 shadow-sm">
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-[1.45] text-[#111B21]"
                    dangerouslySetInnerHTML={{ __html: waPreviewHtml(current.text) }} />
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                    10:24 <CheckCheck size={14} className="text-[#53BDEB]" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={doCopy} type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white transition-colors hover:bg-[#1FB855] active:scale-[0.98]">
              {copied ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy message</>}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(current.text)}`} target="_blank" rel="noreferrer"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] text-[12px] font-semibold text-[#334155] transition-colors hover:bg-[#E2E8F0]">
              <Send size={14} /> Send it to yourself as a test
            </a>
          </aside>
        </div>

        {/* ── All twelve, as real chat bubbles ── */}
        <section aria-labelledby="wa-all">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]"><MessageCircle size={12} /> {WA_TEMPLATES.length} messages</span>
            <h2 id="wa-all" className="mt-3 text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">Pick a message</h2>
            <p className="mt-2 text-[14px] text-[#64748B]">Each one is already written with the details above — click to preview and edit it.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {messages.map((m) => {
              const on = m.id === templateId;
              return (
                <button key={m.id} type="button" onClick={() => setTemplateId(m.id)} aria-pressed={on} aria-label={`${m.name} — ${m.slot}`}
                  className={`flex flex-col overflow-hidden rounded-2xl bg-white text-left transition-all ${on ? "shadow-premium ring-2 ring-[#25D366]" : "ring-1 ring-[#E2E8F0] hover:shadow-premium hover:ring-[#25D366]/60"}`}>
                  <span className="flex items-center gap-2 border-b border-[#F1F5F9] px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F172A]">
                        {m.name}
                        {m.edited && <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-bold text-[#B45309]">EDITED</span>}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">{m.slot}</span>
                    </span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-[#25D366]" : "bg-[#F1F5F9]"}`}>
                      {on && <Check size={14} className="text-white" />}
                    </span>
                  </span>
                  <span className="relative block flex-1 px-3 py-3" style={{ background: "#EFE7DE" }}>
                    <span className="ml-auto block max-w-[95%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-2.5 py-1.5 shadow-sm">
                      <span className="pointer-events-none block max-h-[230px] overflow-hidden whitespace-pre-wrap break-words text-[12.5px] leading-[1.45] text-[#111B21]"
                        dangerouslySetInnerHTML={{ __html: waPreviewHtml(m.text) }} />
                    </span>
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#EFE7DE] to-transparent" />
                  </span>
                  <span className="block px-4 py-2.5 text-[12px] leading-snug text-[#64748B]">{m.blurb}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Where to put it ── */}
        <Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { c: "Greeting message", s: "WhatsApp Business → Settings → Business tools → Greeting message → turn on → paste → Save." },
              { c: "Away message", s: "Business tools → Away message → turn on → paste → set your schedule → Save." },
              { c: "Quick replies", s: "Business tools → Quick replies → add → paste → give it a shortcut like /services." },
            ].map((x) => (
              <div key={x.c} className="rounded-2xl border border-[#F1F5F9] bg-white p-4">
                <p className="mb-1 text-[13px] font-bold text-[#0F172A]">{x.c}</p>
                <p className="text-[12px] leading-relaxed text-[#64748B]">{x.s}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Conversion ── */}
        <Reveal>
          <div className="rounded-2xl bg-[#0F172A] p-6 text-center sm:p-8">
            <MessageCircle size={26} className="mx-auto mb-3 text-[#25D366]" />
            <h2 className="text-xl font-bold text-white sm:text-2xl">Give every reply somewhere to go</h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#CBD5E1]">
              A good reply answers the question. A digital card answers the next five — your services,
              photos, prices, directions and payment — from one link, and tells you who looked.
            </p>
            <Link to="/signup" className="btn-gold mt-6 inline-flex items-center gap-2">
              Create your free card <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-[11px] text-[#64748B]">30-day free trial · no card details</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
