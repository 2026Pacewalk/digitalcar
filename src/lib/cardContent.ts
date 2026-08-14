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

/* Fetch the signed-in user's real legacy card profile (matched by email,
   server-side). Returns the raw legacy customer row (credentials stripped)
   or null if the user has no legacy card / isn't signed in. */
export async function loadMyLegacyProfile(): Promise<Record<string, unknown> | null> {
  try {
    const token = getToken("main");
    const r = await fetch("/api/my/card", { headers: { "x-auth-token": token } });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch { return null; }
}

/* Fetch the signed-in user's published SNAPSHOT (customer + products + gallery +
   videos + offers + qrcodes). Used to hydrate new-flow users whose data isn't in
   the legacy customers.json. Returns { slug, data } or null. */
export async function loadMySnapshot(): Promise<{ slug?: string; data?: Record<string, unknown> } | null> {
  try {
    const token = getToken("main");
    const r = await fetch("/api/my/snapshot", { headers: { "x-auth-token": token } });
    if (!r.ok) return null;
    return (await r.json()) as { slug?: string; data?: Record<string, unknown> } | null;
  } catch { return null; }
}

export async function loadCustomerContent(slug: string) {
  const j = (u: string) => fetch(u).then((r) => r.json()).catch(() => [] as Raw[]);
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
