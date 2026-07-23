/*
 * Server-side lead intelligence. Mirrors src/lib/leadIntel.ts (heuristic) and,
 * when ANTHROPIC_API_KEY is set, upgrades to an LLM classification (Claude).
 * Used at capture time to decide: hot-lead alert / normal alert / suppress spam.
 */
export type LeadCategory = "important" | "normal" | "spam";

export interface LeadLike {
  name?: string | null;
  email?: string | null;
  contact?: string | null;
  description?: string | null;
  uname?: string | null;
}
export interface LeadVerdict { category: LeadCategory; score: number; reasons: string[]; via: "ai" | "rules"; }

const SPAM_KW = /podcast|featured (you|on)|guest post|back ?link|\bSEO\b|rank (your|higher|on)|top of google|first page of|web ?(design|development) (company|services|agency)|digital marketing|increase (your )?(sales|traffic|revenue|ranking|followers)|crypto|bitcoin|\bbtc\b|\beth\b|forex|casino|\bloan\b|viagra|escort|\bxxx\b|\bsex\b|girlfriend|adult|social media marketing|\bSMM\b|lead generation|cold email|b2b (leads|data)|link building|\boutreach\b|website traffic|buy .*followers|marketing (services|agency)|instagram growth|growth service|followers? (bot|organ)|per hour|short email messages|repetitive work|\be-?book\b|chatgpt|\bai (your|website|is here|goldmine|countdown|doomsday|earn|sex)|audiobook|goldmine|make (huge|big|money|\$)|work from home|earn (money|daily|per)|virtual assistant|we run an|totally free|dog harness|spy ?bulb|obsolete|click the link|\binvestment\b|affiliate|free traffic|incredible offer|giveaway|withdrawal|payment no|\bdollars?\b|claim (your|now)|congratulations|you (have )?won|\bprize\b|\bwinner\b|pages\.dev|graph\.org/i;
const URL_RE = /https?:\/\/|www\.[a-z]|t\.me\/|\b[a-z0-9-]{2,}\.(com|net|io|org|dev|xyz|shop|online|site|store|info|link|club|app|co|in|me|ru|cn|top|live|vip|win|bet|gift|pro|biz|us|uk|pages)\b|\b[a-z0-9-]+\.[a-z]{2,8}\/\S/i;
const INTENT = /\b(price|pricing|cost|charges?|quote|quotation|how much|interested|buy|purchase|order|book|booking|need|require|want|available|call me|contact me|whats ?app|urgent|demo|enquir|inquir|looking for|would like)\b/i;
const isCardSlug = (u?: string | null) => !!u && String(u).trim() !== "" && String(u).trim().toLowerCase() !== "admin";
const gibberishName = (n?: string | null) => {
  const t = String(n || "").trim();
  return /^[a-z]{7,}$/i.test(t) && (t.match(/[aeiou]/gi) || []).length / t.length < 0.26;
};

export function classifyLeadRules(l: LeadLike): LeadVerdict {
  const desc = String(l.description || "").trim();
  const hay = (String(l.name || "") + " " + desc).trim();
  const compact = desc.replace(/[^a-z0-9]/gi, "");
  const card = isCardSlug(l.uname);
  const hasContact = !!(l.email || l.contact);

  let spam = 0;
  const reasons: string[] = [];
  if (URL_RE.test(hay)) { spam += 3; reasons.push("contains a link"); }
  if (SPAM_KW.test(hay)) { spam += 3; reasons.push("scam / marketing keywords"); }
  if (!card && desc.length > 220) { spam += 1; reasons.push("long website pitch"); }
  if (gibberishName(l.name) && desc.length < 12) { spam += 3; reasons.push("gibberish name"); }
  if (spam >= 3) return { category: "spam", score: Math.min(99, 62 + spam * 7), reasons, via: "rules" };

  let imp = 0;
  const impR: string[] = [];
  if (card) { imp += 1; impR.push("came from a card"); }
  if (INTENT.test(desc)) { imp += 2; impR.push("shows buying intent"); }
  if (l.contact) { imp += 1; impR.push("left a phone number"); } else if (l.email) imp += 1;
  if ((card && INTENT.test(desc) && hasContact) || imp >= 4) return { category: "important", score: Math.min(98, 52 + imp * 10), reasons: impR, via: "rules" };

  if (!card && compact.length > 0 && compact.length < 6) return { category: "spam", score: 70, reasons: ["junk website message"], via: "rules" };
  return { category: "normal", score: 45, reasons: impR.length ? impR : ["general enquiry"], via: "rules" };
}

async function aiClassify(l: LeadLike): Promise<LeadCategory | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 8,
        system: "You classify enquiries submitted on a digital business card / website. Reply with exactly ONE word: important, normal, or spam. important = a genuine potential customer showing buying intent or a real service request. spam = marketing/SEO/backlink/promo pitches, bots, link drops, get-rich schemes. normal = a real but low-intent or generic message.",
        messages: [{ role: "user", content: `Name: ${l.name || "-"}\nEmail: ${l.email || "-"}\nPhone: ${l.contact || "-"}\nMessage: ${String(l.description || "-").slice(0, 800)}` }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json() as { content?: Array<{ text?: string }> };
    const txt = String(j?.content?.[0]?.text || "").toLowerCase();
    if (txt.includes("important")) return "important";
    if (txt.includes("spam")) return "spam";
    if (txt.includes("normal")) return "normal";
    return null;
  } catch {
    return null;
  }
}

/** Classify with AI when configured, else deterministic rules. Never throws. */
export async function classifyLeadSmart(l: LeadLike): Promise<LeadVerdict> {
  const rules = classifyLeadRules(l);
  const ai = await aiClassify(l);
  if (ai) return { category: ai, score: 92, reasons: ["classified by AI"], via: "ai" };
  return rules;
}
