import type { IndustryPage } from "../types";

/* Digital Marketing Agencies & Freelancers. Share flow: handover-nfc (NFC card or
   the QR on its back, handed over at a networking event). Team cards fit (bulkFit). */
export const digitalAgencies: IndustryPage = {
  slug: "digital-agencies",
  name: "Digital Marketing Agencies & Freelancers",
  crumb: "Agencies & Freelancers",
  audience: "agencies and freelancers",
  group: "business-education",
  order: 19,

  h1: "Digital Visiting Card for Digital Marketing Agencies",
  seoTitle: "Digital Marketing Visiting Card for Agencies | DigitalCarda",
  description: "Digital visiting cards for agencies, IT companies and freelancers: services, portfolio, leads pipeline, analytics and team cards. Free for 30 days.",
  excerpt: "Services with prices, a portfolio gallery, leads in one list, analytics, and one design for the whole team.",
  answer: "A **digital marketing visiting card** is your agency on one link: services with prices, a portfolio gallery and buttons to call, WhatsApp, email or save your number. A prospect at a networking event taps your NFC card or scans the QR on its back, and every enquiry from the card lands in your Leads list.",
  primaryKeyword: "digital marketing visiting card",
  keywords: [
    "visiting card for digital marketing agency",
    "it company visiting card",
    "creative visiting card for digital marketing agency",
    "visiting card for graphic designer",
    "digital business card for teams",
  ],
  searchTerms: ["agency", "freelancer", "it company", "web designer", "graphic designer", "startup"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#8B5CF6", ink: "#6D28D9", icon: "megaphone", motif: "nodes" },
  mockup: {
    img: "digital-business-card-agencies-freelancers",
    alt: "Aarav Mehta, Founder at Mehta Studio: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Aarav Mehta",
    role: "Founder",
    org: "Mehta Studio",
    services: ["Websites & apps", "SEO", "Social media"],
  },

  pains: [
    {
      pain: "At a meetup you hand over a card, and your best work stays in a Drive folder nobody opens.",
      fix: "Your card carries a **portfolio gallery** that opens full screen, so the prospect sees your work before you leave the table.",
      feature: "gallery",
    },
    {
      pain: "Enquiries land on WhatsApp, Instagram and email, and follow-ups get lost between pitches.",
      fix: "Enquiries from your card land in your **Leads** list, where you set the stage, add a note and pick a follow-up date.",
      feature: "leadsPipeline",
    },
    {
      pain: "Every new hire means another print run, and the old cards still show the old address.",
      fix: "One design for 10 or more staff, each card with that person's name and number. Edit it online; nothing to reprint.",
      feature: "bulkCards",
    },
  ],

  checklist: [
    { item: "Agency name, your name and what you actually do", why: "\"Performance marketing for online brands\" tells a prospect more than \"digital solutions\". Say it in one line.", part: "profile" },
    { item: "The number a client can actually reach", why: "Put the number you answer on the Call and WhatsApp buttons, and the email where briefs should arrive.", part: "actions" },
    { item: "Services with a starting price", why: "Websites, SEO or social media, each with a price and a WhatsApp button that opens a chat with the service typed in.", part: "services" },
    { item: "A portfolio gallery of your best work", why: "Screenshots of sites, ad creatives and campaign shots, opened full screen. Show the kind of work you want more of.", part: "gallery" },
    { item: "Instagram, LinkedIn, YouTube and your website", why: "Link the profiles where your work lives. Prospects check them anyway, so make it one tap.", part: "socials" },
    { item: "An enquiry form for briefs", why: "Prospects send their name, number, email and requirement, so a brief reaches you in writing instead of a voice note.", part: "enquiry" },
    { item: "Your QR on the back of your card and in your deck", why: "The last slide of a pitch deck with your QR: the room scans it and saves your number before the meeting ends.", part: "qr" },
  ],

  useCases: [
    { need: "Packages a prospect can compare on the spot", how: "List services with photos, MRP and offer price, and a button to call, WhatsApp or open a link, such as a case study page.", feature: "servicesWithPrices" },
    { need: "Showing the portfolio without a laptop", how: "Put screenshots, creatives and campaign shots in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "Following up every enquiry after an event", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Knowing which event or post brought visitors", how: "See how many people opened your card, what they tapped and where they came from, such as WhatsApp or a QR scan. Export it as CSV.", feature: "analytics" },
    { need: "One card design for the whole team", how: "For 10 or more staff: add the team, pick one design and get volume pricing from ₹799 down to ₹399 per card per year, plus GST.", feature: "bulkCards" },
    { need: "Your card on your own domain", how: "Put your card on your own domain for a one-time ₹499, free on Platinum 3-Year. Our team connects it with HTTPS.", feature: "customDomain" },
  ],

  shareFlow: { kind: "handover-nfc", where: "networking event", client: "prospect" },

  faqs: [
    {
      q: "What should a digital marketing agency visiting card include?",
      a: "Your agency name, your name and role, one line on what you do, the number you answer on WhatsApp, your email and website, and your services with a starting price. On a digital card, add a portfolio gallery, a showreel and an enquiry form for briefs, and keep your Instagram and LinkedIn one tap away. Leave out awards you cannot back up and client logos you have no permission to use.",
    },
    {
      q: "Can every employee get a card?",
      a: "Yes. For 10 or more staff, add the team, pick one design and get volume pricing from ₹799 down to ₹399 per card per year, plus GST. Each card carries that person's name, designation, phone and email, with your agency's logo and colours on all of them. Our team confirms the requirement and sends one invoice. For a smaller team, Platinum runs up to 3 cards from one login, each with its own link and QR.",
    },
    {
      q: "Can I put my card on my own domain?",
      a: "Yes. Put your card on your own domain, such as card.youragency.in, for a one-time ₹499, free on Platinum 3-Year. You add one DNS record at your registrar, we show you the exact value to paste, and our team connects it with HTTPS, usually within a day or two while the DNS change spreads. The domain stays yours.",
    },
    {
      q: "Can my agency resell digital visiting cards?",
      a: "Yes, through the reseller programme. Apply on the [resellers page](/resellers); once approved, you get a reseller panel to manage your customers and their payment orders, and you earn a commission on paid plans. The cards stay DigitalCarda cards, with our footer on every one, and there is no version under your own brand. The details and the application form are on that page.",
    },
    {
      q: "Can clients pay me from the card?",
      a: "They can pay you directly, not through us. Show your payment QR and your Paytm, PhonePe or Google Pay number on the card, so a client scans or copies it and the money goes straight to you. There is no checkout or cart on the card, so keep invoicing the way you do today; the card is simply where your payment details always live.",
    },
    {
      q: "How much does a digital visiting card for an agency or freelancer cost?",
      a: "A freelancer's card is free for 30 days with no payment details, then Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year with a 60-photo gallery and up to 3 cards, so one login can cover you and two brands. An agency with 10 or more staff moves to team cards, from ₹799 down to ₹399 per card per year, plus GST, all on one design. Your link and QR stay the same when you upgrade.",
    },
  ],

  templateNatures: ["IT & Digital", "Consulting"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my agency",
  nfcFit: false,
  bulkFit: true,
  relatedIndustries: ["consultants", "photographers", "schools-coaching"],
  relatedPosts: ["link-in-bio-vs-digital-business-card", "what-is-a-digital-visiting-card", "nfc-business-card-india"],
};

export default digitalAgencies;
