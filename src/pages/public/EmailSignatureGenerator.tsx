import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { PenLine, Copy, Check, Code2, ArrowRight, Sparkles, ShieldCheck, Zap, Upload, X, Info, Mail } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { SEO_EMAIL_SIGNATURE } from "@/lib/publicSeo";
import { copyRichHtml, copyText } from "@/lib/clipboard";
import {
  SIGNATURE_TEMPLATES, buildSignature, buildSignatureText,
  type SignatureData, type SignatureOptions,
} from "@/lib/emailSignature";

const ORIGIN = "https://digitalcarda.in";
const ACCENTS = ["#F7B31C", "#0F172A", "#14B8A6", "#3B82F6", "#8B5CF6", "#EF4444", "#16A34A", "#EC4899"];

/* A complete, made-up business shown before the visitor types anything. It has
   everything a customer's dashboard signature is built from — logo, card link
   and QR, social links — so the public page shows exactly what a customer gets,
   not a stripped-down version. Aarav Mehta and Nayara Interiors are fictional;
   the card link opens a real template demo, so the sample QR code scans to a
   working card. Never swap in a real person's or business's details. */
const SAMPLE = {
  name: "Aarav Mehta",
  designation: "Director — Sales & Partnerships",
  company: "Nayara Interiors",
  phone: "+91 98110 24680",
  whatsapp: "+91 98110 24680",
  email: "aarav@nayarainteriors.in",
  website: "https://nayarainteriors.in",
  address: "504 Trident Tower, Sector 44, Gurugram",
  cardUrl: `${ORIGIN}/demo/midnight-gold-card`,
  linkedin: "https://linkedin.com/company/nayara-interiors",
  instagram: "https://instagram.com/nayarainteriors",
  facebook: "https://facebook.com/nayarainteriors",
  youtube: "https://youtube.com/@nayarainteriors",
};
type Fields = typeof SAMPLE;

const SAMPLE_LOGO_PATH = "/samples/sample-logo.png";
const SAMPLE_TAGLINE = "Save my contact, see my services and pay — all from one link.";

const SOCIAL_FIELDS: { key: "linkedin" | "instagram" | "facebook" | "youtube"; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
];

const field = "w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F7B31C]/40 focus:border-[#F7B31C] transition-shadow";

function Input({ label, value, onChange, placeholder, wide, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; type?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] font-semibold text-[#475569]">{label}</span>
      <input type={type} className={field} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5 border-t border-[#F1F5F9] pt-4 first-of-type:mt-4 first-of-type:border-0 first-of-type:pt-0">
      <legend className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">{title}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => set(!on)} type="button" aria-pressed={on}
      className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-colors ${on ? "bg-[#FEF3C7] text-[#92400E] ring-1 ring-[#FDE68A]" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-md ${on ? "bg-[#F7B31C]" : "bg-white ring-1 ring-[#CBD5E1]"}`}>
        {on && <Check size={11} className="text-[#0F172A]" />}
      </span>
      {label}
    </button>
  );
}

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Email Signature Generator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: "Free email signature generator with 14 professional templates for Gmail, Outlook and Apple Mail.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: { "@type": "Organization", name: "DigitalCarda", url: "https://digitalcarda.in" },
};

export default function EmailSignatureGenerator() {
  usePageSeo({
    ...SEO_EMAIL_SIGNATURE,
    canonical: "/email-signature-generator",
  });

  const [f, setF] = useState<Fields>(SAMPLE);
  const [logo, setLogo] = useState(`${ORIGIN}${SAMPLE_LOGO_PATH}`);
  const [templateId, setTemplateId] = useState("corporate");
  const [accent, setAccent] = useState("#F7B31C");
  const [showLogo, setShowLogo] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showSocials, setShowSocials] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [tagline, setTagline] = useState(SAMPLE_TAGLINE);
  const [copied, setCopied] = useState<"rich" | "html" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The sample logo is served by this site: point it at the site actually being
  // viewed, so it shows on localhost and staging before a deploy. Done after
  // hydration so the server-rendered and first client render match.
  useEffect(() => {
    const here = `${window.location.origin}${SAMPLE_LOGO_PATH}`;
    setLogo((cur) => (cur === `${ORIGIN}${SAMPLE_LOGO_PATH}` ? here : cur));
  }, []);

  const set = (k: keyof Fields) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const isSample = f === SAMPLE;
  const uploaded = logo.startsWith("data:");

  const clearSample = () => {
    setF(Object.fromEntries(Object.keys(SAMPLE).map((k) => [k, ""])) as Fields);
    setLogo("");
    setTagline("");
  };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) { toast.error("Use a PNG or JPG image"); return; }
    if (file.size > 500_000) { toast.error("Keep the logo under 500 KB — email clients strip large images"); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogo(String(reader.result)); setShowLogo(true); };
    reader.readAsDataURL(file);
  };

  const cardUrl = f.cardUrl.trim();
  const sig: SignatureData = useMemo(() => ({
    name: f.name, designation: f.designation, company: f.company,
    phone: f.phone, whatsapp: f.whatsapp, email: f.email, website: f.website, address: f.address,
    logo,
    cardUrl,
    // No card link means nothing to scan — the QR is left out rather than
    // pointing at nowhere.
    qrSrc: cardUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}` : "",
    socials: SOCIAL_FIELDS.filter((s) => f[s.key].trim()).map((s) => ({ platform: s.key, label: s.label, url: f[s.key].trim() })),
  }), [f, logo, cardUrl]);

  const opts: SignatureOptions = useMemo(() => ({
    accent, showLogo, showQr: showQr && !!cardUrl, showSocials, showAddress, tagline: tagline.trim(),
  }), [accent, showLogo, showQr, cardUrl, showSocials, showAddress, tagline]);

  const html = useMemo(() => buildSignature(templateId, sig, opts), [templateId, sig, opts]);
  const plain = useMemo(() => buildSignatureText(sig, opts), [sig, opts]);
  const designs = useMemo(() => SIGNATURE_TEMPLATES.map((t) => ({ ...t, html: buildSignature(t.id, sig, opts) })), [sig, opts]);
  const active = SIGNATURE_TEMPLATES.find((t) => t.id === templateId);

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
      <JsonLd id="page-jsonld" data={PAGE_LD} />
      {/* ── Hero ── */}
      <section className="bg-[#0F172A] px-4 pb-14 pt-28 sm:pb-16 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mb-5 inline-flex h-8 items-center gap-2 rounded-full bg-white/10 px-3.5 text-[12px] font-semibold text-[#F7B31C]">
            <Sparkles size={13} /> Free · No sign-up
          </span>
          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl">
            Free Email Signature Generator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1] sm:text-base">
            Fill in your details, pick a design, and copy your signature straight into Gmail, Outlook or
            Apple Mail. Fourteen professional templates with your logo, social links and a QR code to your card.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Ready in about two minutes</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:py-14">
        {/* ── Details + live result ── */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <Reveal>
            <section className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium sm:p-6" aria-labelledby="details-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="details-title" className="text-[15px] font-bold text-[#0F172A]">Your details</h2>
                  <p className="mt-1 text-[12px] text-[#64748B]">Used on this page only — nothing is sent to us or stored.</p>
                </div>
                {isSample && (
                  <button type="button" onClick={clearSample}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">
                    <X size={12} /> Clear sample
                  </button>
                )}
              </div>

              {isSample && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFFBEB] px-3 py-2.5 text-[12px] leading-snug text-[#92400E] ring-1 ring-[#FDE68A]">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  You're looking at a sample business. Type over any field and every design updates with your details.
                </p>
              )}

              <Group title="About you">
                <Input label="Full name" value={f.name} onChange={set("name")} placeholder="Your name" />
                <Input label="Job title" value={f.designation} onChange={set("designation")} placeholder="e.g. Founder" />
                <Input label="Company" value={f.company} onChange={set("company")} placeholder="Business name" wide />
              </Group>

              <Group title="Contact">
                <Input label="Phone" value={f.phone} onChange={set("phone")} placeholder="+91 …" type="tel" />
                <Input label="WhatsApp (if different)" value={f.whatsapp} onChange={set("whatsapp")} placeholder="+91 …" type="tel" />
                <Input label="Email" value={f.email} onChange={set("email")} placeholder="you@business.com" type="email" />
                <Input label="Website" value={f.website} onChange={set("website")} placeholder="https://…" />
                <Input label="Address" value={f.address} onChange={set("address")} placeholder="Office address" wide />
              </Group>

              <Group title="Logo & card">
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold text-[#475569]">Logo</span>
                  <div className="flex items-center gap-3">
                    <span className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-1.5">
                      {logo ? <img src={logo} alt="Logo preview" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-[#94A3B8]">No logo</span>}
                    </span>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={onLogo} className="hidden" aria-label="Upload logo" />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-3.5 text-[12px] font-semibold text-white hover:bg-[#1E293B]">
                      <Upload size={14} /> {logo ? "Replace" : "Upload"}
                    </button>
                    {logo && (
                      <button type="button" onClick={() => setLogo("")} className="text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A]">Remove</button>
                    )}
                  </div>
                  {uploaded && (
                    <p className="mt-2 text-[11px] leading-snug text-[#92400E]">
                      Uploaded logos travel inside the signature. Gmail and Apple Mail keep them; Outlook may drop them —
                      a logo on your own website address is the safest.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Input label="Your digital card link" value={f.cardUrl} onChange={set("cardUrl")} placeholder="digitalcarda.in/yourname" wide />
                  <p className="mt-1.5 text-[11px] text-[#94A3B8]">
                    Adds the "View my digital card" button and a QR code. Don't have a card?{" "}
                    <Link to="/signup" className="font-semibold text-[#B45309] underline">Create one free</Link>.
                  </p>
                </div>
              </Group>

              <Group title="Social links">
                {SOCIAL_FIELDS.map((s) => (
                  <Input key={s.key} label={s.label} value={f[s.key]} onChange={set(s.key)} placeholder={`https://${s.key}.com/…`} />
                ))}
              </Group>
            </section>
          </Reveal>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium">
              <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7]"><Mail size={15} className="text-[#B45309]" /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-[13px] font-bold text-[#0F172A]">Your signature · {active?.name}</h2>
                  <p className="text-[11px] text-[#94A3B8]">Exactly what lands in the reader's inbox</p>
                </div>
              </div>
              <div className="overflow-x-auto p-5">
                <p className="mb-2 text-[13px] text-[#94A3B8]">Thanks and regards,</p>
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Show in signature</p>
              <div className="flex flex-wrap gap-2">
                <Toggle on={showLogo} set={setShowLogo} label="Logo" />
                <Toggle on={showQr} set={setShowQr} label="QR code" />
                <Toggle on={showSocials} set={setShowSocials} label="Social links" />
                <Toggle on={showAddress} set={setShowAddress} label="Address" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[12px] font-semibold text-[#334155]">Colour</span>
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Accent colour ${c}`} aria-pressed={accent === c}
                    className={`h-7 w-7 rounded-lg transition-transform ${accent === c ? "scale-105 ring-2 ring-[#0F172A] ring-offset-2" : "ring-1 ring-[#E2E8F0] hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-semibold text-[#475569]">Tagline under the card link</span>
                <input className={field} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={90} placeholder="Leave empty to hide it" />
              </label>
            </div>

            <button onClick={doCopy} type="button"
              className="gradient-gold flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#0F172A] transition-all hover:shadow-gold active:scale-[0.98]">
              {copied === "rich" ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy signature</>}
            </button>
            <button onClick={doCopyHtml} type="button"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] text-[12px] font-semibold text-[#334155] transition-colors hover:bg-[#E2E8F0]">
              {copied === "html" ? <Check size={15} className="text-emerald-500" /> : <Code2 size={15} />} Copy HTML
            </button>
          </aside>
        </div>

        {/* ── Designs, shown large enough to read ── */}
        <section aria-labelledby="designs-title">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]"><PenLine size={12} /> {SIGNATURE_TEMPLATES.length} designs</span>
            <h2 id="designs-title" className="mt-3 text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">Pick a design</h2>
            <p className="mt-2 text-[14px] text-[#64748B]">Every design below is built from the details above — click one to use it.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {designs.map((t) => {
              const on = t.id === templateId;
              return (
                <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} aria-pressed={on} aria-label={`${t.name} design`}
                  className={`flex flex-col overflow-hidden rounded-2xl bg-white text-left transition-all ${on ? "shadow-premium ring-2 ring-[#F7B31C]" : "ring-1 ring-[#E2E8F0] hover:shadow-premium hover:ring-[#F7B31C]/60"}`}>
                  <span className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-[#0F172A]">{t.name}</span>
                      <span className="block text-[12px] leading-snug text-[#64748B]">{t.blurb}</span>
                    </span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-[#F7B31C]" : "bg-[#F1F5F9]"}`}>
                      {on && <Check size={14} className="text-[#0F172A]" />}
                    </span>
                  </span>
                  {/* CSS zoom (not transform) so the card grows to the design's real height. */}
                  <span className="pointer-events-none block overflow-hidden p-4 [zoom:0.5] sm:[zoom:0.75] md:[zoom:0.55] lg:[zoom:0.82]"
                    dangerouslySetInnerHTML={{ __html: t.html }} />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Where to paste ── */}
        <Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { c: "Gmail", s: "Settings → See all settings → General → Signature → paste → Save Changes." },
              { c: "Outlook", s: "Settings → Mail → Compose and reply → Email signature → paste → Save." },
              { c: "Apple Mail", s: "Mail → Settings → Signatures → untick “match default font” → paste." },
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
            <PenLine size={26} className="mx-auto mb-3 text-[#F7B31C]" />
            <h2 className="text-xl font-bold text-white sm:text-2xl">Make the signature lead somewhere</h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#CBD5E1]">
              A signature lists your details. A digital card lets people save them in one tap, see your
              services, message you on WhatsApp and pay you — and it tells you who looked.
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
