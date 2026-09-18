/*
 * Live Demo showcase: the same design shown for different industries and colours.
 *
 * Every business here is FICTIONAL (like src/lib/demoData.ts): invented names
 * (checked not to be known Indian brands), neighbourhood + city only, clearly
 * fake numbers (+91 90000 0xxxx) and example.com addresses — so the demo never
 * implies a real business uses DigitalCarda, and its buttons never reach one.
 * Services, prices and hours are realistic for the Indian market (researched
 * from public price lists) so the samples feel true to life.
 *
 * Photos are optional: drop them at public/demo/<industry-id>/ and list them in
 * `images` (services, in order) and `gallery`.
 */
import { SHOWCASE_CONTENT, type ShowcaseContent } from "./demoShowcaseData";

export type DemoPalette = { id: string; name: string; primary: string; secondary: string };

/* Colour combinations a visitor can try on any design. "original" = the
   design's own colours (the product preset). */
export const DEMO_PALETTES: DemoPalette[] = [
  { id: "rose", name: "Rose", primary: "#E11D74", secondary: "#831843" },
  { id: "sunset", name: "Sunset", primary: "#F97316", secondary: "#7C2D12" },
  { id: "ruby", name: "Ruby", primary: "#DC2626", secondary: "#450A0A" },
  { id: "gold", name: "Gold", primary: "#CA8A04", secondary: "#422006" },
  { id: "emerald", name: "Emerald", primary: "#059669", secondary: "#064E3B" },
  { id: "ocean", name: "Ocean", primary: "#0284C7", secondary: "#0C4A6E" },
  { id: "royal", name: "Royal", primary: "#4F46E5", secondary: "#1E1B4B" },
  { id: "plum", name: "Plum", primary: "#9333EA", secondary: "#3B0764" },
  { id: "noir", name: "Noir", primary: "#334155", secondary: "#0F172A" },
];

export type DemoIndustry = {
  id: string;
  label: string;
  /** lucide icon name, resolved by the demo page */
  icon: "scissors" | "coffee" | "smile" | "dumbbell" | "camera" | "building" | "utensils" | "sofa" | "shirt" | "graduation" | "flower" | "gem";
  /** The colour this industry is shown in when picked (unless the visitor chose one). */
  palette: string;
  /** customer.nature of the matching persona in demoData.ts, so a design opens on its own industry */
  natures: string[];
};

export const DEMO_INDUSTRIES: DemoIndustry[] = [
  { id: "salon", label: "Beauty Salon", icon: "scissors", palette: "rose", natures: ["Beauty & Salon"] },
  { id: "cafe", label: "Café & Bakery", icon: "coffee", palette: "sunset", natures: ["Cafe & Bakery"] },
  { id: "dental", label: "Dental Clinic", icon: "smile", palette: "ocean", natures: ["Healthcare"] },
  { id: "fitness", label: "Gym & Fitness", icon: "dumbbell", palette: "noir", natures: ["Fitness"] },
  { id: "yoga", label: "Yoga & Wellness", icon: "flower", palette: "emerald", natures: [] },
  { id: "photography", label: "Photographer", icon: "camera", palette: "plum", natures: ["Photography"] },
  { id: "restaurant", label: "Restaurant", icon: "utensils", palette: "ruby", natures: ["Restaurant"] },
  { id: "realestate", label: "Real Estate", icon: "building", palette: "royal", natures: ["Real Estate"] },
  { id: "interior", label: "Interior Design", icon: "sofa", palette: "gold", natures: ["Interior Design"] },
  { id: "boutique", label: "Boutique", icon: "shirt", palette: "ruby", natures: ["Fashion"] },
  { id: "jewellery", label: "Jewellery", icon: "gem", palette: "gold", natures: ["Jewellery"] },
  { id: "coaching", label: "Coaching", icon: "graduation", palette: "royal", natures: ["Education"] },
].filter((i) => SHOWCASE_CONTENT[i.id]) as DemoIndustry[];

/* The industry a design opens on: its own persona's industry, or "" when no
   sample matches it (the demo then shows the design's own persona). */
export function industryForNature(nature: unknown): string {
  const n = String(nature || "");
  return DEMO_INDUSTRIES.find((i) => i.natures.includes(n))?.id ?? "";
}

/* The sample business shown for an industry (for labels beside the demo). */
export function showcaseName(id: string): string {
  return SHOWCASE_CONTENT[id]?.businessName ?? "";
}

const addDays = (d: number) => {
  const x = new Date(); x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
const digits = (s: string) => String(s || "").replace(/[^\d]/g, "");

/* A complete demo card record for an industry (colours are applied by the caller). */
export function showcaseFor(id: string) {
  const c: ShowcaseContent | undefined = SHOWCASE_CONTENT[id];
  if (!c) return null;
  const imgs = c.images || [];
  const customer: Record<string, unknown> = {
    name: c.businessName, company_name: c.businessName, designation: c.designation, nature: c.label,
    mobile1: c.phone, mobile2: c.phone, email: c.email, url: c.website,
    address: c.area, google_map: `https://maps.google.com/?q=${encodeURIComponent(c.area)}`,
    about_us: `${c.about} ${c.hours ? `Open ${c.hours}.` : ""}`.trim(),
    specialties_title: "What we do", specialities: c.specialities.join(", "),
    establishment: c.established || "2018", logo: "", gst: "", views: 1284,
    about_on: 1, product_on: 1, enquiry_on: 1, offer_on: 1,
    gallery_on: c.gallery?.length ? 1 : 0, payment_on: 0, video_on: 0, qrcode_on: 0, feedback_on: 0,
    instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com",
    social_links: JSON.stringify([
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "facebook", url: "https://facebook.com" },
      { platform: "youtube", url: "https://youtube.com" },
    ]),
  };
  const products = c.services.map((s, i) => ({
    id: i + 1, name: s.name,
    description: [s.duration, s.description].filter(Boolean).join(" · "),
    price: digits(s.price), offer_price: digits(s.offerPrice),
    filename: imgs[i] || "", button: "", button_title: "",
  }));
  const offers = c.offer ? [{ id: 1, title: c.offer.title, description: c.offer.description, valid: addDays(45), filename: "" }] : [];
  const gallery = (c.gallery || []).map((f, i) => ({ id: i + 1, name: `${c.businessName} ${i + 1}`, filename: f }));
  return { customer, products, offers, gallery };
}
