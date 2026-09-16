/*
 * /about — who makes DigitalCarda, and how the blog guides are written.
 *
 * Google's helpful-content guidance asks that readers can see who is behind a
 * site's content and how it is produced ("Who, How and Why"). Article bylines
 * and the BlogPosting author in structured data point here.
 */
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, BookOpen, FileSearch, Mail, MessageCircle, Phone, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { CONTACT } from "@/lib/publicNav";

const ABOUT_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://digitalcarda.in/about#page",
  url: "https://digitalcarda.in/about",
  name: "About DigitalCarda",
  inLanguage: "en-IN",
  about: { "@id": "https://digitalcarda.in/#organization" },
};

const WHAT_WE_MAKE = [
  { title: "Digital visiting cards", text: "50+ designs with a QR code, Call, WhatsApp and Save Contact buttons, an enquiry form, UPI details, Google reviews and visit analytics." },
  { title: "NFC cards and standees", text: "A printed PVC card or counter standee that opens your digital card with a tap, delivered free across India." },
  { title: "Free tools", text: "An email signature generator and WhatsApp Business message templates anyone can use without signing up." },
  { title: "For teams and resellers", text: "Matching cards for whole teams, and a white-label programme for agencies that sell cards to their own clients." },
];

const HOW_WE_WRITE = [
  { icon: BookOpen, title: "Written for Indian businesses", text: "Each guide answers one real question — the kind shop owners, doctors and consultants search for — in plain English, with steps you can follow the same day." },
  { icon: FileSearch, title: "Checked against official sources", text: "Facts about Google, NFC, QR codes and contact files are checked against the organisations that set the rules — such as Google's help centre, the NFC Forum, Apple and Android documentation, W3C and the IETF — and we link to those pages so you can check them too." },
  { icon: Sparkles, title: "Honest about how they're made", text: "We use AI writing tools to help draft some guides. Before a guide is published its facts are checked against those sources and against how DigitalCarda actually works. We don't publish invented statistics, reviews or experiences." },
  { icon: BadgeCheck, title: "Clear about our own product", text: "When a guide mentions DigitalCarda, it says so plainly and only describes features and prices that exist today." },
  { icon: RefreshCw, title: "Kept up to date", text: "Every guide shows the date it was published or last updated. When a product, price or rule changes, we update the guide." },
];

export default function About() {
  return (
    <div className="bg-[#FAFAF7]">
      <JsonLd id="dc-about-ld" data={ABOUT_LD} />

      <section className="relative overflow-hidden border-b border-[#EEE9DD] pt-32 pb-14 sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(247,179,28,0.18),transparent_45%)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#92400E]">About us</p>
          <h1 className="mt-4 font-display text-[2.3rem] font-extrabold leading-[1.06] tracking-tight text-[#0F172A] sm:text-[3.3rem] [text-wrap:balance]">
            About DigitalCarda
          </h1>
          <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-[#57534E]">
            DigitalCarda makes digital visiting cards for businesses and professionals across India — a single link and QR code that lets people save your number, message you on WhatsApp, pay you and find you, without printing a new card every time something changes.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <section aria-labelledby="what-we-make">
          <h2 id="what-we-make" className="font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">What we make</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {WHAT_WE_MAKE.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-5 ring-1 ring-[#EEE9DD]">
                <h3 className="font-display text-[16px] font-bold text-[#0F172A]">{item.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-we-write" className="mt-16">
          <h2 id="how-we-write" className="scroll-mt-28 font-display text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">How we write our guides</h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[#57534E]">
            The guides on our <Link to="/blog" className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">blog</Link> are written by the DigitalCarda team. Here is how we make sure they are useful and accurate.
          </p>
          <ol className="mt-7 space-y-4">
            {HOW_WE_WRITE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-[#EEE9DD]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-[#F7B31C]" aria-hidden="true"><Icon size={20} /></span>
                <div>
                  <h3 className="font-display text-[16px] font-bold text-[#0F172A]">{title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#57534E]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#FFF8E6] p-5 ring-1 ring-[#F9E2A8]">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#B45309]" aria-hidden="true" />
            <p className="text-[15px] leading-relaxed text-[#44403C]">
              <strong className="text-[#0F172A]">Spotted something wrong or out of date?</strong> Email <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Correction to a DigitalCarda guide")}`} className="font-semibold text-[#0F172A] underline decoration-[#F7B31C] decoration-2 underline-offset-4">{CONTACT.email}</a> with the page link and we'll check it.
            </p>
          </div>
        </section>

        <section aria-labelledby="contact-us" className="mt-16 overflow-hidden rounded-[2rem] bg-[#0F172A] p-7 text-white sm:p-10">
          <h2 id="contact-us" className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Talk to us</h2>
          <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-[#CBD5E1]">Questions about cards, NFC products, bulk orders or the reseller programme — we're happy to help.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-[14.5px] font-bold text-white hover:brightness-95"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>
            <a href={CONTACT.phoneHref} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-[14.5px] font-bold text-white ring-1 ring-white/20 hover:bg-white/15"><Phone size={16} aria-hidden="true" /> {CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-[14.5px] font-bold text-white ring-1 ring-white/20 hover:bg-white/15"><Mail size={16} aria-hidden="true" /> {CONTACT.email}</a>
          </div>
          <Link to="/signup?promo=FREE30D" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#F7B31C] px-6 text-[15px] font-bold text-[#0F172A] hover:bg-[#FBBF24]">
            Make your digital visiting card — free for 30 days <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
