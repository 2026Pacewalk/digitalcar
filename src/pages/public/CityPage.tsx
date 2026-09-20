/**
 * City-level landing page for /digital-visiting-card/:slug.
 *
 * One page per Tier 1/2 Indian city, driven by src/data/cities.ts. Purpose is
 * pure long-tail organic capture for queries like "digital visiting card in
 * Mumbai" — the SEO table already has one entry per city, so PublicLayout
 * fills the <title>, <meta> and OG tags from src/lib/publicSeo.ts.
 *
 * The page renders a Service + FAQPage JSON-LD block that names the city, so
 * Google, ChatGPT and Perplexity have a citeable local answer.
 */
import { Link, useParams, Navigate } from "react-router";
import { CITIES, getCity } from "@/data/cities";
import { ArrowRight, MessageCircle, MapPin, Check } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";

const SIGNUP = "/signup?promo=FREE30D";
const WA = "https://wa.me/919517722444?text=Hi%20DigitalCarda";

export default function CityPage() {
  const { slug = "" } = useParams();
  const city = getCity(slug);
  if (!city) return <Navigate to="/digital-business-cards-templates" replace />;

  const url = `https://digitalcarda.in/digital-visiting-card/${city.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
          { "@type": "ListItem", position: 2, name: city.name, item: url },
        ],
      },
      {
        "@type": "Service",
        name: `Digital Visiting Card in ${city.name}`,
        provider: { "@type": "Organization", name: "DigitalCarda", url: "https://digitalcarda.in/" },
        areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "State", name: city.state } },
        serviceType: "Digital Business Card",
        offers: { "@type": "Offer", price: "99", priceCurrency: "INR", url: "https://digitalcarda.in/pricing" },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Where can I make a digital visiting card in ${city.name}?`,
            acceptedAnswer: { "@type": "Answer", text: `DigitalCarda serves every profession in ${city.name}. The card is created online in about two minutes and shared by QR, WhatsApp or NFC tap — nothing to visit.` },
          },
          {
            "@type": "Question",
            name: `How much does a digital visiting card cost in ${city.name}?`,
            acceptedAnswer: { "@type": "Answer", text: `Plans start at ₹99/month with a 30-day free trial. NFC printed cards are ₹499 with free delivery to ${city.name}.` },
          },
          {
            "@type": "Question",
            name: `Do you deliver NFC cards to ${city.name}?`,
            acceptedAnswer: { "@type": "Answer", text: `Yes — free NFC card delivery to every serviceable pin code in ${city.name}.` },
          },
          {
            "@type": "Question",
            name: `Can the card be in Hindi or ${city.localLanguage}?`,
            acceptedAnswer: { "@type": "Answer", text: `Yes. You can write your card in any language — put your details in English, Hindi or ${city.localLanguage}, whichever your customers read.` },
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-[#64748B]">
        <Link to="/" className="hover:text-[#0F172A]">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-[#0F172A]">Digital Visiting Card in {city.name}</span>
      </nav>

      <h1 className="mt-5 font-display text-[2.15rem] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] sm:text-5xl">
        Digital Visiting Card in {city.name}
      </h1>

      {/* AEO answer block */}
      <div className="mt-5 rounded-xl bg-white/70 ring-1 ring-[#E2E8F0] px-4 py-3 max-w-2xl text-[15px] leading-relaxed text-[#334155]">
        <strong className="text-[#0F172A]">Quick answer:</strong> A digital visiting card in {city.name} is a shareable link and QR code that replaces printed cards for {city.name}-based professionals. DigitalCarda plans start at <strong>₹99/month</strong> with a <strong>30-day free trial</strong> and free NFC card delivery to {city.name}. Popular with {city.industries}.
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link to={SIGNUP} className="btn-gold h-12 px-6 inline-flex items-center justify-center gap-2">
          Start 30-day free trial <ArrowRight size={16} />
        </Link>
        <a href={WA} target="_blank" rel="noreferrer" className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white ring-1 ring-[#E2E8F0] text-[15px] font-semibold text-[#0F172A]">
          <MessageCircle size={17} className="text-[#25D366]" /> Ask on WhatsApp
        </a>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#0F172A]">Why professionals in {city.name} switch to digital visiting cards</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[#475569]">{city.context}</p>
        <ul className="mt-5 space-y-2 text-[15px] text-[#334155]">
          <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#F7B31C]" /> Update your card whenever your office in {city.locale1} or {city.locale2} moves — printed cards can't do that.</li>
          <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#F7B31C]" /> Share on WhatsApp Business — the default channel for enquiries in {city.name}.</li>
          <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#F7B31C]" /> Accept UPI payments straight from the card — no card machine, no cash.</li>
          <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#F7B31C]" /> Cards support English, Hindi and {city.localLanguage} — reach every customer segment in {city.name}.</li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#0F172A]">Popular with these professions in {city.name}</h2>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[15px]">
          <li><Link to="/industries/doctors" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Doctors and clinics in {city.name}</Link></li>
          <li><Link to="/industries/real-estate" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Real estate agents in {city.name}</Link></li>
          <li><Link to="/industries/advocates" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Advocates in {city.name}</Link></li>
          <li><Link to="/industries/beauty-parlours" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Salons in {city.name}</Link></li>
          <li><Link to="/industries/jewellers" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Jewellery shops in {city.name}</Link></li>
          <li><Link to="/industries/restaurants" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Restaurants and cafes in {city.name}</Link></li>
          <li><Link to="/industries/photographers" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Photographers in {city.name}</Link></li>
          <li><Link to="/industries/consultants" className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">Consultants in {city.name}</Link></li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#0F172A]">How to make your digital visiting card ({city.name})</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-[15px] text-[#334155]">
          <li>Pick from 50+ card templates.</li>
          <li>Add your details, services, WhatsApp number and UPI ID.</li>
          <li>Publish. Get a permanent link and QR code — printable on your existing card, banner or NFC card.</li>
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#0F172A]">FAQs — digital business cards in {city.name}</h2>
        <div className="mt-4 space-y-2">
          <details className="rounded-lg bg-white ring-1 ring-[#E2E8F0] p-4">
            <summary className="cursor-pointer font-semibold text-[#0F172A]">Where can I make a digital visiting card in {city.name}?</summary>
            <p className="mt-2 text-[14.5px] text-[#475569]">Online in about two minutes at DigitalCarda — nothing to visit. Shared by QR, WhatsApp or NFC tap.</p>
          </details>
          <details className="rounded-lg bg-white ring-1 ring-[#E2E8F0] p-4">
            <summary className="cursor-pointer font-semibold text-[#0F172A]">How much does a digital visiting card cost in {city.name}?</summary>
            <p className="mt-2 text-[14.5px] text-[#475569]">Plans start at ₹99/month, 30-day free trial, no card details. NFC cards ₹499 with free delivery to {city.name}.</p>
          </details>
          <details className="rounded-lg bg-white ring-1 ring-[#E2E8F0] p-4">
            <summary className="cursor-pointer font-semibold text-[#0F172A]">Do you deliver NFC business cards to {city.name}?</summary>
            <p className="mt-2 text-[14.5px] text-[#475569]">Yes — free NFC card delivery to every pin code in {city.name}, printed on both sides.</p>
          </details>
          <details className="rounded-lg bg-white ring-1 ring-[#E2E8F0] p-4">
            <summary className="cursor-pointer font-semibold text-[#0F172A]">Can the card be in Hindi or {city.localLanguage}?</summary>
            <p className="mt-2 text-[14.5px] text-[#475569]">Yes. You can write your card in any language — put your details in English, Hindi or {city.localLanguage}, whichever your customers read.</p>
          </details>
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-[#0F172A] p-6 text-white sm:p-8">
        <h2 className="text-2xl font-bold">Your card, live before your chai gets cold</h2>
        <p className="mt-2 text-white/80">30 days free · No card details · Free NFC delivery to {city.name}.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link to={SIGNUP} className="btn-gold h-12 px-6 inline-flex items-center justify-center gap-2">Create my card free</Link>
          <a href={WA} target="_blank" rel="noreferrer" className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white ring-1 ring-white/20 font-semibold">
            <MessageCircle size={17} /> Chat on WhatsApp
          </a>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-bold text-[#0F172A]">Digital business cards in other Indian cities</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-[#334155]">
          {CITIES.filter((c) => c.slug !== city.slug).slice(0, 12).map((c) => (
            <li key={c.slug}>
              <Link to={`/digital-visiting-card/${c.slug}`} className="inline-flex items-center gap-1 hover:text-[#0F172A]">
                <MapPin size={13} /> {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
