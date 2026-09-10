/*
 * /features — the page people read when they are comparing us with someone
 * else, so it is built to answer "can it do X?" fast and then show why that
 * matters.
 *
 *  - 40 features grouped by the job they do (Create / Share / Sell / Grow /
 *    Scale) with a sliding-pill filter, rather than one flat wall of cards.
 *  - Three spotlights for the features that actually win the deal.
 *  - A paper-vs-digital table, which is the comparison every visitor is
 *    running in their head anyway.
 *  - A feature-level FAQ, mirrored into FAQPage JSON-LD.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  CreditCard, QrCode, MessageCircle, Download, FileDown, FileText, ShoppingBag,
  Image as ImageIcon, Play, Wallet, MapPin, Star, Link2, Globe, BarChart3, Sparkles,
  Shield, Layers, Users, Eye, Check, X, ArrowRight, ChevronRight, Palette, Languages,
  ScanLine, Smartphone, Share2, MousePointer, TrendingUp, Gift, Building2, Clock,
  UserPlus, Rocket, PauseCircle, Wand2, Crop, PanelsTopLeft, Receipt, CalendarClock,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/public/Reveal";

/* ── The catalogue, grouped by the job each feature does ───────── */
type Cat = "create" | "share" | "sell" | "grow" | "scale";

const CATS: { id: Cat | "all"; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "all", label: "Everything", icon: Layers },
  { id: "create", label: "Create", icon: Wand2 },
  { id: "share", label: "Share", icon: Share2 },
  { id: "sell", label: "Sell", icon: Wallet },
  { id: "grow", label: "Grow", icon: TrendingUp },
  { id: "scale", label: "Scale", icon: Building2 },
];

const CAT_ACCENT: Record<Cat, string> = {
  create: "#8B5CF6",
  share: "#14B8A6",
  sell: "#EC4899",
  grow: "#3B82F6",
  scale: "#F7B31C",
};

type Feature = { cat: Cat; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string };

const FEATURES: Feature[] = [
  // Create
  { cat: "create", icon: CreditCard, title: "Drag & Drop Card Builder", desc: "Arrange every block visually with a live mobile preview beside you." },
  { cat: "create", icon: PanelsTopLeft, title: "30+ Ready Templates", desc: "Professional designs for every trade — switch anytime without losing content." },
  { cat: "create", icon: Palette, title: "Brand Colour Extraction", desc: "Upload your logo and the card picks up your brand colours automatically." },
  { cat: "create", icon: Crop, title: "Logo, Photo & Shape Control", desc: "Round, square or plain transparent PNG, sized exactly how you want it." },
  { cat: "create", icon: ImageIcon, title: "Custom Backgrounds", desc: "Gradients, patterns or your own image behind the card." },
  { cat: "create", icon: Sparkles, title: "AI Card Generator", desc: "Paste your website link and AI builds the whole card from it." },
  { cat: "create", icon: FileText, title: "AI Content Writer", desc: "Bio, about us, product copy, FAQs and SEO text written in seconds." },
  { cat: "create", icon: Languages, title: "Multilingual Cards", desc: "Publish the same card in more than one language." },
  { cat: "create", icon: Layers, title: "Compact or Full Layout", desc: "Collapse a long card into tap-to-open sections when you want it short." },

  // Share
  { cat: "share", icon: QrCode, title: "Permanent QR Code", desc: "Redesign the card as often as you like — anything already printed keeps working." },
  { cat: "share", icon: ScanLine, title: "NFC Card Ready", desc: "Tap-to-share on NFC cards, keychains and smart accessories." },
  { cat: "share", icon: MessageCircle, title: "WhatsApp Click-to-Chat", desc: "One tap opens a chat with your message already filled in." },
  { cat: "share", icon: Download, title: "Save Contact (vCard)", desc: "Visitors add you to their phonebook in a single tap." },
  { cat: "share", icon: FileDown, title: "Download PDF Card", desc: "A branded PDF version for email and offline sharing." },
  { cat: "share", icon: Share2, title: "Built-in Share Sheet", desc: "WhatsApp, Telegram, LinkedIn, X, email and copy-link in one place." },
  { cat: "share", icon: Globe, title: "Custom Domain", desc: "Run the card on your own domain or subdomain for a serious brand." },
  { cat: "share", icon: Link2, title: "Short Branded Link", desc: "A clean digitalcarda.in/yourname URL that is easy to say out loud." },
  { cat: "share", icon: Smartphone, title: "Add to Home Screen", desc: "Visitors can pin your card like an app on their phone." },

  // Sell
  { cat: "sell", icon: ShoppingBag, title: "Products & Services", desc: "Photos, pricing, offer price and a Buy button for everything you sell." },
  { cat: "sell", icon: Gift, title: "Offers & Deals", desc: "Time-limited offers that drop off the card by themselves once they expire." },
  { cat: "sell", icon: Wallet, title: "UPI & Wallet Payments", desc: "BHIM, Google Pay, PhonePe and Paytm shown side by side with copy buttons." },
  { cat: "sell", icon: Receipt, title: "Bank Account Details", desc: "Account, IFSC and GST laid out cleanly with one-tap copy." },
  { cat: "sell", icon: QrCode, title: "Payment QR", desc: "A scan-to-pay code sitting right inside the card." },
  { cat: "sell", icon: UserPlus, title: "Enquiry Form", desc: "Capture name, number and requirement straight into your leads list." },
  { cat: "sell", icon: CalendarClock, title: "Booking & Appointment Links", desc: "Send people to your calendar, form or WhatsApp to book you." },
  { cat: "sell", icon: ImageIcon, title: "Image Gallery", desc: "A portfolio of your work with a full-screen lightbox." },
  { cat: "sell", icon: Play, title: "Videos & Reels", desc: "Embed YouTube, Shorts and Instagram reels that play in the card." },

  // Grow
  { cat: "grow", icon: BarChart3, title: "Analytics Dashboard", desc: "Views, unique visitors, clicks, QR scans and traffic sources over time." },
  { cat: "grow", icon: Users, title: "Lead Manager", desc: "Every enquiry captured, tracked by status and exportable when you need it." },
  { cat: "grow", icon: MousePointer, title: "Click Tracking", desc: "See which button people actually press — call, WhatsApp, website or pay." },
  { cat: "grow", icon: Smartphone, title: "Device & Source Reports", desc: "Mobile versus desktop, and exactly where your visitors came from." },
  { cat: "grow", icon: Star, title: "Google Review Link", desc: "One tap to your review page — the fastest way to lift local rankings." },
  { cat: "grow", icon: MapPin, title: "Google Maps Directions", desc: "Your address opens turn-by-turn directions instantly." },
  { cat: "grow", icon: Shield, title: "SEO Settings", desc: "Custom meta title, description and slug so your card ranks on Google." },
  { cat: "grow", icon: Gift, title: "Refer & Earn", desc: "Give 15%, get 15% cash on everyone you bring in." },

  // Scale
  { cat: "scale", icon: Rocket, title: "Bulk Card Creation", desc: "Cards for your whole team in one upload, with consistent branding." },
  { cat: "scale", icon: CreditCard, title: "Multiple Cards Per Account", desc: "Run several brands, branches or profiles from one login." },
  { cat: "scale", icon: Building2, title: "Reseller & White-Label", desc: "Sell digital cards under your own brand, on your own domain." },
  { cat: "scale", icon: Users, title: "Customer Management", desc: "Assign packages, track expiry and manage every client in one place." },
  { cat: "scale", icon: BarChart3, title: "Commission Reports", desc: "See exactly what each reseller has sold and earned." },
  { cat: "scale", icon: PauseCircle, title: "Pause & Expiry Control", desc: "Switch a card off without deleting anything, and switch it back on later." },
];

/* ── Spotlights: the three that actually close the deal ────────── */
const SPOTLIGHTS = [
  {
    eyebrow: "AI",
    title: "Paste a link. Get a finished card.",
    body: "Already have a website? Drop the URL in and AI reads it — pulling your logo, brand colours, services, contact details and location, then writing the copy to match. What normally takes an evening takes about a minute.",
    points: ["Logo and brand colours detected", "Services written from your real content", "SEO title and description generated"],
    accent: "#8B5CF6",
    to: "/ai-card-generator",
    cta: "Try the AI generator",
  },
  {
    eyebrow: "QR & NFC",
    title: "Print it once. Change it forever.",
    body: "Your QR code points at a permanent address, so the design, the phone number, even the whole template can change and every card, standee and brochure you already printed keeps working. That is the thing paper can never do.",
    points: ["Reprint nothing when details change", "Works on NFC cards and tags", "Scan straight to save contact"],
    accent: "#14B8A6",
    to: "/signup",
    cta: "Get your QR code",
  },
  {
    eyebrow: "Analytics",
    title: "Know which sharing actually works.",
    body: "Most people share a card and hope. You get views, unique visitors, call and WhatsApp taps, QR scans, form submissions, device split and traffic source — so you can tell the difference between a channel that looks busy and one that brings business.",
    points: ["Every tap tracked, not just views", "Source reports per channel", "Leads captured and exportable"],
    accent: "#3B82F6",
    to: "/signup",
    cta: "Start tracking free",
  },
];

/* ── Paper vs digital: the comparison the visitor is already running ── */
const COMPARISON = [
  { label: "Updating your details", paper: "Reprint the whole batch", digital: "Edit once — live instantly" },
  { label: "Typical fate", paper: "88% binned within a week", digital: "Lives in the phone" },
  { label: "Saving your contact", paper: "Typed in by hand, often wrong", digital: "One tap to the phonebook" },
  { label: "Showing products & pricing", paper: "Not possible", digital: "Photos, prices and a Buy button" },
  { label: "Taking payments", paper: "Not possible", digital: "UPI, QR and bank details built in" },
  { label: "Knowing who saw it", paper: "No idea", digital: "Full analytics and lead capture" },
  { label: "Sharing at distance", paper: "Hand it over in person", digital: "A link, anywhere, instantly" },
  { label: "Running cost", paper: "Paper and ink, every reprint", digital: "From Rs. 99/month, no printing" },
];

const FAQS = [
  {
    q: "Do I need an app to use a digital business card?",
    a: "No. Your card is a web page, so it opens in any browser on any device. Neither you nor the person you share it with has to install anything or create an account.",
  },
  {
    q: "Can I change my card after I have printed the QR code?",
    a: "Yes. The QR points to a permanent address, so you can change the design, template, phone number, products or anything else as often as you like and every printed QR keeps working.",
  },
  {
    q: "Can I take payments through my digital card?",
    a: "Yes. You can show UPI IDs for BHIM, Google Pay, PhonePe and Paytm, add your bank account details with one-tap copy, and display a scan-to-pay QR code directly inside the card.",
  },
  {
    q: "Can I use my own domain instead of digitalcarda.in?",
    a: "Yes. You can connect your own domain or a subdomain, apply your logo and brand colours, and remove template styling so the card reads as part of your own website.",
  },
  {
    q: "Can I create cards for my whole team?",
    a: "Yes. Bulk creation builds cards for every member of your team in one go with consistent branding, and agencies can resell white-labelled cards under their own brand with commission reporting.",
  },
];

/* ── Page ──────────────────────────────────────────────────────── */
export default function Features() {
  const [cat, setCat] = useState<Cat | "all">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  const activeIdx = CATS.findIndex((c) => c.id === cat);

  // Measure the active filter so the pill can slide between labels of
  // different widths (and stay right when the viewport changes).
  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[activeIdx];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIdx]);

  // Feature-level FAQ schema, text identical to what is on screen.
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    let s = document.getElementById("dc-features-ld");
    if (!s) {
      s = document.createElement("script");
      s.id = "dc-features-ld";
      (s as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("dc-features-ld")?.remove(); };
  }, []);

  const shown = cat === "all" ? FEATURES : FEATURES.filter((f) => f.cat === cat);
  const countFor = (id: Cat | "all") => (id === "all" ? FEATURES.length : FEATURES.filter((f) => f.cat === id).length);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-[#8B5CF6]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <Reveal stagger>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
              <Sparkles size={12} className="text-[#F7B31C]" /> {FEATURES.length} features · one card
            </span>
            <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.4rem] font-extrabold text-[#0F172A] leading-[1.08] tracking-tight">
              Every Feature Your{" "}
              <span className="relative inline-block text-gradient-gold">
                Digital Business Card
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>{" "}
              Needs
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              Build it, share it, sell from it and measure it — without printing anything, and without asking anyone to install an app.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="btn-gold h-12 px-7 inline-flex items-center justify-center gap-2 text-base">
                Start 30-Day Free Trial <ArrowRight size={18} />
              </Link>
              <Link to="/digital-business-cards-templates" className="btn-navy h-12 px-7 inline-flex items-center justify-center gap-2 text-base">
                <Eye size={18} /> View Templates
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#94A3B8]">No credit card details needed to start</p>
          </Reveal>
        </div>
      </section>

      {/* ── Feature catalogue with a sliding filter ── */}
      <section className="py-16 bg-gradient-to-b from-white to-[#F8FAFC] relative" id="all-features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The full list"
            title={<>Grouped by What You <span className="text-gradient-gold">Actually Want to Do</span></>}
            subtitle="Filter by the job in front of you rather than scrolling one long wall of features."
          />

          <Reveal>
            <div className="relative flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-[#F1F5F9] ring-1 ring-[#E2E8F0] mb-10">
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 rounded-xl bg-[#0F172A] shadow-premium transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
                style={{ left: pill.left, width: pill.width }}
              />
              {CATS.map((c, i) => {
                const on = c.id === cat;
                return (
                  <button
                    key={c.id}
                    ref={(el) => { btnRefs.current[i] = el; }}
                    type="button"
                    onClick={() => setCat(c.id)}
                    aria-pressed={on}
                    className={`relative z-10 shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl text-[13px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${on ? "text-white" : "text-[#475569] hover:text-[#0F172A]"}`}
                  >
                    <c.icon size={15} className={on ? "" : "text-[#94A3B8]"} />
                    <span className="whitespace-nowrap">{c.label}</span>
                    <span className={`text-[11px] font-bold tabular-nums ${on ? "text-[#F7B31C]" : "text-[#94A3B8]"}`}>{countFor(c.id)}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* keyed so the grid re-mounts and cross-fades on every filter change */}
          <div key={cat} className="dc-swap-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((f) => {
              const accent = CAT_ACCENT[f.cat];
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FAFBFD] ring-1 ring-[#E8ECF3] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-lg hover:ring-[#F7B31C]/40"
                >
                  <span aria-hidden="true" className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `${accent}2E` }} />
                  <span className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: `${accent}18`, color: accent }}>
                    <f.icon size={19} />
                  </span>
                  <h3 className="relative text-[14.5px] font-bold text-[#0F172A] mb-1.5 leading-snug">{f.title}</h3>
                  <p className="relative text-[12.5px] text-[#64748B] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Spotlights ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Worth a closer look"
            title={<>The Three That Change <span className="text-gradient-gold">How You Work</span></>}
            subtitle="Most features are conveniences. These three change the outcome."
          />

          <div className="space-y-16 lg:space-y-24">
            {SPOTLIGHTS.map((s, i) => (
              <Reveal key={s.title}>
                <div className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: `${s.accent}16`, color: s.accent }}>
                      {s.eyebrow}
                    </span>
                    <h3 className="mt-4 text-2xl sm:text-[1.9rem] font-extrabold text-[#0F172A] tracking-tight leading-[1.2]">{s.title}</h3>
                    <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">{s.body}</p>
                    <div className="mt-6 space-y-3">
                      {s.points.map((p) => (
                        <div key={p} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${s.accent}1F`, color: s.accent }}>
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span className="text-[14px] text-[#334155] leading-relaxed">{p}</span>
                        </div>
                      ))}
                    </div>
                    <Link to={s.to} className="mt-7 inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white transition-transform hover:-translate-y-0.5" style={{ background: s.accent }}>
                      {s.cta} <ArrowRight size={15} />
                    </Link>
                  </div>

                  {/* abstract visual, tinted per spotlight */}
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[400px]">
                      <div className="absolute -inset-5 rounded-[2.2rem] blur-3xl opacity-50" style={{ background: `${s.accent}26` }} />
                      <div className="relative rounded-[1.75rem] bg-white ring-1 ring-[#E7EBF2] shadow-premium-lg p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F1F5F9]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F1F5F9]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F1F5F9]" />
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${s.accent}16`, color: s.accent }}>
                          {i === 0 ? <Sparkles size={26} /> : i === 1 ? <QrCode size={26} /> : <BarChart3 size={26} />}
                        </div>
                        <div className="space-y-2.5">
                          <div className="h-3 rounded-full" style={{ background: `${s.accent}2E`, width: "72%" }} />
                          <div className="h-2.5 rounded-full bg-[#F1F5F9]" />
                          <div className="h-2.5 rounded-full bg-[#F1F5F9] w-5/6" />
                          <div className="h-2.5 rounded-full bg-[#F1F5F9] w-2/3" />
                        </div>
                        <div className="mt-6 grid grid-cols-3 gap-2">
                          {s.points.map((p) => (
                            <span key={p} className="h-8 rounded-lg" style={{ background: `${s.accent}12` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paper vs digital ── */}
      <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute top-1/2 left-1/4 w-[420px] h-[420px] bg-[#F7B31C]/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionHeading
            eyebrow="The honest comparison"
            title={<>Paper Card vs <span className="text-gradient-gold">Digital Card</span></>}
            subtitle="The same eight things, side by side. This is the comparison you are already running."
            light
          />

          <Reveal>
            <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm overflow-hidden">
              <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-px bg-white/10">
                <div className="bg-[#0F172A] px-4 sm:px-5 py-4" />
                <div className="bg-[#0F172A] px-4 sm:px-5 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    <X size={13} /> Paper
                  </span>
                </div>
                <div className="bg-[#0F172A] px-4 sm:px-5 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#F7B31C]">
                    <Check size={13} /> DigitalCarda
                  </span>
                </div>

                {COMPARISON.map((row) => (
                  <div key={row.label} className="contents">
                    <div className="bg-[#0F172A]/70 px-4 sm:px-5 py-4">
                      <span className="text-[12.5px] font-semibold text-white leading-snug">{row.label}</span>
                    </div>
                    <div className="bg-[#0F172A]/70 px-4 sm:px-5 py-4">
                      <span className="text-[12px] text-[#94A3B8] leading-snug">{row.paper}</span>
                    </div>
                    <div className="bg-[#0F172A]/70 px-4 sm:px-5 py-4">
                      <span className="text-[12px] text-[#E2E8F0] leading-snug">{row.digital}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="text-center mt-10">
            <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center gap-2 text-base">
              Switch to a digital card <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-[#F8FAFC]" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Questions"
            title={<>Before You <span className="text-gradient-gold">Ask Us</span></>}
            subtitle="The feature questions that come up most often."
          />
          <Reveal stagger className="space-y-3">
            {FAQS.map((f, i) => {
              const on = openFaq === i;
              return (
                <div key={f.q} className={`rounded-2xl bg-white ring-1 transition-all duration-300 ${on ? "ring-[#F7B31C]/45 shadow-premium-lg" : "ring-[#E2E8F0] shadow-premium hover:ring-[#CBD5E1]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(on ? null : i)}
                    aria-expanded={on}
                    className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
                  >
                    <h3 className="flex-1 text-[14.5px] sm:text-[15px] font-bold text-[#0F172A] leading-snug">{f.q}</h3>
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
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-10 sm:p-14 text-center overflow-hidden ring-1 ring-white/10">
              <div className="absolute inset-0 bg-grid-dark opacity-25" />
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#F7B31C]/20 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl sm:text-[2.1rem] font-extrabold text-white tracking-tight">Ready to Build Your Card?</h2>
                <p className="mt-3 text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
                  Every feature on this page is included in the 30-day free trial. No credit card details needed to start.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/signup" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2 text-base">
                    Start Free Trial <ArrowRight size={17} />
                  </Link>
                  <Link to="/pricing" className="h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all">
                    See Pricing <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#F7B31C]" /> No app to install</span>
                  <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#F7B31C]" /> Works on every phone</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-[#F7B31C]" /> Live in 10 minutes</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
