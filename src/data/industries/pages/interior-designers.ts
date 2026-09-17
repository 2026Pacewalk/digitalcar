import type { IndustryPage } from "../types";

/* Interior Designers & Architects. Share flow: whatsapp-link (the card link sent
   in the chat after the first meeting). Architects are regulated: factual
   wording and no offers (see conduct). */
export const interiorDesigners: IndustryPage = {
  slug: "interior-designers",
  name: "Interior Designers & Architects",
  crumb: "Interior Designers",
  audience: "interior designers",
  group: "property-home",
  order: 18,

  h1: "Digital Visiting Card for Interior Designers & Architects",
  seoTitle: "Interior Designer Visiting Card: Digital | DigitalCarda",
  description: "A digital visiting card for interior designers and architects: project gallery, videos, services, WhatsApp and an enquiry form. Free for 30 days.",
  excerpt: "A project gallery, walkthrough videos, services and an enquiry form, sent as one link after the first meeting.",
  answer: "A **digital visiting card for interior designers and architects** is one link with your name, studio, a gallery of finished projects, walkthrough videos, your services and buttons to call, WhatsApp or send an enquiry. Clients open it from a link you send on WhatsApp after the first meeting and see your work, not a logo on paper.",
  primaryKeyword: "interior designer visiting card",
  keywords: [
    "architect visiting card",
    "interior design visiting card maker",
    "visiting card for interior design company",
    "architect visiting card design",
    "visiting card for architecture firm",
  ],
  searchTerms: ["architect", "interiors", "modular kitchen", "furniture", "decor"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#78716C", ink: "#44403C", icon: "sofa", motif: "plan" },

  sample: {
    name: "Sneha Reddy",
    role: "Interior Designer",
    org: "Studio Nivas",
    services: ["Home interiors", "Modular kitchens", "Office design"],
  },

  pains: [
    {
      pain: "After the first meeting a client asks for \"some photos\", and you send thirty.",
      fix: "Your card carries a **photo gallery** that opens full screen, so one link shows your best finished projects, room by room.",
      feature: "gallery",
    },
    {
      pain: "A logo on a paper card says nothing about how a home you finished actually looks.",
      fix: "Add walkthroughs as YouTube videos, Shorts or Instagram Reels that play on your card, right next to your services.",
      feature: "video",
    },
    {
      pain: "Enquiries arrive as \"Hi, need interiors for 3BHK, budget?\" with no name, area or timeline.",
      fix: "The **enquiry form** collects name, number, email and requirement, and each one lands in your Leads list for follow-up.",
      feature: "enquiryForm",
    },
  ],

  checklist: [
    { item: "Your name, studio and what you design", why: "Homes, offices, modular kitchens or full architecture: say it in one line so a client knows they have the right studio.", part: "profile" },
    { item: "Your Council of Architecture number, if an architect", why: "A plain fact for registered architects. Copy it exactly as issued. Interior designers without one simply leave this out.", part: "profile" },
    { item: "Your best projects in the gallery", why: "Finished rooms, before-and-after pairs and close-ups. Clients judge a designer by the photos, so pick only the best.", part: "gallery" },
    { item: "A walkthrough video or reel", why: "A YouTube walkthrough or Instagram Reel of a finished home plays on the card, showing scale and light as photos cannot.", part: "gallery" },
    { item: "Services with a starting price, if you quote one", why: "Home interiors, modular kitchens or office design. A starting price saves both sides a call when budgets do not match.", part: "services" },
    { item: "The WhatsApp number where you talk to clients", why: "Most interior enquiries continue on WhatsApp with floor plans and photos. Put that number on the WhatsApp button.", part: "actions" },
    { item: "Studio address and your Instagram", why: "Clients tap the address for directions to a meeting, and the Instagram link shows your latest work between card updates.", part: "socials" },
    { item: "An enquiry form that asks for the requirement", why: "Name, number, email and a line about the flat or office, so your first call starts with the facts.", part: "enquiry" },
  ],

  useCases: [
    { need: "Showing finished projects in one link", how: "Put project photos in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.", feature: "gallery" },
    { need: "Walkthroughs clients can watch at home", how: "Add YouTube videos, Shorts and Instagram Reels of finished homes and offices that play on your card.", feature: "video" },
    { need: "Services with a starting price", how: "List home interiors, modular kitchens or office design with photos and a starting price, each with a button to call or WhatsApp.", feature: "servicesWithPrices" },
    { need: "Requirements collected before the first call", how: "Clients send their name, number, email and requirement from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Clients asking about one service", how: "A service button opens a WhatsApp chat with its name already typed in, such as \"Home interiors\", so you know what they want.", feature: "whatsapp" },
    { need: "Your Instagram and other profiles in one place", how: "Link Instagram, Facebook, YouTube, LinkedIn and more, so clients see your latest work between card updates.", feature: "socials" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "first meeting", client: "client" },

  conduct: {
    body: "Council of Architecture (architects)",
    note: "The **Council of Architecture** sets rules on how registered architects may publicise a practice. Keep it factual: name, registration, services, studio address and project photos, with no offers or discounts. Interior designers who are not architects are not bound by it. Check the current rules before you publish.",
    avoid: ["offers"],
  },

  faqs: [
    {
      q: "What should an interior designer's visiting card include?",
      a: "Your name, studio, what you design, the WhatsApp number clients reach you on, your studio address and, if you are an architect, your Council of Architecture registration. A digital card adds the part a paper card cannot: a gallery of finished projects, a walkthrough video, services with a starting price, your Instagram and an enquiry form. Let the photos do the talking and keep the text short.",
    },
    {
      q: "Can I show my project portfolio on the card?",
      a: "Yes. Photos go into a gallery that opens full screen, with 20 photos on Gold and 60 on Platinum, and you can add YouTube walkthroughs, Shorts or Instagram Reels that play on the card. Add the newest work first, since photos show in the order you add them, and swap photos as projects finish; the link you already shared shows the new ones. Your Instagram link sits on the card too, for everything else.",
    },
    {
      q: "Can architects in India use a digital visiting card?",
      a: "Yes, as a factual card with your name, registration, services, studio address and photos of your work. The Council of Architecture sets rules on how registered architects may publicise their practice, so leave out offers and discounts and check the current rules before you publish. Interior designers without a registration are not covered by those rules. This is general information, not legal advice.",
    },
    {
      q: "How do clients share their requirement with me?",
      a: "Through the enquiry form on your card, which takes their name, number, email and a line about the flat or office, or by tapping WhatsApp to message you directly. Form enquiries land in your Leads list, where you set a stage, add notes and pick a follow-up date, and a client who leaves an email gets an automatic reply saying you received it. Floor plans and photos then follow on WhatsApp.",
    },
    {
      q: "How much does a digital visiting card for an interior designer cost?",
      a: "Free for 30 days with no payment details. After that, Gold is ₹99 a month or ₹999 a year with a 20-photo gallery and 8 videos, and Platinum is ₹199 a month or ₹1,999 a year with 60 photos, 25 videos and up to 3 cards from one login, which suits a studio that wants separate cards for its architecture and interiors work. Putting the card on your own domain is a one-time ₹499. Your link and QR stay the same when you upgrade.",
    },
    {
      q: "Can I put the card on my studio's own domain?",
      a: "Yes. Put your card on your own domain for a one-time ₹499, free on Platinum 3-Year. We give you one DNS record to add at your registrar, and our team connects the domain with HTTPS. See [custom domains](/custom-domain) for the steps and timing.",
    },
  ],

  templateNatures: ["Interior Design", "Real Estate"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my interior design studio",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["real-estate", "home-services", "photographers"],
  relatedPosts: ["visiting-card-design-ideas", "link-in-bio-vs-digital-business-card", "how-to-make-a-digital-visiting-card"],
};

export default interiorDesigners;
