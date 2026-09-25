/**
 * Data behind /vs/:slug pages. Head-to-head comparisons help capture
 * bottom-funnel searches like "DigitalCarda vs Linktree" and rank alongside
 * alternative-tool queries.
 */

export type ComparisonRow = {
  label: string;
  ours: string;
  theirs: string;
  /** True when we have something they don't — the page marks the row. */
  win?: boolean;
};

export type ComparisonPage = {
  slug: string;
  competitor: string;
  quickAnswer: string;
  rows: ComparisonRow[];
  usDescription: string;
  themDescription: string;
  /** When their prices were last checked, and where — so the claim can be re-checked. */
  pricedOn: string;
  priceSource: string;
};

export const COMPARISONS: ComparisonPage[] = [
  {
    slug: "linktree",
    competitor: "Linktree",
    quickAnswer:
      "Linktree is a global link-in-bio tool built for creators. DigitalCarda is a digital business card built for Indian businesses — the same stack of links, plus WhatsApp, UPI payments, an enquiry form, a services catalogue and printed NFC cards. Linktree's paid plans start at ₹220/month billed yearly; DigitalCarda is ₹999 a year (₹99/month) after a 30-day free trial. If you take enquiries and payments in India, DigitalCarda covers the parts Linktree was never built for.",
    rows: [
      { label: "Starting price in India", ours: "₹999/year (₹99/mo)", theirs: "₹220/mo billed yearly, ₹360 monthly", win: true },
      { label: "Free to try", ours: "30 days, no card details", theirs: "Free tier; 7-day trial on paid plans" },
      { label: "WhatsApp button, message ready", ours: "Built in", theirs: "Plain link only", win: true },
      { label: "UPI, GPay and PhonePe payments", ours: "Built in", theirs: "Card checkout for digital products", win: true },
      { label: "Enquiry form into your dashboard", ours: "Yes", theirs: "Mailing-list signup", win: true },
      { label: "Save Contact (vCard)", ours: "Yes", theirs: "No", win: true },
      { label: "Services and product catalogue", ours: "Photos, price and a Buy button", theirs: "Digital products, with seller fees" },
      { label: "Printed NFC card", ours: "₹499, free India delivery", theirs: "Not sold", win: true },
      { label: "Your own domain", ours: "₹499 one-time add-on", theirs: "Not listed on their pricing page" },
      { label: "Reseller programme", ours: "20% on every plan", theirs: "Not offered", win: true },
      { label: "Built for", ours: "Indian businesses", theirs: "Global creators" },
    ],
    usDescription: "You run a business in India — doctors, real estate, jewellers, boutiques, salons, restaurants, coaches. You take WhatsApp enquiries and UPI payments. You want to capture leads and follow up. You network face-to-face and want an NFC card.",
    themDescription: "You are a creator, musician or influencer with a global audience. You mainly need a tidy stack of links from an Instagram or TikTok bio and sell digital downloads — and don't need UPI, WhatsApp or an NFC card posted to an Indian address.",
    pricedOn: "20 September 2026",
    priceSource: "linktr.ee/pricing (prices shown for India)",
  },
  {
    slug: "hihello",
    competitor: "HiHello",
    quickAnswer:
      "HiHello is a US-first digital business card, priced in dollars and built around networking and email signatures. DigitalCarda is built for India: ₹999 a year, with WhatsApp and UPI on the card, a services catalogue, and NFC cards delivered free across India. HiHello's paid plan is $6 a month (about ₹530), and its printed cards ship from the US.",
    rows: [
      { label: "Paid plan", ours: "₹999/year (₹99/mo)", theirs: "$6/month, $72 billed yearly (≈ ₹530/mo)", win: true },
      { label: "Free to try", ours: "30-day full trial, no card details", theirs: "Free plan: 4 cards, 5 scans a month" },
      { label: "WhatsApp button, message ready", ours: "Built in", theirs: "Not built in", win: true },
      { label: "UPI, GPay and PhonePe payments", ours: "Built in", theirs: "Not offered", win: true },
      { label: "Printed NFC card in India", ours: "₹499, free India delivery", theirs: "Ships from the US", win: true },
      { label: "Services and product catalogue", ours: "Photos, price and a Buy button", theirs: "Not offered", win: true },
      { label: "Enquiry form into your dashboard", ours: "Yes", theirs: "Contact exchange and enrichment" },
      { label: "Email signature", ours: "Free signature generator", theirs: "Included on paid plans" },
      { label: "Reseller programme", ours: "20% on every plan", theirs: "Not offered", win: true },
      { label: "Built for", ours: "Indian businesses", theirs: "US and global networking" },
    ],
    usDescription: "You're in India and take WhatsApp enquiries or UPI payments. You want a card in Hindi or a regional language. You want NFC cards shipped to Indian pin codes.",
    themDescription: "You network mostly in the US or Europe, live on LinkedIn and email, and want company-wide email signatures, virtual backgrounds and directory sync for a large team.",
    pricedOn: "20 September 2026",
    priceSource: "hihello.com/pricing",
  },
  {
    slug: "beaconstac",
    competitor: "Beaconstac",
    quickAnswer:
      "Beaconstac (now Uniqode) is a US QR-code platform that also sells digital business cards, priced per user in dollars. DigitalCarda does one thing — the digital visiting card — for Indian businesses, at ₹999 a year, with WhatsApp, UPI, a services catalogue and NFC cards delivered inside India. If you are a shop, clinic or agency rather than a large company, the fit is very different.",
    rows: [
      { label: "Pricing", ours: "₹999/year (₹99/mo), shown openly", theirs: "Per user in USD, quoted on their site", win: true },
      { label: "Free to try", ours: "30-day full trial, no card details", theirs: "Free trial on their plans" },
      { label: "WhatsApp button, message ready", ours: "Built in", theirs: "Not built in", win: true },
      { label: "UPI, GPay and PhonePe payments", ours: "Built in", theirs: "Not built in", win: true },
      { label: "Printed NFC card in India", ours: "₹499, free India delivery", theirs: "US catalogue", win: true },
      { label: "Services and product catalogue", ours: "Photos, price and a Buy button", theirs: "QR landing pages" },
      { label: "Reseller programme", ours: "20% on every plan", theirs: "Partner programme" },
      { label: "Best fit", ours: "Indian shops, clinics and agencies", theirs: "Large US and global teams" },
    ],
    usDescription: "You're an Indian professional or SMB owner. You need WhatsApp, UPI and a card that ships to Indian pin codes without an enterprise contract.",
    themDescription: "You are buying for a large organisation that needs hundreds of team cards, a full QR-code platform behind them, single sign-on, CRM integrations and security paperwork.",
    pricedOn: "20 September 2026",
    priceSource: "uniqode.com/pricing",
  },
];

export function getComparison(slug: string): ComparisonPage | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
