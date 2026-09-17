import type { IndustryPage } from "../types";

/* Physiotherapists. Share flow: counter-qr (QR standee at the clinic counter;
   the link is also sent before a home visit). Regulated: factual wording only,
   no offers and no review button (see conduct). The "Can physios use Dr?"
   question is left out on purpose: the answer is disputed. */
export const physiotherapists: IndustryPage = {
  slug: "physiotherapists",
  name: "Physiotherapists",
  crumb: "Physiotherapists",
  audience: "physiotherapists",
  group: "health",
  order: 8,

  h1: "Digital Visiting Card for Physiotherapists",
  seoTitle: "Physiotherapist Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for your physiotherapy clinic or home visits: one-tap call, WhatsApp, directions and save contact. Free for 30 days.",
  excerpt: "Call, WhatsApp, directions and exercise videos for clinic and home-visit patients, from a QR at your counter.",
  answer: "A **digital visiting card for physiotherapists** is one link with your name, qualifications, what you treat, your clinic address and buttons to call, WhatsApp, get directions or save your number. Patients open it from a QR standee at your clinic counter, or from a link you send before a home visit, so your details stay in their phone.",
  primaryKeyword: "physiotherapist visiting card",
  keywords: [
    "visiting card for physiotherapy clinic",
    "physiotherapist visiting card design",
    "physiotherapist visiting card maker",
    "home visit card for physiotherapist",
    "physiotherapy visiting card",
  ],
  searchTerms: ["physio", "physiotherapy", "rehab", "home visit", "sports injury"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#10B981", ink: "#047857", icon: "activity", motif: "motion" },

  sample: {
    name: "Kabir Anand",
    role: "Physiotherapist, BPT MPT",
    org: "MoveWell Physio Care",
    services: ["Back & neck pain", "Sports injury rehab", "Home visit sessions"],
  },

  pains: [
    {
      pain: "Sessions end, and months later the patient cannot recall your name when the pain returns.",
      fix: "**Save Contact** puts your name, clinic number and address in their phonebook in one tap, so they find you by name.",
      feature: "saveContact",
    },
    {
      pain: "The clinic is up a lane and a flight of stairs, and every patient calls for the route.",
      fix: "Patients tap your address to open directions in Google Maps, with the floor and landmark written in.",
      feature: "mapsLink",
    },
    {
      pain: "You show the exercises in the session, and by evening the patient has forgotten the form.",
      fix: "Add your exercise demonstrations as YouTube videos or Shorts that play on your card, so patients replay them at home.",
      feature: "video",
    },
  ],

  checklist: [
    { item: "Your name, qualifications and registration number", why: "BPT, MPT and your council registration if you have one, written the way they appear on your certificates.", part: "profile" },
    { item: "What you treat, listed plainly", why: "Back and neck pain, sports injuries, post-surgery rehab, stroke recovery: facts, with no promise of a cure.", part: "services" },
    { item: "Home visit areas and the number to WhatsApp", why: "Name the localities you cover for home visits, and put the number you answer between sessions on the WhatsApp button.", part: "actions" },
    { item: "Clinic address with floor and landmark", why: "Patients tap it for directions. The floor and a landmark save a call from the lane below.", part: "actions" },
    { item: "Session timings, in your About text", why: "There is no separate timings section. Write clinic timings and home visit days in About and edit them when they change.", part: "about" },
    { item: "Exercise videos patients can replay", why: "Add YouTube videos or Shorts of the exercises you prescribe, so a patient sees the right form at home.", part: "gallery" },
    { item: "A QR on the clinic counter", why: "Print it on a counter standee so patients save your number while they wait, or scan it for a family member.", part: "qr" },
  ],

  useCases: [
    { need: "Patients reaching you between sessions", how: "Patients call you with one tap from your card, with no number to type.", feature: "call" },
    { need: "Home visit requests from families", how: "One tap opens a WhatsApp chat with you. The Home visit sessions button opens it with that service's name already typed in.", feature: "whatsapp" },
    { need: "Finding the clinic on the first visit", how: "Patients tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "Your number saved for when the pain returns", how: "**Save Contact** puts your name, number, email, website and clinic address into the patient's phonebook in one tap.", feature: "saveContact" },
    { need: "Exercises patients can replay at home", how: "Add YouTube videos, Shorts and Instagram Reels of the exercises you prescribe. They play on your card.", feature: "video" },
    { need: "Showing what you treat and what a session costs", how: "List back and neck pain, sports rehab and home visits as services with a photo, an optional price and a WhatsApp button.", feature: "servicesWithPrices" },
  ],

  shareFlow: { kind: "counter-qr", where: "clinic counter", client: "patient" },

  conduct: {
    body: "your professional council or association",
    note: "**Your professional council or association** sets rules on how physiotherapists may publicise their practice, and they differ by state. Keep the card factual: qualifications, registration number, what you treat, address and contact details, with no offers or patient reviews. Check the current rules before you publish.",
    avoid: ["reviewButton", "offers"],
  },

  faqs: [
    {
      q: "What should a physiotherapist visiting card include?",
      a: "Your name, qualifications such as BPT or MPT, your registration number if your state council issues one, what you treat, the clinic address with floor and landmark, the number you answer on WhatsApp and whether you do home visits. On a digital card, add buttons to call, WhatsApp, get directions and save your number, and write your session timings in the About text.",
    },
    {
      q: "How can home-visit patients reach me quickly?",
      a: "Through the Call and WhatsApp buttons on your card, which use the number you answer between sessions. The Home visit sessions button opens WhatsApp with that service's name already typed, so a family does not have to explain from scratch. Send the card link in the first chat, and Save Contact keeps your number in their phone for the next visit. The card does not book slots; you confirm the time on WhatsApp.",
    },
    {
      q: "How do I share my clinic location with patients on WhatsApp?",
      a: "Send your card link in the WhatsApp chat. The patient taps your address on the card and Google Maps opens with directions. Write the floor, building and a landmark in the address so they find the door, not just the lane. If you move, edit the address once; everyone who has the link sees the new one.",
    },
    {
      q: "Can I show exercise videos on my card?",
      a: "Yes. Upload your exercise demonstrations to YouTube as videos or Shorts, or post them as Instagram Reels, and add them to your card, where they play in place: 8 videos on Gold, 25 on Platinum. Patients replay the right form at home instead of guessing from memory. Keep them general demonstrations; a patient's own programme still comes from you in the session.",
    },
    {
      q: "Can patients pay for a session from the card?",
      a: "They can scan your payment QR or copy your Paytm, PhonePe or Google Pay number from the card, and the money goes straight to you. The card itself does not take payments: there is no checkout, and it does not record who paid, so keep your own receipts as you do now.",
    },
    {
      q: "How much does a digital visiting card for a physiotherapy clinic cost?",
      a: "Free for 30 days with no payment details, and your QR is free to download for a standee at the clinic counter. After that, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year. An NFC standee for the counter, which patients tap or scan, is a one-time ₹1,499. Your link and QR stay the same when you upgrade, so a printed standee keeps working.",
    },
  ],

  templateNatures: ["Healthcare", "Fitness"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my physiotherapy clinic",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["doctors", "beauty-parlours", "consultants"],
  relatedPosts: ["digital-visiting-card-for-doctors", "qr-code-business-card-vcard", "nfc-business-card-india"],
};

export default physiotherapists;
