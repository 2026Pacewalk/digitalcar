import type { IndustryPage } from "../types";

/* Chartered Accountants & Tax Consultants. Share flow: handover-nfc (NFC card
   or the QR on its back, handed over at a client meeting). Regulated: ICAI
   wording in conduct, factual copy only, no offers and no review button.
   bulkFit: firms with 10 or more staff get team cards. */
export const charteredAccountants: IndustryPage = {
  slug: "chartered-accountants",
  name: "Chartered Accountants & Tax Consultants",
  crumb: "Chartered Accountants",
  audience: "chartered accountants",
  group: "legal-finance",
  order: 5,

  h1: "Digital Visiting Card for Chartered Accountants",
  seoTitle: "CA Visiting Card: Digital Card for CAs | DigitalCarda",
  description: "A digital visiting card for CAs and tax consultants: services, call, WhatsApp, email and save contact, shared by QR or link. Free for 30 days.",
  excerpt: "Membership number, firm and services on one factual card, opened with an NFC tap or a QR at a client meeting.",
  answer: "A **digital visiting card for chartered accountants** is one link with your name, membership number, firm, the services you take on and buttons to call, WhatsApp, email or save your number. Clients open it by tapping your NFC card, scanning the QR on its back or opening a link you send, and your details stay in their phone.",
  primaryKeyword: "ca visiting card",
  keywords: [
    "chartered accountant visiting card",
    "tax consultant visiting card",
    "digital visiting card for ca",
    "ca visiting card format",
    "gst consultant visiting card",
  ],
  searchTerms: ["ca", "accountant", "tax", "gst", "itr", "audit"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#0891B2", ink: "#155E75", icon: "calculator", motif: "ledger" },

  sample: {
    name: "CA Nikhil Bansal",
    role: "Chartered Accountant",
    org: "Bansal & Co.",
    services: ["Income tax filing", "GST registration & returns", "Bookkeeping"],
  },

  pains: [
    {
      pain: "Clients save you as \"CA\" with no name, then cannot find you when a notice arrives.",
      fix: "**Save Contact** puts your name, firm, number and email in their phonebook in one tap, so they find you by name.",
      feature: "saveContact",
    },
    {
      pain: "In the July rush, a new client's number sits on a paper card under the Form 16 pile.",
      fix: "Enquiries from your card land in your **Leads** list with name, number and requirement, ready for after the deadline.",
      feature: "leadsPipeline",
    },
    {
      pain: "Every partner carries a different card, and the firm's name is spelt three ways.",
      fix: "**Cards for your team**: one design for 10 or more staff, volume pricing from ₹799 down to ₹399 per card per year, plus GST.",
      feature: "bulkCards",
    },
  ],

  checklist: [
    { item: "Your name with CA before it, and your membership number", why: "Clients and banks know you by your ICAI membership number. Write both the way they appear in the ICAI register.", part: "profile" },
    { item: "Firm name, your role and the firm registration number", why: "Proprietor or partner, and the FRN if you have one. Spell the firm's name the way it appears on your letterhead.", part: "profile" },
    { item: "Services, written as plain facts", why: "Income tax filing, GST returns, audit, bookkeeping: say what you do, without fee comparisons or promises of refunds.", part: "services" },
    { item: "The office number and the email where documents arrive", why: "Put the number your office answers on the Call button, and the email you actually open in filing season.", part: "actions" },
    { item: "Office address with floor and landmark", why: "Clients bringing documents tap the address for directions instead of calling you from the lane.", part: "actions" },
    { item: "What clients should send you, in your About text", why: "One line listing PAN, Form 16 and bank statements saves ten WhatsApp messages every filing season.", part: "about" },
    { item: "A QR on the back of your NFC card", why: "Clients whose phones cannot tap the card scan the QR instead and get the same details.", part: "qr" },
    { item: "An enquiry form for new clients", why: "A client who is not ready to call sends their name, number and what they need, such as GST registration.", part: "enquiry" },
  ],

  useCases: [
    { need: "Showing the work you take on", how: "List income tax filing, GST returns and bookkeeping as services, each with a button to call or WhatsApp. The price field is optional.", feature: "servicesWithPrices" },
    { need: "Clients asking about one service", how: "A service button opens a WhatsApp chat with that service's name already typed in, so you know what the client needs.", feature: "whatsapp" },
    { need: "Being found when a notice arrives", how: "**Save Contact** puts your name, number, email, website and office address into the client's phonebook in one tap.", feature: "saveContact" },
    { need: "New clients describing their requirement", how: "Visitors send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Following up after the filing deadline", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Your details under every email you send", how: "Make a free email signature that links to your card, so a client who only has your email finds everything else.", feature: "emailSignature" },
  ],

  shareFlow: { kind: "handover-nfc", where: "client meeting", client: "client" },

  conduct: {
    body: "ICAI",
    note: "**ICAI** restricts advertising and solicitation by members in practice, and limits the designations on a member's visiting card. Keep yours to facts: name, membership number, firm, services, address and contact details, with no offers, client reviews or claims about results. Check the current rules before you publish.",
    avoid: ["reviewButton", "offers"],
  },

  faqs: [
    {
      q: "What details should a CA visiting card include?",
      a: "Your name with CA before it, your ICAI membership number, the firm name and your role in it, the services you take on, office address, phone and email. On a digital card, add buttons to call, WhatsApp, email and save your number. Keep every line factual, without fee comparisons, superlatives or claims about results, the way ICAI expects a member's stationery to read.",
    },
    {
      q: "Are there ICAI guidelines for a CA visiting card?",
      a: "Yes. ICAI's Code of Ethics restricts advertising and solicitation by members in practice, and limits the designations a member may show, so write Chartered Accountant and your recognised qualifications rather than invented titles. ICAI also has its own guidelines on the CA logo, which apply to any logo you upload. Keep the card factual, leave out offers and client reviews, and check the current rules before you publish. This is general information, not legal advice.",
    },
    {
      q: "Can I list services like ITR filing and GST on my card?",
      a: "Yes, as a plain list of the work you do: income tax filing, GST registration and returns, audit, bookkeeping. Each service gets a button that opens WhatsApp with its name already typed in, and the price field can stay empty. Write them as facts, without comparing fees, promising refunds or calling yourself the best; ICAI's rules on how members describe their work apply to your card too.",
    },
    {
      q: "How do clients send me a question from the card?",
      a: "They tap WhatsApp for a quick question, or fill the enquiry form with their name, number, email and what they need. Form enquiries land in your Leads list, and a client who leaves an email gets an automatic reply saying you received it. The card does not take file uploads, so ask for PAN, Form 16 or bank statements on WhatsApp or email once you have replied.",
    },
    {
      q: "Can every partner and staff member in my firm get a card?",
      a: "Yes. Platinum runs up to 3 cards from one login, each with its own link and QR, which suits a small partnership. For 10 or more staff, [cards for your team](/bulk-cards) use one design for everyone, with volume pricing from ₹799 down to ₹399 per card per year, plus GST. Each person gets their own link and QR, and the firm's name is spelt the same way on all of them.",
    },
    {
      q: "How much does a digital visiting card for a CA firm cost?",
      a: "A single card is free for 30 days with no payment details, then Gold is ₹99 a month or ₹999 a year and Platinum is ₹199 a month or ₹1,999 a year. An NFC card with the QR printed on its back, for client meetings, is ₹499. A firm with 10 or more partners and staff can put everyone on team cards with one design, priced from ₹799 down to ₹399 per card per year, plus GST. Your link and QR stay the same when you upgrade.",
    },
  ],

  templateNatures: ["Finance & Tax", "Legal Services"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my CA practice",
  nfcFit: false,
  bulkFit: true,
  relatedIndustries: ["advocates", "insurance-agents", "real-estate"],
  relatedPosts: ["what-is-a-digital-visiting-card", "qr-code-business-card-vcard", "how-to-make-a-digital-visiting-card"],
};

export default charteredAccountants;
