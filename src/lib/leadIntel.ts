/*
 * Lead intelligence — classifies an enquiry as important / normal / spam and
 * scores it, using deterministic signals. Runs instantly in the browser (no API
 * key). The server mirrors this in api/lib/lead-intel.ts and can additionally
 * use an LLM when configured.
 */
export type LeadCategory = "important" | "normal" | "spam";

export interface LeadLike {
  name?: string | null;
  email?: string | null;
  contact?: string | null;
  description?: string | null;
  uname?: string | null;
}

export interface LeadVerdict {
  category: LeadCategory;
  score: number; // 0–100 confidence in the category
  reasons: string[];
}

const SPAM_KW = /podcast|featured (you|on)|guest post|back ?link|\bSEO\b|rank (your|higher|on)|top of google|first page of|web ?(design|development) (company|services|agency)|digital marketing|increase (your )?(sales|traffic|revenue|ranking|followers)|crypto|bitcoin|\bbtc\b|\beth\b|forex|casino|\bloan\b|viagra|escort|\bxxx\b|\bsex\b|girlfriend|adult|social media marketing|\bSMM\b|lead generation|cold email|b2b (leads|data)|link building|\boutreach\b|website traffic|buy .*followers|marketing (services|agency)|instagram growth|growth service|followers? (bot|organ)|per hour|short email messages|repetitive work|\be-?book\b|chatgpt|\bai (your|website|is here|goldmine|countdown|doomsday|earn|sex)|audiobook|goldmine|make (huge|big|money|\$)|work from home|earn (money|daily|per)|virtual assistant|we run an|totally free|dog harness|spy ?bulb|obsolete|click the link|\binvestment\b|affiliate|free traffic|incredible offer|giveaway|withdrawal|payment no|\bdollars?\b|claim (your|now)|congratulations|you (have )?won|\bprize\b|\bwinner\b|pages\.dev|graph\.org/i;
const URL_RE = /https?:\/\/|www\.[a-z]|t\.me\/|\b[a-z0-9-]{2,}\.(com|net|io|org|dev|xyz|shop|online|site|store|info|link|club|app|co|in|me|ru|cn|top|live|vip|win|bet|gift|pro|biz|us|uk|pages)\b|\b[a-z0-9-]+\.[a-z]{2,8}\/\S/i;
const INTENT = /\b(price|pricing|cost|charges?|quote|quotation|how much|interested|buy|purchase|order|book|booking|need|require|want|available|call me|contact me|whats ?app|urgent|demo|enquir|inquir|looking for|would like)\b/i;

const isCardSlug = (u?: string | null) => !!u && String(u).trim() !== "" && String(u).trim().toLowerCase() !== "admin";
// Random keyboard-mash single-token names (e.g. "xklvyvejxj") — very low vowel ratio.
const gibberishName = (n?: string | null) => {
  const t = String(n || "").trim();
  return /^[a-z]{7,}$/i.test(t) && (t.match(/[aeiou]/gi) || []).length / t.length < 0.26;
};

export function classifyLead(l: LeadLike): LeadVerdict {
  const desc = String(l.description || "").trim();
  const hay = (String(l.name || "") + " " + desc).trim(); // spam can hide in the name too
  const compact = desc.replace(/[^a-z0-9]/gi, "");
  const card = isCardSlug(l.uname);
  const hasContact = !!(l.email || l.contact);
  const reasons: string[] = [];

  // ── Spam ──
  let spam = 0;
  if (URL_RE.test(hay)) { spam += 3; reasons.push("contains a link"); }
  if (SPAM_KW.test(hay)) { spam += 3; reasons.push("scam / marketing keywords"); }
  if (!card && desc.length > 220) { spam += 1; reasons.push("long website pitch"); }
  if (gibberishName(l.name) && desc.length < 12) { spam += 3; reasons.push("gibberish name"); }
  if (spam >= 3) return { category: "spam", score: Math.min(99, 62 + spam * 7), reasons };

  // ── Important ──
  let imp = 0;
  const impReasons: string[] = [];
  if (card) { imp += 1; impReasons.push("came from a card"); }
  if (INTENT.test(desc)) { imp += 2; impReasons.push("shows buying intent"); }
  if (l.contact) { imp += 1; impReasons.push("left a phone number"); }
  else if (l.email) { imp += 1; }
  if ((card && INTENT.test(desc) && hasContact) || imp >= 4) {
    return { category: "important", score: Math.min(98, 52 + imp * 10), reasons: impReasons };
  }

  // ── Junk-ish website message (short gibberish, no card) → spam ──
  if (!card && compact.length > 0 && compact.length < 6) {
    return { category: "spam", score: 70, reasons: ["junk website message"] };
  }

  return { category: "normal", score: 45, reasons: impReasons.length ? impReasons : ["general enquiry"] };
}
