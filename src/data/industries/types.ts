/* The shape of a DigitalCarda industry page. Plain data: the same objects render
   the page (src/pages/public/IndustryPage.tsx), the hub, the server <head> and
   JSON-LD (api/lib/industry-meta.ts), sitemap.xml and the tests.
   Import-free (types only) so the server bundle can use it directly.
   Inline marks in answer / fix / how / why / note / faq answers:
     **bold** and [label](/path) only (rendered by src/components/blog/RichText). */

export const DEMO_NATURES = ["Real Estate", "Healthcare", "Consulting", "Restaurant", "Beauty & Salon", "Legal Services",
  "Finance & Tax", "Photography", "Fitness", "Interior Design", "Event Planning", "Fashion", "Cafe & Bakery",
  "Home Services", "Travel", "Education", "Automobile", "Jewellery", "IT & Digital", "Insurance & Loans"] as const;
/** A customer.nature value that src/lib/demoData.ts demoForProduct() actually returns. */
export type DemoNature = (typeof DEMO_NATURES)[number];

export type IndustryGroupId = "health" | "legal-finance" | "property-home" | "shops-food-travel" | "beauty-events" | "business-education";

export const INDUSTRY_ICON_KEYS = ["stethoscope", "activity", "scale", "calculator", "shield-check", "building-2", "sofa", "wrench",
  "utensils-crossed", "gem", "shirt", "car-front", "plane", "scissors", "brush", "party-popper", "camera", "megaphone",
  "briefcase-business", "graduation-cap"] as const;
export type IndustryIconKey = (typeof INDUSTRY_ICON_KEYS)[number];

export const MOTIF_KEYS = ["pulse", "motion", "columns", "ledger", "shield", "skyline", "plan", "bolt", "steam", "facets", "stitch",
  "road", "route", "sparkle", "brush", "confetti", "aperture", "nodes", "compass", "ruled"] as const;
export type MotifKey = (typeof MOTIF_KEYS)[number];

export const PERSONA_IMAGES = ["digital-business-card-doctors-clinics", "digital-business-card-real-estate",
  "digital-business-card-agencies-freelancers", "digital-business-card-restaurants-retail",
  "digital-business-card-salons-spas", "digital-business-card-coaches-consultants"] as const;
/** File stem in public/hero/personas (both .webp and .png exist, 640×960). */
export type PersonaImg = (typeof PERSONA_IMAGES)[number];

export type FeatureKey =
  | "call" | "whatsapp" | "saveContact" | "qr" | "shareLink" | "enquiryForm" | "leadsPipeline" | "analytics"
  | "servicesWithPrices" | "gallery" | "video" | "offers" | "reviewButton" | "paymentQr" | "mapsLink" | "socials"
  | "nfcCard" | "nfcStandee" | "customDomain" | "multiCard" | "bulkCards" | "emailSignature" | "whatsappTemplates" | "aiGenerator";

export type FeaturePlan = "all-plans" | "platinum" | "add-on" | "bulk" | "free-tool";
export type Feature = {
  key: FeatureKey;
  label: string;        // ≤ 28, e.g. "Save contact"
  text: string;         // the ONLY approved wording for this feature (≤ 200)
  href: string;         // a real page: /features, /pricing, /bulk-cards, /custom-domain, /email-signature-generator …
  plan: FeaturePlan;
  icon: "phone" | "message-circle" | "contact-round" | "qr-code" | "link-2" | "clipboard-list" | "inbox" | "chart-column"
      | "tag" | "images" | "circle-play" | "badge-percent" | "message-square-text" | "scan-qr-code" | "map-pin" | "share-2"
      | "nfc" | "smartphone-nfc" | "globe" | "id-card" | "users" | "mail" | "file-text" | "wand-sparkles";
};

/** Which part of the sample phone card a checklist item points at. */
export type CardPart = "profile" | "actions" | "about" | "services" | "gallery" | "enquiry" | "qr" | "socials";

/** How the storyboard shows a first contact. counter-qr = QR standee at a counter;
    whatsapp-link = card link sent in a chat; handover-nfc = NFC card / QR on its back at a meeting. */
export type ShareFlowKind = "counter-qr" | "whatsapp-link" | "handover-nfc";

export type IndustryPage = {
  /** URL segment: /^[a-z0-9-]+$/, ≤ 40. Never change after launch. */
  slug: string;
  /** Full display name (hub card, H1 source, JSON-LD audience), ≤ 44. */
  name: string;
  /** Breadcrumb + short label, ≤ 28. */
  crumb: string;
  /** Plural, lowercase, used in headings: "doctors", "property dealers". ≤ 28. */
  audience: string;
  group: IndustryGroupId;
  /** Hub order (search-demand rank). Unique integer. */
  order: number;

  /** On-page H1, digital wording, ≤ 70. */
  h1: string;
  /** <title>, ≤ 60. */
  seoTitle: string;
  /** Meta description, ≤ 155. */
  description: string;
  /** One line for the hub card, ≤ 110. */
  excerpt: string;
  /** Printed under the H1: answers "what is a digital visiting card for X". 40–60 words. */
  answer: string;
  /** The print term this page targets, e.g. "doctor visiting card". */
  primaryKeyword: string;
  /** Secondary terms, 4–8. Guidance for copy only; never rendered as a keyword list or meta keywords. */
  keywords: string[];
  /** Extra lowercase words the hub search matches (2–8). */
  searchTerms: string[];
  /** YYYY-MM-DD, the real date the page went live / was materially edited. Never backdated. */
  publishedAt: string;
  updatedAt: string;

  theme: {
    /** Glows, tints (append 14/1A/33 alpha), icon tiles. #RRGGBB */
    accent: string;
    /** Text on white in the accent's hue, ≥ 4.5:1 contrast. #RRGGBB */
    ink: string;
    icon: IndustryIconKey;
    motif: MotifKey;
  };
  /** Real persona phone screenshot, shown on the hub card only. */
  mockup?: { img: PersonaImg; alt: string };

  /** Fictional person/business for the HTML sample card. No numbers, no real businesses. */
  sample: { name: string; role: string; org: string; services: [string, string, string] };

  /** "Paper card → digital card" rows. Exactly 3. pain ≤ 90, fix ≤ 130. */
  pains: [IndustryPain, IndustryPain, IndustryPain];
  /** "What to put on a {audience} visiting card", 5–8 items. item ≤ 60, why ≤ 120. */
  checklist: { item: string; why: string; part: CardPart }[];
  /** Use-case table rows, 5–7. need ≤ 60, how ≤ 140 (must agree with FEATURES[feature].text). */
  useCases: { need: string; how: string; feature: FeatureKey }[];
  /** Storyboard. where ≤ 24 ("reception desk"), client ≤ 16 singular ("patient"). */
  shareFlow: { kind: ShareFlowKind; where: string; client: string };
  /** Regulated professions only. note ≤ 320; avoid = feature keys this page must not use anywhere. */
  conduct?: { body: string; note: string; avoid: FeatureKey[] };
  /** 4–7. q ≤ 90, a 25–90 words, first sentence answers directly. */
  faqs: { q: string; a: string }[];
  /** Catalogue designs to show, in priority order (1–3). */
  templateNatures: DemoNature[];
  /** Pre-filled WhatsApp text, ≤ 90, no personal data. */
  whatsappText: string;
  /** Show the NFC standee first in "Share it everywhere". */
  nfcFit: boolean;
  /** Show bulk team cards in "Share it everywhere" and CTA microcopy. */
  bulkFit: boolean;
  /** Exactly 3 other slugs. */
  relatedIndustries: [string, string, string];
  /** 1–3 slugs from src/data/blog/posts. */
  relatedPosts: string[];
};
export type IndustryPain = { pain: string; fix: string; feature: FeatureKey };
