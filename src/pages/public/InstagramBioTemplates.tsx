import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Instagram, Copy, Check, RotateCcw, ArrowRight, ShieldCheck, Zap, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { SEO_INSTAGRAM_BIO } from "@/lib/publicSeo";
import { copyText } from "@/lib/clipboard";
import InstagramProfilePreview from "@/components/tools/InstagramProfilePreview";
import {
  IG_TEMPLATES, IG_BIO_LIMIT, IG_NAME_LIMIT, buildIgBio, igNameField, igLength, type IgData,
} from "@/lib/instagramBio";

const ORIGIN = "https://digitalcarda.in";

/* A made-up business shown before the visitor types anything. Glow Studio and
   Priya Arora are fictional; the link opens a real template demo. */
const SAMPLE = {
  name: "Priya Arora",
  designation: "Founder & Stylist",
  company: "Glow Studio",
  category: "Hair & Skin Salon",
  city: "Chandigarh",
  highlights: "Bridal makeup, Keratin, Nail art",
  cardUrl: `${ORIGIN}/demo/bloom-profile-card`,
};
type Fields = typeof SAMPLE;

const field = "w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#E1306C]/30 focus:border-[#E1306C] transition-shadow";

function Input({ label, value, onChange, placeholder, wide, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; hint?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] font-semibold text-[#475569]">{label}</span>
      <input className={field} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

const FAQ = [
  { q: "How long can an Instagram bio be?", a: "150 characters, including spaces, line breaks and emoji. Every template here fits, and the counter shows how much room is left after you edit it." },
  { q: "Can I put a link in my Instagram bio?", a: "A link typed into the bio text isn't clickable. Add it under Edit profile → Links instead — that is the link people can tap. A digital card works well there because it holds your contact details, services, prices and location in one place." },
  { q: "What should go in the Name field?", a: "Your business name plus a keyword people search for, such as \"Glow Studio | Salon Chandigarh\". Instagram search matches the Name field, and it allows 30 characters." },
  { q: "Is this tool free?", a: "Yes. There is no sign-up, and your details stay in your browser — nothing is sent to us or stored." },
];

const PAGE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Instagram Bio Templates for Business",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      description: "Free Instagram bio templates for businesses — 12 styles that fit the 150-character limit.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: "DigitalCarda", url: ORIGIN },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function InstagramBioTemplates() {
  usePageSeo({ ...SEO_INSTAGRAM_BIO, canonical: "/instagram-bio-templates" });

  const [f, setF] = useState<Fields>(SAMPLE);
  const [templateId, setTemplateId] = useState("salon");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"bio" | "name" | null>(null);

  const set = (k: keyof Fields) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const isSample = f === SAMPLE;
  const clearSample = () => setF(Object.fromEntries(Object.keys(SAMPLE).map((k) => [k, ""])) as Fields);

  const ig: IgData = useMemo(() => ({
    name: f.name.trim(), designation: f.designation.trim(), company: f.company.trim(), category: f.category.trim(),
    city: f.city.trim(),
    highlights: f.highlights.split(/[,|]/).map((x) => x.trim()).filter(Boolean).slice(0, 3),
    cardUrl: f.cardUrl.trim(),
  }), [f]);

  const bios = useMemo(() => IG_TEMPLATES.map((t) => {
    const generated = buildIgBio(t.id, ig);
    const text = edits[t.id] ?? generated;
    return { ...t, generated, text, edited: edits[t.id] !== undefined && edits[t.id] !== generated };
  }), [ig, edits]);

  const current = bios.find((b) => b.id === templateId) ?? bios[0];
  const setText = (v: string) => setEdits((e) => ({ ...e, [current.id]: v }));
  const reset = () => setEdits((e) => { const n = { ...e }; delete n[current.id]; return n; });
  const len = igLength(current.text);
  const nameField = igNameField(ig);
  const username = (f.company || f.name || "yourbusiness").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "yourbusiness";

  const copy = async (what: "bio" | "name", text: string, msg: string) => {
    if (await copyText(text)) {
      setCopied(what); toast.success(msg);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2200);
    } else toast.error("Copy failed — select the text and copy it manually");
  };

  return (
    <div className="bg-[#F8FAFC]">
      <JsonLd id="page-jsonld" data={PAGE_LD} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0F172A] px-4 pb-14 pt-28 sm:pb-16 sm:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#DD2A7B]/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 h-[320px] w-[320px] rounded-full bg-[#F58529]/15 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-5 inline-flex h-8 items-center gap-2 rounded-full bg-white/10 px-3.5 text-[12px] font-semibold text-[#F9A8D4]">
            <Instagram size={13} /> Free · No sign-up
          </span>
          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl">
            Instagram Bio Templates for Business
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1] sm:text-base">
            Twelve bio styles for salons, restaurants, shops, clinics, coaches and more — each under Instagram's
            150-character limit. Add your details, tweak the words and copy it in.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Fits the 150-character limit</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:py-14">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <Reveal>
              <section className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium sm:p-6" aria-labelledby="ig-details">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="ig-details" className="text-[15px] font-bold text-[#0F172A]">Your details</h2>
                    <p className="mt-1 text-[12px] text-[#64748B]">Used to write every bio. Nothing is sent to us or stored.</p>
                  </div>
                  {isSample && (
                    <button type="button" onClick={clearSample}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">
                      <X size={12} /> Clear sample
                    </button>
                  )}
                </div>
                {isSample && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#FDF2F8] px-3 py-2.5 text-[12px] leading-snug text-[#9D174D] ring-1 ring-[#FBCFE8]">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    You're looking at a sample business. Type over any field and all twelve bios update.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Business name" value={f.company} onChange={set("company")} placeholder="e.g. Glow Studio" />
                  <Input label="What you do" value={f.category} onChange={set("category")} placeholder="e.g. Hair & Skin Salon" />
                  <Input label="Your name" value={f.name} onChange={set("name")} placeholder="Your name" />
                  <Input label="Your role" value={f.designation} onChange={set("designation")} placeholder="e.g. Founder" />
                  <Input label="City" value={f.city} onChange={set("city")} placeholder="e.g. Chandigarh" />
                  <Input label="Link for your profile" value={f.cardUrl} onChange={set("cardUrl")} placeholder="digitalcarda.in/yourname" />
                  <Input label="Known for (up to 3, separated by commas)" value={f.highlights} onChange={set("highlights")} placeholder="e.g. Bridal makeup, Keratin, Nail art" wide />
                </div>
              </section>
            </Reveal>

            <Reveal>
              <section className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium" aria-labelledby="ig-edit">
                <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-5 py-3">
                  <div className="min-w-0">
                    <h2 id="ig-edit" className="truncate text-[14px] font-bold text-[#0F172A]">{current.name}</h2>
                    <p className="text-[11px] text-[#94A3B8]">{current.fits} · edit it so it sounds like you</p>
                  </div>
                  {current.edited && (
                    <button type="button" onClick={reset}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <textarea value={current.text} onChange={(e) => setText(e.target.value)} rows={5} spellCheck aria-label="Bio text"
                    className="w-full resize-y rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-[#0F172A] focus:border-[#E1306C] focus:outline-none focus:ring-2 focus:ring-[#E1306C]/30" />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-[#94A3B8]">Line breaks and emoji work. Bold and links don't.</p>
                    <p className={`text-[11px] font-semibold tabular-nums ${len > IG_BIO_LIMIT ? "text-[#DC2626]" : "text-[#64748B]"}`}>{len} / {IG_BIO_LIMIT}</p>
                  </div>
                  {len > IG_BIO_LIMIT && (
                    <p className="mt-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#991B1B]">
                      Instagram won't save a bio over {IG_BIO_LIMIT} characters. Trim {len - IG_BIO_LIMIT} more.
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#E2E8F0]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-[#94A3B8]">Suggested Name field · {igLength(nameField)}/{IG_NAME_LIMIT}</span>
                      <span className="block truncate text-[13px] font-semibold text-[#0F172A]">{nameField}</span>
                    </span>
                    <button type="button" onClick={() => copy("name", nameField, "Name copied")}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[11px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0] hover:bg-[#F1F5F9]">
                      {copied === "name" ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
              </section>
            </Reveal>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <InstagramProfilePreview username={username} displayName={nameField} category={f.category || f.designation}
              bio={current.text} link={f.cardUrl} />
            <button onClick={() => copy("bio", current.text, "Bio copied — paste it into Edit profile → Bio")} type="button" disabled={len > IG_BIO_LIMIT}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50 active:scale-[0.98]">
              {copied === "bio" ? <><Check size={17} /> Copied — now paste it</> : <><Copy size={17} /> Copy bio</>}
            </button>
          </aside>
        </div>

        {/* ── All twelve ── */}
        <section aria-labelledby="ig-all">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCE7F3] px-3 py-1 text-xs font-semibold text-[#9D174D]"><Instagram size={12} /> {IG_TEMPLATES.length} bio styles</span>
            <h2 id="ig-all" className="mt-3 text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">Pick a bio</h2>
            <p className="mt-2 text-[14px] text-[#64748B]">Each one is already written with your details — click to preview and edit it.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bios.map((b) => {
              const on = b.id === templateId;
              return (
                <button key={b.id} type="button" onClick={() => { setTemplateId(b.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  aria-pressed={on} aria-label={`${b.name} — ${b.fits}`}
                  className={`flex flex-col rounded-2xl bg-white p-4 text-left transition-all ${on ? "shadow-premium ring-2 ring-[#E1306C]" : "ring-1 ring-[#E2E8F0] hover:shadow-premium hover:ring-[#E1306C]/60"}`}>
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F172A]">
                        {b.name}
                        {b.edited && <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-bold text-[#B45309]">EDITED</span>}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full bg-[#FCE7F3] px-2 py-0.5 text-[10px] font-semibold text-[#9D174D]">{b.fits}</span>
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-[#94A3B8]">{igLength(b.text)}/{IG_BIO_LIMIT}</span>
                  </span>
                  <span className="mt-3 block flex-1 whitespace-pre-wrap break-words rounded-xl bg-[#FAFAFA] px-3 py-2.5 text-[13px] leading-[1.4] text-[#0F172A] ring-1 ring-[#EFEFEF]">{b.text}</span>
                  <span className="mt-2.5 block text-[12px] leading-snug text-[#64748B]">{b.blurb}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Where it goes ── */}
        <Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { c: "Bio", s: "Instagram → your profile → Edit profile → Bio → paste → Done." },
              { c: "Link", s: "Edit profile → Links → Add external link → paste your card link. Links typed in the bio aren't clickable." },
              { c: "Name", s: "Edit profile → Name → add a keyword people search for, like \"Salon\" or your city (30 characters)." },
            ].map((x) => (
              <div key={x.c} className="rounded-2xl border border-[#F1F5F9] bg-white p-4">
                <p className="mb-1 text-[13px] font-bold text-[#0F172A]">{x.c}</p>
                <p className="text-[12px] leading-relaxed text-[#64748B]">{x.s}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── FAQ (same text as the FAQPage schema) ── */}
        <section aria-labelledby="ig-faq" className="mx-auto max-w-3xl">
          <h2 id="ig-faq" className="text-center text-2xl font-extrabold tracking-tight text-[#0F172A]">Instagram bio questions</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((q) => (
              <details key={q.q} className="group rounded-2xl border border-[#F1F5F9] bg-white px-5 py-4 open:shadow-premium">
                <summary className="cursor-pointer list-none marker:hidden"><span className="dc-faq-q">{q.q}</span></summary>
                <p className="dc-faq-a mt-2">{q.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Conversion ── */}
        <Reveal>
          <div className="rounded-2xl bg-[#0F172A] p-6 text-center sm:p-8">
            <Instagram size={26} className="mx-auto mb-3 text-[#F9A8D4]" />
            <h2 className="text-xl font-bold text-white sm:text-2xl">Give your bio link somewhere to go</h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#CBD5E1]">
              Instagram gives you one link. Make it a digital card — call, WhatsApp, services, prices, reviews and
              directions in one place, and you can see who tapped it.
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
