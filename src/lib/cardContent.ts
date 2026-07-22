/* Helpers to load a customer's real card content (from the extracted DB tables)
   and decode the quirks of the legacy schema. */

const IMG_BASE = "https://digitalcarda.in/otdo-panel/uploads";

export function imgUrl(folder: string, f: unknown): string {
  const name = String(f ?? "").trim();
  if (!name) return "";
  if (/^(https?:|data:)/.test(name)) return name;
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

/* Product descriptions are HTML-encoded; decode entities but keep the markup. */
export function decodeHtml(html: unknown): string {
  const t = document.createElement("textarea");
  t.innerHTML = String(html ?? "");
  return t.value.trim();
}

type Raw = Record<string, string>;

export async function loadCustomerContent(slug: string) {
  const j = (u: string) => fetch(u).then((r) => r.json()).catch(() => [] as Raw[]);
  const [prods, gals, vids, offs, qrs, ups] = await Promise.all([
    j("/product.json"), j("/gallery.json"), j("/video.json"), j("/offer.json"), j("/qrcode.json"), j("/uploads.json"),
  ]);
  const mine = (arr: Raw[]) => arr.filter((x) => x.uname === slug);

  return {
    products: mine(prods).map((p) => ({
      id: Number(p.id), name: p.name || "", filename: imgUrl("product", p.filename),
      price: p.price || "", offer_price: p.offer_price || "",
      description: decodeHtml(p.description), button: "", button_title: p.button_title || "Know More",
    })),
    gallery: mine(gals).map((g) => ({ id: Number(g.id), name: g.name || "", filename: imgUrl("gallery", g.filename) })),
    videos: mine(vids).map((v) => ({ id: Number(v.id), title: v.title || "Video", url: `https://www.youtube.com/watch?v=${v.name}` })),
    offers: mine(offs).map((o) => ({
      id: Number(o.id), title: decodeHtml(o.title) || "", description: decodeHtml(o.name) || "",
      valid: (o.valid || "").split(" ")[0], filename: imgUrl("offer", o.filename),
    })),
    qrcodes: mine(qrs).map((q) => ({ id: Number(q.id), name: q.name || "Pay Online", filename: imgUrl("qrcode", q.filename) })),
    uploads: mine(ups).map((u) => ({ id: Number(u.id), name: u.name || u.filename || "File", filename: imgUrl("uploads", u.filename), kind: /\.(jpg|jpeg|png|gif|webp)$/i.test(u.filename) ? "image" : "file" })),
  };
}
