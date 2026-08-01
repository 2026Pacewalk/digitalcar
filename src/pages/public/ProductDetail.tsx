import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowRight, Eye, X, ChevronRight, Zap, Share2, ShieldCheck, Smartphone, Check,
  Phone, MessageCircle, QrCode, BarChart3, Star, Contact, Images, MapPin, Globe, ChevronDown, Sparkles,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, buildCardHtml } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";
import { demoForProduct } from "@/lib/demoData";
import { logFunnel } from "@/lib/funnel";
import MockupGallery from "@/components/MockupGallery";

type Product = {
  id: number; slug: string; name: string; tagline?: string | null; description?: string | null;
  category?: string | null; styleNumber: number; price: string; salePrice?: string | null;
  currency: string; trialDays: number; primaryColor?: string | null; secondaryColor?: string | null;
  images?: string[] | null; seoTitle?: string | null; seoDescription?: string | null; status: string; isFeatured: boolean;
};

const inr = (v?: string | number | null) => "₹" + Number(v || 0).toLocaleString("en-IN");
const THUMB_W = 375, THUMB_H = 560;

function ThumbFrame({ style, primary, secondary, category, className }: { style: number; primary?: string | null; secondary?: string | null; category?: string | null; className?: string }) {
  const html = useMemo(() => {
    const demo = demoForProduct({ styleNumber: style, category });
    return buildCardThumb({ ...DEFAULT_CUSTOMER, ...demo.customer, color: primary || "#F7B31C", color2: secondary || "" } as Parameters<typeof buildCardThumb>[0], style);
  }, [style, primary, secondary, category]);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = () => setScale(el.clientWidth / THUMB_W); m();
    const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative w-full overflow-hidden bg-white ${className || ""}`} style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title="Card design" srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: THUMB_W, height: THUMB_H, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

const FEATURES = [
  { icon: Contact, label: "Save Contact (vCard)" }, { icon: Phone, label: "One-tap Call" },
  { icon: MessageCircle, label: "WhatsApp Chat" }, { icon: Globe, label: "Website & Links" },
  { icon: MapPin, label: "Google Maps Directions" }, { icon: Images, label: "Gallery & Video" },
  { icon: QrCode, label: "Scannable QR Code" }, { icon: BarChart3, label: "Visitor Analytics" },
  { icon: Star, label: "Google Reviews" }, { icon: Share2, label: "Instant Sharing" },
];
const INCLUDED = ["Your own public card URL", "Permanent QR code", "Lead / enquiry capture", "Unlimited edits — anytime", "Works on every phone, no app", "30-day free trial to start"];
const STEPS = [
  { t: "Choose", d: "Pick this design." }, { t: "Customise", d: "Add your details, logo and links." },
  { t: "Publish", d: "Go live with one tap." }, { t: "Share", d: "Send the link or QR anywhere." },
];
const FAQS = [
  { q: "Do I need to install an app?", a: "No. Your card opens in any web browser and works on every phone — nothing to download." },
  { q: "What happens after the 30-day free trial?", a: "Your card and all its content stay safely saved. Activate a plan to keep it live — you never rebuild it." },
  { q: "Can I change the design later?", a: "Yes. Switch designs anytime — your card URL and QR code stay exactly the same, so printed codes never break." },
  { q: "How do people share or save my card?", a: "Via the link, the QR code, WhatsApp, or one-tap Save Contact straight into their phonebook." },
  { q: "Is there any setup or printing cost?", a: "None. It's fully digital — instant activation, no printing, no delivery." },
];

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { data: product, isLoading } = trpc.product.bySlug.useQuery({ slug }, { enabled: !!slug });
  const { data: all = [] } = trpc.product.catalogue.useQuery();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const related = useMemo(() => {
    if (!product) return [];
    return all.filter((p) => p.slug !== product.slug)
      .sort((a) => (a.category && a.category === product.category ? -1 : 0)).slice(0, 4);
  }, [all, product]);

  useEffect(() => { if (product?.slug) logFunnel("product_view", product.slug); }, [product?.slug]);

  // Per-product SEO + structured data (genuine data only — no fake ratings).
  useEffect(() => {
    if (!product) return;
    const title = product.seoTitle || `${product.name} — DigitalCarda`;
    document.title = title;
    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr.startsWith("og") ? "property" : "name", attr); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    const desc = product.seoDescription || product.tagline || `${product.name} — a digital business card you can try free for ${product.trialDays} days.`;
    setMeta('meta[name="description"]', "description", desc);
    setMeta('meta[property="og:title"]', "og:title", title);
    setMeta('meta[property="og:description"]', "og:description", desc);

    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: product.name, description: desc,
      brand: { "@type": "Brand", name: "DigitalCarda" },
      ...(product.images?.length ? { image: product.images } : {}),
      offers: {
        "@type": "Offer", priceCurrency: product.currency || "INR",
        price: Number(product.salePrice || product.price).toFixed(2),
        availability: "https://schema.org/InStock",
        url: `https://digitalcarda.in/digital-business-cards-templates/${product.slug}`,
      },
    };
    let s = document.getElementById("pdp-ld");
    if (!s) { s = document.createElement("script"); s.id = "pdp-ld"; (s as HTMLScriptElement).type = "application/ld+json"; document.head.appendChild(s); }
    s.textContent = JSON.stringify(ld);
    return () => { document.getElementById("pdp-ld")?.remove(); };
  }, [product]);

  if (isLoading) return <div className="pt-28 pb-20 text-center text-[#64748B]">Loading…</div>;
  if (!product || product.status !== "published") return (
    <div className="pt-32 pb-24 text-center px-4">
      <p className="text-lg font-bold text-[#0F172A]">Card not available</p>
      <p className="text-sm text-[#64748B] mt-1">This design may have been unpublished.</p>
      <Link to="/digital-business-cards-templates" className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-xl gradient-gold text-[#0F172A] font-bold">Browse all cards <ArrowRight size={16} /></Link>
    </div>
  );

  const onSale = !!product.salePrice && Number(product.salePrice) < Number(product.price);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94A3B8] py-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#F7B31C]">Home</Link><ChevronRight size={13} />
          <Link to="/digital-business-cards-templates" className="hover:text-[#F7B31C]">Digital Business Cards</Link><ChevronRight size={13} />
          <span className="text-[#334155] font-medium truncate">{product.name}</span>
        </nav>

        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 pb-12">
          {/* Preview */}
          <div className="relative">
            <div className="sticky top-24 rounded-3xl bg-white border border-[#F1F5F9] shadow-premium p-5 sm:p-8">
              <div className="max-w-[300px] mx-auto rounded-2xl overflow-hidden shadow-premium-lg border border-[#E2E8F0]">
                <ThumbFrame style={product.styleNumber} primary={product.primaryColor} secondary={product.secondaryColor} category={product.category} />
              </div>
              <Link to={`/demo/${product.slug}`} className="mt-5 w-full h-11 rounded-xl border-2 border-[#0F172A] text-[#0F172A] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0F172A] hover:text-white transition-colors"><Eye size={16} /> View Live Demo</Link>
            </div>
          </div>

          {/* Details */}
          <div>
            {product.category && <p className="text-[11px] font-bold text-[#F7B31C] uppercase tracking-[0.14em]">{product.category}</p>}
            <h1 className="mt-1.5 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight text-balance">{product.name}</h1>
            {product.tagline && <p className="mt-2.5 text-[15px] text-[#475569]">{product.tagline}</p>}

            <div className="flex items-baseline gap-2.5 mt-5">
              <span className="text-3xl font-extrabold text-[#0F172A] tabular-nums">{inr(product.salePrice || product.price)}</span>
              {onSale && <span className="text-base text-[#94A3B8] line-through tabular-nums">{inr(product.price)}</span>}
              <span className="text-sm text-[#64748B]">/ year</span>
            </div>
            <span className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-bold text-[#92400E] bg-[#FEF3C7] px-3 py-1.5 rounded-full">◷ {product.trialDays}-Day Free Trial · No credit card</span>

            <ul className="mt-6 grid sm:grid-cols-2 gap-y-2.5 gap-x-4">
              {[[Zap, "Instant digital activation"], [Smartphone, "No app required"], [Share2, "Share instantly"], [ShieldCheck, "Permanent URL & QR"]].map(([Ic, t]) => {
                const I = Ic as typeof Zap;
                return <li key={t as string} className="flex items-center gap-2.5 text-[14px] text-[#334155]"><span className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0"><I size={15} className="text-[#F7B31C]" /></span>{t as string}</li>;
              })}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <Link to={`/signup?product=${encodeURIComponent(product.slug)}`} className="flex-1 h-13 py-3.5 rounded-xl gradient-gold text-[#0F172A] font-bold flex items-center justify-center gap-2 hover:shadow-gold transition-all text-[15px]">Try This Card Free <ArrowRight size={18} /></Link>
              <Link to={`/demo/${product.slug}`} className="h-13 py-3.5 px-6 rounded-xl bg-[#0F172A] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-colors text-[15px]"><Eye size={17} /> Live Demo</Link>
            </div>
            <p className="text-[12px] text-[#94A3B8] mt-3 text-center sm:text-left">Try → experience the value → keep it active. Cancel anytime during the trial.</p>
          </div>
        </div>

        {/* Template showcase — marketing mockups (movable gallery + click-to-zoom) */}
        {Array.isArray(product.images) && product.images.length > 0 && (
          <Section title="See this template in action">
            <MockupGallery images={product.images as string[]} name={product.name} />
          </Section>
        )}

        {/* About */}
        {product.description && (
          <Section title="About this card">
            <p className="text-[15px] leading-relaxed text-[#475569] max-w-3xl whitespace-pre-line">{product.description}</p>
          </Section>
        )}

        {/* Key features */}
        <Section title="Key features">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-2xl bg-white border border-[#F1F5F9] p-4 text-center shadow-premium">
                <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-2"><f.icon size={19} className="text-[#F7B31C]" /></span>
                <p className="text-[12.5px] font-semibold text-[#334155] leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* What's included */}
        <Section title="What's included">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl">
            {INCLUDED.map((i) => <div key={i} className="flex items-center gap-2.5 text-[14.5px] text-[#334155]"><span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check size={13} className="text-emerald-600" /></span>{i}</div>)}
          </div>
        </Section>

        {/* How it works */}
        <Section title="How it works">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-premium">
                <span className="w-8 h-8 rounded-lg bg-[#0F172A] text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <p className="mt-3 font-bold text-[#0F172A]">{s.t}</p>
                <p className="text-[13px] text-[#64748B] mt-0.5">{s.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section title="Frequently asked questions">
          <div className="max-w-3xl space-y-2.5">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                  <span className="text-[14.5px] font-semibold text-[#0F172A]">{f.q}</span>
                  <ChevronDown size={18} className={`text-[#94A3B8] shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                {faqOpen === i && <p className="px-5 pb-4 -mt-1 text-[14px] text-[#64748B] leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </Section>

        {/* Related */}
        {related.length > 0 && (
          <Section title="You may also like">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
              {related.map((p) => (
                <Link key={p.id} to={`/digital-business-cards-templates/${p.slug}`} className="group rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-premium hover:shadow-premium-lg hover:-translate-y-1 transition-all">
                  <ThumbFrame style={p.styleNumber} primary={p.primaryColor} secondary={p.secondaryColor} category={p.category} />
                  <div className="p-3">
                    <p className="text-[13px] font-bold text-[#0F172A] line-clamp-1">{p.name}</p>
                    <p className="text-[13px] font-extrabold text-[#0F172A] mt-0.5 tabular-nums">{inr(p.salePrice || p.price)}<span className="text-[11px] font-normal text-[#94A3B8]"> /yr</span></p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Bottom CTA */}
        <div className="rounded-3xl bg-[#0F172A] text-center px-6 py-12 my-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(247,179,28,.25), transparent)" }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F7B31C]"><Sparkles size={13} /> Ready in minutes</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">{product.name}</h2>
            <p className="mt-2 text-[#94A3B8] max-w-lg mx-auto">Start your {product.trialDays}-day free trial — no app, no printing, no credit card upfront.</p>
            <Link to={`/signup?product=${encodeURIComponent(product.slug)}`} className="mt-6 inline-flex items-center gap-2 h-12 px-7 rounded-xl gradient-gold text-[#0F172A] font-bold hover:shadow-gold transition-all">Try This Card Free <ArrowRight size={18} /></Link>
          </div>
        </div>
      </div>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-8 border-t border-[#E2E8F0]">
      <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mb-5">{title}</h2>
      {children}
    </section>
  );
}
