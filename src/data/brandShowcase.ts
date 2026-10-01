/*
 * "Big brand" sample cards for the public showcase at /big-brand-cards.
 *
 * Every brand here is FICTIONAL. The names were searched and match no real
 * company; numbers are clearly fake (+91 90000 0xxxx), addresses are an area and
 * city only, and every email, website and UPI id is on example.com / @examplebank.
 * We never put a real company's name, logo or details on a sample card — the page
 * exists to show how a LARGE business would look on a DigitalCarda card, not to
 * imply any brand uses us.
 *
 * Prices are realistic for the Indian market so the samples feel true to life.
 */

export type BrandProduct = {
  name: string;
  description: string;
  /** Rupees, digits only. Leave empty for "enquire" style rows. */
  price?: string;
  offerPrice?: string;
};

export type BrandShowcase = {
  slug: string;
  /** Fictional brand name. */
  name: string;
  /** Two-letter monogram used as the logo tile. */
  monogram: string;
  category: string;
  /** Short line under the name on the card. */
  designation: string;
  tagline: string;
  about: string;
  specialities: string[];
  products: BrandProduct[];
  offer: { title: string; description: string };
  /** Brand colours used for the card and the tile. */
  primary: string;
  secondary: string;
  /** Design (template) number this brand is shown on. Premium designs (48+). */
  style: number;
  /** Brand logo, public/brands/<slug>.svg (drawn for the demo, not a real mark). */
  logo: string;
  /** Photos for the first products, in order (licensed Unsplash set in public/demo). */
  photos?: string[];
  /** Gallery photos. */
  gallery?: string[];
  /** Head-office area + city. */
  area: string;
  phone: string;
  email: string;
  website: string;
  upi: string;
  established: string;
  /** Three facts shown beside the card. */
  stats: { label: string; value: string }[];
  /** Why this card suits a brand of this size. */
  why: string[];
};

export const BRANDS: BrandShowcase[] = [
  {
    slug: "voltessa-electronics",
    name: "Voltessa Electronics",
    monogram: "VE",
    category: "Electronics & appliances",
    designation: "Televisions · Appliances · Service",
    tagline: "A national appliance brand on one card",
    about:
      "Voltessa builds televisions, refrigerators, washing machines and air conditioners for Indian homes, sold through 1,200 dealer counters and serviced by a network that covers 480 cities. The card carries the full range, the current offers, the nearest service centre and the complaint line.",
    specialities: ["Smart TVs", "Refrigerators", "Washing machines", "Air conditioners", "Service network"],
    products: [
      { name: "55\" 4K Smart TV — Aurora Series", description: "Dolby Vision, 2-year warranty, free installation", price: "42990", offerPrice: "38490" },
      { name: "265L Frost-Free Refrigerator", description: "5-star rated, convertible freezer, 10-year compressor warranty", price: "28990", offerPrice: "" },
      { name: "7 kg Front-Load Washing Machine", description: "Inverter motor, 15 wash programmes, steam wash", price: "31490", offerPrice: "28990" },
      { name: "1.5 Ton Inverter AC — 5 Star", description: "Copper condenser, self-clean, free standard installation", price: "38990", offerPrice: "35990" },
      { name: "Extended Warranty — 2 Years", description: "Parts and labour cover on any Voltessa appliance", price: "2499", offerPrice: "" },
      { name: "Book a Service Visit", description: "Technician at your door, usually the same day", price: "", offerPrice: "" },
    ],
    offer: { title: "Festive exchange bonus", description: "Up to ₹6,000 off when you exchange your old appliance at any Voltessa counter." },
    primary: "#1D4ED8",
    secondary: "#0B1120",
    style: 48,
    logo: "/brands/voltessa-electronics.svg",
    area: "Whitefield, Bengaluru 560066",
    phone: "+91 90000 00301",
    email: "care@voltessa.example.com",
    website: "https://voltessa.example.com",
    upi: "voltessa@examplebank",
    established: "2004",
    stats: [
      { label: "Dealer counters", value: "1,200" },
      { label: "Cities serviced", value: "480" },
      { label: "Products on the card", value: "6" },
    ],
    why: [
      "One link on every dealer board, invoice and service sticker",
      "Product range with prices and festive offers, updated centrally",
      "Service bookings land in one dashboard instead of a call centre queue",
    ],
  },
  {
    slug: "bhojly",
    name: "Bhojly",
    monogram: "BH",
    category: "Food delivery",
    designation: "Food delivery · 60+ cities",
    tagline: "A delivery app's card, built for partners",
    about:
      "Bhojly delivers from 42,000 restaurant partners across 60 cities. This card is the one the partnerships team shares — restaurant sign-up, rider jobs, corporate orders and the support line, all on a single link that goes in every WhatsApp conversation.",
    specialities: ["Restaurant partnerships", "Rider jobs", "Corporate orders", "City launches", "Support"],
    products: [
      { name: "List your restaurant", description: "Go live in 48 hours. No setup fee for the first 3 months", price: "", offerPrice: "" },
      { name: "Bhojly for Business", description: "Team meal accounts with GST invoices and one monthly bill", price: "", offerPrice: "" },
      { name: "Rider partner sign-up", description: "Flexible hours, weekly payouts, fuel and insurance support", price: "", offerPrice: "" },
      { name: "Bhojly Plus — yearly", description: "Free delivery over ₹199 and member-only prices", price: "999", offerPrice: "699" },
      { name: "Advertise on Bhojly", description: "Sponsored placement in your city, billed per click", price: "", offerPrice: "" },
      { name: "Help & order support", description: "Order, refund or partner issue — we answer on WhatsApp", price: "", offerPrice: "" },
    ],
    offer: { title: "Zero commission for 30 days", description: "New restaurant partners pay no commission on their first month of orders." },
    primary: "#E11D48",
    secondary: "#4C0519",
    style: 51,
    logo: "/brands/bhojly.svg",
    photos: ["/demo/restaurant/svc-1.webp", "/demo/cafe/svc-2.webp", "/demo/restaurant/svc-3.webp"],
    gallery: ["/demo/restaurant/gal-1.webp", "/demo/cafe/gal-1.webp"],
    area: "Powai, Mumbai 400076",
    phone: "+91 90000 00302",
    email: "partners@bhojly.example.com",
    website: "https://bhojly.example.com",
    upi: "bhojly@examplebank",
    established: "2016",
    stats: [
      { label: "Restaurant partners", value: "42,000" },
      { label: "Cities", value: "60" },
      { label: "Links to share", value: "1" },
    ],
    why: [
      "The partnerships team shares one link instead of six PDFs",
      "Sign-ups arrive as leads, tagged by which button was tapped",
      "City teams can be given their own card under the same brand",
    ],
  },
  {
    slug: "crustora-pizza",
    name: "Crustora Pizza",
    monogram: "CP",
    category: "Restaurant chain",
    designation: "Wood-fired pizza · 310 outlets",
    tagline: "A pizza chain with a card per outlet",
    about:
      "Crustora runs 310 outlets across India, each with its own delivery radius, timings and offers. The brand card carries the menu, today's deals and the nearest outlet — and every franchise gets the same card with its own number and address.",
    specialities: ["Wood-fired pizza", "Veg & non-veg menu", "Party boxes", "Franchise enquiries", "30-min delivery"],
    products: [
      { name: "Margherita Classic — Medium", description: "Hand-stretched base, San Marzano sauce, buffalo mozzarella", price: "329", offerPrice: "279" },
      { name: "Paneer Tikka Supreme — Large", description: "Tandoori paneer, onion, capsicum, mint drizzle", price: "599", offerPrice: "" },
      { name: "Family Feast Box", description: "2 large pizzas, garlic bread, dip and a 750ml drink", price: "999", offerPrice: "849" },
      { name: "Cheesy Garlic Bread", description: "Stone-baked, four-cheese blend, served with dip", price: "189", offerPrice: "" },
      { name: "Franchise enquiry", description: "Investment, location support and training — ask for the deck", price: "", offerPrice: "" },
      { name: "Party & office catering", description: "20 to 500 guests. Custom menu and on-time delivery", price: "", offerPrice: "" },
    ],
    offer: { title: "Buy 1 get 1 — every Tuesday", description: "On all medium pizzas, dine-in and takeaway, at every Crustora outlet." },
    primary: "#DC2626",
    secondary: "#450A0A",
    style: 52,
    logo: "/brands/crustora-pizza.svg",
    photos: ["/demo/restaurant/svc-1.webp", "/demo/restaurant/svc-2.webp", "/demo/restaurant/svc-3.webp", "/demo/restaurant/svc-4.webp"],
    gallery: ["/demo/restaurant/gal-1.webp", "/demo/restaurant/gal-2.webp"],
    area: "Koregaon Park, Pune 411001",
    phone: "+91 90000 00303",
    email: "hello@crustora.example.com",
    website: "https://crustora.example.com",
    upi: "crustora@examplebank",
    established: "2011",
    stats: [
      { label: "Outlets", value: "310" },
      { label: "Cities", value: "74" },
      { label: "Menu items on card", value: "6" },
    ],
    why: [
      "Each outlet gets the same branded card with its own number and address",
      "Menu and offers change centrally — no reprinting 310 standees",
      "Franchise enquiries come in as leads, not lost phone calls",
    ],
  },
  {
    slug: "varnika-group",
    name: "Varnika Group",
    monogram: "VG",
    category: "Conglomerate",
    designation: "Infrastructure · Energy · Retail",
    tagline: "A group card that opens every door",
    about:
      "Varnika Group is a family-held conglomerate with businesses in infrastructure, renewable energy, retail and logistics, employing 18,000 people. Its card is the one directors hand over — group companies, investor contacts, the press desk and careers, in one place.",
    specialities: ["Infrastructure", "Renewable energy", "Retail", "Logistics", "CSR foundation"],
    products: [
      { name: "Varnika Infra", description: "Highways, metro depots and industrial parks across 9 states", price: "", offerPrice: "" },
      { name: "Varnika Energy", description: "1.2 GW of solar and wind capacity, with storage projects underway", price: "", offerPrice: "" },
      { name: "Varnika Retail", description: "Supermarkets and fashion formats in 40 cities", price: "", offerPrice: "" },
      { name: "Varnika Logistics", description: "Cold chain and contract warehousing, 6 million sq ft", price: "", offerPrice: "" },
      { name: "Investor relations", description: "Annual reports, results and the IR team's direct line", price: "", offerPrice: "" },
      { name: "Careers at Varnika", description: "Open roles across group companies and campus hiring", price: "", offerPrice: "" },
    ],
    offer: { title: "Group profile 2026", description: "Download the latest group profile and sustainability report." },
    primary: "#0F766E",
    secondary: "#042F2E",
    style: 48,
    logo: "/brands/varnika-group.svg",
    photos: ["/demo/realestate/svc-1.webp", "/demo/realestate/svc-2.webp", "/demo/interior/svc-3.webp"],
    gallery: ["/demo/realestate/gal-1.webp", "/demo/realestate/gal-2.webp"],
    area: "Nariman Point, Mumbai 400021",
    phone: "+91 90000 00304",
    email: "corporate@varnika.example.com",
    website: "https://varnika.example.com",
    upi: "",
    established: "1978",
    stats: [
      { label: "Group companies", value: "6" },
      { label: "Employees", value: "18,000" },
      { label: "States", value: "9" },
    ],
    why: [
      "One card for the whole group, with a card per company underneath",
      "Investor, press and careers contacts without printing a brochure",
      "Directors share it at events — details stay current after a reshuffle",
    ],
  },
  {
    slug: "zentel-fiber",
    name: "Zentel Fiber",
    monogram: "ZF",
    category: "Telecom & broadband",
    designation: "Fiber broadband · 4.2 million homes",
    tagline: "A telecom brand's plans, on one link",
    about:
      "Zentel Fiber connects 4.2 million homes and businesses with fiber broadband and OTT bundles. The card does what the website's plan page does — compare speeds, pick a plan, book an installation and pay — without anyone hunting through a menu.",
    specialities: ["Fiber broadband", "OTT bundles", "Business leased lines", "Same-week installation", "24×7 support"],
    products: [
      { name: "Zen 100 — 100 Mbps", description: "Unlimited data, free router, 6 OTT apps included", price: "599", offerPrice: "499" },
      { name: "Zen 300 — 300 Mbps", description: "Unlimited data, 12 OTT apps, free landline with calls", price: "899", offerPrice: "" },
      { name: "Zen 1 Gbps — Ultra", description: "For large homes and creators. Priority support included", price: "1499", offerPrice: "1299" },
      { name: "Business Leased Line", description: "Symmetric bandwidth with an uptime guarantee and static IP", price: "", offerPrice: "" },
      { name: "Book an installation", description: "Pick a slot — most connections go live within 48 hours", price: "", offerPrice: "" },
      { name: "Report a fault", description: "Raise a ticket and track the engineer's visit", price: "", offerPrice: "" },
    ],
    offer: { title: "3 months free on annual plans", description: "Pay for 9 months, get 12 — on any Zen home plan booked this month." },
    primary: "#7C3AED",
    secondary: "#2E1065",
    style: 51,
    logo: "/brands/zentel-fiber.svg",
    area: "HITEC City, Hyderabad 500081",
    phone: "+91 90000 00305",
    email: "support@zentel.example.com",
    website: "https://zentel.example.com",
    upi: "zentel@examplebank",
    established: "2009",
    stats: [
      { label: "Homes connected", value: "4.2 M" },
      { label: "Plans on the card", value: "4" },
      { label: "Install time", value: "48 hrs" },
    ],
    why: [
      "Plans, prices and offers in the customer's hand, always current",
      "Installation and fault requests arrive as leads with the address attached",
      "Field staff share the same card instead of printed plan sheets",
    ],
  },
  {
    slug: "mystora-fashion",
    name: "Mystora",
    monogram: "MY",
    category: "Fashion retail",
    designation: "Fashion & lifestyle · 180 stores",
    tagline: "A retail chain's lookbook and store finder",
    about:
      "Mystora sells womenswear, menswear and home textiles through 180 stores and an online shop. The card carries the season's lookbook, store offers, the loyalty programme and a store locator — the link printed on every bill and carry bag.",
    specialities: ["Womenswear", "Menswear", "Home textiles", "Loyalty programme", "Store locator"],
    products: [
      { name: "Festive Edit — Women", description: "Handloom-inspired kurtas, sarees and co-ord sets", price: "1499", offerPrice: "1199" },
      { name: "Workwear Capsule — Men", description: "Wrinkle-free shirts, chinos and unstructured blazers", price: "1999", offerPrice: "" },
      { name: "Home Textiles", description: "Cotton bedsheets, throws and cushion covers", price: "899", offerPrice: "749" },
      { name: "Mystora Circle membership", description: "Points on every bill, early access to sales, free alterations", price: "499", offerPrice: "0" },
      { name: "Find your nearest store", description: "180 stores across 62 cities — directions in one tap", price: "", offerPrice: "" },
      { name: "Bulk & corporate gifting", description: "Custom hampers and uniforms with your branding", price: "", offerPrice: "" },
    ],
    offer: { title: "End of season — up to 50% off", description: "In stores and online. Members get an extra 10% on the first day." },
    primary: "#BE185D",
    secondary: "#4A044E",
    style: 52,
    logo: "/brands/mystora-fashion.svg",
    photos: ["/demo/boutique/svc-1.webp", "/demo/boutique/svc-2.webp", "/demo/boutique/svc-3.webp", "/demo/boutique/svc-4.webp"],
    gallery: ["/demo/boutique/gal-1.webp", "/demo/boutique/gal-2.webp"],
    area: "Linking Road, Mumbai 400050",
    phone: "+91 90000 00306",
    email: "care@mystora.example.com",
    website: "https://mystora.example.com",
    upi: "mystora@examplebank",
    established: "2007",
    stats: [
      { label: "Stores", value: "180" },
      { label: "Cities", value: "62" },
      { label: "Collections on card", value: "3" },
    ],
    why: [
      "The QR on every bill and carry bag opens the live lookbook",
      "Store-level cards carry the same brand with local timings",
      "Loyalty sign-ups and gifting enquiries come in as leads",
    ],
  },
  {
    slug: "aarvely-hotels",
    name: "Aarvely Hotels",
    monogram: "AH",
    category: "Hotels & resorts",
    designation: "Hotels & resorts · 46 properties",
    tagline: "A hotel group's card, from booking to banquet",
    about:
      "Aarvely runs 46 city hotels and leisure resorts. The card is in every room, at the concierge desk and in the sales team's signature — room bookings, restaurant reservations, banquet enquiries and the loyalty programme on one link.",
    specialities: ["City hotels", "Leisure resorts", "Banquets & weddings", "Restaurants", "Loyalty programme"],
    products: [
      { name: "Deluxe Room — per night", description: "Breakfast for two, late checkout on request", price: "6500", offerPrice: "5499" },
      { name: "Suite — per night", description: "Separate living area, lounge access, airport transfer", price: "12900", offerPrice: "" },
      { name: "Wedding & banquet enquiry", description: "Halls for 50 to 1,200 guests with in-house catering", price: "", offerPrice: "" },
      { name: "Table at Saffron & Sage", description: "Our all-day restaurant. Reserve for lunch or dinner", price: "", offerPrice: "" },
      { name: "Aarvely Rewards", description: "Points on every stay, free nights and room upgrades", price: "", offerPrice: "" },
      { name: "Corporate rate agreement", description: "Negotiated rates for companies with regular travel", price: "", offerPrice: "" },
    ],
    offer: { title: "Stay 3, pay 2 — leisure resorts", description: "On weekday stays at all Aarvely resorts, booked direct." },
    primary: "#B45309",
    secondary: "#431407",
    style: 52,
    logo: "/brands/aarvely-hotels.svg",
    photos: ["/demo/interior/svc-1.webp", "/demo/interior/svc-2.webp", "/demo/interior/svc-4.webp"],
    gallery: ["/demo/interior/gal-1.webp", "/demo/interior/gal-2.webp"],
    area: "MG Road, Jaipur 302001",
    phone: "+91 90000 00307",
    email: "reservations@aarvely.example.com",
    website: "https://aarvely.example.com",
    upi: "aarvely@examplebank",
    established: "1996",
    stats: [
      { label: "Properties", value: "46" },
      { label: "Rooms", value: "5,400" },
      { label: "Enquiry types", value: "4" },
    ],
    why: [
      "A QR in every room opens dining, spa and booking in one place",
      "Banquet and corporate enquiries land with the property attached",
      "Each hotel runs its own card under the group brand",
    ],
  },
  {
    slug: "motoriq-auto",
    name: "Motoriq",
    monogram: "MQ",
    category: "Automobile",
    designation: "Cars · Service · Finance",
    tagline: "A dealership group's whole forecourt",
    about:
      "Motoriq runs 54 showrooms and 38 service centres for new and certified pre-owned cars. The card replaces the printed brochure on the salesperson's desk: models, EMI, test drives, service booking and insurance renewal, all tappable.",
    specialities: ["New cars", "Certified pre-owned", "Service & repair", "Finance & insurance", "Exchange"],
    products: [
      { name: "Book a test drive", description: "At the showroom or at your home, any model", price: "", offerPrice: "" },
      { name: "Certified pre-owned cars", description: "140-point check, 1-year warranty, finance available", price: "", offerPrice: "" },
      { name: "Periodic service package", description: "3 services with parts, pick-up and drop included", price: "8999", offerPrice: "7499" },
      { name: "Insurance renewal", description: "Compare and renew in minutes, cashless at our centres", price: "", offerPrice: "" },
      { name: "Exchange your car", description: "Free valuation in 30 minutes, paid the same day", price: "", offerPrice: "" },
      { name: "EMI calculator & finance", description: "Offers from 14 banks, approval usually within a day", price: "", offerPrice: "" },
    ],
    offer: { title: "Festive benefits up to ₹85,000", description: "Across exchange bonus, corporate discount and accessory pack." },
    primary: "#0369A1",
    secondary: "#082F49",
    style: 48,
    logo: "/brands/motoriq-auto.svg",
    area: "Ring Road, Surat 395002",
    phone: "+91 90000 00308",
    email: "sales@motoriq.example.com",
    website: "https://motoriq.example.com",
    upi: "motoriq@examplebank",
    established: "2002",
    stats: [
      { label: "Showrooms", value: "54" },
      { label: "Service centres", value: "38" },
      { label: "Actions on card", value: "6" },
    ],
    why: [
      "Every salesperson shares the same card with their own number",
      "Test drive and service bookings arrive as leads, not sticky notes",
      "Offers change weekly without reprinting a single brochure",
    ],
  },
];

export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug);

const digits = (s?: string) => String(s || "").replace(/[^\d]/g, "");
const addDays = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

/** A complete card record for a brand, in the shape buildCardHtml expects. */
export function brandCard(b: BrandShowcase) {
  const customer: Record<string, unknown> = {
    name: b.name, company_name: b.name, designation: b.designation, nature: b.category,
    mobile1: b.phone, mobile2: b.phone, email: b.email, url: b.website,
    address: b.area, google_map: `https://maps.google.com/?q=${encodeURIComponent(b.area)}`,
    about_us: b.about,
    specialties_title: "What we do", specialities: b.specialities.join(", "),
    establishment: b.established, logo: b.logo, gst: "", views: 48210,
    theme: b.style, color: b.primary, color2: b.secondary,
    about_on: 1, product_on: 1, enquiry_on: 1, offer_on: 1, qrcode_on: 1,
    gallery_on: b.gallery?.length ? 1 : 0, video_on: 0, feedback_on: 0,
    payment_on: b.upi ? 1 : 0, upi: b.upi, google_pay: b.upi, phone_pe: b.upi,
    product: b.category === "Conglomerate" ? "Our businesses" : "What we offer",
    instagram: "https://instagram.com", facebook: "https://facebook.com",
    linkedin: "https://linkedin.com", youtube: "https://youtube.com",
    social_links: JSON.stringify([
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "facebook", url: "https://facebook.com" },
      { platform: "linkedin", url: "https://linkedin.com" },
      { platform: "youtube", url: "https://youtube.com" },
    ]),
  };
  const photos = b.photos || [];
  const products = b.products.map((p, i) => ({
    id: i + 1, name: p.name, description: p.description,
    price: digits(p.price), offer_price: digits(p.offerPrice),
    filename: photos[i] || "", button: "", button_title: "",
  }));
  const offers = [{ id: 1, title: b.offer.title, description: b.offer.description, valid: addDays(45), filename: "" }];
  const gallery = (b.gallery || []).map((f, i) => ({ id: i + 1, name: `${b.name} ${i + 1}`, filename: f }));
  return { customer, products, offers, gallery };
}
