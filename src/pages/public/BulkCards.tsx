import { Link, useNavigate } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  Users, Building2, Briefcase, Check, Plus, Trash2, ArrowRight,
  Sparkles, Calculator, IdCard, TrendingDown, ShieldCheck, Zap, Clock,
  MessageSquare, FileSpreadsheet, X, Minus, BadgePercent, Layers,
  Phone, Mail, Globe, UploadCloud, Palette, Headphones, HelpCircle,
  Rocket, ListChecks,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Scroll-reveal + counter primitives (mirrors public/Home.tsx)
   ───────────────────────────────────────────────────────────── */
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const fallback = window.setTimeout(() => setVisible(true), 900);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { setVisible(true); window.clearTimeout(fallback); io.disconnect(); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => { window.clearTimeout(fallback); io.disconnect(); };
  }, []);
  return { ref, visible };
}

function Reveal({ children, stagger, className = "", as: Tag = "div" }: { children: ReactNode; stagger?: boolean; className?: string; as?: "div" | "section"; }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const base = stagger ? "reveal-stagger" : "reveal";
  return <Tag ref={ref as never} className={`${base} ${visible ? "is-visible" : ""} ${className}`}>{children}</Tag>;
}

function Counter({ end, duration = 2000, separator = true, decimals = 0 }: { end: number; duration?: number; separator?: boolean; decimals?: number }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVal(end); return; }
    let raf = 0; let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, end, duration]);
  const shown = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-IN");
  return <span ref={ref}>{separator || decimals ? shown : String(Math.round(val))}</span>;
}

function SectionHeading({ eyebrow, title, subtitle, light }: { eyebrow?: string; title: ReactNode; subtitle?: string; light?: boolean }) {
  return (
    <Reveal className="text-center max-w-3xl mx-auto mb-12">
      {eyebrow && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${light ? "bg-white/10 text-[#F7B31C] ring-1 ring-white/10" : "bg-[#FEF3C7] text-[#92400E]"}`}>
          <Sparkles size={12} /> {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl lg:text-[2.7rem] font-extrabold tracking-tight ${light ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-base leading-relaxed ${light ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{subtitle}</p>}
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────
   Bulk pricing config
   ───────────────────────────────────────────────────────────── */
const BASE_PRICE = 999; // single-card yearly price (Starter), used to compute savings
const TIERS = [
  { min: 10, max: 24, price: 799 },
  { min: 25, max: 49, price: 699 },
  { min: 50, max: 99, price: 599 },
  { min: 100, max: 249, price: 499 },
  { min: 250, max: Infinity, price: 399 },
];
const GST_RATE = 0.18;
const MIN_QTY = 10;

const PACKAGES = [
  {
    name: "Team", icon: Users, qty: 10, pricePerCard: 799, tagline: "Small teams & startups",
    color: "from-[#14B8A6] to-[#0D9488]", accent: "#14B8A6", popular: false,
    features: ["10 Digital Cards", "Shared Team Template", "QR Code for each card", "WhatsApp & Call buttons", "Basic Lead Tracking", "Email support"],
  },
  {
    name: "Business", icon: Briefcase, qty: 25, pricePerCard: 699, tagline: "Growing companies & agencies",
    color: "from-[#F7B31C] to-[#D97706]", accent: "#F7B31C", popular: true,
    features: ["25 Digital Cards", "Custom Branded Template", "Company logo on all cards", "Products & Services", "Advanced Analytics", "Bulk QR download", "Priority support"],
  },
  {
    name: "Enterprise", icon: Building2, qty: 100, pricePerCard: 499, tagline: "Large orgs & partners",
    color: "from-[#0F172A] to-[#334155]", accent: "#6366F1", popular: false,
    features: ["100 Digital Cards", "White-label branding", "Custom domain", "Dedicated onboarding", "Team roles & access", "CRM / CSV export", "Dedicated account manager"],
  },
];

const perks = [
  { icon: TrendingDown, accent: "#14B8A6", title: "Volume Discounts", desc: "The more cards you order, the lower the per-card price — up to 58% off." },
  { icon: Zap, accent: "#F7B31C", title: "Bulk Creation", desc: "Add all your staff or partners in one go — no building cards one by one." },
  { icon: ShieldCheck, accent: "#8B5CF6", title: "Consistent Branding", desc: "Every card shares your company logo, colors, and template automatically." },
  { icon: Clock, accent: "#3B82F6", title: "Ready in 48 Hours", desc: "Submit your list and get all cards live within two business days." },
];

const steps = [
  { icon: ListChecks, num: 1, title: "Pick Quantity & Package", desc: "Choose a bundle or set a custom quantity — volume pricing applies instantly." },
  { icon: UploadCloud, num: 2, title: "Add Your Team", desc: "Enter or bulk-paste your staff and partner details in one simple list." },
  { icon: Rocket, num: 3, title: "We Build & Publish", desc: "Our team designs every card with your branding and makes them live in 48 hours." },
];

const bulkFaqs = [
  { q: "What is the minimum order for bulk pricing?", a: "Bulk pricing starts from 10 cards. Below that, the standard single-card plan of Rs. 999/year applies. Every bulk card is a yearly plan — the more cards you add, the lower the per-card price." },
  { q: "Can each card have different details?", a: "Yes. Every card is personalized with the individual's name, designation, phone, email, and photo — while sharing your company's branding and template." },
  { q: "Do I have to enter everyone's details right now?", a: "No. You can reserve the quantity now and share the full staff list later. Only names are needed to lock in a card." },
  { q: "How is billing handled for bulk orders?", a: "You get a single consolidated invoice for the whole order. No payment is taken upfront — our team confirms your requirement and shares a final invoice first." },
  { q: "Can I add more cards later?", a: "Absolutely. You can top up your order at any time and the same volume tier pricing applies to additional cards." },
  { q: "Is white-label / reseller branding available?", a: "Yes, on the Enterprise package and above. You can fully white-label the cards with your own domain and branding for partners or clients." },
];

/* ─────────────────────────────────────────────────────────────
   Helpers + types
   ───────────────────────────────────────────────────────────── */
type Member = { id: string; name: string; designation: string; phone: string; email: string };
let idCounter = 0;
const newMember = (): Member => ({ id: `m-${++idCounter}`, name: "", designation: "", phone: "", email: "" });
const inr = (n: number) => "Rs. " + n.toLocaleString("en-IN");
const resolveTier = (qty: number) => TIERS.find((t) => qty >= t.min && qty <= t.max) ?? TIERS[0];
const pct = (price: number) => Math.round(((BASE_PRICE - price) / BASE_PRICE) * 100);

/* ─────────────────────────────────────────────────────────────
   Hero visual — a fanned stack of team cards
   ───────────────────────────────────────────────────────────── */
const HERO_TEAM = [
  { name: "AARAV SHAH", role: "SALES HEAD", accent: "#F7B31C" },
  { name: "MEERA IYER", role: "MARKETING", accent: "#14B8A6" },
  { name: "ROHAN DESAI", role: "CONSULTANT", accent: "#8B5CF6" },
];

function TeamStackVisual() {
  return (
    <div className="relative flex justify-center items-center min-h-[380px]">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[360px] rounded-[48px] bg-gradient-to-b from-[#F7B31C]/25 via-[#F7B31C]/5 to-transparent blur-2xl" />
      </div>

      {HERO_TEAM.map((m, i) => (
        <div
          key={i}
          className="absolute w-[210px] bg-white rounded-3xl shadow-premium-lg border border-[#F1F5F9] ring-1 ring-black/5 overflow-hidden animate-float"
          style={{
            transform: `translateX(${(i - 1) * 62}px) translateY(${Math.abs(i - 1) * 26}px) rotate(${(i - 1) * 7}deg)`,
            zIndex: i === 1 ? 30 : 10,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div className="h-1.5" style={{ background: m.accent }} />
          <div className="p-4">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-2.5 flex items-center justify-center text-white font-bold" style={{ background: m.accent }}>
              {m.name.charAt(0)}
            </div>
            <p className="text-center text-[11px] font-bold text-[#0F172A] tracking-wide">{m.name}</p>
            <p className="text-center text-[9px] text-[#94A3B8] font-medium mt-0.5">{m.role}</p>
            <div className="mt-3 space-y-1.5">
              {[Phone, Mail, Globe].map((Icon, k) => (
                <div key={k} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2 py-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${m.accent}1A` }}>
                    <Icon size={10} style={{ color: m.accent }} />
                  </span>
                  <span className="h-1.5 rounded-full bg-[#E2E8F0]" style={{ width: `${60 - k * 8}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <div className="h-6 rounded-lg flex items-center justify-center" style={{ background: m.accent }}>
                <Phone size={11} className="text-white" />
              </div>
              <div className="h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                <MessageSquare size={11} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Floating chips */}
      <div className="hidden sm:flex absolute -left-2 top-4 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] z-40 animate-float">
        <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center"><Layers size={15} className="text-[#16A34A]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">50 Cards</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">One order</p>
        </div>
      </div>
      <div className="hidden sm:flex absolute -right-2 bottom-6 items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-premium-lg border border-[#F1F5F9] z-40 animate-float" style={{ animationDelay: "1.2s" }}>
        <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><TrendingDown size={15} className="text-[#F7B31C]" /></div>
        <div>
          <p className="text-[10px] font-bold text-[#0F172A] leading-none">Save 42%</p>
          <p className="text-[9px] text-[#94A3B8] mt-0.5">Bulk price</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */
export default function BulkCards() {
  const [quantity, setQuantity] = useState(25);
  const [members, setMembers] = useState<Member[]>([newMember(), newMember(), newMember()]);
  const [company, setCompany] = useState({ name: "", email: "", phone: "" });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const orderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const bulkCreate = trpc.card.bulkCreate.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.count} card${res.count !== 1 ? "s" : ""} created! Taking you to your cards…`);
      navigate("/dashboard/cards");
    },
    onError: (err) => toast.error(err.message || "Could not create cards. Please try again."),
  });
  const bulkOrder = trpc.bulkOrder.create.useMutation({
    onSuccess: (r) => {
      if ((r as { ok?: boolean; error?: string })?.ok === false) { toast.error((r as { error?: string }).error || "Add a phone or email so we can reach you."); return; }
      toast.success(`Bulk request for ${billingQty} cards sent! Our team will contact you within 24 hours.`);
    },
    onError: () => toast.error("Could not send your request — please try again."),
  });

  const filledMembers = members.filter((m) => m.name.trim());
  const billingQty = Math.max(quantity, filledMembers.length, MIN_QTY);

  const summary = useMemo(() => {
    const tier = resolveTier(billingQty);
    const perCard = tier.price;
    const subtotal = perCard * billingQty;
    const gst = Math.round(subtotal * GST_RATE);
    const total = subtotal + gst;
    const savings = (BASE_PRICE - perCard) * billingQty;
    return { perCard, subtotal, gst, total, savings, discountPct: pct(perCard), tier };
  }, [billingQty]);

  const scrollToOrder = () => orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const choosePackage = (qty: number) => { setQuantity(qty); scrollToOrder(); };

  const updateMember = (id: string, key: keyof Member, val: string) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [key]: val } : m)));
  const addMember = () => setMembers((prev) => [...prev, newMember()]);
  const removeMember = (id: string) => setMembers((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));

  const applyPaste = () => {
    const rows = pasteText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name = "", designation = "", phone = "", email = ""] = line.split(",").map((s) => s.trim());
      return { ...newMember(), name, designation, phone, email };
    });
    if (!rows.length) { toast.error("Nothing to import. Add one person per line."); return; }
    setMembers(rows);
    setQuantity((q) => Math.max(q, rows.length));
    setPasteOpen(false); setPasteText("");
    toast.success(`${rows.length} member${rows.length > 1 ? "s" : ""} imported`);
  };

  const submitQuote = () => {
    if (!company.name || !company.phone) { toast.error("Please add your company name and contact number."); return; }
    bulkOrder.mutate({
      company: company.name.trim() || undefined,
      phone: company.phone.trim() || undefined,
      email: company.email.trim() || undefined,
      quantity: billingQty,
      pricePerCard: summary.perCard,
      totalEstimate: Math.round(summary.total),
      packageName: "Custom",
    });
  };

  // Logged-in visitors create real cards; guests submit a sales quote.
  const createCards = () => {
    const payload = filledMembers.map((m) => ({
      name: m.name.trim(),
      designation: m.designation.trim() || undefined,
      phone: m.phone.trim() || undefined,
      email: m.email.trim() || undefined,
    }));
    if (!payload.length) {
      toast.error("Add at least one team member's name below to create cards.");
      scrollToOrder();
      return;
    }
    bulkCreate.mutate({ companyName: company.name.trim() || undefined, members: payload });
  };

  const primaryAction = isAuthenticated ? createCards : submitQuote;

  const waMessage = encodeURIComponent(
    `Hi DigitalCarda, I'd like a bulk order:\nCompany: ${company.name || "-"}\nCards: ${billingQty}\nPer card: ${inr(summary.perCard)}\nTotal (incl. GST): ${inr(summary.total)}`
  );

  return (
    <div className="overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#F7B31C]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-aurora-drift" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#14B8A6]/12 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-aurora-drift" style={{ animationDelay: "3s" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <Reveal stagger>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-[#92400E] shadow-premium ring-1 ring-[#FEF3C7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] animate-pulse" /> Bulk Cards for Teams · Volume Pricing
              </span>
              <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.6rem] font-extrabold text-[#0F172A] leading-[1.06] tracking-tight">
                Digital Cards for Your{" "}
                <span className="relative inline-block text-gradient-gold">
                  Entire Team
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" preserveAspectRatio="none">
                    <path d="M2 7c60-5 120-5 180-2s90 3 116-1" stroke="#F7B31C" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-lg">
                Create smart digital business cards in bulk for your staff, partners, and resellers — with consistent branding and volume pricing that gets cheaper the more you add.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button onClick={scrollToOrder} className="btn-gold h-12 px-7 flex items-center justify-center gap-2 text-base">
                  Build Your Bulk Order <ArrowRight size={18} />
                </button>
                <a href="#packages" className="btn-navy h-12 px-7 flex items-center justify-center gap-2 text-base">
                  <BadgePercent size={18} /> View Bulk Pricing
                </a>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                {[
                  { end: 60, suffix: "%", label: "Max discount", dec: 0 },
                  { end: 48, suffix: "h", label: "Turnaround", dec: 0 },
                  { end: 10, suffix: "+", label: "Min. per order", dec: 0 },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white shadow-premium border border-[#F1F5F9] px-3 py-3 text-center">
                    <p className="text-xl font-extrabold text-[#0F172A]"><Counter end={s.end} duration={1800} /><span className="text-gradient-gold">{s.suffix}</span></p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal className="lg:pl-6">
              <TeamStackVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] card-hover">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 ring-1 ring-black/[0.03]" style={{ backgroundColor: `${p.accent}1A`, color: p.accent }}>
                  <p.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{p.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────────────────── */}
      <section id="packages" className="scroll-mt-24 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Bulk Packages" title="Pick a Ready-Made Bundle" subtitle="Curated packages for common team sizes. Need a different quantity? Use the live calculator below." />
          <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PACKAGES.map((pkg) => {
              const total = pkg.pricePerCard * pkg.qty;
              const save = (BASE_PRICE - pkg.pricePerCard) * pkg.qty;
              return (
                <div key={pkg.name} className={`relative flex flex-col rounded-3xl bg-white ring-1 shadow-premium overflow-hidden card-hover ${pkg.popular ? "ring-2 ring-[#F7B31C]" : "ring-black/5"}`}>
                  {pkg.popular && (
                    <span className="absolute top-4 right-4 z-10 px-2.5 py-1 gradient-gold text-[#0F172A] text-[10px] font-bold rounded-full shadow">MOST POPULAR</span>
                  )}
                  <div className={`relative bg-gradient-to-r ${pkg.color} px-6 py-5`}>
                    <div className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center">
                        <pkg.icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-none">{pkg.name}</h3>
                        <p className="text-[11px] text-white/80 mt-1">{pkg.tagline}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-extrabold text-[#0F172A]">{inr(pkg.pricePerCard)}</span>
                      <span className="text-sm text-[#94A3B8] mb-1">/ card / yr</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 mb-4">{pkg.qty} cards · <span className="font-semibold text-[#0F172A]">{inr(total)}</span> / year</p>
                    <span className="inline-flex items-center gap-1 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#166534] mb-5">
                      <TrendingDown size={12} /> Save {inr(save)} · {pct(pkg.pricePerCard)}% off
                    </span>
                    <div className="space-y-2.5 mb-6 flex-1">
                      {pkg.features.map((f, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs text-[#64748B]">
                          <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => choosePackage(pkg.qty)} className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${pkg.popular ? "gradient-gold text-[#0F172A] hover:shadow-gold" : "border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"}`}>
                      Choose {pkg.name} <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* ── Volume tiers (dark band) ─────────────────────────── */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="gradient-navy ring-1 ring-white/5 rounded-3xl p-8 sm:p-10 shadow-premium-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-dark opacity-30" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <BadgePercent size={18} className="text-[#F7B31C]" />
                <h3 className="text-lg font-semibold text-white">Volume Pricing — the more you add, the less you pay</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {TIERS.map((t, i) => (
                  <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center hover:border-[#F7B31C]/40 transition-colors">
                    <p className="text-[11px] text-[#94A3B8] mb-1">{t.max === Infinity ? `${t.min}+ cards` : `${t.min}–${t.max} cards`}</p>
                    <p className="text-2xl font-extrabold text-white">{inr(t.price)}</p>
                    <p className="text-[11px] text-[#F7B31C] font-semibold mt-1">{pct(t.price)}% off</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#64748B] mt-4">A single card is {inr(BASE_PRICE)}/year. Bulk pricing (per card, billed yearly) applies automatically from {MIN_QTY} cards. Prices exclusive of 18% GST.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Bulk builder ─────────────────────────────────────── */}
      <section ref={orderRef} className="scroll-mt-24 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Bulk Builder" title="Build Your Bulk Order" subtitle="Set your quantity, add your team members, and watch pricing update live." />

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quantity calculator */}
              <Reveal className="bg-white rounded-3xl p-7 shadow-premium border border-[#F1F5F9]">
                <div className="flex items-center gap-2 mb-5">
                  <Calculator size={18} className="text-[#F7B31C]" />
                  <h3 className="text-base font-semibold text-[#0F172A]">How many cards do you need?</h3>
                </div>
                <div className="flex items-center gap-4 mb-5">
                  <button onClick={() => setQuantity((q) => Math.max(MIN_QTY, q - 5))} className="w-11 h-11 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] transition-colors active:scale-95">
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-4xl font-extrabold text-[#0F172A] tabular-nums">{billingQty}</span>
                    <span className="text-sm text-[#94A3B8] ml-2">cards</span>
                  </div>
                  <button onClick={() => setQuantity((q) => q + 5)} className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center text-[#0F172A] hover:shadow-gold transition-all active:scale-95">
                    <Plus size={18} />
                  </button>
                </div>
                <input type="range" min={MIN_QTY} max={300} step={5} value={Math.min(quantity, 300)} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full accent-[#F7B31C] cursor-pointer" />
                <div className="flex justify-between text-[11px] text-[#94A3B8] mt-1.5"><span>{MIN_QTY}</span><span>150</span><span>300+</span></div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[10, 25, 50, 100, 250].map((n) => (
                    <button key={n} onClick={() => setQuantity(n)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${billingQty === n ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                      {n} cards
                    </button>
                  ))}
                </div>
                {filledMembers.length > quantity && (
                  <p className="mt-4 text-[11px] text-[#92400E] bg-[#FEF3C7] rounded-lg px-3 py-2">You added {filledMembers.length} members, so the quantity was raised to match.</p>
                )}
              </Reveal>

              {/* Members table */}
              <Reveal className="bg-white rounded-3xl p-7 shadow-premium border border-[#F1F5F9]">
                <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <IdCard size={18} className="text-[#F7B31C]" />
                    <h3 className="text-base font-semibold text-[#0F172A]">Team / Partner Details</h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">{filledMembers.length} added</span>
                  </div>
                  <button onClick={() => setPasteOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors">
                    <FileSpreadsheet size={14} className="text-[#F7B31C]" /> Bulk paste
                  </button>
                </div>

                {pasteOpen && (
                  <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-[#0F172A]">One person per line: <span className="text-[#94A3B8]">Name, Designation, Phone, Email</span></p>
                      <button onClick={() => setPasteOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={15} /></button>
                    </div>
                    <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4}
                      placeholder={"Rahul Sharma, Sales Manager, +91 XXXXX XXXXX, rahul@company.com\nPriya Nair, Designer, +91 XXXXX XXXXX, priya@company.com"}
                      className="input-premium w-full resize-none font-mono text-xs" />
                    <div className="flex justify-end mt-3">
                      <button onClick={applyPaste} className="btn-gold h-9 px-4 inline-flex items-center gap-1.5"><Plus size={14} /> Import list</button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 px-1">
                    {["Name", "Designation", "Phone", "Email", ""].map((h, i) => (
                      <span key={i} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{h}</span>
                    ))}
                  </div>
                  {members.map((m, idx) => (
                    <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 items-center">
                      <input value={m.name} onChange={(e) => updateMember(m.id, "name", e.target.value)} placeholder={`Member ${idx + 1} name`} className="input-premium w-full" />
                      <input value={m.designation} onChange={(e) => updateMember(m.id, "designation", e.target.value)} placeholder="Designation" className="input-premium w-full" />
                      <input value={m.phone} onChange={(e) => updateMember(m.id, "phone", e.target.value)} placeholder="Phone" className="input-premium w-full" />
                      <div className="flex items-center gap-2">
                        <input value={m.email} onChange={(e) => updateMember(m.id, "email", e.target.value)} placeholder="Email" type="email" className="input-premium w-full" />
                        <button onClick={() => removeMember(m.id)} aria-label="Remove member" className="w-9 h-9 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={addMember} className="mt-4 w-full h-11 rounded-xl border border-dashed border-[#CBD5E1] text-sm font-semibold text-[#64748B] hover:border-[#F7B31C] hover:text-[#0F172A] hover:bg-[#FEF3C7]/30 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} /> Add another member
                </button>
                <p className="text-[11px] text-[#94A3B8] mt-3">Tip: You don't have to enter everyone now — order {billingQty} cards and share details later. Only names are required to reserve a card.</p>
              </Reveal>

              {/* Company details */}
              <Reveal className="bg-white rounded-3xl p-7 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-base font-semibold text-[#0F172A] mb-5 flex items-center gap-2"><Building2 size={18} className="text-[#F7B31C]" /> Your Company Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Company Name *</label>
                    <input value={company.name} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} placeholder="Your company" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Contact Number *</label>
                    <input value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Work Email</label>
                    <input value={company.email} onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))} placeholder="you@company.com" type="email" className="input-premium w-full" />
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Sticky summary */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="bg-white rounded-3xl p-7 shadow-premium-lg border border-[#F1F5F9]">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={18} className="text-[#F7B31C]" />
                    <h3 className="text-base font-semibold text-[#0F172A]">Order Summary</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex items-center justify-between"><span className="text-[#64748B]">Quantity</span><span className="font-semibold text-[#0F172A]">{billingQty} cards</span></div>
                    <div className="flex items-center justify-between"><span className="text-[#64748B]">Price per card / yr</span><span className="font-semibold text-[#0F172A]">{inr(summary.perCard)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[#64748B]">Subtotal / year</span><span className="font-semibold text-[#0F172A]">{inr(summary.subtotal)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[#64748B]">GST (18%)</span><span className="font-semibold text-[#0F172A]">{inr(summary.gst)}</span></div>
                    <div className="border-t border-dashed border-[#E2E8F0] pt-3.5 flex items-center justify-between">
                      <span className="text-[#0F172A] font-semibold">Total</span>
                      <span className="text-2xl font-extrabold text-[#0F172A]">{inr(summary.total)}</span>
                    </div>
                  </div>
                  {summary.savings > 0 && (
                    <div className="mt-4 rounded-2xl bg-[#DCFCE7] px-4 py-3 flex items-center gap-2.5">
                      <TrendingDown size={18} className="text-[#166534] shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-[#166534]">You save {inr(summary.savings)}</p>
                        <p className="text-[11px] text-[#15803D]">{summary.discountPct}% off vs. single cards ({inr(BASE_PRICE)}/yr each)</p>
                      </div>
                    </div>
                  )}
                  <button onClick={primaryAction} disabled={bulkCreate.isPending} className="mt-5 w-full h-12 gradient-gold text-[#0F172A] rounded-2xl font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
                    {isAuthenticated ? (
                      bulkCreate.isPending
                        ? <><span className="w-4 h-4 border-2 border-[#0F172A]/40 border-t-[#0F172A] rounded-full animate-spin" /> Creating…</>
                        : <>Create My Team Cards <ArrowRight size={16} /></>
                    ) : (
                      <>Request Bulk Quote <ArrowRight size={16} /></>
                    )}
                  </button>
                  <a href={`https://wa.me/919517722444?text=${waMessage}`} target="_blank" rel="noreferrer" className="mt-3 w-full h-11 rounded-2xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-[0.98]">
                    <MessageSquare size={16} /> Discuss on WhatsApp
                  </a>
                  {isAuthenticated ? (
                    <p className="text-[11px] text-[#94A3B8] text-center mt-4 leading-relaxed">Creates a personalized draft card for each member you added above — edit them anytime in your dashboard.</p>
                  ) : (
                    <p className="text-[11px] text-[#94A3B8] text-center mt-4 leading-relaxed">No payment now. <Link to="/login" className="text-[#F7B31C] font-medium hover:underline">Sign in</Link> to create your cards instantly, or request a quote and our team will follow up.</p>
                  )}
                </div>

                {/* Trust mini-card */}
                <div className="bg-white rounded-3xl p-5 shadow-premium border border-[#F1F5F9] space-y-3">
                  {[
                    { icon: Palette, text: "Consistent branding on every card" },
                    { icon: ShieldCheck, text: "Secure & GST-compliant invoicing" },
                    { icon: Headphones, text: "Dedicated onboarding support" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><r.icon size={15} className="text-[#F7B31C]" /></span>
                      <span className="text-xs text-[#475569]">{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How bulk works ───────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#F7B31C] via-[#D97706] to-[#F7B31C] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F172A]/10 text-[#0F172A] mb-3">How bulk ordering works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">From List to Live in 3 Steps</h2>
          </div>
          <Reveal stagger className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/30" />
            {steps.map((s) => (
              <div key={s.num} className="text-center relative z-10">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                    <s.icon size={30} className="text-[#D97706]" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#0F172A] border-2 border-[#F7B31C] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F7B31C]">{s.num}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </Reveal>
          <div className="text-center mt-12">
            <button onClick={scrollToOrder} className="inline-flex items-center justify-center gap-2 h-12 px-10 bg-[#0F172A] text-white rounded-2xl text-sm font-semibold hover:bg-[#1E293B] transition-all hover:shadow-lg active:scale-[0.98]">
              Start Your Bulk Order <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Bulk Order Questions" subtitle="Everything you need to know about ordering digital cards for your team." />
          <Reveal stagger className="space-y-3">
            {bulkFaqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-medium text-[#0F172A]">{faq.q}</span>
                  <HelpCircle size={16} className={`text-[#94A3B8] transition-transform shrink-0 ml-3 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-5"><p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p></div>}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────── */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center gradient-navy ring-1 ring-white/5 rounded-3xl p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-dark opacity-30" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#F7B31C]/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">Need more than 250 cards or a custom plan?</h2>
              <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Custom enterprise pricing, dedicated onboarding, and white-label branding for large teams and reseller partners.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/contact" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">Talk to Sales <ArrowRight size={16} /></Link>
                <button onClick={scrollToOrder} className="h-12 px-8 inline-flex items-center gap-2 text-sm font-medium text-[#CBD5E1] border border-white/20 rounded-2xl hover:bg-white/5 transition-all">
                  <Calculator size={16} /> Use the Calculator
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
