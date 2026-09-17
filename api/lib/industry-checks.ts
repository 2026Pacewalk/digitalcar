/* Content rules for the industry pages in src/data/industries (blueprint §3d).
 *
 * Every rule is a plain function that returns a list of problems, so the same
 * code backs `api/lib/industry-data.test.ts` and the little CLI content writers
 * run on a page before it is registered:
 *
 *   npx tsx <scratchpad>/check-pages.ts doctors advocates real-estate
 *
 * An empty array means the page is clean. Node-only (it stats the persona
 * images), so nothing here is imported by the app or the server bundle. */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FEATURES, INDUSTRIES, INDUSTRY_GROUPS, INDUSTRY_HUB_FAQS, INDUSTRY_ICON_KEYS, MOTIF_KEYS, PERSONA_IMAGES,
  PRICE_LINE, SHARE_CHIPS, SHARE_STEPS, TRIAL_LINE, UPGRADE_LINE,
  getIndustry, plainText, wordCount,
} from "../../src/data/industries";
import type { CardPart, FeatureKey, IndustryPage } from "../../src/data/industries";
import { getBlogPost } from "../../src/data/blog";
import { seoForPath } from "../../src/lib/publicSeo";
import { demoForProduct } from "../../src/lib/demoData";

/** The 20 slugs planned in blueprint §1a. A page may link to any of them, even
 *  before that page exists; add a slug here when a new industry is planned. */
export const PLANNED_INDUSTRY_SLUGS: readonly string[] = [
  "advocates", "doctors", "real-estate", "insurance-agents", "chartered-accountants", "beauty-parlours",
  "restaurants", "physiotherapists", "makeup-artists", "jewellers", "home-services", "photographers",
  "boutiques", "travel-agencies", "event-planners", "automobile", "schools-coaching", "interior-designers",
  "digital-agencies", "consultants",
];

/** Professions that must carry a `conduct` note with reviewButton + offers avoided. */
export const REGULATED_SLUGS: readonly string[] = ["doctors", "physiotherapists", "advocates", "chartered-accountants"];

const CARD_PARTS: readonly CardPart[] = ["profile", "actions", "about", "services", "gallery", "enquiry", "qr", "socials"];
const SHARE_KINDS = ["counter-qr", "whatsapp-link", "handover-nfc"] as const;

/* ── guards (blueprint §3d rules 8–11, §5) ─────────────────────────────── */

const BRAND_GUARD = /pacewalk|shekhar/i;

/** Wording the blueprint allows although it looks like a statistic (§5.4). */
const stripAllowed = (s: string) => s.replace(/up to 3 cards/gi, "up to three cards");

const FAKE_STAT_GUARDS: { re: RegExp; what: string }[] = [
  { re: /\b\d[\d,]*\+?\s*(clients|customers|businesses|users|doctors|agents|patients|families|cards|views|leads|reviews)\b/i, what: "a customer/usage count" },
  { re: /\b\d(\.\d)?\s*(\/\s*5|stars?|★|rating)/i, what: "a rating" },
  { re: /\d\s*%/, what: "a percentage" },
  { re: /\b(guarantee|#1|no\.? ?1|best in india|rank(s|ing)? (on|in) google)\b/i, what: "a guarantee or ranking promise" },
  { re: /\b\d[\d,]*\+(?!\d)/, what: "a \"500+\" style figure" },
];

/** Only these amounts are real (plans, add-ons, bulk tiers). */
const PRICES_OK = new Set(["₹99", "₹199", "₹299", "₹399", "₹499", "₹799", "₹999", "₹1,499", "₹1,999", "₹2,499", "₹4,999"]);
const PRICE_RE = /₹\s?[\d,]+/g;

/** Things the product does not do (§5.3). Run over statements, never over FAQ questions. */
const CLAIM_GUARD_SOURCE = /\b(book(ing)? (an )?appointment online|appointment booking|table reservation|reserve a table online|opening hours section|business hours|menu pdf|download(able)? (menu|brochure|pdf)|testimonials? on (your|the) card|hindi (version|switch)|multi-?language|white-?label|remove (the )?branding|unlimited|designed (specifically|exclusively) for|instant (sms|email) alerts?|coupon codes?)\b/i;

/** All the things a piece of copy claims that the product does not do. */
const claimHits = (text: string) => [...stripAllowed(text).matchAll(new RegExp(CLAIM_GUARD_SOURCE.source, "gi"))].map((m) => m[0]);

/** Feature wording a page must not use when `conduct.avoid` lists that feature. */
const AVOID_PHRASES: Partial<Record<FeatureKey, RegExp>> = {
  reviewButton: /write a review|google review|review button/i,
  offers: /valid till|offers? with end dates|post an offer|discount code/i,
};

/* ── small helpers ─────────────────────────────────────────────────────── */

const PERSONA_DIR = fileURLToPath(new URL("../../public/hero/personas/", import.meta.url));

/** Today in IST (the site's timezone), as YYYY-MM-DD. */
export function todayIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

let NATURES: Set<string> | null = null;
/** Every customer.nature demoForProduct() can actually return (20 personas). */
function demoNatures(): Set<string> {
  if (!NATURES) NATURES = new Set(Array.from({ length: 20 }, (_, i) => String(demoForProduct({ styleNumber: i }).customer.nature)));
  return NATURES;
}

const hex = (c: string) => parseInt(c, 16) / 255;
const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
/** Contrast of a #RRGGBB colour against white. */
function contrastOnWhite(color: string): number {
  const [r, g, b] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((p) => channel(hex(p)));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (l + 0.05);
}

/** A fresh [label](/path) matcher each time, so no lastIndex is ever shared. */
const markRe = () => /\[([^\]]+)\]\(([^)]+)\)/g;

/** Inline links must be internal and point at a page the site really has. */
function linkProblems(text: string, where: string, relatedPool: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(markRe())) {
    const href = m[2];
    if (!href.startsWith("/")) { out.push(`${where}: link "${href}" is not an internal /path`); continue; }
    const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (path.startsWith("/blog/")) {
      if (!getBlogPost(path.slice("/blog/".length))) out.push(`${where}: link "${href}" is not a blog post`);
    } else if (path.startsWith("/industries/")) {
      const slug = path.slice("/industries/".length);
      if (!relatedPool.has(slug)) out.push(`${where}: link "${href}" is not a planned industry`);
    } else if (path.startsWith("/digital-business-cards-templates/") || path.startsWith("/demo/")) {
      // a catalogue design: the slug is only known at runtime
    } else if (!seoForPath(path)) {
      out.push(`${where}: link "${href}" is not a page the site knows`);
    }
  }
  const left = text.replace(markRe(), "").replace(/\*\*(.+?)\*\*/g, "$1");
  if (left.includes("](") || left.includes("**")) out.push(`${where}: broken **bold** or [link](/path) mark`);
  return out;
}

export type CheckOptions = {
  /** Defaults to today in IST. */
  today?: string;
  /** Slugs `relatedIndustries` and /industries/ links may point at. Defaults to the planned 20. */
  relatedPool?: ReadonlySet<string>;
};

/* ── per-page checks (blueprint §3d rules 2–11) ────────────────────────── */

export function checkIndustry(ind: IndustryPage, opts: CheckOptions = {}): string[] {
  const p: string[] = [];
  const today = opts.today ?? todayIst();
  const pool = opts.relatedPool ?? new Set(PLANNED_INDUSTRY_SLUGS);
  const at = (field: string) => `${ind.slug}.${field}`;
  const max = (field: string, value: string, limit: number) => {
    if (typeof value !== "string" || !value.trim()) p.push(`${at(field)}: missing`);
    else if (value.length > limit) p.push(`${at(field)}: ${value.length} chars, max ${limit}`);
  };
  const between = (field: string, n: number, lo: number, hi: number) => {
    if (n < lo || n > hi) p.push(`${at(field)}: ${n} entries, expected ${lo}–${hi}`);
  };

  /* 2. Lengths and counts */
  if (!/^[a-z0-9-]{1,40}$/.test(ind.slug)) p.push(`${ind.slug}: slug must match /^[a-z0-9-]{1,40}$/`);
  max("name", ind.name, 44);
  max("crumb", ind.crumb, 28);
  max("audience", ind.audience, 28);
  max("h1", ind.h1, 70);
  max("seoTitle", ind.seoTitle, 60);
  max("description", ind.description, 155);
  max("excerpt", ind.excerpt, 110);
  max("whatsappText", ind.whatsappText, 90);
  max("primaryKeyword", ind.primaryKeyword, 60);
  const answerWords = wordCount(ind.answer);
  if (answerWords < 40 || answerWords > 60) p.push(`${at("answer")}: ${answerWords} words, expected 40–60`);
  if (!Number.isInteger(ind.order) || ind.order < 1) p.push(`${at("order")}: must be a positive integer`);
  between("keywords", ind.keywords.length, 4, 8);
  between("searchTerms", ind.searchTerms.length, 2, 8);
  for (const t of ind.searchTerms) if (t !== t.toLowerCase()) p.push(`${at("searchTerms")}: "${t}" must be lowercase`);
  between("pains", ind.pains.length, 3, 3);
  between("checklist", ind.checklist.length, 5, 8);
  between("useCases", ind.useCases.length, 5, 7);
  between("faqs", ind.faqs.length, 4, 7);
  between("templateNatures", ind.templateNatures.length, 1, 3);
  between("relatedPosts", ind.relatedPosts.length, 1, 3);
  ind.pains.forEach((x, i) => { max(`pains[${i}].pain`, x.pain, 90); max(`pains[${i}].fix`, x.fix, 130); });
  ind.checklist.forEach((x, i) => { max(`checklist[${i}].item`, x.item, 60); max(`checklist[${i}].why`, x.why, 120); });
  ind.useCases.forEach((x, i) => { max(`useCases[${i}].need`, x.need, 60); max(`useCases[${i}].how`, x.how, 140); });
  max("shareFlow.where", ind.shareFlow.where, 24);
  max("shareFlow.client", ind.shareFlow.client, 16);
  ind.faqs.forEach((f, i) => {
    max(`faqs[${i}].q`, f.q, 90);
    const w = wordCount(f.a);
    if (w < 25 || w > 90) p.push(`${at(`faqs[${i}].a`)}: ${w} words, expected 25–90 ("${f.q}")`);
  });
  if (new Set(ind.faqs.map((f) => f.q)).size !== ind.faqs.length) p.push(`${at("faqs")}: duplicate question`);
  if (new Set(ind.checklist.map((c) => c.item)).size !== ind.checklist.length) p.push(`${at("checklist")}: duplicate item`);
  if (new Set(ind.useCases.map((u) => u.feature)).size !== ind.useCases.length) p.push(`${at("useCases")}: the same feature twice`);
  if (new Set(ind.templateNatures).size !== ind.templateNatures.length) p.push(`${at("templateNatures")}: duplicate nature`);
  if (new Set(ind.relatedPosts).size !== ind.relatedPosts.length) p.push(`${at("relatedPosts")}: duplicate post`);

  /* 3. References resolve */
  for (const [i, x] of ind.pains.entries()) if (!FEATURES[x.feature]) p.push(`${at(`pains[${i}].feature`)}: "${x.feature}" is not a FeatureKey`);
  for (const [i, x] of ind.useCases.entries()) if (!FEATURES[x.feature]) p.push(`${at(`useCases[${i}].feature`)}: "${x.feature}" is not a FeatureKey`);
  for (const [i, c] of ind.checklist.entries()) if (!CARD_PARTS.includes(c.part)) p.push(`${at(`checklist[${i}].part`)}: "${c.part}" is not a CardPart`);
  if (ind.relatedIndustries.length !== 3) p.push(`${at("relatedIndustries")}: ${ind.relatedIndustries.length} entries, expected 3`);
  if (new Set(ind.relatedIndustries).size !== ind.relatedIndustries.length) p.push(`${at("relatedIndustries")}: duplicate slug`);
  for (const s of ind.relatedIndustries) {
    if (s === ind.slug) p.push(`${at("relatedIndustries")}: points at itself`);
    else if (!pool.has(s)) p.push(`${at("relatedIndustries")}: "${s}" is not a planned industry`);
  }
  for (const s of ind.relatedPosts) if (!getBlogPost(s)) p.push(`${at("relatedPosts")}: "${s}" is not a blog post`);
  if (!INDUSTRY_GROUPS.some((g) => g.id === ind.group)) p.push(`${at("group")}: "${ind.group}" is not an INDUSTRY_GROUPS id`);
  if (!INDUSTRY_ICON_KEYS.includes(ind.theme.icon)) p.push(`${at("theme.icon")}: "${ind.theme.icon}" is not an IndustryIconKey`);
  if (!MOTIF_KEYS.includes(ind.theme.motif)) p.push(`${at("theme.motif")}: "${ind.theme.motif}" is not a MotifKey`);
  for (const k of ["accent", "ink"] as const) {
    if (!/^#[0-9A-F]{6}$/i.test(ind.theme[k])) p.push(`${at(`theme.${k}`)}: "${ind.theme[k]}" must be #RRGGBB`);
  }
  if (/^#[0-9A-F]{6}$/i.test(ind.theme.ink) && contrastOnWhite(ind.theme.ink) < 4.5) {
    p.push(`${at("theme.ink")}: ${contrastOnWhite(ind.theme.ink).toFixed(2)}:1 on white, needs 4.5:1`);
  }
  if (!SHARE_KINDS.includes(ind.shareFlow.kind)) p.push(`${at("shareFlow.kind")}: "${ind.shareFlow.kind}" is not a ShareFlowKind`);

  /* 4. Template natures the catalogue can really show */
  const natures = demoNatures();
  for (const n of ind.templateNatures) if (!natures.has(n)) p.push(`${at("templateNatures")}: demoForProduct never returns "${n}"`);

  /* 5. Mockup image files exist */
  if (ind.mockup) {
    if (!PERSONA_IMAGES.includes(ind.mockup.img)) p.push(`${at("mockup.img")}: "${ind.mockup.img}" is not a PersonaImg`);
    for (const ext of ["webp", "png"]) {
      if (!existsSync(`${PERSONA_DIR}${ind.mockup.img}.${ext}`)) p.push(`${at("mockup.img")}: public/hero/personas/${ind.mockup.img}.${ext} is missing`);
    }
    if (!/sample/i.test(ind.mockup.alt)) p.push(`${at("mockup.alt")}: must say the card is a sample`);
    if (!ind.mockup.alt.includes(ind.sample.name)) p.push(`${at("mockup.alt")}: must name the sample persona`);
    max("mockup.alt", ind.mockup.alt, 160);
  }

  /* 6. Dates */
  for (const k of ["publishedAt", "updatedAt"] as const) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ind[k])) p.push(`${at(k)}: "${ind[k]}" must be YYYY-MM-DD`);
  }
  if (ind.publishedAt > ind.updatedAt) p.push(`${at("updatedAt")}: is before publishedAt`);
  if (ind.updatedAt > today) p.push(`${at("updatedAt")}: "${ind.updatedAt}" is in the future (today is ${today})`);

  /* 7. Conduct */
  if (REGULATED_SLUGS.includes(ind.slug)) {
    if (!ind.conduct) p.push(`${at("conduct")}: regulated profession, a conduct note is required`);
    else for (const k of ["reviewButton", "offers"] as FeatureKey[]) {
      if (!ind.conduct.avoid.includes(k)) p.push(`${at("conduct.avoid")}: must include "${k}"`);
    }
  }
  if (ind.conduct) {
    max("conduct.body", ind.conduct.body, 80);
    max("conduct.note", ind.conduct.note, 320);
    if (!/current rules/i.test(ind.conduct.note)) p.push(`${at("conduct.note")}: must end by telling the reader to check the current rules`);
    if (/legal advice/i.test(ind.conduct.note)) p.push(`${at("conduct.note")}: the page already adds "This is general information, not legal advice."`);
    const bodyWords = plainText(ind.conduct.body).split(/[^A-Za-z]+/).filter((w) => w.length > 3);
    if (bodyWords.length && !bodyWords.some((w) => new RegExp(`\\b${w}\\b`, "i").test(plainText(ind.conduct!.note)))) {
      p.push(`${at("conduct.note")}: does not name ${ind.conduct.body}`);
    }
    const pageText = plainText(JSON.stringify(ind));
    for (const k of ind.conduct.avoid) {
      if (ind.pains.some((x) => x.feature === k) || ind.useCases.some((x) => x.feature === k)) {
        p.push(`${at("conduct.avoid")}: "${k}" is still used on this page`);
      }
      const phrase = AVOID_PHRASES[k];
      if (phrase && phrase.test(pageText)) p.push(`${at("conduct.avoid")}: the copy still describes "${k}" (${phrase.source})`);
    }
  }

  /* 8–10. Brand, fake stats and prices, over everything the page says */
  p.push(...guardProblems(JSON.stringify(ind), ind.slug));

  /* 11. Claim guard — statements only, never FAQ questions */
  const statements: [string, string][] = [
    [at("answer"), ind.answer],
    ...ind.pains.map((x, i): [string, string] => [at(`pains[${i}].fix`), x.fix]),
    ...ind.checklist.map((x, i): [string, string] => [at(`checklist[${i}].why`), x.why]),
    ...ind.useCases.map((x, i): [string, string] => [at(`useCases[${i}].how`), x.how]),
    ...ind.faqs.map((f, i): [string, string] => [at(`faqs[${i}].a`), f.a]),
    ...(ind.conduct ? ([[at("conduct.note"), ind.conduct.note]] as [string, string][]) : []),
  ];
  for (const [where, text] of statements) {
    for (const hit of claimHits(text)) p.push(`${where}: claims "${hit}", which the product does not do`);
    p.push(...linkProblems(text, where, pool));
  }

  /* Fields rendered as plain text must not carry inline marks */
  const plainFields: [string, string][] = [
    [at("name"), ind.name], [at("crumb"), ind.crumb], [at("h1"), ind.h1], [at("seoTitle"), ind.seoTitle],
    [at("description"), ind.description], [at("excerpt"), ind.excerpt], [at("whatsappText"), ind.whatsappText],
    ...ind.pains.map((x, i): [string, string] => [at(`pains[${i}].pain`), x.pain]),
    ...ind.checklist.map((x, i): [string, string] => [at(`checklist[${i}].item`), x.item]),
    ...ind.useCases.map((x, i): [string, string] => [at(`useCases[${i}].need`), x.need]),
    ...ind.faqs.map((f, i): [string, string] => [at(`faqs[${i}].q`), f.q]),
  ];
  for (const [where, text] of plainFields) {
    if (text.includes("**") || markRe().test(text)) p.push(`${where}: inline marks are only allowed in answer, fix, why, how, note and FAQ answers`);
  }

  /* Copy rules the writers agreed on (§5.2, §5.6) */
  const firstSentence = plainText(ind.answer).split(/(?<=\.)\s/)[0] ?? "";
  if (!/digital visiting card/i.test(firstSentence) && !firstSentence.toLowerCase().includes(ind.primaryKeyword.toLowerCase())) {
    p.push(`${at("answer")}: the first sentence must contain the primary keyword or "digital visiting card"`);
  }
  const sample = [ind.sample.name, ind.sample.role, ind.sample.org, ...ind.sample.services].join(" · ");
  if (/\d/.test(sample) || sample.includes("@")) p.push(`${at("sample")}: no numbers, phone numbers or emails in the sample persona`);
  if (/\bjain\b/i.test(sample)) p.push(`${at("sample")}: don't use the surname Jain (§5.6)`);
  if (ind.sample.services.length !== 3) p.push(`${at("sample.services")}: exactly 3 services`);
  if (/\d|@/.test(ind.whatsappText)) p.push(`${at("whatsappText")}: no numbers or personal data`);
  if (!/^Hi DigitalCarda, /.test(ind.whatsappText)) p.push(`${at("whatsappText")}: must start with "Hi DigitalCarda, "`);

  return p;
}

/** Brand (8), fake-stat (9) and price (10) guards over any blob of page text. */
export function guardProblems(raw: string, where: string): string[] {
  const p: string[] = [];
  const text = stripAllowed(raw);
  if (BRAND_GUARD.test(text)) p.push(`${where}: never write Pacewalk or Shekhar (§5.8)`);
  for (const g of FAKE_STAT_GUARDS) {
    const m = g.re.exec(text);
    if (m) p.push(`${where}: "${m[0].trim()}" looks like ${g.what}; invented numbers are not allowed (§5.4)`);
  }
  for (const m of text.match(PRICE_RE) ?? []) {
    const amount = m.replace(/\s/g, "").replace(/,+$/, "");
    if (!PRICES_OK.has(amount)) p.push(`${where}: price "${amount}" is not one of our real amounts`);
  }
  return p;
}

/* ── registry checks (blueprint §3d rule 1, minus the count) ───────────── */

export function checkRegistry(): string[] {
  const p: string[] = [];
  const seenSlug = new Set<string>();
  const seenOrder = new Map<number, string>();
  for (const ind of INDUSTRIES) {
    if (seenSlug.has(ind.slug)) p.push(`registry: duplicate slug "${ind.slug}"`);
    seenSlug.add(ind.slug);
    if (!/^[a-z0-9-]{1,40}$/.test(ind.slug)) p.push(`registry: slug "${ind.slug}" must match /^[a-z0-9-]{1,40}$/`);
    const clash = seenOrder.get(ind.order);
    if (clash) p.push(`registry: "${ind.slug}" and "${clash}" share order ${ind.order}`);
    seenOrder.set(ind.order, ind.slug);
    if (!PLANNED_INDUSTRY_SLUGS.includes(ind.slug)) p.push(`registry: "${ind.slug}" is not in PLANNED_INDUSTRY_SLUGS (add it there too)`);
  }

  /* Groups */
  if (INDUSTRY_GROUPS.length !== 6) p.push(`registry: ${INDUSTRY_GROUPS.length} groups, expected 6`);
  if (new Set(INDUSTRY_GROUPS.map((g) => g.id)).size !== INDUSTRY_GROUPS.length) p.push("registry: duplicate group id");
  for (const g of INDUSTRY_GROUPS) {
    if (g.label.length > 28) p.push(`registry: group "${g.id}" label is ${g.label.length} chars, max 28`);
    if (g.blurb.length > 70) p.push(`registry: group "${g.id}" blurb is ${g.blurb.length} chars, max 70`);
  }

  /* Features */
  for (const [key, f] of Object.entries(FEATURES)) {
    if (f.key !== key) p.push(`FEATURES.${key}: key field says "${f.key}"`);
    if (f.label.length > 28) p.push(`FEATURES.${key}: label is ${f.label.length} chars, max 28`);
    if (f.text.length > 200) p.push(`FEATURES.${key}: text is ${f.text.length} chars, max 200`);
    if (!f.href.startsWith("/")) p.push(`FEATURES.${key}: href "${f.href}" must start with "/"`);
    else if (f.href.startsWith("/blog/")) {
      if (!getBlogPost(f.href.slice("/blog/".length))) p.push(`FEATURES.${key}: href "${f.href}" is not a blog post`);
    } else if (!seoForPath(f.href)) p.push(`FEATURES.${key}: href "${f.href}" is not a page the site knows`);
    for (const hit of claimHits(f.text)) p.push(`FEATURES.${key}: claims "${hit}", which the product does not do`);
  }

  /* Storyboard */
  for (const kind of SHARE_KINDS) {
    if (SHARE_STEPS[kind]?.length !== 4) p.push(`SHARE_STEPS.${kind}: expected exactly 4 steps`);
    if (SHARE_CHIPS[kind]?.length !== 3) p.push(`SHARE_CHIPS.${kind}: expected exactly 3 chips`);
    for (const s of SHARE_STEPS[kind] ?? []) {
      const unknown = [...`${s.title} ${s.text}`.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((t) => !["client", "where", "org", "service"].includes(t));
      if (unknown.length) p.push(`SHARE_STEPS.${kind}: unknown token {${unknown[0]}}`);
    }
  }

  /* Hub FAQ */
  const pool = new Set(PLANNED_INDUSTRY_SLUGS);
  if (INDUSTRY_HUB_FAQS.length !== 4) p.push(`INDUSTRY_HUB_FAQS: ${INDUSTRY_HUB_FAQS.length} entries, expected 4`);
  INDUSTRY_HUB_FAQS.forEach((f, i) => {
    if (f.q.length > 90) p.push(`INDUSTRY_HUB_FAQS[${i}].q: ${f.q.length} chars, max 90`);
    const w = wordCount(f.a);
    if (w < 25 || w > 90) p.push(`INDUSTRY_HUB_FAQS[${i}].a: ${w} words, expected 25–90`);
    for (const hit of claimHits(f.a)) p.push(`INDUSTRY_HUB_FAQS[${i}].a: claims "${hit}", which the product does not do`);
    p.push(...linkProblems(f.a, `INDUSTRY_HUB_FAQS[${i}].a`, pool));
  });

  /* Shared copy */
  p.push(...guardProblems(JSON.stringify({ FEATURES, SHARE_STEPS, SHARE_CHIPS, INDUSTRY_GROUPS, INDUSTRY_HUB_FAQS, TRIAL_LINE, PRICE_LINE, UPGRADE_LINE }), "shared copy"));
  return p;
}

/** Blueprint §3d rule 1: the registry holds 14–20 pages. Fails until WP6 lands. */
export function checkCount(): string[] {
  const n = INDUSTRIES.length;
  return n >= 14 && n <= 20 ? [] : [`registry: ${n} industries, expected 14–20 (WP6 adds the rest)`];
}

/** Every relatedIndustries slug is a page that exists. Fails until WP6 lands. */
export function checkLinks(): string[] {
  const p: string[] = [];
  for (const ind of INDUSTRIES) {
    for (const s of ind.relatedIndustries) {
      if (!getIndustry(s)) p.push(`${ind.slug}.relatedIndustries: "${s}" is planned but not registered yet`);
    }
  }
  return p;
}
