/* Instagram bio templates, filled in from the customer's card.
 *
 * Instagram's rules, which every template is written around:
 *
 *  · The bio is PLAIN TEXT with a hard 150-character limit. Line breaks and
 *    emoji are allowed; there is no bold or italic.
 *  · A URL typed into the bio is NOT clickable. Links go in the separate
 *    "Links" field — so the card link is shown as its own step, not in the text.
 *  · The profile "Name" field (30 characters) is what Instagram search matches,
 *    so a keyword there ("Glow Studio | Salon Chandigarh") helps people find
 *    the account. It is suggested alongside the bio.
 *  · The last line should tell people what to do next, pointing down at the
 *    link: that link is where the enquiry actually happens.
 *
 * Every template is a starting point the customer can edit before copying.
 */

export type IgData = {
  name: string;
  designation: string;
  company: string;
  /** What the business is, e.g. "Hair & Skin Salon". */
  category: string;
  city: string;
  /** Up to three short things they're known for. */
  highlights: string[];
  cardUrl: string;
};

export type IgTemplate = {
  id: string;
  name: string;
  blurb: string;
  /** Who it suits — shown as a chip. */
  fits: string;
  build: (d: IgData) => string;
};

export const IG_BIO_LIMIT = 150;
export const IG_NAME_LIMIT = 30;

/** Drop lines left empty by a missing field; no trailing spaces. */
function tidy(s: string): string {
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, "").replace(/\s{2,}/g, " "))
    .filter((l) => l.replace(/[\s·|,]/g, "").length > 0)
    .join("\n")
    .trim();
}

/** The nth highlight, or a sensible default so the bio never has a gap. */
const h = (d: IgData, i: number, fallback: string) => d.highlights[i] || fallback;
/** " in City" / " · City" only when there is a city. */
const inCity = (d: IgData) => (d.city ? ` in ${d.city}` : "");
const dotCity = (d: IgData) => (d.city ? ` · ${d.city}` : "");
const biz = (d: IgData) => d.company || d.name || "Our business";
const what = (d: IgData, fallback: string) => d.category || d.designation || fallback;

export const IG_TEMPLATES: IgTemplate[] = [
  {
    id: "classic",
    name: "Classic business",
    blurb: "What you do, where, and what you're known for.",
    fits: "Any business",
    build: (d) => tidy(`
✨ ${what(d, "Your business")}${inCity(d)}
${h(d, 0, "Quality work")} · ${h(d, 1, "Honest prices")} · ${h(d, 2, "Fast service")}
👇 Contact, prices & directions`),
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Three calm lines, no clutter.",
    fits: "Premium brands",
    build: (d) => tidy(`
${what(d, "Your business")}${dotCity(d)}
${h(d, 0, "Made with care")}
↓ Everything in one link`),
  },
  {
    id: "salon",
    name: "Salon & beauty",
    blurb: "Services up front, booking as the next step.",
    fits: "Salons, spas, makeup",
    build: (d) => tidy(`
💇 ${what(d, "Salon")}${inCity(d)}
✨ ${h(d, 0, "Hair")} | ${h(d, 1, "Skin")} | ${h(d, 2, "Nails")}
📅 Book your appointment 👇`),
  },
  {
    id: "food",
    name: "Restaurant & café",
    blurb: "Cuisine, a reason to visit, and how to order.",
    fits: "Restaurants, cafés, bakeries",
    build: (d) => tidy(`
🍽️ ${what(d, "Restaurant")}${dotCity(d)}
⭐ ${h(d, 0, "Fresh food")} · ${h(d, 1, "Cosy seating")}
📍 Visit us | 🛵 Order online 👇`),
  },
  {
    id: "realestate",
    name: "Real estate",
    blurb: "Buy, sell, rent — and a site visit is one tap away.",
    fits: "Agents, builders",
    build: (d) => tidy(`
🏡 ${what(d, "Real estate")}${dotCity(d)}
🔑 ${h(d, 0, "Buy")} · ${h(d, 1, "Sell")} · ${h(d, 2, "Rent")}
📞 Book a site visit 👇`),
  },
  {
    id: "clinic",
    name: "Doctor & clinic",
    blurb: "Name and qualification first — that's what builds trust.",
    fits: "Doctors, dentists, physios",
    build: (d) => tidy(`
🩺 ${d.name || "Dr. Your Name"}${d.designation ? `, ${d.designation}` : ""}
🏥 ${d.company || "Your Clinic"}${d.city ? `, ${d.city}` : ""}
📅 Book an appointment 👇`),
  },
  {
    id: "shop",
    name: "Shop & boutique",
    blurb: "New stock and an easy way to ask about it.",
    fits: "Boutiques, stores, jewellers",
    build: (d) => tidy(`
🛍️ ${what(d, "Boutique")}${dotCity(d)}
✨ ${h(d, 0, "New arrivals every week")}
📦 Shop & enquire on WhatsApp 👇`),
  },
  {
    id: "coach",
    name: "Coach & consultant",
    blurb: "What you help with, then a free first step.",
    fits: "Coaches, consultants, CAs",
    build: (d) => tidy(`
🎯 ${d.designation || what(d, "Business coach")}${dotCity(d)}
💡 ${h(d, 0, "Strategy")} · ${h(d, 1, "Growth")} · ${h(d, 2, "Clarity")}
📅 Book a free discovery call 👇`),
  },
  {
    id: "creative",
    name: "Creative & freelancer",
    blurb: "Your craft, your range, and that you're taking work.",
    fits: "Designers, photographers",
    build: (d) => tidy(`
🎨 ${d.designation || what(d, "Designer")}${d.company ? ` · ${d.company}` : ""}
${h(d, 0, "Branding")} · ${h(d, 1, "Web")} · ${h(d, 2, "Social")}
📩 Open for projects 👇`),
  },
  {
    id: "fitness",
    name: "Fitness & wellness",
    blurb: "Energetic, with a simple word to message.",
    fits: "Trainers, gyms, yoga",
    build: (d) => tidy(`
💪 ${d.designation || what(d, "Fitness coach")}${dotCity(d)}
🔥 ${h(d, 0, "Weight loss")} · ${h(d, 1, "Strength")}
📲 DM "START" or tap below 👇`),
  },
  {
    id: "service",
    name: "Local service",
    blurb: "Reliability and speed — what service customers look for.",
    fits: "Repairs, cleaning, electricians",
    build: (d) => tidy(`
🔧 ${what(d, "Home services")}${inCity(d)}
✅ ${h(d, 0, "Verified experts")} · ${h(d, 1, "On-time")}
📞 Same-day service — call below 👇`),
  },
  {
    id: "personal",
    name: "Personal brand",
    blurb: "You, your role and your company — for founders and professionals.",
    fits: "Founders, professionals",
    build: (d) => tidy(`
${d.name || "Your Name"}${d.designation ? ` | ${d.designation}` : ""}
${d.company ? `🏢 ${d.company}` : ""}${d.city ? `  📍 ${d.city}` : ""}
💼 Let's connect 👇`),
  },
];

/* Build the bio, and if long card details push it past 150 characters, step
   down gracefully rather than cut mid-word: shorter highlights, fewer of them,
   a shorter category, then no city. The customer can still edit the result. */
export function buildIgBio(id: string, d: IgData): string {
  const t = IG_TEMPLATES.find((x) => x.id === id) || IG_TEMPLATES[0];
  const short = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, ""));
  const firstPart = (s: string) => s.split(/\s*[,&|·]\s*|\s+and\s+/i)[0].trim();
  const attempts: IgData[] = [
    d,
    { ...d, highlights: d.highlights.map((x) => short(x, 18)) },
    { ...d, highlights: d.highlights.slice(0, 2).map((x) => short(x, 16)) },
    { ...d, highlights: d.highlights.slice(0, 2).map((x) => short(x, 16)), category: firstPart(d.category), designation: firstPart(d.designation) },
    { ...d, highlights: d.highlights.slice(0, 1).map((x) => short(x, 16)), category: firstPart(d.category), designation: firstPart(d.designation), city: "" },
  ];
  let bio = t.build(d);
  for (const a of attempts) {
    bio = t.build(a);
    if (igLength(bio) <= IG_BIO_LIMIT) return bio;
  }
  return bio;
}

/** Suggested profile Name: "Business | Category City", shortened to fit 30. */
export function igNameField(d: IgData): string {
  const who = biz(d);
  const kind = (d.category || d.designation || "").split(/[,&|·]/)[0].trim();
  const options = [
    [who, [kind, d.city].filter(Boolean).join(" ")].filter(Boolean).join(" | "),
    [who, kind].filter(Boolean).join(" | "),
    [who, d.city].filter(Boolean).join(" | "),
    who,
  ];
  return options.find((o) => o.length <= IG_NAME_LIMIT)
    // Too long even alone: cut at a word boundary rather than mid-word.
    || who.slice(0, IG_NAME_LIMIT + 1).replace(/\s+\S*$/, "").trim()
    || who.slice(0, IG_NAME_LIMIT);
}

/** Instagram counts characters the way people see them — an emoji is one. */
export const igLength = (s: string) => Array.from(s).length;

/** The city from a one-line address: the last part that isn't a PIN, state or "India". */
export function cityFromAddress(address: string): string {
  const STATES = /^(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|india)$/i;
  const parts = address.split(",")
    .map((p) => p.replace(/\b[1-9]\d{2}\s?\d{3}\b/g, "").replace(/[-–]/g, " ").trim())
    .filter((p) => p && !STATES.test(p));
  const last = parts[parts.length - 1] || "";
  return last.length <= 24 ? last : "";
}
