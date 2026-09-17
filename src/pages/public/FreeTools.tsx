/*
 * /free-tools — the hub for every no-sign-up tool.
 *
 * Lists only tools that actually work today. A "coming soon" tile would be a
 * promise on a live page, so upcoming ideas stay out until they ship.
 *
 * Template counts come from the tools' own data, so this page can never quote
 * a different number from the tool it links to.
 */
import { Link } from "react-router";
import {
  PenLine, MessageCircle, Sparkles, ArrowRight, ShieldCheck, Zap, Check,
  LayoutGrid, UserX, Gift, Instagram,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";
import { usePageSeo } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import { SEO_FREE_TOOLS } from "@/lib/publicSeo";
import { SIGNATURE_TEMPLATES } from "@/lib/emailSignature";
import { WA_TEMPLATES } from "@/lib/whatsappMessage";
import { IG_TEMPLATES, IG_BIO_LIMIT } from "@/lib/instagramBio";

type Tool = {
  href: string;
  name: string;
  pitch: string;
  points: string[];
  stat: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  cta: string;
};

const TOOLS: Tool[] = [
  {
    href: "/email-signature-generator",
    name: "Email Signature Generator",
    pitch: "A professional signature for Gmail, Outlook or Apple Mail — fill in your details, pick a design, copy it in.",
    points: ["Works in Gmail, Outlook & Apple Mail", "Your logo, photo and social links", "Copy as rich text or HTML"],
    stat: `${SIGNATURE_TEMPLATES.length} designs`,
    icon: PenLine,
    accent: "#F7B31C",
    cta: "Create my signature",
  },
  {
    href: "/whatsapp-message-templates",
    name: "WhatsApp Business Templates",
    pitch: "Ready-written greeting, away and quick-reply messages, filled in with your business details.",
    points: ["Greeting, away & quick replies", "Edit the wording to sound like you", "Paste straight into WhatsApp Business"],
    stat: `${WA_TEMPLATES.length} messages`,
    icon: MessageCircle,
    accent: "#25D366",
    cta: "Get my templates",
  },
  {
    href: "/instagram-bio-templates",
    name: "Instagram Bio Templates",
    pitch: "Business bios for salons, restaurants, shops, clinics and coaches — written to fit Instagram's limit.",
    points: [`Every bio under ${IG_BIO_LIMIT} characters`, "A searchable profile name to match", "Tips for the one link people can tap"],
    stat: `${IG_TEMPLATES.length} bios`,
    icon: Instagram,
    accent: "#DB2777",
    cta: "Write my bio",
  },
  {
    href: "/ai-card-generator",
    name: "AI Business Card Builder",
    pitch: "Describe your business or paste your website, and AI writes and designs a digital business card to preview.",
    points: ["Reads your website for logo & colours", "Writes your bio, services & SEO", "Preview free, before signing up"],
    stat: "About 10 seconds",
    icon: Sparkles,
    accent: "#8B5CF6",
    cta: "Build my card",
  },
];

const PROMISES = [
  { icon: UserX, title: "No sign-up", desc: "Open a tool and use it. There is no account wall in front of any of them." },
  { icon: ShieldCheck, title: "Nothing stored", desc: "The signature, WhatsApp and Instagram tools run in your browser — your details are not sent to us." },
  { icon: Gift, title: "Actually free", desc: "No trial timer, no watermark, no card details. Copy the result and keep it." },
];

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free business tools",
  url: "https://digitalcarda.in/free-tools",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `https://digitalcarda.in${t.href}`,
    })),
  },
};

export default function FreeTools() {
  usePageSeo({
    ...SEO_FREE_TOOLS,
    canonical: "/free-tools",
  });

  return (
    <div className="bg-[#F8FAFC]">
      <JsonLd id="page-jsonld" data={PAGE_LD} />
      {/* ── Hero: dark, to match the tool pages it leads into ── */}
      <section className="relative bg-[#0F172A] pt-28 pb-16 sm:pt-32 sm:pb-20 px-4 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-30" />
        <div aria-hidden="true" className="absolute -top-24 right-0 w-[460px] h-[460px] bg-[#F7B31C]/15 rounded-full blur-3xl animate-aurora-drift" />
        <div aria-hidden="true" className="absolute bottom-0 -left-20 w-[380px] h-[380px] bg-[#25D366]/10 rounded-full blur-3xl animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <Reveal stagger className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white/10 text-[#F7B31C] text-[12px] font-semibold">
            <Zap size={13} /> Free · No sign-up
          </span>
          <h1 className="mt-5 text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.12]">
            Free Tools for{" "}
            <span className="relative inline-block text-gradient-gold">
              Small Businesses
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-[15px] sm:text-base text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed">
            The small jobs every business needs done — a proper email signature, WhatsApp replies that sound
            professional, a card people can save. Pick a tool, use it, keep the result.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#14B8A6]" /> {TOOLS.length} tools</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#14B8A6]" /> Nothing leaves your browser</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-[#F7B31C]" /> Done in a minute</span>
          </div>
        </Reveal>
      </section>

      {/* ── The tools ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative">
        <Reveal stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              to={t.href}
              className="group relative flex flex-col rounded-3xl bg-white ring-1 ring-[#E8ECF3] shadow-premium p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium-lg hover:ring-[#F7B31C]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
            >
              <span aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-300" style={{ background: `${t.accent}33` }} />

              <div className="relative flex items-start justify-between gap-3">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ background: `${t.accent}1F`, color: t.accent }}>
                  <t.icon size={22} />
                </span>
                <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-[#F1F5F9] text-[#475569]">{t.stat}</span>
              </div>

              <h2 className="relative mt-5 text-[17px] font-bold text-[#0F172A] leading-snug">{t.name}</h2>
              <p className="relative mt-2 text-[13px] text-[#64748B] leading-relaxed">{t.pitch}</p>

              <ul className="relative mt-4 space-y-2 flex-1">
                {t.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[12.5px] text-[#334155]">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>

              <span className="relative mt-6 inline-flex items-center justify-between h-11 px-4 rounded-xl bg-[#0F172A] text-white text-[13.5px] font-semibold transition-colors group-hover:bg-[#1E293B]">
                {t.cta}
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* ── Promises ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <SectionHeading
          eyebrow="The deal"
          title={<>Free Means <span className="text-gradient-gold">Actually Free</span></>}
          subtitle="Tools that hold something back until you pay are not really free. These do not."
        />
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROMISES.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white ring-1 ring-[#E8ECF3] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-premium">
              <span className="w-11 h-11 mx-auto rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center"><p.icon size={19} /></span>
              <h3 className="mt-3.5 text-[14.5px] font-bold text-[#0F172A]">{p.title}</h3>
              <p className="mt-1.5 text-[12.5px] text-[#64748B] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── Bridge to the product ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Reveal>
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] ring-1 ring-white/10 p-8 sm:p-12 overflow-hidden text-center">
            <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-25" />
            <div aria-hidden="true" className="absolute -top-16 -right-16 w-64 h-64 bg-[#F7B31C]/20 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-[2rem] font-bold text-white tracking-tight">Put all of it behind one link</h2>
              <p className="mt-3 text-sm text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
                Your signature and WhatsApp replies work best when they point somewhere. A digital business card
                gives them one link with your contacts, services, payments and reviews.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/signup" className="btn-gold h-12 px-7 inline-flex items-center justify-center gap-2 text-base">
                  Start 30-day free trial <ArrowRight size={17} />
                </Link>
                <Link to="/digital-business-cards-templates" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
                  <LayoutGrid size={16} /> Browse card designs
                </Link>
              </div>
              <p className="mt-4 text-[11.5px] text-[#64748B]">No credit card details needed</p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
