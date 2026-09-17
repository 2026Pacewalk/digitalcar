import type { IndustryPage } from "../types";

/* Real Estate Agents & Property Dealers. Share flow: whatsapp-link (the card
   link sent in the chat after a site visit). RERA wording in conduct. */
export const realEstate: IndustryPage = {
  slug: "real-estate",
  name: "Real Estate Agents & Property Dealers",
  crumb: "Real Estate Agents",
  audience: "property dealers",
  group: "property-home",
  order: 3,

  h1: "Digital Visiting Card for Real Estate Agents",
  seoTitle: "Real Estate Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for property dealers: property photos, WhatsApp, directions, an enquiry form and a leads pipeline. Free for 30 days.",
  excerpt: "Property photos and walkthrough videos, WhatsApp, directions and an enquiry form, with every lead in one list.",
  answer: "A **digital visiting card for real estate agents** is one link with your name, agency, RERA number, property photos, videos and buttons to call, WhatsApp or get directions. Buyers open it from a WhatsApp message after a site visit, or by scanning your QR, and every enquiry from the card lands in your Leads list.",
  primaryKeyword: "real estate visiting card",
  keywords: [
    "property dealer visiting card",
    "real estate visiting card design",
    "digital business card for real estate agents",
    "real estate agent digital business card",
    "property dealer visiting card in hindi",
    "property dealer ka visiting card kaise banaye",
  ],
  searchTerms: ["property", "realtor", "broker", "builder", "flats", "rera"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#F7B31C", ink: "#92400E", icon: "building-2", motif: "skyline" },
  mockup: {
    img: "digital-business-card-real-estate",
    alt: "Rohit Malhotra, Realtor at Malhotra Properties: a sample DigitalCarda digital visiting card on a smartphone",
  },

  sample: {
    name: "Rohit Malhotra",
    role: "Realtor",
    org: "Malhotra Properties",
    services: ["Flats for sale", "Commercial spaces", "Site visits"],
  },

  pains: [
    {
      pain: "Buyers take your card at the site, but the flat photos are lost somewhere in the chat.",
      fix: "Your card carries a **photo gallery** that opens full screen, so one link shows every property you are selling.",
      feature: "gallery",
    },
    {
      pain: "A buyer wants to show the flat at home, but the walkthrough video is too heavy to send.",
      fix: "Add walkthroughs as YouTube videos, Shorts or Instagram Reels that play on your card. They forward the link instead.",
      feature: "video",
    },
    {
      pain: "Numbers from site visits pile up in your phone, and the follow-up call never happens.",
      fix: "Enquiries from your card land in your **Leads** list, where you set the stage, a note and a follow-up date.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "Your name, agency and a clear photo", why: "Buyers meet several dealers in a week. A face and a firm name help them remember who showed the flat.", part: "profile" },
    { item: "RERA registration number, if you have one", why: "A plain fact a buyer can check. Copy it exactly as issued by your state's RERA authority.", part: "profile" },
    { item: "The mobile number you answer on WhatsApp", why: "Buyers usually reply on WhatsApp after a site visit, so put that number on the WhatsApp button.", part: "actions" },
    { item: "Office address with a Maps link", why: "Buyers tap it for directions before a meeting instead of calling you for the route.", part: "actions" },
    { item: "The areas and property types you deal in", why: "Flats, plots, shops or rentals, and the localities you cover, so buyers know if you can help.", part: "about" },
    { item: "Properties as services, with photos and prices", why: "Each one gets a photo, a price and a WhatsApp button that opens a chat with the property name typed in.", part: "services" },
    { item: "An enquiry form for new buyers", why: "Buyers send their name, number and requirement, such as a two-bedroom flat near the metro.", part: "enquiry" },
    { item: "Your QR on site boards and flyers", why: "Anyone who scans it opens your card and can save your number in one tap.", part: "qr" },
  ],

  useCases: [
    { need: "Showing flats without flooding the chat", how: "Put property photos in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "Walkthroughs buyers can watch at home", how: "Add YouTube videos, Shorts and Instagram Reels of your properties that play on your card.", feature: "video" },
    { need: "Buyers asking about one specific property", how: "A property's button opens a WhatsApp chat with its name already typed in, so you know which flat they mean.", feature: "whatsapp" },
    { need: "Requirements collected in the buyer's words", how: "Buyers send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Following up after a site visit", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Buyers finding your office", how: "Buyers tap your address to open directions in Google Maps.", feature: "mapsLink" },
    { need: "Knowing whether the link you sent was opened", how: "See how many people opened your card, what they tapped and where they came from, such as WhatsApp or a QR scan.", feature: "analytics" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "site visit", client: "buyer" },

  conduct: {
    body: "your state's RERA authority (registration number)",
    note: "**Your state's RERA authority** registers agents and sets rules on how registered projects are advertised. If you are registered, show your registration number exactly as issued and describe properties factually. Rules differ between states, so check the current rules before you publish.",
    avoid: [],
  },

  faqs: [
    {
      q: "What should be written on a property dealer visiting card?",
      a: "Write your name, agency name, RERA registration number if you have one, the mobile number you answer on WhatsApp, your office address and the property types and localities you deal in. A digital card can also carry property photos, walkthrough videos and an enquiry form, which a printed card cannot.",
    },
    {
      q: "Should I add my RERA registration number?",
      a: "Yes, if you are registered, add it exactly as issued by your state's RERA authority. It is a plain fact a buyer can verify before dealing with you. Rules on where and how the number is shown differ between states, so check the current rules for your state. This is general information, not legal advice.",
    },
    {
      q: "Can I show property photos and videos on my card?",
      a: "Yes. Photos go into a gallery that opens full screen, with 20 photos on Gold and 60 on Platinum, and you can add YouTube videos, Shorts or Instagram Reels that play on the card. Swap them as properties sell; the link you already shared shows the new ones.",
    },
    {
      q: "How do buyers send me an enquiry?",
      a: "They fill the enquiry form on your card with their name, number, email and requirement, or tap WhatsApp to message you straight away. Form enquiries land in your Leads list, where you set the stage, add notes and pick a follow-up date. Buyers who leave an email get an automatic reply saying you received it.",
    },
    {
      q: "Property dealer ka visiting card kaise banaye?",
      a: "Sign up free, pick a design and add your name, agency, RERA number if registered, mobile number and office address. Add your properties as services with photos and prices, then send the card link on WhatsApp after every site visit. You can write the details in Hindi or any language; the buttons stay in English.",
    },
    {
      q: "How much does a digital visiting card for a property dealer cost?",
      a: "Free for 30 days with no payment details, so you can send it after every site visit this month before deciding. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos and 25 videos, enough for photos and a walkthrough of each listing. Your link and QR stay the same when you upgrade, so printed QRs keep working.",
    },
  ],

  templateNatures: ["Real Estate", "Interior Design"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my property business",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["interior-designers", "insurance-agents", "home-services"],
  relatedPosts: ["how-to-make-a-digital-visiting-card", "nfc-business-card-india", "visiting-card-design-ideas"],
};

export default realEstate;
