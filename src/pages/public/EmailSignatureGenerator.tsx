import { useMemo, useState } from "react";
import { Link } from "react-router";
import { PenLine, Copy, Check, Code2, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import { SEO_EMAIL_SIGNATURE } from "@/lib/publicSeo";
import { copyRichHtml, copyText } from "@/lib/clipboard";
import {
  SIGNATURE_TEMPLATES, buildSignature, buildSignatureText,
  type SignatureData, type SignatureOptions,
} from "@/lib/emailSignature";

const ACCENTS = ["#F7B31C", "#0F172A", "#14B8A6", "#3B82F6", "#8B5CF6", "#EF4444", "#16A34A", "#EC4899"];

/* Deliberately a real, complete example rather than empty fields: an untouched
   form would render fourteen identical blank cards, and nobody can choose a
   design from that. The visitor overwrites it with their own details. */
const SAMPLE = {
  name: "Aarav Mehta",
  designation: "Director — Sales & Partnerships",
  company: "Nayara Interiors",
  phone: "+91 98110 24680",
  email: "aarav@nayarainteriors.in",
  website: "https://nayarainteriors.in",
  address: "504 Trident Tower, Sector 44, Gurugram",
  cardUrl: "",
};

const field = "w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F7B31C]/40 focus:border-[#F7B31C] transition-shadow";

export default function EmailSignatureGenerator() {
  usePageSeo({
    ...SEO_EMAIL_SIGNATURE,
    canonical: "/email-signature-generator",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Email Signature Generator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      description: "Free email signature generator with 14 professional templates for Gmail, Outlook and Apple Mail.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: "DigitalCarda", url: "https://digitalcarda.in" },
    },
  });

  const [f, setF] = useState(SAMPLE);
  const [templateId, setTemplateId] = useState("corporate");
  const [accent, setAccent] = useState("#F7B31C");
  const [showAddress, setShowAddress] = useState(true);
  const [copied, setCopied] = useState<"rich" | "html" | null>(null);

  const set = (k: keyof typeof SAMPLE) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const sig: SignatureData = useMemo(() => ({
    name: f.name, designation: f.designation, company: f.company,
    phone: f.phone, whatsapp: "", email: f.email, website: f.website, address: f.address,
    logo: "",
    cardUrl: f.cardUrl.trim(),
    /* No card link means no QR to point at — the option is hidden rather than
       rendering a code that resolves nowhere. */
    qrSrc: f.cardUrl.trim()
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(f.cardUrl.trim())}`
      : "",
    socials: [],
  }), [f]);

  const opts: SignatureOptions = {
    accent, showLogo: false, showQr: !!f.cardUrl.trim(), showSocials: false, showAddress, tagline: "",
  };

  const html = useMemo(() => buildSignature(templateId, sig, opts), [templateId, sig, accent, showAddress]);
  const plain = useMemo(() => buildSignatureText(sig, opts), [sig, showAddress]);
  const thumbs = useMemo(() => Object.fromEntries(
    SIGNATURE_TEMPLATES.map((t) => [t.id, buildSignature(t.id, sig, opts)]),
  ) as Record<string, string>, [sig, accent, showAddress]);

  const doCopy = async () => {
    if (await copyRichHtml(html, plain)) {
      setCopied("rich"); toast.success("Signature copied — paste it into your email settings");
      setTimeout(() => setCopied(null), 2200);
    } else toast.error("Copy failed — use Copy HTML instead");
  };
  const doCopyHtml = async () => {
    if (await copyText(html)) {
      setCopied("html"); toast.success("HTML copied");
      setTimeout(() => setCopied(null), 2200);
    } else toast.error("Copy failed");
  };

  return (
    <div className="bg-[#F8FAFC]">
      {/* ── Hero ── */}
      <section className="bg-[#0F172A] pt-28 pb-14 sm:pt-32 sm:pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white/10 text-[#F7B31C] text-[12px] font-semibold mb-5">
            <Sparkles size={13} /> Free · No sign-up
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.12]">
            Free Email Signature Generator
          </h1>
          <p className="text-[15px] sm:text-base text-[#CBD5E1] mt-4 max-w-2xl mx-auto leading-relaxed">
            Fill in your details, pick a design, and copy your signature straight into Gmail, Outlook or
            Apple Mail. Fourteen professional templates, built to survive every email client.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Ready in under a minute</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-8">

        {/* ── Details ── */}
        <Reveal>
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Your details</h2>
            <p className="text-[12px] text-[#64748B] mb-4">
              Typed here and used here only — none of it is sent to us or stored anywhere.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={field} value={f.name} onChange={set("name")} placeholder="Full name" aria-label="Full name" />
              <input className={field} value={f.designation} onChange={set("designation")} placeholder="Job title" aria-label="Job title" />
              <input className={field} value={f.company} onChange={set("company")} placeholder="Company" aria-label="Company" />
              <input className={field} value={f.phone} onChange={set("phone")} placeholder="Phone" aria-label="Phone" />
              <input className={field} value={f.email} onChange={set("email")} placeholder="Email" aria-label="Email" />
              <input className={field} value={f.website} onChange={set("website")} placeholder="Website" aria-label="Website" />
              <input className={`${field} sm:col-span-2`} value={f.address} onChange={set("address")} placeholder="Address (optional)" aria-label="Address" />
              <div className="sm:col-span-2">
                <input className={field} value={f.cardUrl} onChange={set("cardUrl")}
                  placeholder="Your digital card link (optional) — e.g. digitalcarda.in/yourname" aria-label="Digital card link" />
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  Add a card link and the signature gains a button and a QR code. Don't have one?
                  {" "}<Link to="/signup" className="text-[#B45309] font-semibold underline">Create your card free</Link>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-[#F1F5F9]">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#334155] cursor-pointer">
                <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#F7B31C]" />
                Show address
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#334155]">Colour</span>
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Accent ${c}`}
                    className={`w-7 h-7 rounded-lg transition-transform ${accent === c ? "ring-2 ring-offset-2 ring-[#0F172A] scale-105" : "ring-1 ring-[#E2E8F0] hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Designs ── */}
        <Reveal>
          <SectionHeading eyebrow="Step 2" title="Pick a design" subtitle="Every card below shows your own details — click one to select it." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {SIGNATURE_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} aria-pressed={templateId === t.id}
                className={`text-left rounded-2xl overflow-hidden transition-all bg-white ${
                  templateId === t.id ? "ring-2 ring-[#F7B31C] shadow-premium" : "ring-1 ring-[#E2E8F0] hover:ring-[#F7B31C]/60 hover:shadow-premium"}`}>
                <div className="h-[128px] bg-white border-b border-[#F1F5F9] overflow-hidden relative">
                  <div className="absolute inset-0 origin-top-left pointer-events-none"
                    style={{ transform: "scale(0.44)", width: "227%", padding: "14px 16px" }}
                    dangerouslySetInnerHTML={{ __html: thumbs[t.id] }} />
                </div>
                <div className="px-3 py-2.5 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#0F172A] leading-tight">{t.name}</p>
                    <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">{t.blurb}</p>
                  </div>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${templateId === t.id ? "bg-[#F7B31C]" : "bg-[#F1F5F9]"}`}>
                    {templateId === t.id && <Check size={12} className="text-[#0F172A]" />}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Reveal>

        {/* ── Result ── */}
        <Reveal>
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F1F5F9]">
              <h2 className="text-[14px] font-bold text-[#0F172A]">Your signature</h2>
              <p className="text-[11px] text-[#94A3B8]">Exactly what lands in the reader's inbox</p>
            </div>
            <div className="p-5 sm:p-6 overflow-x-auto">
              <p className="text-[13px] text-[#94A3B8] mb-2">Thanks and regards,</p>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2.5">
              <button onClick={doCopy} type="button"
                className="flex-1 h-12 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
                {copied === "rich" ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy signature</>}
              </button>
              <button onClick={doCopyHtml} type="button"
                className="h-12 px-5 rounded-xl bg-[#F1F5F9] text-[#334155] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#E2E8F0] transition-colors">
                {copied === "html" ? <Check size={16} className="text-emerald-500" /> : <Code2 size={16} />} Copy HTML
              </button>
            </div>
          </div>
        </Reveal>

        {/* ── Where to paste ── */}
        <Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { c: "Gmail", s: "Settings → See all settings → General → Signature → paste → Save Changes." },
              { c: "Outlook", s: "Settings → Mail → Compose and reply → Email signature → paste → Save." },
              { c: "Apple Mail", s: "Mail → Settings → Signatures → untick “match default font” → paste." },
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
            <PenLine size={26} className="text-[#F7B31C] mx-auto mb-3" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Make the signature lead somewhere</h2>
            <p className="text-[14px] text-[#CBD5E1] mt-3 max-w-xl mx-auto leading-relaxed">
              A signature lists your details. A digital card lets people save them in one tap, see your
              services, message you on WhatsApp and pay you — and it tells you who looked.
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
