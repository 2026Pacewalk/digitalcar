/* Helpers to load a customer's real card content (from the extracted DB tables)
   and decode the quirks of the legacy schema. */
import { scopedKey } from "@/hooks/useCustomer";
import { IMG_BASE, healUploadUrl } from "@/lib/img";
import { getToken } from "@/lib/session";

export function imgUrl(folder: string, f: unknown): string {
  const name = String(f ?? "").trim();
  if (!name) return "";
  if (/^data:/.test(name)) return name;
  // Absolute upload URL from any (possibly stale/dev) host → re-point to the
  // current base; other absolute URLs pass through unchanged.
  if (/^https?:/.test(name)) return healUploadUrl(name);
  return encodeURI(`${IMG_BASE}/${folder}/${name}`);
}

/* Specialities are stored triple-base64-encoded + character-reversed per item. */
export function decodeSpecialities(raw: unknown): string {
  return String(raw ?? "")
    .split(",")
    .map((item) => {
      let x = item.trim();
      if (!x) return "";
      if (!/^[A-Za-z0-9+/]+=*$/.test(x) || x.length < 12) return x; // already plain
      try {
        for (let i = 0; i < 3; i++) x = atob(x);
        return x.split("").reverse().join("");
      } catch {
        return item.trim();
      }
    })
    .filter(Boolean)
    .join(",");
}

/* Characters produced by UTF-8-as-latin1 mangling (and Windows-1252 punctuation).
   A run of 2+ of these is unrecoverable garbage — usually a mangled bullet/checkmark. */
const MOJI_CLUSTER = /[-¿ÂÃÅâŒœŠšŸŽžˆ˜–—‘’‚“”„†‡•…‰‹›€™]{2,}/g;

/* Legacy data is doubly UTF-8-as-latin1 mangled (e.g. ₹ shows as "Ã¢âÂ¹",
   a bullet shows as "Ã¢Åâ"). Reverse the reversible layers, patch the common
   symbols, then collapse any remaining garbage cluster into a clean bullet. */
export function fixMojibake(raw: unknown): string {
  let out = String(raw ?? "");
  for (let i = 0; i < 2; i++) {
    if (!/[ÃÂ]/.test(out)) break;
    try { const d = decodeURIComponent(escape(out)); if (!d || d === out) break; out = d; } catch { break; }
  }
  return out
    .replace(/Ã¢[^\x00-\x7F]*Â?¹|â[^\x00-\x7F]*¹|â‚¹/g, "₹")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, "-")
    .replace(MOJI_CLUSTER, "•")
    .replace(/[ÂÃ](?=\s|$|•)/g, "");
}

/* Product descriptions are HTML-encoded; decode entities but keep the markup. */
export function decodeHtml(html: unknown): string {
  const t = document.createElement("textarea");
  t.innerHTML = String(html ?? "");
  return fixMojibake(t.value).trim();
}

/* Decode entities, strip markup and repair encoding → clean plain text.
   Block boundaries (</p>, <br>, </li>…) become " · " so list items don't merge. */
export function cleanPlain(raw: unknown): string {
  const html = String(raw ?? "")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const t = document.createElement("div");
  t.innerHTML = html;
  return fixMojibake(t.textContent || "")
    .replace(/[•\n]+/g, " · ")
    .replace(/\s*·\s*/g, " · ")
    .replace(/^(\s*·\s*)+|(\s*·\s*)+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Raw = Record<string, string>;

/* Returns an async seeder for useLocalList that loads a single content category
   for the currently-impersonated customer (slug read from localStorage). */
export function contentSeeder<K extends keyof Awaited<ReturnType<typeof loadCustomerContent>>>(category: K) {
  return async () => {
    let slug = "acme-digital";
    try { slug = JSON.parse(localStorage.getItem(scopedKey("dc_customer")) || "{}").slug || "acme-digital"; } catch { /* default */ }
    const content = await loadCustomerContent(slug);
    return content[category] as Awaited<ReturnType<typeof loadCustomerContent>>[K];
  };
}

/* The two loaders below answer "no card" with null and THROW when the server
   couldn't be asked (offline, a 5xx, signed out). The difference matters: the
   dashboard loads the old site's copy of a card only when there is no live one,
   and an error mistaken for "no card" put years-old content back on live cards. */

/* Fetch the signed-in user's real legacy card profile (matched by email,
   server-side). Returns the raw legacy customer row (credentials stripped)
   or null if the user has no legacy card. */
export async function loadMyLegacyProfile(): Promise<Record<string, unknown> | null> {
  const r = await fetch("/api/my/card", { headers: { "x-auth-token": getToken("main") } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Couldn't load the card (${r.status})`);
  return (await r.json()) as Record<string, unknown>;
}

/* Fetch the signed-in user's published SNAPSHOT (customer + products + gallery +
   videos + offers + qrcodes). The snapshot is the LIVE card's data — the primary
   copy the dashboard hydrates from. Returns { slug, cardId, data, updatedAt },
   or null when there is no published card. `cardId` asks for one card of a
   multi-card account (default: the primary); `token` reads another account's
   card without signing this browser in as them (admin "Login as Client"). */
export type MySnapshot = { slug?: string; cardId?: number; data?: Record<string, unknown>; updatedAt?: string };
export async function loadMySnapshot(cardId?: number, token: string = getToken("main")): Promise<MySnapshot | null> {
  const r = await fetch(`/api/my/snapshot${cardId ? `?cardId=${cardId}` : ""}`, { headers: { "x-auth-token": token } });
  if (!r.ok) throw new Error(`Couldn't load the card (${r.status})`);
  const snap = (await r.json()) as MySnapshot | null;
  // A server that doesn't know `cardId` answers with the primary card. That is
  // not this card's copy, and must never be written into it.
  if (snap && cardId && snap.cardId !== undefined && Number(snap.cardId) !== cardId) return null;
  return snap;
}

/* The old site's content for a card. A file that can't be fetched counts as
   empty — fine for showing a card. `strict` is for the callers that go on to
   SAVE what they loaded (dashboard hydration, admin "Login as Client"): there
   a failed fetch throws, so a server hiccup can't turn into an empty list that
   later gets published. (A file this deployment doesn't have is still empty.) */
export async function loadCustomerContent(slug: string, opts: { strict?: boolean } = {}) {
  const j = async (u: string): Promise<Raw[]> => {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`${u} ${r.status}`);
      try { const rows = await r.json(); return Array.isArray(rows) ? (rows as Raw[]) : []; } catch { return []; }
    } catch (e) {
      if (opts.strict) throw e;
      return [];
    }
  };
  const [prods, gals, vids, offs, qrs, ups] = await Promise.all([
    j("/product.json"), j("/gallery.json"), j("/video.json"), j("/offer.json"), j("/qrcode.json"), j("/uploads.json"),
  ]);
  // Legacy `uname` casing is inconsistent (e.g. "Property1313" vs slug
  // "property1313"), so match case-insensitively.
  const sl = String(slug).toLowerCase();
  const mine = (arr: Raw[]) => arr.filter((x) => String(x.uname ?? "").toLowerCase() === sl);

  return {
    products: mine(prods).map((p) => ({
      id: Number(p.id), name: p.name || "", filename: imgUrl("product", p.filename),
      price: p.price || "", offer_price: p.offer_price || "",
      description: decodeHtml(p.description), button: "", button_title: p.button_title || "Know More",
    })),
    gallery: mine(gals).map((g) => ({ id: Number(g.id), name: g.name || "", filename: imgUrl("gallery", g.filename) })),
    videos: mine(vids).map((v) => ({ id: Number(v.id), title: v.title || "Video", url: `https://www.youtube.com/watch?v=${v.name}` })),
    offers: mine(offs).map((o) => ({
      id: Number(o.id), title: cleanPlain(o.title) || "", description: cleanPlain(o.name) || "",
      valid: (o.valid || "").split(" ")[0], filename: imgUrl("offer", o.filename),
    })),
    qrcodes: mine(qrs).map((q) => ({ id: Number(q.id), name: q.name || "Pay Online", filename: imgUrl("qrcode", q.filename) })),
    uploads: mine(ups).map((u) => ({ id: Number(u.id), name: u.name || u.filename || "File", filename: imgUrl("uploads", u.filename), kind: /\.(jpg|jpeg|png|gif|webp)$/i.test(u.filename) ? "image" : "file" })),
  };
}
