/*
 * The public site footer.
 *
 *   1. A closing call to action beside an illustrated card that shows what the
 *      product does (QR, NFC tap, WhatsApp, Save Contact, a UPI payment, a lead).
 *   2. A scrolling strip of every feature, each linking to where it's explained.
 *   3. Brand, contact, install-the-app, and the link columns.
 *   4. Popular guides from the blog, and the NFC card.
 *   5. A large wordmark, then the legal bar with back-to-top.
 *
 * Link lists come from src/lib/publicNav.ts — the same source as the header and
 * the /sitemap page — so they can never list different pages. Every feature named
 * here exists in the product today; keep it that way when editing.
 */
import { Link } from "react-router";
import {
  ArrowRight, ArrowUp, BarChart3, BookOpen, Check, Globe, IndianRupee, Inbox, LayoutGrid, Mail, MessageCircle, Nfc,
  PenLine, Phone, QrCode, ShieldCheck, Sparkles, Star, Truck, UserPlus, Wand2, Zap, type LucideIcon,
} from "lucide-react";
import { CONTACT, FOOTER_GROUPS, FOOTER_GUIDES, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/publicNav";
import { InstallAppRow } from "@/components/mobile/InstallApp";

/** Every feature here is live in the product. */
const FEATURES: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: LayoutGrid, label: "50+ card designs", href: "/digital-business-cards-templates" },
  { icon: QrCode, label: "QR code sharing", href: "/features" },
  { icon: Nfc, label: "NFC tap cards · ₹499", href: "/pricing" },
  { icon: Wand2, label: "AI writes your card", href: "/ai-card-generator" },
  { icon: MessageCircle, label: "WhatsApp button", href: "/features" },
  { icon: UserPlus, label: "One-tap Save Contact", href: "/features" },
  { icon: IndianRupee, label: "UPI payments", href: "/features" },
  { icon: Inbox, label: "Enquiry form & leads", href: "/features" },
  { icon: Star, label: "Google reviews", href: "/blog/google-review-qr-code" },
  { icon: BarChart3, label: "Visit & tap analytics", href: "/features" },
  { icon: Globe, label: "Your own domain", href: "/custom-domain" },
  { icon: PenLine, label: "Free email signatures", href: "/email-signature-generator" },
];

const MARQUEE_CSS = `
@keyframes dc-footer-marquee { to { transform: translateX(-50%); } }
.dc-footer-marquee { animation: dc-footer-marquee 46s linear infinite; }
.dc-footer-marquee:hover, .dc-footer-marquee:focus-within { animation-play-state: paused; }
@keyframes dc-footer-ping { 0% { transform: scale(.85); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
.dc-footer-ping { animation: dc-footer-ping 2.4s cubic-bezier(0,0,.2,1) infinite; }
@media (prefers-reduced-motion: reduce) { .dc-footer-marquee, .dc-footer-ping { animation: none; } }
`;

function FeaturePill({ icon: Icon, label, href, hidden = false }: { icon: LucideIcon; label: string; href: string; hidden?: boolean }) {
  return (
    <Link
      to={href}
      tabIndex={hidden ? -1 : undefined}
      className="group mx-1.5 inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-2 pr-4 text-[13.5px] font-medium text-[#CBD5E1] transition-colors hover:border-[#F7B31C]/50 hover:bg-[#F7B31C]/10 hover:text-white"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7B31C]/15 text-[#F7B31C] transition-colors group-hover:bg-[#F7B31C] group-hover:text-[#0B1120]">
        <Icon size={14} aria-hidden="true" />
      </span>
      {label}
    </Link>
  );
}

/** The illustrated card beside the call to action — decorative. */
function CardShowcase() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[300px] w-[270px] select-none">
      {/* NFC waves behind the card */}
      {/* (The wrapper centres; the inner ring animates — one transform each, so they don't fight.) */}
      <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
        <span className="dc-footer-ping block h-40 w-40 rounded-full border-2 border-[#F7B31C]/40" />
      </span>
      <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
        <span className="dc-footer-ping block h-40 w-40 rounded-full border-2 border-[#F7B31C]/30 [animation-delay:1.2s]" />
      </span>

      {/* The card */}
      <div className="absolute left-1/2 top-3 w-[200px] -translate-x-1/2 rotate-[-6deg] overflow-hidden rounded-[1.6rem] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        <div className="h-16 bg-gradient-to-br from-[#FBBF24] to-[#F59E0B]" />
        <div className="-mt-8 flex flex-col items-center px-4 pb-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] font-display text-lg font-extrabold text-[#F7B31C] ring-4 ring-white">AM</span>
          <span className="mt-2 h-2.5 w-24 rounded-full bg-[#0F172A]" />
          <span className="mt-1.5 h-2 w-16 rounded-full bg-[#CBD5E1]" />
          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            <span className="flex h-7 items-center justify-center gap-1 rounded-full bg-[#0F172A] text-[10px] font-bold text-white"><Phone size={10} /> Call</span>
            <span className="flex h-7 items-center justify-center gap-1 rounded-full bg-[#22C55E] text-[10px] font-bold text-white"><MessageCircle size={10} /> WhatsApp</span>
          </div>
          <div className="mt-3 flex w-full items-center gap-2 rounded-xl bg-[#F8FAFC] p-2">
            <QrCode size={30} className="shrink-0 text-[#0F172A]" />
            <span className="flex-1 space-y-1"><span className="block h-1.5 w-full rounded-full bg-[#E2E8F0]" /><span className="block h-1.5 w-2/3 rounded-full bg-[#E2E8F0]" /></span>
          </div>
        </div>
      </div>

      {/* Floating notifications */}
      <div className="absolute -left-6 top-24 flex items-center gap-2 rounded-2xl bg-[#0F172A]/95 px-3 py-2 text-[11px] font-semibold text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E]"><UserPlus size={12} /></span> Saved to contacts
      </div>
      <div className="absolute -right-8 top-44 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-semibold text-[#0F172A] shadow-xl">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7B31C]"><IndianRupee size={12} /></span> Paid via UPI
      </div>
      <div className="absolute -left-2 bottom-2 flex items-center gap-2 rounded-2xl bg-[#0F172A]/95 px-3 py-2 text-[11px] font-semibold text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B82F6]"><Inbox size={12} /></span> New enquiry
      </div>
    </div>
  );
}

export default function SiteFooter({ signupHref }: { signupHref: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[#070B16] text-white">
      <style>{MARQUEE_CSS}</style>
      {/* Ambient light and a faint grid */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#F7B31C]/[0.09] blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        {/* ── 1. Call to action ─────────────────────────────────── */}
        <section aria-labelledby="footer-cta" className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#16213A] via-[#0F172A] to-[#0B1120] p-7 sm:p-10 lg:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F7B31C]/20 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#F7B31C]/30 bg-[#F7B31C]/10 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#F7B31C]">
                <Sparkles size={13} aria-hidden="true" /> ₹0 for 30 days · no payment needed
              </p>
              <h2 id="footer-cta" className="mt-5 font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl [text-wrap:balance]">
                Your whole business,{" "}
                <span className="bg-gradient-to-r from-[#FDE68A] via-[#F7B31C] to-[#F59E0B] bg-clip-text text-transparent">one tap away.</span>
              </h2>
              <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-[#94A3B8]">
                Contact details, services, payments and enquiries on a digital visiting card people open instantly — shared by link, QR code or an NFC tap. No app to install.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-[#CBD5E1]">
                {["Live in minutes", "50+ designs", "Cancel anytime"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#22C55E]" aria-hidden="true" /> {t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={signupHref} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F7B31C] px-7 py-3.5 text-[15px] font-bold text-[#0B1120] shadow-[0_18px_40px_-18px_rgba(247,179,28,0.9)] transition hover:bg-[#FBBF24]">
                  Create my free card <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:border-[#25D366]/60 hover:bg-[#25D366]/10">
                  <MessageCircle size={17} className="text-[#25D366]" aria-hidden="true" /> Chat on WhatsApp
                </a>
              </div>
            </div>
            <div className="hidden sm:block"><CardShowcase /></div>
          </div>
        </section>
      </div>

      {/* ── 2. Feature strip ─────────────────────────────────────── */}
      <nav aria-label="Features" className="relative mt-12 border-y border-white/[0.06] bg-white/[0.015] py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#070B16] to-transparent sm:w-32" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#070B16] to-transparent sm:w-32" aria-hidden="true" />
        <div className="overflow-hidden motion-reduce:overflow-x-auto">
          <div className="dc-footer-marquee flex w-max">
            {FEATURES.map((f) => <FeaturePill key={f.label} {...f} />)}
            {/* Second copy for a seamless loop — hidden from assistive tech and the tab order. */}
            <span aria-hidden="true" className="flex">
              {FEATURES.map((f) => <FeaturePill key={`dup-${f.label}`} {...f} hidden />)}
            </span>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── 3. Brand + links ───────────────────────────────────── */}
        <div className="grid gap-12 pt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center" aria-label="DigitalCarda home">
              <img src="/logo.png" alt="DigitalCarda" className="h-10 w-auto object-contain" loading="lazy" />
            </Link>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#94A3B8]">
              Digital visiting cards for businesses and professionals across India — with QR and NFC sharing, AI writing, payments and lead capture built in.
            </p>

            <div className="mt-6 grid max-w-sm gap-2.5">
              <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.07]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]"><MessageCircle size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">WhatsApp · fastest reply</span>
                  <span className="block truncate text-[14px] font-semibold text-white">{CONTACT.phone}</span>
                </span>
                <ArrowRight size={16} className="text-[#64748B] transition group-hover:translate-x-0.5 group-hover:text-[#25D366]" aria-hidden="true" />
              </a>
              <div className="grid grid-cols-2 gap-2.5">
                <a href={CONTACT.phoneHref} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-[#CBD5E1] transition hover:border-[#F7B31C]/40 hover:text-white">
                  <Phone size={15} className="text-[#F7B31C]" aria-hidden="true" /> Call us
                </a>
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] font-semibold text-[#CBD5E1] transition hover:border-[#F7B31C]/40 hover:text-white">
                  <Mail size={15} className="text-[#F7B31C]" aria-hidden="true" /> Email us
                </a>
              </div>
            </div>

            {SOCIAL_LINKS.length > 0 && (
              <div className="mt-5 flex items-center gap-2.5">
                {SOCIAL_LINKS.map((s) => (
                  <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer me" aria-label={`DigitalCarda on ${s.label}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/10">
                    <img src={s.icon} alt="" width={20} height={20} className="h-5 w-5" loading="lazy" />
                  </a>
                ))}
              </div>
            )}

            {/* Shown only where the browser can add the site to the home screen. */}
            <div className="mt-5 max-w-sm empty:hidden"><InstallAppRow /></div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_GROUPS.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]/80">{g.title}</p>
                <ul className="mt-4 space-y-3">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link to={l.href} className="group inline-flex items-center gap-1.5 text-[14px] text-[#CBD5E1] transition-colors hover:text-white">
                        <span className="h-px w-0 bg-[#F7B31C] transition-all duration-300 group-hover:w-3" aria-hidden="true" />
                        {l.label}
                        {l.badge && <span className="rounded-full bg-[#22C55E]/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#4ADE80]">{l.badge}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* ── 4. Guides + NFC ────────────────────────────────────── */}
        <div className="mt-14 grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]/80"><BookOpen size={14} aria-hidden="true" /> Popular guides</p>
              <Link to="/blog" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#CBD5E1] hover:text-white">All guides <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {FOOTER_GUIDES.map((g) => (
                <li key={g.href}>
                  <Link to={g.href} className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-[#F7B31C]/40 hover:bg-white/[0.05]">
                    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                      {g.desc}
                      <BookOpen size={14} className="text-white/20 transition group-hover:text-[#F7B31C]" aria-hidden="true" />
                    </span>
                    <span className="mt-2 text-[14.5px] font-semibold leading-snug text-white">{g.label}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[12.5px] font-semibold text-[#F7B31C]">Read guide <ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link to="/pricing" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F7B31C] to-[#F59E0B] p-5 text-[#0B1120] lg:mt-9">
            <span aria-hidden="true" className="absolute -right-6 -top-6 h-28 w-28 rounded-full border-[14px] border-white/25" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[#0B1120] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#F7B31C]"><Zap size={11} aria-hidden="true" /> Tap to share</span>
            <span className="relative mt-3 flex items-center gap-2 font-display text-[19px] font-extrabold leading-tight"><Nfc size={20} aria-hidden="true" /> NFC card · ₹499</span>
            <span className="relative mt-1 block text-[13px] font-medium leading-snug text-[#422006]">Tap it on a phone and your card opens. Printed on both sides.</span>
            <span className="relative mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold"><Truck size={14} aria-hidden="true" /> Free delivery across India <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
        </div>

        {/* ── 5. Wordmark + legal ────────────────────────────────── */}
        <div aria-hidden="true" className="pointer-events-none mt-14 select-none overflow-hidden">
          <p className="whitespace-nowrap text-center font-display font-extrabold leading-[0.8] tracking-[-0.04em] text-[length:clamp(3.5rem,15vw,13rem)] bg-gradient-to-b from-white/[0.14] via-white/[0.05] to-transparent bg-clip-text text-transparent">
            DigitalCarda
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-6 pb-28 md:flex-row md:items-center md:justify-between lg:pb-6">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#64748B]">
            <span>© {year} DigitalCarda. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px]" aria-hidden="true">
                <span className="flex-1 bg-[#FF9933]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#138808]" />
              </span>
              Made in India
            </span>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={13} className="text-[#22C55E]" aria-hidden="true" /> Secure payments</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
              {LEGAL_LINKS.map((l) => (
                <Link key={l.href} to={l.href} className="text-[#94A3B8] transition-colors hover:text-white">{l.label}</Link>
              ))}
              <Link to="/sitemap" className="text-[#94A3B8] transition-colors hover:text-white">Sitemap</Link>
            </nav>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
              className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[12.5px] font-semibold text-[#CBD5E1] transition hover:border-[#F7B31C]/50 hover:text-white"
            >
              Back to top <ArrowUp size={14} className="transition group-hover:-translate-y-0.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
