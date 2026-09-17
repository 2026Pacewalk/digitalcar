import type { IndustryPage } from "../types";

/* Doctors & Clinics. Share flow: counter-qr (QR standee at the reception desk).
   Regulated: factual wording only, no offers and no review button (see conduct). */
export const doctors: IndustryPage = {
  slug: "doctors",
  name: "Doctors & Clinics",
  crumb: "Doctors & Clinics",
  audience: "doctors",
  group: "health",
  order: 2,

  h1: "Digital Visiting Card for Doctors & Clinics",
  seoTitle: "Doctor Visiting Card: Digital, QR & NFC | DigitalCarda",
  description: "Make a digital visiting card for your clinic: tap to call, WhatsApp, directions and save contact, shared by QR or NFC. Free for 30 days.",
  excerpt: "Call, WhatsApp, directions and save contact for your patients, opened from a QR at your reception desk.",
  answer: "A **digital visiting card for doctors** is a one-page link with your name, qualifications, clinic address and buttons to call, WhatsApp, get directions or save your number. Patients open it from a QR code at reception or a WhatsApp message, so your details stay in their phone instead of a lost paper card.",
  primaryKeyword: "doctor visiting card",
  keywords: [
    "visiting card for doctor",
    "doctor visiting card design",
    "digital visiting card for doctors",
    "doctor digital business card",
    "hospital visiting card",
    "dental clinic visiting card",
    "doctor ka visiting card kaise banaye",
  ],
  searchTerms: ["clinic", "dentist", "dental", "hospital", "physician", "medical"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#14B8A6", ink: "#0F766E", icon: "stethoscope", motif: "pulse" },
  mockup: {
    img: "digital-business-card-doctors-clinics",
    alt: "Dr. Anita Sharma, MD Physician at Sharma Clinic: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Dr. Anita Sharma",
    role: "MD Physician",
    org: "Sharma Clinic",
    services: ["General consultation", "Health check-ups", "Clinic directions"],
  },

  pains: [
    {
      pain: "A patient loses your paper card, searches your name and finds a different doctor.",
      fix: "**Save Contact** puts your name, clinic number and address in the patient's phonebook in one tap.",
      feature: "saveContact",
    },
    {
      pain: "The reception phone keeps ringing with \"Where exactly is the clinic?\"",
      fix: "Patients tap your address to open directions in Google Maps, landmark and all.",
      feature: "mapsLink",
    },
    {
      pain: "A new clinic number or a second branch means reprinting a whole box of cards.",
      fix: "Edit your card once. The link and the QR at reception stay the same, so there is nothing to reprint.",
      feature: "qr",
    },
  ],

  checklist: [
    { item: "Your name, qualifications and speciality", why: "Patients want to know they have the right doctor. Write them the way they appear on your certificates.", part: "profile" },
    { item: "Your medical registration number", why: "A plain fact that shows who you are. Copy it exactly as issued, with the council's name.", part: "profile" },
    { item: "The number your reception actually answers", why: "Put it on the Call and WhatsApp buttons, so patients reach a person and not a switched-off phone.", part: "actions" },
    { item: "Clinic address, floor and a nearby landmark", why: "Patients tap the address for directions. The floor and landmark save a confused call from the lift.", part: "actions" },
    { item: "Consultation days and times, in your About text", why: "There is no separate timings section. Write your morning and evening sessions in About and edit them when they change.", part: "about" },
    { item: "The services you offer, stated plainly", why: "General consultation, check-ups or procedures, listed as facts, with no discounts or promises of results.", part: "services" },
    { item: "A QR code for the reception desk", why: "Print it on a counter standee so patients save your number while they wait for their turn.", part: "qr" },
  ],

  useCases: [
    { need: "Patients calling the clinic", how: "Patients call your reception with one tap from your card, with no number to type.", feature: "call" },
    { need: "Finding the clinic on the first visit", how: "Patients tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "Your number saved in the patient's phone", how: "**Save Contact** puts your name, number, email, website and address into their phonebook in one tap.", feature: "saveContact" },
    { need: "A QR at the reception desk", how: "Download your QR as PNG or SVG and print a counter standee. The QR stays the same when you redesign your card.", feature: "qr" },
    { need: "Tap or scan at the counter", how: "An NFC standee (₹1,499) at reception: patients tap their phone on it or scan it to open your card.", feature: "nfcStandee" },
    { need: "Quick questions without a phone call", how: "One tap opens a WhatsApp chat with the clinic number, so patients can message your reception.", feature: "whatsapp" },
    { need: "Knowing whether patients use the card", how: "See how many people opened your card, what they tapped, such as Call or Directions, and whether they came from a QR scan.", feature: "analytics" },
  ],

  shareFlow: { kind: "counter-qr", where: "reception desk", client: "patient" },

  conduct: {
    body: "National Medical Commission (NMC)",
    note: "In India, the **National Medical Commission (NMC)** sets rules on how doctors may publicise themselves. Keep your card factual: qualifications, services, clinic address and contact details, with no discounts, offers or patient reviews. Rules change, so check the current rules before you publish.",
    avoid: ["reviewButton", "offers"],
  },

  faqs: [
    {
      q: "What should be written on a doctor's visiting card?",
      a: "Write your name, qualifications, speciality, registration number, clinic address and the phone number your reception answers, plus your consultation days and times. On a digital card, add buttons to call, WhatsApp, get directions and save your number. Keep every line factual, the way you would write it on your clinic board.",
    },
    {
      q: "Can doctors in India use a digital visiting card?",
      a: "Yes, as a factual card with your clinic's contact details, much like a printed one. The National Medical Commission (NMC) sets rules on how doctors may publicise themselves, so stick to qualifications, services and address, leave out offers and reviews, and check the current rules before you publish. This is general information, not legal advice.",
    },
    {
      q: "How do patients save my clinic number from the card?",
      a: "They tap **Save Contact**, and your name, number, email, website and address go into their phonebook in one tap. Patients open the card by scanning the QR at your reception desk or from a link you send on WhatsApp, so nobody has to type your number.",
    },
    {
      q: "Can I show my clinic timings on the card?",
      a: "Yes, write them in your About text. There is no separate timings section, so list your consultation days and times there, such as morning and evening sessions, and edit the text whenever they change. Your link and QR stay the same, so the standee at reception keeps working.",
    },
    {
      q: "Doctor ka visiting card kaise banaye?",
      a: "Sign up free, pick a design and fill in your name, qualifications, clinic address and phone number. Write your timings in the About text, then share the link on WhatsApp or print your QR for the reception desk. You can write the details in Hindi or any language; the buttons stay in English.",
    },
    {
      q: "How much does a digital visiting card for a clinic cost?",
      a: "You can start free for 30 days with no payment details. After that, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year. An NFC standee for your reception desk is a one-time ₹1,499. Your link and QR stay the same when you upgrade.",
    },
  ],

  templateNatures: ["Healthcare"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my clinic",
  nfcFit: true,
  bulkFit: false,
  relatedIndustries: ["physiotherapists", "advocates", "chartered-accountants"],
  relatedPosts: ["digital-visiting-card-for-doctors", "qr-code-business-card-vcard", "nfc-business-card-india"],
};

export default doctors;
