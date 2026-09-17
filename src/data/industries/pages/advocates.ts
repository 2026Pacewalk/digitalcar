import type { IndustryPage } from "../types";

/* Advocates & Lawyers. Share flow: handover-nfc (NFC card or the QR on its back,
   handed over at a client meeting). Regulated: factual wording only, no offers
   and no review button (see conduct). */
export const advocates: IndustryPage = {
  slug: "advocates",
  name: "Advocates & Lawyers",
  crumb: "Advocates",
  audience: "advocates",
  group: "legal-finance",
  order: 1,

  h1: "Digital Visiting Card for Advocates & Lawyers",
  seoTitle: "Advocate Visiting Card: Digital & QR | DigitalCarda",
  description: "A factual digital visiting card for advocates: name, enrolment details, practice areas, call, email and save contact, shared by QR. Free for 30 days.",
  excerpt: "A factual card with your enrolment details, practice areas and chamber address that clients save in one tap.",
  answer: "A **digital visiting card for advocates** is a one-page link with your name, enrolment details, practice areas, chamber address and buttons to call, email or save your number. Clients open it by tapping your NFC card, scanning the QR on its back or opening a link you send, and your details stay in their phone.",
  primaryKeyword: "advocate visiting card",
  keywords: [
    "visiting card for advocate",
    "advocate visiting card design",
    "digital visiting card for advocate",
    "lawyer visiting card",
    "lawyer digital business card",
    "advocate ka visiting card kaise banaye",
  ],
  searchTerms: ["lawyer", "advocate", "legal", "law firm", "court"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#4F46E5", ink: "#3730A3", icon: "scale", motif: "columns" },

  sample: {
    name: "Adv. Kavita Menon",
    role: "Advocate, High Court",
    org: "Menon & Associates",
    services: ["Property & documentation", "Family law", "Civil litigation"],
  },

  pains: [
    {
      pain: "Cards run out on a busy court day, and a client writes your number on a file cover.",
      fix: "One NFC card does the work of a box: a tap, or a scan of the QR on its back, opens your card on their phone.",
      feature: "nfcCard",
    },
    {
      pain: "A client copies your number wrong from the printed card, and the call never reaches you.",
      fix: "**Save Contact** puts your name, number, email and chamber address in their phonebook in one tap.",
      feature: "saveContact",
    },
    {
      pain: "You shift chambers or add a mobile number, and every card in circulation is out of date.",
      fix: "Edit your card once. The same link and the QR on your card show the new details, with nothing to reprint.",
      feature: "qr",
    },
  ],

  checklist: [
    { item: "Your name as enrolled, with Adv. before it", why: "Clients and court staff know you by this name. Write it the way it appears on your enrolment.", part: "profile" },
    { item: "Enrolment number and State Bar Council", why: "A plain fact that lets a client confirm you are an enrolled advocate. Copy it exactly as issued.", part: "profile" },
    { item: "The courts where you appear", why: "High Court, district courts or a tribunal: clients want to know you practise where their matter is.", part: "about" },
    { item: "Practice areas, listed plainly", why: "Property, family or civil matters, written as facts. Leave out claims about results or cases won.", part: "services" },
    { item: "Chamber address with a Maps link", why: "Add the floor, chamber number and court complex gate, so a first-time client finds you without calling.", part: "actions" },
    { item: "Office number, mobile and email", why: "Put the number your office answers on the Call button, and the email where you take documents.", part: "actions" },
    { item: "A QR code on the back of your card", why: "Clients whose phones cannot tap an NFC card scan the QR instead and get the same details.", part: "qr" },
  ],

  useCases: [
    { need: "Clients keeping your number safely", how: "**Save Contact** puts your name, number, email, website and chamber address into their phonebook in one tap.", feature: "saveContact" },
    { need: "A client who needs to reach you today", how: "Clients call your office or mobile with one tap from your card.", feature: "call" },
    { need: "Passing your details to a client's family", how: "Share your digitalcarda.in link on WhatsApp, SMS or email. It shows your name and a proper preview when pasted.", feature: "shareLink" },
    { need: "Something to hand over at a meeting", how: "An NFC card (₹499): the client taps it on a phone, or scans the printed QR, and your card opens.", feature: "nfcCard" },
    { need: "A new matter described in writing", how: "Visitors send their name, number, email and a short requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Your details under every email", how: "Make a free email signature that links to your card, so clients who email you can find everything else.", feature: "emailSignature" },
  ],

  shareFlow: { kind: "handover-nfc", where: "client meeting", client: "client" },

  conduct: {
    body: "Bar Council of India",
    note: "The **Bar Council of India** restricts advertising and soliciting work by advocates. Keep your card to plain facts: name, enrolment details, areas of practice, chamber address and contact details, with no offers, client reviews or claims about results. Rules can change, so check the current rules before you publish.",
    avoid: ["reviewButton", "offers"],
  },

  faqs: [
    {
      q: "What should be written on an advocate's visiting card?",
      a: "Write your name with Adv. before it, your enrolment number and State Bar Council, the courts where you appear, your areas of practice, chamber address, office number and email. Keep it to those facts. A digital card adds buttons to call, email and save your number, which a printed card cannot do.",
    },
    {
      q: "Can advocates in India use a digital visiting card?",
      a: "Yes, as a factual record of your contact details, much like a printed card. The Bar Council of India restricts advertising and soliciting work, so leave out offers, client reviews and claims about results, and check the current rules before you publish. This is general information, not legal advice.",
    },
    {
      q: "Should I add my enrolment number and practice areas?",
      a: "Both are plain facts, and they help a client confirm who you are and whether you handle their kind of matter. Copy the enrolment number exactly as issued and name your areas of practice, such as property, family or civil matters, without calling yourself the best or promising an outcome.",
    },
    {
      q: "How do clients save my office number?",
      a: "They tap **Save Contact** on your card, and your name, number, email, website and chamber address go into their phonebook in one tap. They open the card by tapping your NFC card, scanning the QR on its back, or opening the link you send on WhatsApp.",
    },
    {
      q: "Advocate ka visiting card kaise banaye?",
      a: "Sign up free, choose a design and add your name, enrolment details, practice areas, chamber address, office number and email. Share the link on WhatsApp, or order an NFC card with the QR printed on it for meetings. You can write the details in Hindi or any language; the buttons stay in English.",
    },
    {
      q: "How much does a digital visiting card for an advocate cost?",
      a: "The card itself is free for 30 days with no payment details; an NFC card to hand over at meetings, printed on both sides with the QR on its back, is ₹499 each. After the trial, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year. Your link and QR stay the same when you upgrade, so the NFC cards you have already handed out keep working.",
    },
  ],

  templateNatures: ["Legal Services", "Finance & Tax"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my law practice",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["chartered-accountants", "doctors", "consultants"],
  relatedPosts: ["what-is-a-digital-visiting-card", "qr-code-business-card-vcard", "visiting-card-design-ideas"],
};

export default advocates;
