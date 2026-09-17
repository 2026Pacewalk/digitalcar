import type { IndustryPage } from "../types";

/* Consultants & Coaches. Share flow: handover-nfc (NFC card or the QR on its back,
   handed over after a workshop). Keeps the Home "Coaches & Consultants" persona. */
export const consultants: IndustryPage = {
  slug: "consultants",
  name: "Consultants & Coaches",
  crumb: "Consultants & Coaches",
  audience: "consultants and coaches",
  group: "business-education",
  order: 20,

  h1: "Digital Visiting Card for Consultants & Coaches",
  seoTitle: "Consultant Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for consultants and coaches: services, videos, WhatsApp, an enquiry form and a leads pipeline for follow-ups. Free for 30 days.",
  excerpt: "Sessions and workshops with prices, videos of your talks, an enquiry form and all your leads in one list.",
  answer: "A digital **consultant visiting card** is one link with your name, what you help with, sessions and workshops with prices, videos of your talks and buttons to call, WhatsApp, email or save your number. An attendee at a workshop taps your NFC card or scans the QR on its back, and their enquiry lands in your Leads list.",
  primaryKeyword: "consultant visiting card",
  keywords: [
    "business consultant visiting card",
    "digital business card for consultants",
    "coach visiting card",
    "life coach business card",
    "career counsellor visiting card",
  ],
  searchTerms: ["coach", "consultant", "trainer", "counsellor", "startup founder", "mentor"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#3B82F6", ink: "#1D4ED8", icon: "briefcase-business", motif: "compass" },
  mockup: {
    img: "digital-business-card-coaches-consultants",
    alt: "Neha Kapoor, Business Coach at Neha Kapoor Coaching: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Neha Kapoor",
    role: "Business Coach",
    org: "Neha Kapoor Coaching",
    services: ["One-to-one coaching", "Workshops", "Strategy calls"],
  },

  pains: [
    {
      pain: "After a workshop the room takes your cards, and few remember what you actually offer.",
      fix: "Your card lists **sessions and workshops with prices**, so an attendee sees exactly what you offer and taps WhatsApp to ask.",
      feature: "servicesWithPrices",
    },
    {
      pain: "People want to see you speak before they hire you, and a paper card cannot play a video.",
      fix: "Add YouTube videos, Shorts and Instagram Reels of your talks that play on your card, so they watch you before they call.",
      feature: "video",
    },
    {
      pain: "Names from a session pile up in your phone, and nobody hears from you the next week.",
      fix: "Enquiries from your card land in your **Leads** list, where you set the stage, add a note and pick a follow-up date.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "Your name, what you coach and who it is for", why: "\"Business coach for first-time founders\" gives a prospect a reason to save you. Vague titles get forgotten.", part: "profile" },
    { item: "Credentials and certifications, stated plainly", why: "Your coaching certification, degree or industry background as facts, without promising outcomes a client cannot check.", part: "about" },
    { item: "The number you answer between sessions", why: "Put it on the Call and WhatsApp buttons, and add the email where you want programme enquiries to arrive.", part: "actions" },
    { item: "Sessions, workshops and calls as services with prices", why: "A one-to-one session, a workshop seat or a strategy call, each with a price and a WhatsApp button to ask about it.", part: "services" },
    { item: "A video of you speaking", why: "A talk, a podcast clip or a short reel from a workshop, so prospects hear how you explain things before they enquire.", part: "gallery" },
    { item: "An enquiry form for people who would rather write", why: "They send their name, number, email and what they need help with; those who leave an email get an automatic reply.", part: "enquiry" },
    { item: "LinkedIn, Instagram and YouTube", why: "Link the profiles where you post, so a prospect who is not ready to call can follow you first.", part: "socials" },
    { item: "Your QR on the last slide", why: "End every workshop with your QR on screen. The room scans it and saves your number while you take questions.", part: "qr" },
  ],

  useCases: [
    { need: "Letting prospects hear you before they hire you", how: "Add YouTube videos, Shorts and Instagram Reels of your talks and sessions that play on your card: 8 videos on Gold, 25 on Platinum.", feature: "video" },
    { need: "Sessions and workshops priced clearly", how: "List each session, workshop or strategy call with a price, and a WhatsApp button that opens a chat with its name already typed in.", feature: "servicesWithPrices" },
    { need: "Enquiries in the prospect's own words", how: "Visitors send their name, number, email and what they need help with from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Following up after a workshop", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Two brands, two cards", how: "Platinum runs up to 3 cards from one login, each with its own link and QR: one for your coaching practice, one for your consulting firm.", feature: "multiCard" },
    { need: "Your card under every email you send", how: "Make a free email signature that links to your card, so every proposal and follow-up email carries your details.", feature: "emailSignature" },
  ],

  shareFlow: { kind: "handover-nfc", where: "workshop", client: "attendee" },

  faqs: [
    {
      q: "What should a consultant or coach put on a visiting card?",
      a: "Your name, what you coach or consult on and who it is for, your certifications stated as facts, the number you answer, your email and your LinkedIn. On a digital card, add your sessions and workshops with prices, a video of you speaking and an enquiry form. Leave out promises about results, and client names you do not have permission to use.",
    },
    {
      q: "Can I add videos of my talks or sessions?",
      a: "Yes. Add YouTube videos, Shorts and Instagram Reels that play on your card: 8 videos on Gold and 25 on Platinum. Upload the talk to YouTube or post the clip on Instagram first, then paste its link into your card. A keynote clip, a podcast episode or a short reel from a workshop all work, and the video plays on the card itself.",
    },
    {
      q: "How do I follow up with people who enquire?",
      a: "Every enquiry from your card lands in your Leads list. Open it, mark the stage, add a note about what they asked, set a follow-up date and reply by call or WhatsApp from the same screen. The dashboard shows which follow-ups are due, so the people from last week's workshop do not go quiet. Chats that start on WhatsApp stay in WhatsApp; the Leads list holds the form enquiries.",
    },
    {
      q: "Can I run separate cards for two brands?",
      a: "Yes, on Platinum, which runs up to 3 cards from one login, each with its own link and QR. Keep one card for your coaching practice and one for your consulting firm, with different designs, services and colours. Leads and analytics are kept per card, so you can see which brand a person came through.",
    },
    {
      q: "Can attendees book a session from the card?",
      a: "Not through a calendar; there is no slot picker on the card. Attendees ask for a session by tapping WhatsApp on the one they want, which opens a chat with its name already typed in, or by sending the enquiry form. If you already use a scheduling tool, a service button can open its link instead, so the card stays your front door.",
    },
    {
      q: "How much does a digital visiting card for a consultant cost?",
      a: "Free for 30 days with no payment details, then Gold is ₹99 a month or ₹999 a year. Platinum is ₹199 a month or ₹1,999 a year and adds 25 videos, a 60-photo gallery and up to 3 cards from one login, useful if you run a consulting practice and a coaching programme under different names. An NFC card to hand out at workshops is ₹499. Your link and QR stay the same when you upgrade.",
    },
  ],

  templateNatures: ["Consulting", "Finance & Tax", "Education"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my coaching practice",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["digital-agencies", "chartered-accountants", "schools-coaching"],
  relatedPosts: ["what-is-a-digital-visiting-card", "how-to-make-a-digital-visiting-card", "link-in-bio-vs-digital-business-card"],
};

export default consultants;
