import type { IndustryPage } from "../types";

/* Schools, Coaching Classes & Tutors. Share flow: counter-qr (QR standee at the
   admission desk). Teams: bulkFit, one card per teacher or counsellor. */
export const schoolsCoaching: IndustryPage = {
  slug: "schools-coaching",
  name: "Schools, Coaching Classes & Tutors",
  crumb: "Schools & Coaching",
  audience: "coaching classes",
  group: "business-education",
  order: 17,

  h1: "Digital Visiting Card for Schools, Coaching Classes & Tutors",
  seoTitle: "Coaching & School Visiting Card: Digital | DigitalCarda",
  description: "A digital visiting card for schools, coaching classes and tutors: courses with fees, WhatsApp, directions and an enquiry form. Free for 30 days.",
  excerpt: "Courses with fees, WhatsApp, directions and admission enquiries in one list, from a QR at the admission desk.",
  answer: "A **digital visiting card for a school, coaching class or tutor** is one link with your name, institute, the courses you teach with fees, and buttons to call, WhatsApp or get directions. Parents open it from a QR standee at your admission desk or a link in a parents' WhatsApp group, and enquiries land in your Leads list.",
  primaryKeyword: "school visiting card",
  keywords: [
    "coaching visiting card",
    "tuition visiting card",
    "teacher visiting card",
    "visiting card for coaching institute",
    "visiting card for home tuition",
  ],
  searchTerms: ["coaching", "tuition", "tutor", "teacher", "academy", "institute"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#16A34A", ink: "#166534", icon: "graduation-cap", motif: "ruled" },

  sample: {
    name: "Vikram Iyer",
    role: "Founder & educator",
    org: "Apex Learning Academy",
    services: ["Maths & science", "Board exam prep", "Spoken English"],
  },

  pains: [
    {
      pain: "Parents collect pamphlets from five classes in one evening. Yours lands in the same pile.",
      fix: "**Save Contact** puts your name, number and address in the parent's phonebook in one tap, before they reach the next gate.",
      feature: "saveContact",
    },
    {
      pain: "The same question, \"What are the fees for class 10 maths?\", comes on WhatsApp all day.",
      fix: "List each course as a service with its fee, batch details and a WhatsApp button, so parents see the answer before they ask.",
      feature: "servicesWithPrices",
    },
    {
      pain: "Admission enquiries sit in a register and two phones; some parents never get a call back.",
      fix: "Enquiries from your card land in your **Leads** list, where you set a stage, a note and a follow-up date for every parent.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "The institute's name, your name and a photo", why: "Parents trust a face. Write the institute name as it is on your board, and your name as the person they will call.", part: "profile" },
    { item: "Classes, subjects and batch timings, in your About text", why: "No separate timings section: write what you teach, class 6 to 12 or entrance prep, with morning and evening batches.", part: "about" },
    { item: "The number a parent can reach in the evening", why: "Parents call after office hours. Put the number that is actually answered then on the Call and WhatsApp buttons.", part: "actions" },
    { item: "Address with a landmark and a Maps link", why: "Parents tap it for directions before the first visit. The landmark helps when the class is on a first floor in a lane.", part: "actions" },
    { item: "Courses as services, with fees", why: "Each course gets its fee, duration and a WhatsApp button, so the fee question is answered before the call.", part: "services" },
    { item: "Photos of classrooms, labs and events", why: "The classroom, the annual day and the library, in a gallery that opens full screen. Show the place, not promises.", part: "gallery" },
    { item: "An admission enquiry form", why: "Parents send their name, number and the class they want, and you call back with batch and fee details.", part: "enquiry" },
    { item: "A QR standee at the admission desk", why: "Parents scan it while waiting for the counsellor and save your number in one tap. The QR stays valid after edits.", part: "qr" },
  ],

  useCases: [
    { need: "Fees answered before the phone rings", how: "List each course as a service with its fee, a photo and a WhatsApp button, so parents compare batches on their own.", feature: "servicesWithPrices" },
    { need: "Admission enquiries in writing", how: "Parents send their name, number, email and the class they want from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Parents finding the class on the first day", how: "Parents tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "Questions about one course", how: "A course's button opens a WhatsApp chat with the course name already typed in, so you know which batch they mean.", feature: "whatsapp" },
    { need: "Showing classrooms and events", how: "Photos go into a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "A card for every teacher and counsellor", how: "For 10 or more staff, add the team, pick one design and get volume pricing from ₹799 down to ₹399 per card per year, plus GST.", feature: "bulkCards" },
  ],

  shareFlow: { kind: "counter-qr", where: "admission desk", client: "parent" },

  faqs: [
    {
      q: "What should a coaching class visiting card include?",
      a: "The institute's name, your name, the classes and subjects you teach, batch timings, the number a parent can reach in the evening and the address with a landmark. A digital card adds courses with fees, a gallery of classrooms and events, an enquiry form for admissions and buttons to call, WhatsApp, get directions and save your number. Keep it factual; parents compare several classes in a week.",
    },
    {
      q: "Can parents send an admission enquiry from the card?",
      a: "Yes. The enquiry form takes the parent's name, number, email and requirement, such as class 10 maths in the evening batch, and a parent who leaves an email gets an automatic reply saying you received it. The enquiry lands in your Leads list, where you set its stage, add a note and pick a follow-up date. It is an enquiry, not an admission: there is no enrolment or fee collection on the card.",
    },
    {
      q: "Can I list courses with fees?",
      a: "Yes, as services with prices: each course gets a name, a photo, the fee, a reduced fee if you run one, and a button that opens WhatsApp or a call. Write the duration and batch in the description. Fees are not collected on the card. You can show your payment QR and Paytm, PhonePe or Google Pay number so parents scan or copy it, and the money goes straight to you.",
    },
    {
      q: "Can each teacher have their own card?",
      a: "Yes. For 10 or more teachers and counsellors, add the team, pick one design and each person gets a card with their own link and QR, at volume pricing from ₹799 down to ₹399 per card per year, plus GST. A smaller class can run up to 3 cards from one Platinum login: one for the institute and one each for two subject teachers. See [team cards](/bulk-cards).",
    },
    {
      q: "How much does a digital visiting card for a coaching institute cost?",
      a: "One card is free for 30 days with no payment details, then Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year with a 60-photo gallery. An NFC standee for the admission desk is a one-time ₹1,499. A school or institute with 10 or more teachers and counsellors can give each one a card on one design, from ₹799 down to ₹399 per card per year, plus GST. Your link and QR stay the same when you upgrade.",
    },
    {
      q: "Does it work for a home tutor?",
      a: "Yes. A home tutor's card carries your name, qualifications, the subjects and classes you take, the areas you cover and the number parents can WhatsApp. Share the link in parents' WhatsApp groups and your Instagram bio, and parents message you or send an enquiry from it. You can write the details in Hindi or any language; the buttons stay in English.",
    },
  ],

  templateNatures: ["Education", "Fitness"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my coaching class",
  nfcFit: true,
  bulkFit: true,
  relatedIndustries: ["consultants", "digital-agencies", "photographers"],
  relatedPosts: ["how-to-make-a-digital-visiting-card", "qr-code-business-card-vcard", "google-review-qr-code"],
};

export default schoolsCoaching;
