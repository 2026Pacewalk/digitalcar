/* DigitalCarda industry pages: every profession page, plus the helpers the
   pages, the hub, the server and the sitemap share.

   Adding an industry: write it in ./pages, add it to ALL below. The page, <head>,
   JSON-LD, sitemap entry, hub card and related links all follow. Also add it to
   INDUSTRY_SEARCH in src/lib/publicNav.ts (a test checks).

   Every page must pass the content rules in api/lib/industry-checks.ts:
     npx vitest run api/lib/industry-data.test.ts

   Import-free apart from its own files, so the server bundle can use it.
   No import.meta.glob: the server is bundled by esbuild, so pages are listed by
   explicit static imports. */
import type { IndustryGroupId, IndustryPage, ShareFlowKind } from "./types";
import { advocates } from "./pages/advocates";
import { doctors } from "./pages/doctors";
import { realEstate } from "./pages/real-estate";
import { insuranceAgents } from "./pages/insurance-agents";
import { charteredAccountants } from "./pages/chartered-accountants";
import { beautyParlours } from "./pages/beauty-parlours";
import { restaurants } from "./pages/restaurants";
import { physiotherapists } from "./pages/physiotherapists";
import { makeupArtists } from "./pages/makeup-artists";
import { jewellers } from "./pages/jewellers";
import { homeServices } from "./pages/home-services";
import { photographers } from "./pages/photographers";
import { boutiques } from "./pages/boutiques";
import { travelAgencies } from "./pages/travel-agencies";
import { eventPlanners } from "./pages/event-planners";
import { automobile } from "./pages/automobile";
import { schoolsCoaching } from "./pages/schools-coaching";
import { interiorDesigners } from "./pages/interior-designers";
import { digitalAgencies } from "./pages/digital-agencies";
import { consultants } from "./pages/consultants";

export * from "./types";
export { FEATURES, PLAN_LABEL } from "./features";

export const INDUSTRIES_PATH = "/industries";
export const PERSONA_IMAGE_DIR = "/hero/personas";

/** Hub sections, in display order. */
export const INDUSTRY_GROUPS: { id: IndustryGroupId; label: string; blurb: string }[] = [
  { id: "health", label: "Health", blurb: "Clinics, doctors and physiotherapists" },
  { id: "legal-finance", label: "Law, tax & insurance", blurb: "Advocates, chartered accountants and insurance advisors" },
  { id: "property-home", label: "Property & home", blurb: "Property dealers, interior designers and home repairs" },
  { id: "shops-food-travel", label: "Shops, food & travel", blurb: "Restaurants, showrooms, boutiques and travel desks" },
  { id: "beauty-events", label: "Beauty, photos & events", blurb: "Salons, makeup artists, photographers and planners" },
  { id: "business-education", label: "Business & education", blurb: "Agencies, consultants, coaches, schools and tutors" },
];

/** Every industry page. Add new pages here (hub order comes from `order`). */
const ALL: IndustryPage[] = [
  advocates,
  doctors,
  realEstate,
  insuranceAgents,
  charteredAccountants,
  beautyParlours,
  restaurants,
  physiotherapists,
  makeupArtists,
  jewellers,
  homeServices,
  photographers,
  boutiques,
  travelAgencies,
  eventPlanners,
  automobile,
  schoolsCoaching,
  interiorDesigners,
  digitalAgencies,
  consultants,
];

// `order` is unique (a test checks); the slug breaks ties so the order never varies.
export const INDUSTRIES: readonly IndustryPage[] = [...ALL].sort((a, b) =>
  a.order - b.order || a.slug.localeCompare(b.slug));

const BY_SLUG = new Map(INDUSTRIES.map((i) => [i.slug, i] as const));

export const industryPath = (slug: string) => `${INDUSTRIES_PATH}/${slug}`;

/** EXACT match on the raw string: no lowercasing, no decoding (the server 404s the rest). */
export function getIndustry(slug: string): IndustryPage | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The page's related industries that exist, in its own order, without itself or repeats. */
export function relatedIndustries(ind: IndustryPage): IndustryPage[] {
  const out: IndustryPage[] = [];
  for (const s of ind.relatedIndustries) {
    const r = getIndustry(s);
    if (r && r.slug !== ind.slug && !out.includes(r)) out.push(r);
  }
  return out;
}

export function industriesInGroup(id: IndustryGroupId): IndustryPage[] {
  return INDUSTRIES.filter((i) => i.group === id);
}

/** Newest updatedAt across all pages (YYYY-MM-DD), or "" when there are none. */
export function industriesLastmod(): string {
  return INDUSTRIES.reduce((max, i) => (i.updatedAt > max ? i.updatedAt : max), "");
}

/** Text with the inline marks (**bold**, [label](href)) reduced to plain words. */
export const plainText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
export const wordCount = (s: string) => plainText(s).trim().split(/\s+/).filter(Boolean).length;
/** ₹ with Indian grouping. Amounts < 1,00,000 only; hydration-safe (no toLocaleString). */
export const inr = (n: number) => "₹" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const SIGNUP_HREF = "/signup?promo=FREE30D";
export const signupForProduct = (slug: string) => `${SIGNUP_HREF}&product=${encodeURIComponent(slug)}`;
export const TRIAL_LINE = "Start free for 30 days, no payment details.";
export const PRICE_LINE = "Then Gold from ₹99/month or ₹999/year, or Platinum from ₹199/month or ₹1,999/year.";
export const UPGRADE_LINE = "Your link and QR stay the same when you upgrade.";

/** Storyboard steps. Tokens {client} {where} {org} {service} are filled by fillTokens().
    Exactly 4 per kind. Titles are bold on the page; texts follow them. */
export const SHARE_STEPS: Record<ShareFlowKind, { title: string; text: string }[]> = {
  "counter-qr": [
    { title: "A {client} scans your QR.", text: "The standee at your {where} opens your card in the phone's camera. No app needed." },
    { title: "Your card opens.", text: "Name, services and buttons to call, WhatsApp or get directions." },
    { title: "Your number is saved.", text: "Save Contact adds {org} to their phonebook in one tap." },
    { title: "Their enquiry reaches you.", text: "It lands in your Leads list, ready to follow up." },
  ],
  "whatsapp-link": [
    { title: "You send your link.", text: "After the {where}, share your card link in the WhatsApp chat." },
    { title: "It opens with a preview.", text: "The link shows your name and opens your card." },
    { title: "They tap WhatsApp.", text: "A service button opens a chat with \"{service}\" already typed." },
    { title: "You see what they tapped.", text: "Analytics shows opens, WhatsApp taps and where visitors came from." },
  ],
  "handover-nfc": [
    { title: "A {client} taps your card.", text: "At a {where}, they tap your NFC card or scan the QR on its back." },
    { title: "Your card opens.", text: "Your details, services and contact buttons." },
    { title: "You're in their phonebook.", text: "Save Contact adds your name, number and email." },
    { title: "They reach you later.", text: "They find you by name and call, email or send an enquiry." },
  ],
};

/** The three event chips floating around the hero phone. */
export const SHARE_CHIPS: Record<ShareFlowKind, [string, string, string]> = {
  "counter-qr": ["Opened from a QR scan", "Saved to contacts", "New enquiry in Leads"],
  "whatsapp-link": ["Opened from WhatsApp", "WhatsApp tap", "New enquiry in Leads"],
  "handover-nfc": ["Opened with an NFC tap", "Saved to contacts", "Email tap"],
};

const startsWithVowel = (s: string) => /^[aeiou]/i.test(s.trim());

/** Fills {client} {where} {org} {service} from the page, and turns "a"/"A" into
    "an"/"An" in front of a token whose value starts with a vowel ("an attendee"). */
export function fillTokens(s: string, ind: IndustryPage): string {
  const values: Record<string, string> = {
    client: ind.shareFlow.client,
    where: ind.shareFlow.where,
    org: ind.sample.org,
    service: ind.sample.services[0],
  };
  return s
    .replace(/\b([Aa]) \{(client|where|org|service)\}/g, (_, a: string, k: string) =>
      `${startsWithVowel(values[k]) ? `${a}n` : a} {${k}}`)
    .replace(/\{(client|where|org|service)\}/g, (_, k: string) => values[k]);
}

/** Hub FAQ (rendered on /industries and in its FAQPage JSON-LD). */
export const INDUSTRY_HUB_FAQS: { q: string; a: string }[] = [
  {
    q: "What is a digital visiting card, and will it work for my profession?",
    a: "A digital visiting card is one link that opens your name, contact details, services and buttons to call, WhatsApp or save your number. It works for any profession that hands out a phone number, because you choose which sections to show and write the details yourself. Customers open it from a QR code, an NFC tap or a WhatsApp message.",
  },
  {
    q: "Is there a design made for my industry?",
    a: "No, the designs are general, and any design works for any business. Each profession page shows the designs with sample details for that line of work, so you can see how yours could look. Pick the one you like, then add your own name, services, photos and colours.",
  },
  {
    q: "Can doctors, advocates and CAs use a digital visiting card?",
    a: "Yes, as a factual contact card with your name, qualifications, practice details, address and phone number. The NMC, the Bar Council of India and ICAI each set rules on publicity, so the pages for [doctors](/industries/doctors), [advocates](/industries/advocates) and [chartered accountants](/industries/chartered-accountants) list what to leave off, such as offers and review buttons. Check the current rules before you publish. This is general information, not legal advice.",
  },
  {
    q: "How much does a digital visiting card cost?",
    a: `${TRIAL_LINE} ${PRICE_LINE} ${UPGRADE_LINE} An NFC card is ₹499 and an NFC standee is ₹1,499 if you want one. See [pricing](/pricing) for what each plan includes.`,
  },
];
