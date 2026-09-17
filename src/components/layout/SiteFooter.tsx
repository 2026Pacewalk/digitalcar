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
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, BarChart3, BookOpen, Check, Globe, IndianRupee, Inbox, LayoutGrid, MessageCircle, Nfc,
  PenLine, Phone, QrCode, Rocket, ShieldCheck, Sparkles, Star, Truck, UserPlus, Wand2, Zap, type LucideIcon,
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

/* Back to top: a rocket in a spinning gold orbit. Hover = engines on; click = lift-off. */
@keyframes dc-top-spin { to { transform: rotate(360deg); } }
.dc-top-ring { animation: dc-top-spin 6s linear infinite; }
@keyframes dc-top-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.dc-top:hover .dc-top-rocket, .dc-top:focus-visible .dc-top-rocket { animation: dc-top-bob .9s ease-in-out infinite; }
.dc-top-flame { opacity: 0; transform-origin: top center; transition: opacity .2s; }
.dc-top:hover .dc-top-flame, .dc-top:focus-visible .dc-top-flame, .dc-top.is-launching .dc-top-flame { opacity: 1; animation: dc-top-flicker .16s ease-in-out infinite alternate; }
@keyframes dc-top-flicker { from { transform: scaleY(.8); } to { transform: scaleY(1.5); } }
@keyframes dc-top-launch {
  0% { transform: translateY(0); }
  18% { transform: translateY(3px); }
  55% { transform: translateY(-52px); opacity: 1; }
  56% { transform: translateY(52px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
.dc-top.is-launching .dc-top-rocket { animation: dc-top-launch 1.05s cubic-bezier(.5, 0, .2, 1) forwards; }
.dc-top-puff { position: absolute; bottom: 3px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 9999px; background: rgba(226, 232, 240, .75); opacity: 0; }
@keyframes dc-top-puff { 0% { transform: translate(0, 0) scale(.3); opacity: .85; } 100% { transform: translate(var(--dx), 7px) scale(1.7); opacity: 0; } }
.dc-top.is-launching .dc-top-puff { animation: dc-top-puff .75s ease-out .12s forwards; }
@keyframes dc-top-twinkle { 0%, 100% { opacity: .15; } 50% { opacity: .9; } }
.dc-top-star { animation: dc-top-twinkle 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .dc-top-ring, .dc-top-rocket, .dc-top-flame, .dc-top-puff, .dc-top-star { animation: none !important; }
}
`;

/** Brand colour for each network's hover glow. */
const BRAND_COLORS: Record<string, string> = {
  Pinterest: "#E60023", Instagram: "#E1306C", Facebook: "#1877F2", LinkedIn: "#0A66C2",
  YouTube: "#FF0000", X: "#E2E8F0", Telegram: "#229ED9", WhatsApp: "#25D366", Threads: "#E2E8F0",
};

/** "Follow us": every official profile in SOCIAL_LINKS (src/lib/publicNav.ts),
    as a brand icon that lifts and glows in the network's colour. Adding a profile
    there adds it here and to the Organization structured data. */
function FollowUs() {
  if (!SOCIAL_LINKS.length) return null;
  return (
    <div className="mt-6">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]/80">Follow us</p>
      <ul className="mt-2.5 flex flex-wrap items-center gap-2">
        {SOCIAL_LINKS.map((s) => {
          const color = BRAND_COLORS[s.label] ?? "#F7B31C";
          return (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`Follow DigitalCarda on ${s.label}`}
                style={{ ["--brand" as string]: color }}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-[0_10px_22px_-10px_var(--brand)] hover:ring-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
              >
                {/* Soft glow in the network's colour */}
                <span aria-hidden="true" className="absolute inset-1 rounded-lg bg-[var(--brand)] opacity-0 blur-md transition duration-300 group-hover:opacity-40" />
                <img src={s.icon} alt="" width={18} height={18} className="relative h-[18px] w-[18px] transition duration-300 group-hover:scale-110" loading="lazy" />
                {/* Name tooltip */}
                <span aria-hidden="true" className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#0B1120] opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  {s.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function useLaunch() {
  const [launching, setLaunching] = useState(false);
  const launch = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { window.scrollTo({ top: 0, behavior: "auto" }); return; }
    setLaunching(true);
    // Lift-off first, then the page follows the rocket up.
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 280);
    window.setTimeout(() => setLaunching(false), 1150);
  };
  return { launching, launch };
}

function RocketOrb({ size = 40 }: { size?: number }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ width: size, height: size }} aria-hidden="true">
      <span className="dc-top-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#F7B31C,rgba(247,179,28,0)_35%,#FDE68A_62%,rgba(247,179,28,0)_85%,#F7B31C)]" />
      <span className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_50%_30%,#1E293B,#0B1120)]" />
      <span className="dc-top-star absolute left-[9px] top-[9px] h-[2px] w-[2px] rounded-full bg-white" />
      <span className="dc-top-star absolute right-[10px] top-[14px] h-[2px] w-[2px] rounded-full bg-white [animation-delay:.8s]" />
      <span className="dc-top-star absolute bottom-[11px] left-[12px] h-[1.5px] w-[1.5px] rounded-full bg-white [animation-delay:1.4s]" />
      <span className="dc-top-puff" style={{ ["--dx" as string]: "-11px" }} />
      <span className="dc-top-puff" style={{ ["--dx" as string]: "0px" }} />
      <span className="dc-top-puff" style={{ ["--dx" as string]: "11px" }} />
      <span className="dc-top-rocket relative flex flex-col items-center">
        <Rocket size={size > 44 ? 20 : 17} strokeWidth={2.2} className="-rotate-45 text-[#F7B31C]" />
        <span className="dc-top-flame -mt-[3px] h-[7px] w-[5px] rounded-b-full bg-gradient-to-b from-[#FDE68A] via-[#F59E0B] to-[#EF4444]/0" />
      </span>
    </span>
  );
}

/** Desktop: a floating rocket that appears once the page has been scrolled
    a screen or so, and tucks itself away again near the top. */
function FloatingBackToTop() {
  const { launching, launch } = useLaunch();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > Math.max(600, window.innerHeight * 0.9));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <button
      type="button"
      onClick={launch}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`dc-top group fixed bottom-6 right-6 z-40 hidden items-center rounded-full bg-[#0B1120]/90 p-1 shadow-[0_18px_40px_-12px_rgba(2,6,23,0.6)] ring-1 ring-white/15 backdrop-blur transition-all duration-300 hover:ring-[#F7B31C]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] md:flex ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"} ${launching ? "is-launching" : ""}`}
    >
      <RocketOrb size={48} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-semibold text-white transition-all duration-300 group-hover:max-w-[110px] group-hover:pl-2 group-hover:pr-3 group-focus-visible:max-w-[110px] group-focus-visible:pl-2 group-focus-visible:pr-3">
        Back to top
      </span>
    </button>
  );
}

/** "Back to top", as a small rocket launch (phones and tablets, in the footer). */
function BackToTop() {
  const { launching, launch: onClick } = useLaunch();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dc-top group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.03] py-1 pl-1 pr-4 text-[12.5px] font-semibold text-[#CBD5E1] transition hover:border-[#F7B31C]/50 hover:bg-[#F7B31C]/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${launching ? "is-launching" : ""}`}
    >
      <RocketOrb />
      Back to top
    </button>
  );
}

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
      <FloatingBackToTop />
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

            <FollowUs />

            {/* Shown only where the browser can add the site to the home screen. */}
            <div className="mt-5 max-w-sm empty:hidden"><InstallAppRow /></div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8 lg:gap-x-8 lg:pl-6">
            {FOOTER_GROUPS.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]/80">{g.title}</p>
                <ul className="mt-4 space-y-3">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link to={l.href} className="group inline-block text-[14px] leading-snug text-[#CBD5E1] transition-colors hover:text-white">
                        <span className="inline-block h-px w-0 align-middle bg-[#F7B31C] transition-all duration-300 group-hover:mr-1.5 group-hover:w-3" aria-hidden="true" />
                        {l.label}
                        {l.badge && <span className="ml-1.5 inline-block rounded-full bg-[#22C55E]/15 px-1.5 py-0.5 align-[1px] text-[9.5px] font-bold uppercase leading-none tracking-wide text-[#4ADE80]">{l.badge}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* ── 4. Guides + NFC ────────────────────────────────────── */}
        <div className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#F7B31C]/80"><BookOpen size={14} aria-hidden="true" /> Popular guides</p>
            <Link to="/blog" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#CBD5E1] hover:text-white">All guides <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <li>
            <Link to="/pricing" className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#F7B31C] to-[#F59E0B] p-4 text-[#0B1120] transition hover:-translate-y-0.5">
              <span aria-hidden="true" className="absolute -right-6 -top-6 h-28 w-28 rounded-full border-[14px] border-white/25" />
              <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[#0B1120] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#F7B31C]"><Zap size={11} aria-hidden="true" /> Tap to share</span>
              <span className="relative mt-2.5 flex items-center gap-2 font-display text-[17px] font-extrabold leading-tight"><Nfc size={20} aria-hidden="true" /> NFC card · ₹499</span>
              <span className="relative mt-1 block text-[13px] font-medium leading-snug text-[#422006]">Tap it on a phone and your card opens. Printed on both sides.</span>
              <span className="relative mt-auto pt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold"><Truck size={14} aria-hidden="true" /> Free delivery across India <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
            </li>
          </ul>
        </div>

        {/* ── 5. Wordmark + legal ────────────────────────────────── */}
        <div aria-hidden="true" className="pointer-events-none mt-14 select-none overflow-hidden">
          <p className="whitespace-nowrap text-center font-display font-extrabold leading-[0.8] tracking-[-0.04em] text-[length:clamp(3.5rem,15vw,13rem)] bg-gradient-to-b from-white/[0.14] via-white/[0.05] to-transparent bg-clip-text text-transparent">
            DigitalCarda
          </p>
        </div>

        {/* Phones: a centred stack — back to top, the legal links in a tidy 2×2
            grid, then the badges and copyright. From md up: one row. */}
        <div className="flex flex-col items-center gap-6 border-t border-white/10 pt-8 pb-28 text-center md:flex-row md:items-center md:justify-between md:gap-4 md:py-6 md:text-left lg:pb-6">
          <div className="order-3 flex flex-col items-center gap-2.5 md:order-1 md:flex-row md:flex-wrap md:gap-x-4 md:gap-y-1">
            <p className="order-2 text-[12.5px] text-[#64748B] md:order-1">© {year} DigitalCarda. All rights reserved.</p>
            <p className="order-1 flex items-center justify-center gap-x-4 text-[12.5px] text-[#94A3B8] md:order-2 md:gap-x-3 md:text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px]" aria-hidden="true">
                  <span className="flex-1 bg-[#FF9933]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#138808]" />
                </span>
                Made in India
              </span>
              <span className="h-3 w-px bg-white/15 md:hidden" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#22C55E]" aria-hidden="true" /> Secure payments</span>
            </p>
          </div>

          <nav aria-label="Legal" className="order-2 grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-3 text-[13px] md:flex md:w-auto md:max-w-none md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2 md:text-[12.5px]">
            {[...LEGAL_LINKS, { label: "Sitemap", href: "/sitemap" }].map((l) => (
              <Link key={l.href} to={l.href} className="rounded-lg py-1 text-[#94A3B8] transition-colors hover:text-white md:py-0">{l.label}</Link>
            ))}
          </nav>

          <div className="order-1 md:order-3 md:hidden"><BackToTop /></div>
        </div>
      </div>
    </footer>
  );
}
