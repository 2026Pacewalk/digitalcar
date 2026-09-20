/**
 * The topical-authority pillar for "digital business card" and "digital visiting
 * card" — one long-form guide at /digital-business-card-guide that answers the
 * head-term queries directly and links out to every industry and city page.
 *
 * SEO metadata is in src/lib/publicSeo.ts under "/digital-business-card-guide".
 */
import { Link } from "react-router";
import JsonLd from "@/components/seo/JsonLd";

const SIGNUP = "/signup?promo=FREE30D";
const WA = "https://wa.me/919517722444?text=Hi%20DigitalCarda";

export default function DigitalBusinessCardGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
          { "@type": "ListItem", position: 2, name: "Digital Business Card Guide", item: "https://digitalcarda.in/digital-business-card-guide" },
        ],
      },
      {
        "@type": "Article",
        headline: "Digital Business Card: The Complete India Guide (2026)",
        datePublished: "2026-09-20",
        dateModified: "2026-09-20",
        author: { "@type": "Organization", name: "DigitalCarda" },
        publisher: {
          "@type": "Organization",
          name: "DigitalCarda",
          logo: { "@type": "ImageObject", url: "https://digitalcarda.in/apple-touch-icon.png" },
        },
        mainEntityOfPage: "https://digitalcarda.in/digital-business-card-guide",
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "What is a digital business card?", acceptedAnswer: { "@type": "Answer", text: "A digital business card is a shareable web page with your contact details, services and payment options, opened by link or QR code — no app required on either side." } },
          { "@type": "Question", name: "How much does a digital business card cost in India?", acceptedAnswer: { "@type": "Answer", text: "Plans start at ₹99/month with a 30-day free trial. NFC printed cards cost ₹499 with free delivery across India." } },
          { "@type": "Question", name: "NFC vs QR business card — which is better?", acceptedAnswer: { "@type": "Answer", text: "Both open the same digital card. QR costs nothing to reproduce and works on every phone camera. NFC feels premium at face-to-face meetings — tap phone to card and it opens instantly." } },
          { "@type": "Question", name: "Do digital business cards work without internet?", acceptedAnswer: { "@type": "Answer", text: "The card itself needs a data connection to open, but once opened the recipient can save the contact offline via the Save Contact button, which downloads a vCard." } },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 prose prose-slate max-w-none">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="not-prose text-sm text-[#64748B]">
        <Link to="/" className="hover:text-[#0F172A]">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-[#0F172A]">Digital Business Card Guide</span>
      </nav>

      <h1 className="mt-5 font-display text-[2.15rem] font-extrabold leading-[1.1] text-[#0F172A] sm:text-5xl">
        Digital Business Card: The Complete India Guide (2026)
      </h1>
      <p className="not-prose mt-2 text-[13px] text-[#64748B]">Updated September 2026 · 12 minute read · By the DigitalCarda team</p>

      <div className="not-prose mt-5 rounded-xl bg-white/70 ring-1 ring-[#E2E8F0] px-4 py-3 text-[15px] leading-relaxed text-[#334155]">
        <strong className="text-[#0F172A]">Quick answer:</strong> A digital business card is a shareable web link and QR code that replaces printed visiting cards. In India, plans start at <strong>₹99/month</strong> with a 30-day free trial, NFC printed cards cost <strong>₹499</strong> with free delivery, and the card supports WhatsApp, UPI payments and lead capture. Most professionals publish theirs in under two minutes.
      </div>

      <h2>What is a digital business card?</h2>
      <p>A digital business card (also called a digital visiting card or smart business card) is a web page that carries your contact details, services, payment options and social links in one place. You share it as a link or QR code, and whoever receives it opens it instantly in any browser — nothing is printed and no app or account is needed on either side.</p>
      <p>The card lives on a permanent URL you own, so you can redesign it, change your number or move offices anytime and every share you have ever made keeps working.</p>

      <h2>Why Indian professionals are switching from paper to digital</h2>
      <ul>
        <li><strong>88% of printed visiting cards</strong> end up in the bin within a week.</li>
        <li><strong>Reprint costs stack up</strong> — a change of address, number, designation or GST detail costs another print run.</li>
        <li><strong>No lead capture</strong> — a paper card can't tell you who scanned it or where they came from.</li>
        <li><strong>WhatsApp is the default channel</strong> in India — a digital card ties directly into it.</li>
        <li><strong>UPI payments</strong> straight from the card mean the same tap collects a booking advance.</li>
      </ul>

      <h2>How much does a digital business card cost in India?</h2>
      <p>Prices land in three tiers:</p>
      <ul>
        <li><strong>Free trial</strong> — ₹0 for 30 days, no credit card upfront</li>
        <li><strong>Starter</strong> — ₹99/month, one card, QR sharing, WhatsApp, UPI, analytics</li>
        <li><strong>Business</strong> — ₹299/month, multiple cards, custom domain, AI writer, lead form</li>
        <li><strong>NFC printed card</strong> — ₹499 one-time, free India delivery</li>
      </ul>

      <h2>NFC vs QR business cards — what's the difference?</h2>
      <p>Both open the exact same digital card. The difference is only in how it opens.</p>
      <ul>
        <li><strong>QR code</strong> — free to reproduce. Print it anywhere. Works on every phone camera.</li>
        <li><strong>NFC card</strong> — physical card with a chip. Tap it to a phone and the card opens instantly.</li>
      </ul>
      <p>Most people end up using both. See <Link to="/blog/nfc-vs-qr-business-card">NFC vs QR — the full comparison</Link>.</p>

      <h2>What goes on a digital business card?</h2>
      <h3>Essentials</h3>
      <ul>
        <li>Name, designation, company, logo</li>
        <li>One-tap call, WhatsApp, email, Save Contact</li>
        <li>Company website or Instagram bio</li>
      </ul>
      <h3>For businesses</h3>
      <ul>
        <li>Services or product catalogue with photos and prices</li>
        <li>Google Maps directions</li>
        <li>UPI or Razorpay payment button</li>
        <li>Google review link</li>
        <li>Enquiry form → dashboard</li>
        <li>Analytics — views, clicks, QR scans, sources</li>
      </ul>

      <h2>Digital business cards by profession</h2>
      <ul>
        <li><Link to="/industries/doctors">Doctors and clinics</Link></li>
        <li><Link to="/industries/real-estate">Real estate agents</Link></li>
        <li><Link to="/industries/advocates">Advocates and lawyers</Link></li>
        <li><Link to="/industries/beauty-parlours">Salons and beauty parlours</Link></li>
        <li><Link to="/industries/jewellers">Jewellers</Link></li>
        <li><Link to="/industries/restaurants">Restaurants and cafes</Link></li>
        <li><Link to="/industries/photographers">Photographers</Link></li>
        <li><Link to="/industries/consultants">Coaches and consultants</Link></li>
      </ul>

      <h2>How to make a digital visiting card in 2 minutes</h2>
      <ol>
        <li><strong>Pick a template</strong> — 50+ ready-made designs.</li>
        <li><strong>Add your details</strong> — or paste your website URL and AI writes it for you.</li>
        <li><strong>Publish</strong> — permanent link and QR you can print anywhere.</li>
      </ol>
      <p>Full walkthrough: <Link to="/blog/how-to-make-a-digital-visiting-card">How to make a digital visiting card</Link>.</p>

      <h2>Where to share your digital business card</h2>
      <p>Email signature, WhatsApp Business profile, Instagram / LinkedIn / X bio, Google Business Profile, video-call background, printed material, packaging, shop counter, IndiaMART, JustDial, event badges, invoices, Google/Meta/WhatsApp ads.</p>

      <h2>Digital business card in your city</h2>
      <ul>
        <li><Link to="/digital-visiting-card/mumbai">Mumbai</Link>, <Link to="/digital-visiting-card/delhi">Delhi</Link>, <Link to="/digital-visiting-card/bangalore">Bangalore</Link>, <Link to="/digital-visiting-card/hyderabad">Hyderabad</Link>, <Link to="/digital-visiting-card/chennai">Chennai</Link>, <Link to="/digital-visiting-card/kolkata">Kolkata</Link></li>
        <li><Link to="/digital-visiting-card/pune">Pune</Link>, <Link to="/digital-visiting-card/ahmedabad">Ahmedabad</Link>, <Link to="/digital-visiting-card/jaipur">Jaipur</Link>, <Link to="/digital-visiting-card/chandigarh">Chandigarh</Link>, <Link to="/digital-visiting-card/lucknow">Lucknow</Link>, <Link to="/digital-visiting-card/surat">Surat</Link></li>
        <li><Link to="/digital-visiting-card/ludhiana">Ludhiana</Link>, <Link to="/digital-visiting-card/indore">Indore</Link>, <Link to="/digital-visiting-card/nagpur">Nagpur</Link>, <Link to="/digital-visiting-card/gurgaon">Gurgaon</Link></li>
      </ul>

      <h2>Compared with other tools</h2>
      <ul>
        <li><Link to="/vs/linktree">DigitalCarda vs Linktree</Link></li>
        <li><Link to="/vs/hihello">DigitalCarda vs HiHello</Link></li>
        <li><Link to="/vs/beaconstac">DigitalCarda vs Beaconstac</Link></li>
      </ul>

      <h2>Frequently asked questions</h2>
      <h3>Does the recipient need an app?</h3>
      <p>No. The card opens in any phone browser. This is the single biggest reason cards get opened far more often than a PDF or a contact file.</p>
      <h3>What if my design needs to change later?</h3>
      <p>Change it anytime — the URL and QR stay the same. Every card you've ever printed keeps working.</p>
      <h3>Can I have more than one card under one login?</h3>
      <p>Yes. Business plans support multiple cards — useful for teams, multi-branch clinics or multi-role professionals.</p>
      <h3>Do you support Hindi and regional languages?</h3>
      <p>Yes. Every card supports multilingual content, and AI translates in one click — English, Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali, Punjabi and Kannada.</p>

      <p className="not-prose mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to={SIGNUP} className="btn-gold h-12 px-6 inline-flex items-center justify-center gap-2">Start 30-day free trial</Link>
        <a href={WA} target="_blank" rel="noreferrer" className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white ring-1 ring-[#E2E8F0] font-semibold text-[#0F172A]">Chat on WhatsApp</a>
      </p>
    </main>
  );
}
