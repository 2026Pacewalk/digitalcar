/**
 * Data behind /vs/:slug pages. Head-to-head comparisons help capture
 * bottom-funnel searches like "DigitalCarda vs Linktree" and rank alongside
 * alternative-tool queries.
 */

export type ComparisonRow = { label: string; ours: string; theirs: string };

export type ComparisonPage = {
  slug: string;
  competitor: string;
  quickAnswer: string;
  rows: ComparisonRow[];
  usDescription: string;
  themDescription: string;
};

export const COMPARISONS: ComparisonPage[] = [
  {
    slug: "linktree",
    competitor: "Linktree",
    quickAnswer:
      "Linktree is a global link-in-bio tool built for creators. DigitalCarda is a digital business card built for Indian professionals — a stack of links plus WhatsApp, UPI payments, lead capture, NFC cards, Hindi content, and Indian pricing (starts ₹99/month vs Linktree's ~₹500/month for paid features). For a business in India, DigitalCarda wins on cost, payments and lead capture.",
    rows: [
      { label: "Starting price (India)", ours: "₹99/month", theirs: "~₹500/month for paid" },
      { label: "Free trial", ours: "30-day full free trial", theirs: "Limited free tier" },
      { label: "WhatsApp button (pre-fill)", ours: "Native", theirs: "Manual link only" },
      { label: "UPI, GPay, Paytm payments", ours: "Native", theirs: "Not supported" },
      { label: "Lead capture form → dashboard", ours: "Yes", theirs: "No" },
      { label: "Save Contact / vCard", ours: "Yes", theirs: "No" },
      { label: "Product / service catalogue", ours: "With price and CTA", theirs: "No" },
      { label: "NFC printed card", ours: "₹499", theirs: "Not sold" },
      { label: "Custom domain", ours: "All paid tiers", theirs: "Higher tier only" },
      { label: "Hindi and regional languages", ours: "AI translation", theirs: "No" },
      { label: "White-label / reseller", ours: "20–30% recurring", theirs: "No" },
      { label: "Made for", ours: "Indian professionals", theirs: "Global creators" },
    ],
    usDescription: "You run a business in India — doctors, real estate, jewellers, boutiques, salons, restaurants, coaches. You take WhatsApp enquiries and UPI payments. You want to capture leads and follow up. You network face-to-face and want an NFC card.",
    themDescription: "You are a global influencer, creator, musician or content maker. Your audience is outside India and you don't need UPI or WhatsApp. You only need a stack of external links, nothing else.",
  },
  {
    slug: "hihello",
    competitor: "HiHello",
    quickAnswer:
      "HiHello is a US-first digital business card, priced in dollars and built for LinkedIn-style networking. DigitalCarda is India-first, priced at ₹99/month, with WhatsApp, UPI, Hindi content and free NFC card delivery across India. For an Indian professional, DigitalCarda is cheaper, faster to set up locally, and has the payment and messaging channels Indian customers actually use.",
    rows: [
      { label: "Pricing", ours: "₹99/month", theirs: "$6+/month (~₹500)" },
      { label: "Free trial", ours: "30 days, no card", theirs: "Limited free plan" },
      { label: "WhatsApp button", ours: "Native", theirs: "Not native" },
      { label: "UPI / Razorpay / Paytm", ours: "Yes", theirs: "No" },
      { label: "NFC card delivery in India", ours: "₹499, free shipping", theirs: "US shipping only" },
      { label: "Hindi + regional languages", ours: "AI translation", theirs: "No" },
      { label: "Product catalogue", ours: "Yes", theirs: "Limited" },
      { label: "Lead capture form", ours: "Yes → dashboard", theirs: "Contact exchange" },
      { label: "Reseller program", ours: "20–30% recurring", theirs: "No" },
      { label: "Made for", ours: "Indian professionals", theirs: "US/global networking" },
    ],
    usDescription: "You're in India and take WhatsApp enquiries or UPI payments. You want a card in Hindi or a regional language. You want NFC cards shipped to Indian pin codes.",
    themDescription: "You're US-based and network mostly on LinkedIn. You need Salesforce or HubSpot deep integration on the enterprise plan.",
  },
  {
    slug: "beaconstac",
    competitor: "Beaconstac",
    quickAnswer:
      "Beaconstac (now Uniqode) is an enterprise QR-code platform with digital business cards as one product. DigitalCarda is a focused digital business card built for Indian professionals. For SMB use in India, DigitalCarda is 5–10× cheaper, integrates natively with WhatsApp and UPI, and ships NFC cards inside India — where Beaconstac's enterprise pricing and US-first delivery don't fit.",
    rows: [
      { label: "Starting price", ours: "₹99/month", theirs: "$5+/user/month enterprise" },
      { label: "Free trial", ours: "30 days, no card", theirs: "14 days, card required" },
      { label: "WhatsApp button", ours: "Native", theirs: "Manual" },
      { label: "UPI payments", ours: "Native", theirs: "Not native" },
      { label: "NFC card in India", ours: "₹499, free ship", theirs: "US catalogue" },
      { label: "Hindi content + AI translate", ours: "Yes", theirs: "No" },
      { label: "White-label reseller", ours: "20–30% recurring", theirs: "Partner tier only" },
      { label: "Best fit", ours: "Indian SMB & professionals", theirs: "US/global enterprise" },
    ],
    usDescription: "You're an Indian professional or SMB owner. You need WhatsApp, UPI and a card that ships to Indian pin codes without an enterprise contract.",
    themDescription: "You're an enterprise buyer needing 500+ team cards with SSO, CRM integrations and SOC-2 audit reports.",
  },
];

export function getComparison(slug: string): ComparisonPage | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
