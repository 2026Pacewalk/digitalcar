/*
 * Premium single-screen card DESIGNS (not just colour themes) — richer, print-
 * like layouts inspired by real business / ID / membership cards. Numbered right
 * after the link-in-bio range. Each reuses the data the customer already has
 * (name, role, company, contacts, products, socials, QR, vCard) plus a few
 * optional fields (photo, employee id, blood group, membership id…).
 */
import { shareSheetCss, shareSheetHtml, shareSheetJs } from "./shareSheet";
import { parseVideo } from "@/lib/video";
import { SOCIAL_BY_KEY, readSocialLinks } from "@/lib/socialPlatforms";

type PCProduct = { name: string; tagline?: string; description?: string; button?: string; button_title?: string; filename?: string; price?: string; offer_price?: string };
type PCRecord = Record<string, unknown>;
/* Full mini-website content passed through from buildCardHtml, so the premium
   designs can render the SAME sections as the classic templates. */
export type PremiumExtras = {
  gallery?: { name?: string; filename: string }[];
  videos?: { title?: string; url: string }[];
  offers?: { title?: string; description?: string; valid?: string; filename?: string }[];
};

const s = (v: unknown) => String(v ?? "").trim();
const esc = (v: unknown) => s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Perceived brightness of a #rrggbb colour (0 dark … 1 light) — pick readable text.
const lum = (hex: string) => { const h = s(hex).replace("#", ""); if (h.length < 6) return 1; const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const IMG = 'referrerpolicy="no-referrer"';
/* Social icons for the premium designs — reads the SAME source as the classic
   templates (the Social Links page's saved list, with the legacy per-platform
   fields as fallback) and honours the owner's "Icon style" choice: theme colour
   (the template's own look) vs each platform's real brand colour. Shared by all
   premium templates so the setting keeps working for future designs too. */
const safeHref = (u: string) => {
  const t = String(u ?? "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return "https://" + t;
  return "#"; // block javascript:/data: etc.
};
function premiumSocials(c: PCRecord, cls: string): string {
  const brand = s(c.social_icon_style) === "brand";
  return readSocialLinks(c as Record<string, unknown>).map(({ platform, url }) => {
    const p = SOCIAL_BY_KEY[platform];
    if (!p) return "";
    const ic = p.svg || `<i class="${p.fa}"></i>`;
    const st = brand ? ` style="background:${p.color};color:${p.fg || "#fff"};border-color:${p.color}"` : "";
    return `<a class="${cls}" href="${esc(safeHref(url))}" target="_blank" rel="noopener" aria-label="${esc(p.label)}"${st}>${ic}</a>`;
  }).join("");
}

/* Design names — the count drives the template gallery. Add more here + a branch
   in buildPremiumCardHtml to introduce the ID / Membership cards later. */
export const PREMIUM_NAMES = ["Corporate Business Card", "Employee ID Card", "Membership Card", "Professional Profile"];
export const PREMIUM_COUNT = PREMIUM_NAMES.length;

const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&family=Sora:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap">`;

const initialPh = (c: PCRecord, bg: string) => {
  const i = (s(c.name)[0] || "D").toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='220'><rect width='200' height='220' fill='${bg}'/><text x='50%' y='50%' font-size='96' fill='#fff' text-anchor='middle' font-family='Arial' dominant-baseline='central'>${i}</text></svg>`)}`;
};

export function buildPremiumCardHtml(c: PCRecord, products: PCProduct[] = [], index = 0, opts: { thumb?: boolean; extras?: PremiumExtras } = {}): string {
  switch (index) {
    case 1: return idCard(c);
    case 2: return membershipCard(c);
    case 3: return professionalProfile(c, products, opts);
    default: return businessCard(c, products, opts);
  }
}

const fieldRow = (label: string, value: string, labelColor: string, valColor: string) =>
  value ? `<div class="pcf-row"><span class="pcf-l" style="color:${labelColor}">${esc(label)}</span><span class="pcf-c">:</span><span class="pcf-v" style="color:${valColor}">${esc(value)}</span></div>` : "";

// ── Employee ID card (image #2): white card, circular photo, field table, footer ──
function idCard(c: PCRecord): string {
  const dark = s(c.color2) || "#16365d";
  const accent = s(c.color) || "#e0b23c";
  const name = esc(c.name) || "Your Name";
  const photo = s(c.photo);
  const logo = s(c.logo);
  const fields = [
    fieldRow("Employee ID", s(c.employee_id), dark, "#334155"),
    fieldRow("Blood Group", s(c.blood_group), dark, "#334155"),
    fieldRow("Phone", s(c.mobile1), dark, "#334155"),
    fieldRow("Email", s(c.email), dark, "#334155"),
    fieldRow("Joining Date", s(c.joining_date), dark, "#334155"),
  ].join("");
  const css = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins','Inter',system-ui,sans-serif;background:#e7ecf2;}
  .idc{max-width:410px;margin:0 auto;min-height:100vh;background:#fff;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(15,23,42,.12);}
  .idc-top{position:relative;padding:26px 22px 0;text-align:center;}
  .idc-top::before{content:"";position:absolute;top:0;left:0;right:0;height:70px;background:${dark};clip-path:polygon(0 0,100% 0,100% 55%,0 100%);opacity:.06;}
  .idc-logo img{max-height:38px;max-width:170px;object-fit:contain;position:relative;}
  .idc-photo{width:132px;height:132px;border-radius:50%;overflow:hidden;border:4px solid ${dark};margin:16px auto 14px;background:${accent};box-shadow:0 8px 24px rgba(15,23,42,.15);}
  .idc-photo img{width:100%;height:100%;object-fit:cover;display:block;}
  .idc-name{color:${dark};font-size:22px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;}
  .idc-role{font-size:13px;color:#475569;font-weight:600;margin-top:3px;}
  .idc-org{font-size:12px;color:#94a3b8;margin:2px 0 20px;}
  .idc-fields{padding:0 26px;}
  .pcf-row{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:10px 0;border-bottom:1px solid #eef2f7;}
  .pcf-l{width:104px;flex-shrink:0;font-weight:700;text-transform:uppercase;letter-spacing:.03em;font-size:11px;}
  .pcf-c{color:#cbd5e1;}
  .pcf-v{font-weight:500;word-break:break-word;}
  .idc-sign{text-align:right;padding:20px 26px 10px;}
  .idc-sign .idc-sig-name{font-family:'Poppins',cursive;font-size:15px;color:${dark};font-weight:600;font-style:italic;}
  .idc-sign small{display:inline-block;border-top:1.5px solid #cbd5e1;padding-top:4px;margin-top:2px;font-size:10.5px;color:#94a3b8;letter-spacing:.05em;}
  .idc-foot{margin-top:auto;background:${dark};color:${accent};text-align:center;padding:15px;font-weight:700;letter-spacing:.22em;font-size:11px;text-transform:uppercase;}
  `;
  const brand = logo ? `<img src="${esc(logo)}" alt="${esc(c.company_name)}" ${IMG}>` : `<span style="font-weight:800;font-size:17px;color:${dark}">${esc(c.company_name) || "COMPANY"}</span>`;
  return `<!doctype html><html><head>${HEAD}<style>${css}</style></head><body><div class="idc">
    <div class="idc-top">
      <div class="idc-logo">${brand}</div>
      <div class="idc-photo"><img src="${esc(photo) || initialPh(c, dark)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, dark)}'"></div>
      <div class="idc-name">${name}</div>
      ${s(c.designation) ? `<div class="idc-role">${esc(c.designation)}</div>` : ""}
      ${s(c.company_name) ? `<div class="idc-org">${esc(c.company_name)}</div>` : ""}
    </div>
    <div class="idc-fields">${fields}</div>
    <div class="idc-sign"><div class="idc-sig-name">${name}</div><small>Authorised Signatory</small></div>
    <div class="idc-foot">Innovate &nbsp;·&nbsp; Secure &nbsp;·&nbsp; Empower</div>
  </div></body></html>`;
}

// ── Membership card (image #3): emerald + gold, badge, stars, fields, QR, thanks ──
function membershipCard(c: PCRecord): string {
  const green = s(c.color2) || "#0f5132";
  const gold = s(c.color) || "#d4af37";
  const name = esc(c.name) || "Your Name";
  const photo = s(c.photo);
  const logo = s(c.logo);
  const tier = esc(s(c.membership_type) || "Premium");
  const rating = Math.max(0, Math.min(5, Number(c.member_rating) || 5));
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(`https://digitalcarda.in/${slug || "card"}`)}`;
  const stars = Array.from({ length: 5 }, (_, i) => `<i class="fa fa-star" style="color:${i < rating ? gold : "rgba(255,255,255,.25)"}"></i>`).join("");
  const fields = [
    fieldRow("Membership ID", s(c.membership_id), gold, "#f4f1e4"),
    fieldRow("Member Since", s(c.member_since), gold, "#f4f1e4"),
    fieldRow("Valid Till", s(c.valid_till), gold, "#f4f1e4"),
    fieldRow("Membership Type", tier, gold, "#f4f1e4"),
    fieldRow("Blood Group", s(c.blood_group), gold, "#f4f1e4"),
  ].join("");
  const css = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins','Inter',system-ui,sans-serif;background:#08201a;}
  .mem{max-width:410px;margin:0 auto;min-height:100vh;background:radial-gradient(120% 90% at 50% -10%,${green} 0%,#0a3a24 55%,#062417 100%);color:#f4f1e4;display:flex;flex-direction:column;padding:22px 22px 26px;position:relative;}
  .mem::before{content:"";position:absolute;inset:10px;border:1.5px solid ${gold}55;border-radius:16px;pointer-events:none;}
  .mem-in{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;}
  .mem-top{display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px;}
  .mem-logo img{max-height:30px;max-width:130px;object-fit:contain;}
  .mem-tier{background:${gold};color:${green};font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;border-radius:999px;}
  .mem-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid ${gold}88;color:${gold};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin:8px 0 16px;}
  .mem-photo{width:110px;height:110px;border-radius:50%;overflow:hidden;border:3px solid ${gold};background:${green};box-shadow:0 8px 22px rgba(0,0,0,.35);}
  .mem-photo img{width:100%;height:100%;object-fit:cover;display:block;}
  .mem-name{font-family:'Poppins',sans-serif;font-size:21px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:12px 0 6px;}
  .mem-stars{font-size:14px;letter-spacing:3px;margin-bottom:16px;}
  .mem-fields{width:100%;max-width:320px;margin:0 auto 16px;}
  .mem-fields .pcf-row{border-bottom:1px solid ${gold}22;padding:9px 0;font-size:12.5px;}
  .mem-fields .pcf-l{width:120px;font-size:10.5px;} .mem-fields .pcf-c{color:${gold}66;}
  .mem-qr{background:#fff;padding:6px;border-radius:10px;line-height:0;margin:4px 0 14px;}
  .mem-qr img{width:96px;height:96px;display:block;}
  .mem-thanks{color:${gold};font-size:12.5px;font-weight:600;margin-top:auto;}
  `;
  const brand = logo ? `<img src="${esc(logo)}" alt="${esc(c.company_name)}" ${IMG}>` : `<span style="font-weight:800;font-size:15px;color:${gold}">${esc(c.company_name) || "BRAND"}</span>`;
  return `<!doctype html><html><head>${HEAD}<style>${css}</style></head><body><div class="mem"><div class="mem-in">
    <div class="mem-top"><span class="mem-logo">${brand}</span><span class="mem-tier">${tier} Member</span></div>
    <div class="mem-badge"><i class="fa fa-crown"></i> Membership Card</div>
    <div class="mem-photo"><img src="${esc(photo) || initialPh(c, green)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, green)}'"></div>
    <div class="mem-name">${name}</div>
    <div class="mem-stars">${stars}</div>
    <div class="mem-fields">${fields}</div>
    <div class="mem-qr"><img src="${qrSrc}" alt="QR" ${IMG}></div>
    <div class="mem-thanks">Thank you for being a valued member!</div>
  </div></div></body></html>`;
}

// Distinct, relevant icon + a professional fallback description per service.
export function svcMeta(nm: string): { icon: string; desc: string } {
  const n = nm.toLowerCase();
  const M: [RegExp, string, string][] = [
    [/social|smm|instagram|facebook/, "fa-bullhorn", "Grow reach & engagement across every platform."],
    [/e-?commerce|shop|store|cart/, "fa-shopping-cart", "Sell online with a store built to convert."],
    [/web|website|landing/, "fa-code", "Fast, modern websites that turn visits into leads."],
    [/business ?card|visiting|nfc|digital card/, "fa-id-card", "Smart digital cards that make an impression."],
    [/brand|identity|logo/, "fa-gem", "A cohesive identity that sets you apart."],
    [/catalog|catalogue|brochure/, "fa-book-open", "Beautiful catalogues that showcase your range."],
    [/seo|search|rank/, "fa-search", "Rank higher and get found by the right people."],
    [/app|mobile/, "fa-mobile-alt", "Native-feel mobile apps your users love."],
    [/video|motion|animation/, "fa-video", "Scroll-stopping video that tells your story."],
    [/graphic|creative|poster|design/, "fa-pen-nib", "Standout creatives crafted to perform."],
    [/lead|crm|automation/, "fa-user-plus", "Capture and nurture every lead automatically."],
    [/bulk|sms|whatsapp|campaign/, "fa-comment-dots", "Reach your audience where they already are."],
    [/consult|strategy|growth/, "fa-chart-line", "Data-driven strategy for measurable growth."],
  ];
  for (const [re, icon, desc] of M) if (re.test(n)) return { icon, desc };
  return { icon: "fa-star", desc: "Explore how we can help your business grow." };
}

/* ── Full content sections (About / Offers / Payments / Gallery / Videos /
   Reviews / Enquiry) in the premium aesthetic, so a premium card is the same
   complete mini-website as the classic templates — not just a first screen.
   Gated by the owner's per-section flags; empty sections are skipped. ── */
function pwContentSections(c: PCRecord, extras: PremiumExtras, slug: string, o: { skip?: string[]; products?: PCProduct[] } = {}): { css: string; html: string; js: string } {
  const on = (v: unknown, def = 1) => Number(v ?? def) === 1;
  const skip = o.skip || [];
  const strip = (v: unknown) => s(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // Compact layout: sections collapse into tap-to-open accordions (same option
  // the classic templates honour — Card Builder → Design → Card layout).
  const compact = s(c.layout_mode) === "compact";
  const sec = (id: string, title: string, body: string) =>
    !body ? "" : compact
      ? `<section id="${id}" class="pwx-sec pwx-acc"><button type="button" class="pwx-h2 pwx-acc-h" onclick="pwxAcc(this)" aria-expanded="false">${esc(title)}<i class="fa fa-chevron-down pwx-acc-c"></i></button><div class="pwx-acc-b">${body}</div></section>`
      : `<section id="${id}" class="pwx-sec"><h2 class="pwx-h2">${esc(title)}</h2>${body}</section>`;

  // Services / products — for designs that don't render their own product list.
  // Products WITH an uploaded image get a full media card (image, name, price,
  // description, CTA); image-less ones stay as slim rows.
  const prods = (o.products || []).filter((p) => s(p.name));
  const servicesHtml = !skip.includes("services") && on(c.product_on) && prods.length
    ? sec("products-section", s(c.product) || "Services", prods.map((p) => {
        const href = s(p.button);
        const img = s(p.filename);
        if (img) {
          const priceRow = (s(p.price) || s(p.offer_price))
            ? `<div class="pwx-prod-price">${s(p.price) && s(p.offer_price) ? `<s>₹${esc(p.price)}</s>` : ""}<b>₹${esc(p.offer_price) || esc(p.price)}</b></div>` : "";
          const d = strip(p.description) || strip(p.tagline);
          return `<div class="pwx-prod">
            <div class="pwx-prod-media"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" ${IMG} onerror="this.parentNode.style.display='none'"></div>
            <div class="pwx-prod-b">
              <div class="pwx-prod-top"><b>${esc(p.name)}</b>${priceRow}</div>
              ${d ? `<p>${esc(d.slice(0, 220))}</p>` : ""}
              ${href ? `<a class="pwx-prod-cta" href="${esc(href)}" target="_blank" rel="noopener">${esc(p.button_title) || "Know More"} <i class="fa fa-arrow-right"></i></a>` : ""}
            </div>
          </div>`;
        }
        const d = strip(p.tagline) || strip(p.description).slice(0, 80);
        const inner = `<span class="pwx-svc-tx"><b>${esc(p.name)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span><i class="fa fa-arrow-right pwx-svc-ar"></i>`;
        return href ? `<a class="pwx-svc" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="pwx-svc">${inner}</div>`;
      }).join("")) : "";

  // About Us — info rows + quote text + speciality chips.
  const info = (icon: string, k: string, v: string) => v ? `<div class="pwx-info"><span class="pwx-info-ic"><i class="fa ${icon}"></i></span><span class="pwx-info-tx"><small>${esc(k)}</small><b>${esc(v)}</b></span></div>` : "";
  const specs = s(c.specialities).split(/[,|]/).map((x) => x.trim()).filter(Boolean);
  const infoRows = [info("fa-building", "Company", s(c.company_name)), info("fa-briefcase", "Business", s(c.nature)), info("fa-calendar-alt", "Established", s(c.establishment)), info("fa-file-invoice", "GST Number", s(c.gst))].join("");
  const aboutBody = [
    strip(c.about_us) ? `<div class="pwx-about"><p>${esc(strip(c.about_us))}</p></div>` : "",
    infoRows ? `<div class="pwx-infos">${infoRows}</div>` : "",
    specs.length ? `<div class="pwx-chips">${specs.map((x) => `<span class="pwx-chip"><i class="fa fa-check"></i>${esc(x)}</span>`).join("")}</div>` : "",
  ].join("");
  const about = !skip.includes("about") && on(c.about_on) && (s(c.company_name) || s(c.about_us)) ? sec("about-section", s(c.about) || "About Us", aboutBody) : "";

  // Latest Offers. An offer stays visible through the END of its valid-till day,
  // then drops off the card automatically (still editable in the dashboard).
  const offerEnded = (v: string) => { const d = new Date(v); return !isNaN(d.getTime()) && d.getTime() + 86_400_000 <= Date.now(); };
  const offers = (extras.offers || []).filter((o) => (s(o.title) || s(o.filename)) && !offerEnded(s(o.valid)));
  const offersHtml = on(c.offer_on, 0) && offers.length ? sec("offers-section", s(c.offer) || "Latest Offers", offers.map((o) => {
    return `<div class="pwx-offer">
      ${s(o.filename) ? `<div class="pwx-offer-media"><span class="pwx-offer-tag"><i class="fa fa-tag"></i> Offer</span><img class="pwx-offer-img" src="${esc(o.filename)}" ${IMG} onerror="this.parentNode.style.display='none'"></div>` : ""}
      <div class="pwx-offer-b">
        ${s(o.title) ? `<b>${esc(o.title)}</b>` : ""}
        ${s(o.valid) ? `<span class="pwx-valid"><i class="fa fa-clock"></i> Valid till ${esc(o.valid)}</span>` : ""}
        ${strip(o.description) ? `<p>${esc(strip(o.description))}</p>` : ""}
      </div>
    </div>`;
  }).join("")) : "";

  // Payment Details — UPI-style rows with copy + bank details.
  const payRow = (label: string, v: string) => v ? `<div class="pwx-pay"><span class="pwx-pay-n">${esc(label)}</span><span class="pwx-pay-v">${esc(v)}</span><button type="button" class="pwx-copy" data-copy="${esc(v)}" onclick="pwxCopy(this)" aria-label="Copy ${esc(label)}"><i class="fa fa-copy"></i></button></div>` : "";
  const bankRow = (k: string, v: string) => v ? `<div class="pwx-bank-r"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : "";
  const hasPay = s(c.upi) || s(c.paytm_number) || s(c.phone_pe) || s(c.google_pay);
  const hasBank = s(c.account_number) || s(c.bank_name);
  const payBody = [
    hasPay ? [payRow("BHIM UPI", s(c.upi)), payRow("Paytm", s(c.paytm_number)), payRow("PhonePe", s(c.phone_pe)), payRow("Google Pay", s(c.google_pay))].join("") : "",
    hasBank ? `<div class="pwx-bank"><div class="pwx-bank-h"><i class="fa fa-university"></i> Bank Account Details</div>
      ${bankRow("A/c Holder", s(c.account_holder))}${bankRow("A/c Number", s(c.account_number))}${bankRow("Bank", s(c.bank_name))}${bankRow("IFSC", s(c.ifsc))}${bankRow("GST", s(c.gst))}
    </div>` : "",
  ].join("");
  const payment = on(c.payment_on) && (hasPay || hasBank) ? sec("payment-section", "Payment Details", `<div class="pwx-paywrap">${payBody}</div>`) : "";

  // Gallery — grid with a minimal lightbox.
  const gallery = (extras.gallery || []).filter((g) => s(g.filename));
  const galleryHtml = on(c.gallery_on) && gallery.length ? sec("gallery-section", s(c.gallery) || "Gallery",
    `<div class="pwx-gal${s(c.gallery_layout) === "compact" ? " compact" : ""}">${gallery.map((g, i) => `<img src="${esc(g.filename)}" alt="${esc(g.name) || "Gallery image"}" loading="lazy" ${IMG} onclick="pwxLb(${i})" onerror="this.style.display='none'">`).join("")}</div>`) : "";

  // Videos — YouTube plays inline; anything else opens in a new tab.
  const videos = (extras.videos || []).filter((v) => s(v.url));
  const videoCard = (v: { title?: string; url: string }) => {
    const inf = parseVideo(v.url);
    if (inf?.provider === "youtube") {
      return `<div class="pwx-vid" onclick="pwxPlay(this,'${inf.id}')"><img src="${inf.thumb}" loading="lazy" ${IMG}><span class="pwx-vid-p"><i class="fa fa-play"></i></span>${s(v.title) ? `<span class="pwx-vid-t">${esc(v.title)}</span>` : ""}</div>`;
    }
    return `<a class="pwx-vid pwx-vid-ext" href="${esc(v.url)}" target="_blank" rel="noopener"><span class="pwx-vid-p"><i class="fa fa-play"></i></span>${s(v.title) ? `<span class="pwx-vid-t">${esc(v.title)}</span>` : ""}</a>`;
  };
  // Owner-chosen layout (Gallery & Videos → Layout): "swipe" is a compact
  // scroll-snap carousel, default is the full-width stack.
  const vidSwipe = s(c.video_layout).toLowerCase() === "swipe";
  const videosBody = vidSwipe
    ? `<div class="pwx-vswrap">
        ${videos.length > 1 ? `<button type="button" class="pwx-vnav prev" onclick="pwxVScroll(this,-1)" aria-label="Previous video"><i class="fa fa-chevron-left"></i></button>` : ""}
        <div class="pwx-vswipe">${videos.map((v) => `<div class="pwx-vslide">${videoCard(v)}</div>`).join("")}</div>
        ${videos.length > 1 ? `<button type="button" class="pwx-vnav next" onclick="pwxVScroll(this,1)" aria-label="Next video"><i class="fa fa-chevron-right"></i></button>` : ""}
      </div>${videos.length > 1 ? `<div class="pwx-vhint"><i class="fa fa-arrows-alt-h"></i> Swipe or use the arrows</div>` : ""}`
    : `<div class="pwx-vids">${videos.map(videoCard).join("")}</div>`;
  const videosHtml = on(c.video_on) && videos.length ? sec("video-section", s(c.video) || "Videos", videosBody) : "";

  // Google Reviews — rating summary (when set) + Write a Review CTA.
  const rating = Number(s(c.google_rating)) || 0;
  const reviewBody = [
    rating > 0
      ? `<div class="pwx-rev"><span class="pwx-rev-score">${rating.toFixed(1)}</span><span class="pwx-rev-stars"><span style="width:${Math.max(0, Math.min(100, (rating / 5) * 100))}%">★★★★★</span>★★★★★</span>${s(c.google_review_count) ? `<small>Based on ${esc(c.google_review_count)} Google reviews</small>` : ""}</div>`
      : `<div class="pwx-rev pwx-rev-empty"><span class="pwx-rev-stars"><span style="width:100%">★★★★★</span>★★★★★</span><small>Loved our service? Rate us on Google!</small></div>`,
    s(c.google_review) ? `<a class="pwx-rev-btn" href="${esc(c.google_review)}" target="_blank" rel="noopener"><i class="fab fa-google"></i> Write a Review</a>` : "",
  ].join("");
  const reviewsHtml = on(c.review_on) && s(c.google_review) ? sec("review-section", s(c.review) || "Google Reviews", reviewBody) : "";

  // Enquiry form — posts to the same /api/enquiry endpoint as the classic card
  // (with the sandboxed-iframe postMessage fallback so no lead is ever lost).
  const enquiryHtml = on(c.enquiry_on) ? sec("enquiry-section", s(c.enquiry) || "Enquiry Form", `
    <form class="pwx-form" onsubmit="return pwxEnq(this)">
      <input name="name" placeholder="Your Name" required>
      <input name="contact" placeholder="Contact Number" required>
      <input name="email" type="email" placeholder="Email">
      <textarea name="description" placeholder="Your requirement" rows="3"></textarea>
      <button type="submit"><i class="fa fa-paper-plane"></i> Send Enquiry</button>
    </form>`) : "";

  const html = about + servicesHtml + offersHtml + payment + galleryHtml + videosHtml + reviewsHtml + enquiryHtml;
  if (!html) return { css: "", html: "", js: "" };

  const css = `
  /* ── Corporate Luxe section chrome (self-contained; needs --navy/--gold/
     --ink/--muted/--line/--soft or aliases). Layered depth on light surfaces,
     one dark navy statement panel (Payments), gold reserved for accents —
     never body text on white (contrast). ── */
  @keyframes pwxUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  .pwx-sec{margin-bottom:30px;animation:pwxUp .5s cubic-bezier(.2,.7,.2,1) both;}
  @media(prefers-reduced-motion:reduce){.pwx-sec{animation:none;}.pwx-svc,.pwx-gal img,.pwx-offer{transition:none!important;}}
  .pwx-h2{display:flex;align-items:center;gap:12px;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:.16em;color:#5b6474;text-transform:uppercase;margin-bottom:16px;}
  .pwx-h2::before{content:"";width:26px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--gold),color-mix(in srgb,var(--gold) 45%,#fff));flex-shrink:0;}
  .pwx-h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent);}
  .pwx-card, .pwx-svc, .pwx-offer, .pwx-rev{
    background:linear-gradient(180deg,#ffffff,#fafbfd);
    border:1px solid #e8ecf3;border-radius:18px;
    box-shadow:0 1px 2px rgba(14,27,52,.05),0 14px 34px -14px rgba(14,27,52,.14);
  }
  /* interactive focus ring, shared */
  .pwx-svc:focus-visible,.pwx-copy:focus-visible,.pwx-rev-btn:focus-visible,.pwx-vid:focus-visible,.pwx-form button:focus-visible,#pwxLb .x:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}

  /* About — statement quote + info tiles */
  .pwx-about{position:relative;background:linear-gradient(180deg,#ffffff,#fafbfd);border:1px solid #e8ecf3;border-radius:18px;padding:20px 18px 18px 20px;box-shadow:0 1px 2px rgba(14,27,52,.05),0 14px 34px -14px rgba(14,27,52,.14);overflow:hidden;}
  .pwx-about::before{content:"\\201C";position:absolute;top:-14px;left:10px;font-family:Georgia,serif;font-size:92px;line-height:1;color:color-mix(in srgb,var(--gold) 26%,#fff);pointer-events:none;}
  .pwx-about::after{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:linear-gradient(180deg,var(--gold),transparent);}
  .pwx-about p{position:relative;font-size:13.5px;line-height:1.75;color:#3d4655;}
  .pwx-infos{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px;}
  .pwx-info{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e8ecf3;border-radius:14px;padding:11px 12px;box-shadow:0 1px 2px rgba(14,27,52,.04);}
  .pwx-info-ic{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 22%,#fff),color-mix(in srgb,var(--gold) 8%,#fff));color:var(--navy);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .pwx-info-tx{display:flex;flex-direction:column;min-width:0;}
  .pwx-info-tx small{font-size:9.5px;font-weight:700;color:#7a8494;text-transform:uppercase;letter-spacing:.6px;}
  .pwx-info-tx b{font-size:12.5px;color:var(--ink);word-break:break-word;line-height:1.3;}
  .pwx-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
  .pwx-chip{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;color:var(--navy);background:linear-gradient(180deg,color-mix(in srgb,var(--gold) 16%,#fff),color-mix(in srgb,var(--gold) 7%,#fff));border:1px solid color-mix(in srgb,var(--gold) 38%,#fff);border-radius:999px;padding:6px 13px;box-shadow:0 1px 2px rgba(14,27,52,.05);}
  .pwx-chip i{color:color-mix(in srgb,var(--gold) 70%,#7a5200);font-size:10px;}

  /* Services */
  .pwx-svc{display:flex;align-items:center;gap:13px;padding:15px 16px;margin-bottom:11px;text-decoration:none;transition:transform .18s ease,box-shadow .22s ease,border-color .22s ease;}
  .pwx-svc:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--gold) 45%,#e8ecf3);box-shadow:0 3px 6px rgba(14,27,52,.06),0 20px 44px -16px rgba(14,27,52,.2);}
  .pwx-svc-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
  .pwx-svc-tx b{font-family:'Sora',sans-serif;font-size:13.5px;color:var(--ink);letter-spacing:-.01em;}
  .pwx-svc-tx small{font-size:11.5px;color:var(--muted);line-height:1.5;}
  .pwx-svc-ar{width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--gold) 14%,#fff);color:var(--navy);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:background .2s,transform .2s;}
  .pwx-svc:hover .pwx-svc-ar{background:var(--gold);transform:translateX(2px);}

  /* Product media cards (services with an uploaded image) */
  .pwx-prod{background:linear-gradient(180deg,#ffffff,#fafbfd);border:1px solid #e8ecf3;border-radius:18px;overflow:hidden;margin-bottom:13px;box-shadow:0 1px 2px rgba(14,27,52,.05),0 14px 34px -14px rgba(14,27,52,.14);transition:transform .18s ease,box-shadow .22s ease;}
  .pwx-prod:hover{transform:translateY(-2px);box-shadow:0 3px 6px rgba(14,27,52,.06),0 22px 48px -16px rgba(14,27,52,.22);}
  .pwx-prod-media{line-height:0;background:#f2f4f8;}
  .pwx-prod-media img{width:100%;display:block;}
  .pwx-prod-b{padding:14px 16px 16px;}
  .pwx-prod-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
  .pwx-prod-top > b{font-family:'Sora',sans-serif;font-size:15px;color:var(--ink);letter-spacing:-.01em;line-height:1.3;}
  .pwx-prod-price{display:flex;align-items:center;gap:7px;flex-shrink:0;}
  .pwx-prod-price s{font-size:11.5px;color:#98a1b1;}
  .pwx-prod-price b{font-family:'Sora',sans-serif;font-size:13px;color:var(--navy);background:linear-gradient(180deg,color-mix(in srgb,var(--gold) 22%,#fff),color-mix(in srgb,var(--gold) 10%,#fff));border:1px solid color-mix(in srgb,var(--gold) 40%,#fff);border-radius:999px;padding:4px 11px;}
  .pwx-prod-b p{font-size:12.5px;color:#4c5567;line-height:1.65;margin-top:8px;}
  .pwx-prod-cta{display:inline-flex;align-items:center;gap:8px;margin-top:12px;height:40px;padding:0 18px;border-radius:11px;background:linear-gradient(135deg,#1c3358,var(--navy) 60%);color:#fff;font-family:'Sora',sans-serif;font-weight:700;font-size:12px;text-decoration:none;box-shadow:0 2px 4px rgba(7,13,28,.14),0 10px 22px -8px rgba(7,13,28,.4);transition:transform .16s,box-shadow .2s;}
  .pwx-prod-cta:hover{transform:translateY(-1px);}
  .pwx-prod-cta i{color:var(--gold);font-size:11px;}
  .pwx-prod-cta:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}

  /* Compact layout — sections as tap-to-open accordion cards */
  .pwx-acc{background:linear-gradient(180deg,#ffffff,#fafbfd);border:1px solid #e8ecf3;border-radius:18px;box-shadow:0 1px 2px rgba(14,27,52,.05),0 12px 30px -14px rgba(14,27,52,.13);margin-bottom:13px;overflow:hidden;}
  .pwx-acc-h{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:16px 17px;cursor:pointer;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:.16em;color:#3d4655;text-transform:uppercase;-webkit-tap-highlight-color:transparent;}
  .pwx-acc-h::before{content:"";width:26px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--gold),color-mix(in srgb,var(--gold) 45%,#fff));flex-shrink:0;}
  .pwx-acc-h .pwx-acc-c{margin-left:auto;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--gold) 14%,#fff);color:var(--navy);display:inline-flex;align-items:center;justify-content:center;font-size:11px;transition:transform .25s ease,background .2s,color .2s;}
  .pwx-acc.open .pwx-acc-c{transform:rotate(180deg);background:var(--gold);color:#141414;}
  .pwx-acc-h:focus-visible{outline:2px solid var(--gold);outline-offset:-2px;}
  .pwx-acc-b{display:none;padding:2px 15px 17px;}
  .pwx-acc.open .pwx-acc-b{display:block;animation:pwxUp .3s ease both;}

  /* Latest Offers — media card with floating ribbon */
  .pwx-offer{overflow:hidden;margin-bottom:14px;transition:transform .18s ease,box-shadow .22s ease;}
  .pwx-offer:hover{transform:translateY(-2px);box-shadow:0 3px 6px rgba(14,27,52,.06),0 22px 48px -16px rgba(14,27,52,.22);}
  .pwx-offer-media{position:relative;line-height:0;}
  .pwx-offer-media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,13,28,0) 55%,rgba(7,13,28,.35));pointer-events:none;}
  .pwx-offer-tag{position:absolute;top:12px;left:12px;z-index:2;display:inline-flex;align-items:center;gap:6px;background:var(--navy);color:#fff;font-family:'Sora',sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:7px 12px;border-radius:999px;box-shadow:0 6px 16px rgba(7,13,28,.35);}
  .pwx-offer-tag i{color:var(--gold);font-size:10px;}
  .pwx-offer-img{width:100%;display:block;}
  .pwx-offer-b{padding:15px 17px 17px;line-height:1.4;}
  .pwx-offer-b b{font-family:'Sora',sans-serif;font-size:15px;color:var(--ink);display:block;margin-bottom:8px;letter-spacing:-.01em;}
  .pwx-offer-b p{font-size:12.5px;color:#4c5567;line-height:1.65;margin-top:8px;}
  .pwx-valid{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#046a4e;background:linear-gradient(180deg,#f0fdf7,#e4fbf0);border:1px solid #b2f0d3;border-radius:999px;padding:4px 11px;}
  .pwx-valid.ended{color:#5a6472;background:#f2f4f8;border-color:#e2e6ee;}

  /* Payment — dark navy statement panel, wallet-style glass rows */
  #payment-section .pwx-h2::after{background:linear-gradient(90deg,var(--line),transparent);}
  .pwx-paywrap{position:relative;background:radial-gradient(140% 130% at 88% -25%,#22406b 0%,var(--navy) 52%,#070d1c 130%);border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:20px;padding:17px 16px;box-shadow:0 2px 4px rgba(7,13,28,.2),0 22px 48px -14px rgba(7,13,28,.45);overflow:hidden;}
  .pwx-paywrap::before{content:"";position:absolute;right:-30px;top:-30px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--gold) 22%,transparent),transparent 70%);pointer-events:none;}
  .pwx-pay{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;margin-bottom:9px;background:rgba(255,255,255,.055);backdrop-filter:blur(4px);}
  .pwx-pay-n{font-family:'Sora',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,var(--gold) 82%,#fff);flex-shrink:0;}
  .pwx-pay-v{flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:#e7ecf5;word-break:break-all;}
  .pwx-copy{border:none;background:var(--gold);color:#141414;width:32px;height:32px;border-radius:10px;cursor:pointer;flex-shrink:0;font-size:12px;transition:transform .15s,filter .2s;}
  .pwx-copy:hover{filter:brightness(1.07);}
  .pwx-copy:active{transform:scale(.92);}
  .pwx-copy.ok{background:#22c55e;color:#08331a;}
  .pwx-bank{border:1px dashed rgba(255,255,255,.22);border-radius:14px;padding:13px 14px 8px;margin-top:11px;background:rgba(255,255,255,.03);}
  .pwx-bank-h{font-family:'Sora',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#dbe3f0;margin-bottom:8px;}
  .pwx-bank-h i{color:var(--gold);margin-right:7px;}
  .pwx-bank-r{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:7px 0;border-bottom:1px dashed rgba(255,255,255,.12);}
  .pwx-bank-r:last-child{border-bottom:none;}
  .pwx-bank-r span{color:#9fb0c8;}
  .pwx-bank-r b{color:#f2f5fa;text-align:right;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;}

  /* Gallery — editorial grid (lead image wide) */
  .pwx-gal{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
  .pwx-gal.compact{grid-template-columns:repeat(3,1fr);gap:7px;}
  .pwx-gal.compact img{border-radius:10px;}
  .pwx-gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;cursor:pointer;display:block;border:1px solid #e8ecf3;box-shadow:0 1px 2px rgba(14,27,52,.05),0 10px 24px -12px rgba(14,27,52,.14);transition:transform .2s ease,box-shadow .25s ease,filter .25s ease;}
  .pwx-gal img:first-child{grid-column:span 2;aspect-ratio:16/9;}
  .pwx-gal img:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.04);box-shadow:0 4px 8px rgba(14,27,52,.08),0 22px 44px -14px rgba(14,27,52,.26);}
  #pwxLb{display:none;position:fixed;inset:0;background:rgba(7,13,28,.95);backdrop-filter:blur(4px);z-index:99999;align-items:center;justify-content:center;padding:18px;}
  #pwxLb img{max-width:100%;max-height:86vh;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);}
  #pwxLb .x{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:22px;cursor:pointer;line-height:1;}

  /* Videos — glass play chip */
  .pwx-vids{display:grid;gap:14px;}
  /* Swipe layout — scroll-snap carousel (mirrors the classic templates) */
  .pwx-vswrap{position:relative;}
  .pwx-vswipe{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:2px 2px 10px;scrollbar-width:none;}
  .pwx-vswipe::-webkit-scrollbar{display:none;}
  .pwx-vslide{flex:0 0 74%;scroll-snap-align:center;}
  .pwx-vswipe .pwx-vid{aspect-ratio:9/16;}
  .pwx-vnav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.94);color:var(--navy);display:none;align-items:center;justify-content:center;cursor:pointer;font-size:13px;box-shadow:0 6px 18px rgba(14,27,52,.18);}
  .pwx-vnav.prev{left:-6px;} .pwx-vnav.next{right:-6px;}
  @media(hover:hover) and (pointer:fine){.pwx-vnav{display:flex;}}
  .pwx-vhint{text-align:center;font-size:11.5px;color:var(--muted);margin-top:2px;}
  .pwx-vhint i{margin-right:5px;color:var(--gold);}
  .pwx-vid{position:relative;border-radius:18px;overflow:hidden;background:#0b1220;aspect-ratio:16/9;cursor:pointer;display:block;border:1px solid #e8ecf3;box-shadow:0 1px 2px rgba(14,27,52,.05),0 16px 36px -14px rgba(14,27,52,.2);}
  .pwx-vid img,.pwx-vid iframe{width:100%;height:100%;object-fit:cover;display:block;border:0;}
  .pwx-vid-p{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(7,13,28,.04),rgba(7,13,28,.32));transition:background .25s;}
  .pwx-vid:hover .pwx-vid-p{background:linear-gradient(180deg,rgba(7,13,28,.02),rgba(7,13,28,.44));}
  .pwx-vid-p i{width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.16);backdrop-filter:blur(6px);border:1.5px solid rgba(255,255,255,.5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;padding-left:4px;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:transform .2s,background .2s,border-color .2s;}
  .pwx-vid:hover .pwx-vid-p i{transform:scale(1.08);background:var(--gold);border-color:var(--gold);color:#141414;}
  .pwx-vid-t{position:absolute;left:0;right:0;bottom:0;padding:26px 14px 12px;background:linear-gradient(transparent,rgba(7,13,28,.82));color:#fff;font-family:'Sora',sans-serif;font-size:12.5px;font-weight:600;letter-spacing:.01em;}

  /* Google Reviews */
  .pwx-rev{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:17px 16px;position:relative;overflow:hidden;}
  .pwx-rev::before{content:"";position:absolute;right:-24px;top:-24px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--gold) 16%,#fff),transparent 70%);pointer-events:none;}
  .pwx-rev-score{font-family:'Sora',sans-serif;font-size:34px;font-weight:800;color:var(--ink);letter-spacing:-.02em;line-height:1;}
  .pwx-rev-stars{position:relative;display:inline-block;font-size:20px;color:#e4e7ec;letter-spacing:2px;line-height:1;}
  .pwx-rev-stars > span{position:absolute;left:0;top:0;overflow:hidden;white-space:nowrap;color:#eda906;}
  .pwx-rev small{display:block;width:100%;font-size:12px;color:var(--muted);}
  .pwx-rev-empty{flex-direction:column;align-items:flex-start;gap:7px;}
  .pwx-rev-btn{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;height:50px;border-radius:14px;background:linear-gradient(135deg,#1c3358,var(--navy) 60%);color:#fff;font-family:'Sora',sans-serif;font-weight:700;font-size:13.5px;text-decoration:none;box-shadow:0 2px 4px rgba(7,13,28,.15),0 14px 30px -10px rgba(7,13,28,.4);transition:transform .16s,box-shadow .22s;}
  .pwx-rev-btn:hover{transform:translateY(-1px);box-shadow:0 4px 8px rgba(7,13,28,.18),0 20px 40px -10px rgba(7,13,28,.5);}
  .pwx-rev-btn i{width:26px;height:26px;border-radius:50%;background:#fff;color:#4285F4;display:inline-flex;align-items:center;justify-content:center;font-size:13px;}

  /* Enquiry — soft panel + gold glow CTA */
  #enquiry-section .pwx-form{background:linear-gradient(180deg,#fbfcfe,#f4f6fa);border:1px solid #e8ecf3;border-radius:20px;padding:16px;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(14,27,52,.05),0 14px 34px -14px rgba(14,27,52,.12);}
  .pwx-form{display:grid;gap:11px;}
  .pwx-form input,.pwx-form textarea{width:100%;border:1.5px solid #e2e7f0;border-radius:13px;padding:13px 15px;font-size:13.5px;font-family:'Inter',inherit;outline:none;background:#fff;color:var(--ink);transition:border-color .2s,box-shadow .2s;}
  .pwx-form input::placeholder,.pwx-form textarea::placeholder{color:#98a1b1;}
  .pwx-form input:focus,.pwx-form textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3.5px color-mix(in srgb,var(--gold) 22%,transparent);}
  .pwx-form button{height:52px;border:none;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 90%,#fff),color-mix(in srgb,var(--gold) 78%,#7a5200));color:#141414;font-family:'Sora',sans-serif;font-weight:800;font-size:14px;letter-spacing:.02em;cursor:pointer;box-shadow:0 2px 4px rgba(14,27,52,.08),0 14px 30px -8px color-mix(in srgb,var(--gold) 55%,transparent);transition:transform .15s,filter .2s,box-shadow .22s;}
  .pwx-form button:hover{filter:brightness(1.05);transform:translateY(-1px);}
  .pwx-form button:active{transform:scale(.985);}
  .pwx-sent{text-align:center;font-weight:700;color:#118a4e;padding:16px 0;}`;

  const galUrls = gallery.map((g) => s(g.filename));
  const js = `
  var PWX_GAL=${JSON.stringify(galUrls)};
  function pwxAcc(h){var sec=h.parentElement;var open=sec.classList.toggle('open');h.setAttribute('aria-expanded',open?'true':'false');}
  function pwxLb(i){var el=document.getElementById('pwxLb');if(!el||!PWX_GAL[i])return;el.querySelector('img').src=PWX_GAL[i];el.style.display='flex';}
  function pwxLbClose(){var el=document.getElementById('pwxLb');if(el)el.style.display='none';}
  function pwxPlay(el,id){el.innerHTML='<iframe src="https://www.youtube.com/embed/'+id+'?autoplay=1&playsinline=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>';el.onclick=null;}
  function pwxVScroll(btn,dir){var w=btn.parentNode.querySelector('.pwx-vswipe');if(w)w.scrollBy({left:dir*w.clientWidth*0.9,behavior:'smooth'});}
  function pwxCopy(b){var t=b.getAttribute('data-copy')||'';function ok(){b.classList.add('ok');var i=b.querySelector('i');if(i)i.className='fa fa-check';setTimeout(function(){b.classList.remove('ok');if(i)i.className='fa fa-copy';},1300);}
    function ex(){try{var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var r=document.execCommand('copy');document.body.removeChild(ta);return r;}catch(_){return false;}}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,function(){if(ex())ok();});}else{if(ex())ok();}}
  function pwxEnq(form){try{
    var d={slug:${JSON.stringify(slug)},name:(form.name.value||'').trim(),contact:(form.contact.value||'').trim(),email:(form.email.value||'').trim(),description:(form.description.value||'').trim()};
    var sb=false;try{sb=(window.origin==='null');}catch(_){sb=true;}
    if(sb){try{if(window.parent&&window.parent!==window)window.parent.postMessage({__dcEnquiry:d},'*');}catch(_){}}
    else{try{fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(d),keepalive:true}).catch(function(){});}catch(_){}}
  }catch(_){}form.innerHTML='<p class="pwx-sent">✓ Thank you! We will get back to you shortly.</p>';return false;}`;

  return { css, html: html + `<div id="pwxLb" onclick="pwxLbClose()"><button type="button" class="x" aria-label="Close image">&times;</button><img alt=""></div>`, js };
}

function businessCard(c: PCRecord, products: PCProduct[], opts: { thumb?: boolean; extras?: PremiumExtras }): string {
  const gold = s(c.color) || "#F7B31C";
  const navy = s(c.color2) || "#0e1b34";
  const name = esc(c.name) || "Your Name";
  const desig = esc(c.designation);
  const company = esc(c.company_name);
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug || "card"}`;
  const photo = s(c.photo);
  const logo = s(c.logo);
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const mapHref = s(c.google_map) || (s(c.address) ? `https://maps.google.com/?q=${encodeURIComponent(s(c.address))}` : "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(cardUrl)}`;

  const crow = (icon: string, label: string, text: string, href = "", ext = false) =>
    text ? `<a class="pw-crow" ${href ? `href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}` : 'aria-disabled="true"'} aria-label="${esc(label)}: ${esc(text)}"><span class="pw-cic"><i class="fa ${icon}"></i></span><span class="pw-ctx"><small>${esc(label)}</small><b>${esc(text)}</b></span></a>` : "";
  const contacts = [
    crow("fa-phone-alt", "Call", s(c.mobile1), phone ? `tel:${phone}` : ""),
    crow("fa-envelope", "Email", s(c.email), s(c.email) ? `mailto:${s(c.email)}` : ""),
    crow("fa-globe", "Website", s(c.url).replace(/^https?:\/\//i, "").replace(/\/$/, ""), s(c.url), true),
    crow("fa-map-marker-alt", "Address", s(c.address), mapHref, true),
  ].join("");

  const socials = [
    premiumSocials(c, "pw-soc"),
  ].join("");

  const services = products.slice(0, 8).map((p) => {
    const m = svcMeta(s(p.name));
    const desc = s(p.tagline) || s(p.description).replace(/<[^>]*>/g, "").trim().slice(0, 70) || m.desc;
    const href = s(p.button) || cardUrl;
    return `<a class="pw-svc" href="${esc(href)}" target="_blank" rel="noopener"><span class="pw-svc-ic"><i class="fa ${m.icon}"></i></span><span class="pw-svc-tx"><b>${esc(p.name)}</b><small>${esc(desc)}</small></span><i class="fa fa-arrow-right pw-svc-ar"></i></a>`;
  }).join("");

  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n");
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
  const ref = s(c.referral_code) || slug;
  // Owner toggles (Card Builder → Design) — same flags as the classic templates.
  const showViews = Number(c.views_on ?? 1) !== 0 && !opts.thumb;
  const showQr = Number(c.cardqr_on ?? 1) !== 0;
  const showShare = Number(c.share_on ?? 1) !== 0;
  const pkgId = Number(c.package_id);
  const planBadge = Number(c.badge_on) === 0 ? "" : pkgId === 6
    ? `<span class="pw-plan" title="Platinum member" aria-label="Platinum member"><i class="fa fa-gem"></i></span>`
    : pkgId === 5
      ? `<span class="pw-plan" title="Gold member" aria-label="Gold member"><i class="fa fa-crown"></i></span>`
      : "";
  // Photo size (its own control — Basics → Photo & card details) scales the
  // hero headshot; it stays round by design.
  const avaScale = Math.max(70, Math.min(160, Number(s(c.photo_size)) || 100)) / 100;
  const avaPx = Math.round(76 * avaScale);
  const avatar = `<div class="pw-ava" style="width:${avaPx}px;height:${avaPx}px"><img src="${esc(photo) || initialPh(c, gold)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, gold)}'">${planBadge}</div>`;
  // Logo shape + Logo size (Basics → Shape / Logo size) style the BRAND MARK:
  // default = the raw (transparent) logo; square/round wrap it in a white chip
  // so the shape reads on the dark hero. Size scales the logo height 70–160%.
  const logoH = Math.round(34 * (Math.max(70, Math.min(160, Number(s(c.logo_size)) || 100)) / 100));
  const logoShape = s(c.logo_shape);
  const brandImg = logo ? `<img src="${esc(logo)}" alt="${company || name}" style="max-height:${logoH}px;max-width:${logoH * 5}px" ${IMG}>` : "";
  const brand = logo
    ? (logoShape === "square" || logoShape === "round"
        ? `<span class="pw-logo-chip${logoShape === "round" ? " rd" : ""}">${brandImg}</span>`
        : brandImg)
    : (company ? `<span class="pw-logo-txt">${company}</span>` : "");

  const css = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  :root{--navy:${navy};--gold:${gold};--ink:#101828;--muted:#667085;--line:#eef1f5;--paper:#ffffff;--soft:#f6f8fb;}
  html{-webkit-text-size-adjust:100%;}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:#eaeef3;color:var(--ink);line-height:1.5;}
  .pw{max-width:440px;margin:0 auto;background:var(--paper);min-height:100vh;box-shadow:0 24px 70px rgba(16,24,40,.14);overflow:hidden;padding-bottom:78px;}
  @media(min-width:520px){.pw{padding-bottom:0;}}
  @keyframes pwUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  .pw-rise{animation:pwUp .5s cubic-bezier(.2,.7,.2,1) both;}
  .pw-rise.d1{animation-delay:.05s;} .pw-rise.d2{animation-delay:.12s;} .pw-rise.d3{animation-delay:.2s;}
  @media(prefers-reduced-motion:reduce){.pw-rise{animation:none;}}

  .pw-hero{position:relative;background:radial-gradient(120% 80% at 85% -10%,#243b63 0%,var(--navy) 45%,#070d1c 130%);color:#fff;padding:22px 22px 46px;overflow:hidden;}
  .pw-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:30px 30px;mask-image:radial-gradient(120% 90% at 80% 0,#000,transparent 70%);opacity:.5;pointer-events:none;}
  .pw-hero::after{content:"";position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,var(--gold)33 0%,transparent 70%);pointer-events:none;}
  .pw-hero-in{position:relative;z-index:1;}
  .pw-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;}
  .pw-top .pw-logo{margin-bottom:0;}
  .pw-logo{min-height:30px;margin-bottom:18px;}
  .pw-logo img{max-height:34px;max-width:170px;object-fit:contain;}
  .pw-logo-txt{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;letter-spacing:.4px;color:var(--gold);}
  .pw-idrow{display:flex;align-items:center;gap:15px;margin-bottom:18px;}
  .pw-ava{position:relative;width:76px;height:76px;border-radius:50%;padding:3px;background:linear-gradient(140deg,var(--gold),#fff6);flex-shrink:0;box-shadow:0 10px 26px rgba(0,0,0,.35);}
  .pw-ava img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid var(--navy);}
  /* Brand-mark shape chip (builder → Basics → Shape): square tile / round pill
     on a white ground so the shape reads on the dark hero. */
  .pw-logo-chip{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:12px;padding:7px 12px;box-shadow:0 6px 18px rgba(0,0,0,.3);}
  .pw-logo-chip.rd{border-radius:999px;padding:8px 16px;}
  .pw-logo-chip img{display:block;}
  .pw-plan{position:absolute;top:-3px;right:-3px;z-index:5;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;background:linear-gradient(135deg,#FCE4A0,#E8A317);color:#5b3d00;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);}
  .pw-views{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;background:rgba(255,255,255,.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;}
  .pw-views i{color:var(--gold);font-size:11px;}
  .pw-idtx{min-width:0;}
  .pw-name{font-family:'Sora',sans-serif;font-weight:800;font-size:23px;line-height:1.1;letter-spacing:-.01em;color:#fff;}
  .pw-name .u{color:var(--gold);}
  .pw-role{font-size:13px;font-weight:600;color:var(--gold);margin-top:4px;letter-spacing:.01em;}
  .pw-org{font-size:12px;font-weight:500;color:rgba(255,255,255,.75);margin-top:1px;}
  .pw-contacts{display:flex;flex-direction:column;gap:2px;margin-bottom:16px;}
  .pw-crow{display:flex;align-items:center;gap:12px;padding:8px 6px;border-radius:11px;text-decoration:none;transition:background .18s;}
  .pw-crow:hover{background:rgba(255,255,255,.06);}
  .pw-cic{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:var(--gold);display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .pw-ctx{min-width:0;display:flex;flex-direction:column;}
  .pw-ctx small{font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);font-weight:600;}
  .pw-ctx b{font-size:12.5px;font-weight:500;color:#fff;word-break:break-word;line-height:1.35;}
  .pw-scan{display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:11px 13px;margin-bottom:16px;}
  .pw-scan-qr{background:#fff;padding:5px;border-radius:9px;line-height:0;flex-shrink:0;transition:transform .2s;}
  .pw-scan-qr img{width:72px;height:72px;display:block;}
  @media(hover:hover){.pw-scan-qr:hover{transform:scale(1.06);}}
  .pw-scan-tx b{display:block;font-size:12.5px;font-weight:700;color:#fff;}
  .pw-scan-tx small{display:block;font-size:11px;color:rgba(255,255,255,.6);margin-top:2px;}
  .pw-cta{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .pw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:12px;font-weight:700;font-size:13.5px;text-decoration:none;border:none;cursor:pointer;transition:transform .12s,box-shadow .2s,filter .2s;font-family:inherit;}
  .pw-btn:active{transform:scale(.97);}
  .pw-btn-gold{background:linear-gradient(135deg,var(--gold),#e0930a);color:var(--navy);box-shadow:0 8px 20px ${gold}44;}
  .pw-btn-gold:hover{filter:brightness(1.04);}
  .pw-btn-ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);}
  .pw-btn-ghost:hover{background:rgba(255,255,255,.14);}

  .pw-body{position:relative;background:var(--paper);border-radius:26px 26px 0 0;margin-top:-24px;padding:26px 22px 26px;z-index:2;}
  .pw-h2{display:flex;align-items:center;gap:12px;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-bottom:16px;}
  .pw-h2::before{content:"";width:22px;height:3px;border-radius:3px;background:var(--gold);flex-shrink:0;}
  .pw-h2::after{content:"";flex:1;height:1px;background:var(--line);}
  .pw-sec{margin-bottom:26px;}
  .pw-socials{display:flex;flex-wrap:wrap;gap:10px;}
  .pw-soc{width:46px;height:46px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;color:var(--navy);background:var(--soft);border:1px solid var(--line);text-decoration:none;transition:transform .16s,box-shadow .2s,color .2s,background .2s;}
  /* Inline-SVG glyphs (X, TikTok) carry no width/height — size them to match
     the Font Awesome icons, or they render at the browser default and overflow. */
  .pw-soc svg{width:18px;height:18px;display:block;fill:currentColor;}
  .pw-soc:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(16,24,40,.12);color:var(--gold);}
  .pw-soc:active{transform:translateY(0);}
  .pw-svcs{display:grid;grid-template-columns:1fr;gap:11px;}
  @media(min-width:400px){.pw-svcs{grid-template-columns:1fr 1fr;}}
  .pw-svc{display:flex;flex-direction:column;gap:9px;padding:15px;border:1px solid var(--line);border-radius:16px;text-decoration:none;background:var(--paper);box-shadow:0 2px 10px rgba(16,24,40,.04);position:relative;overflow:hidden;transition:transform .16s,box-shadow .22s,border-color .2s;}
  .pw-svc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gold);transform:scaleY(0);transform-origin:top;transition:transform .22s;}
  .pw-svc:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(16,24,40,.1);border-color:${gold}55;}
  .pw-svc:hover::before{transform:scaleY(1);}
  .pw-svc-ic{width:42px;height:42px;border-radius:12px;background:var(--navy);color:var(--gold);display:inline-flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
  .pw-svc-tx b{display:block;font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:var(--ink);line-height:1.25;}
  .pw-svc-tx small{display:block;font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.45;}
  .pw-svc-ar{position:absolute;right:14px;top:15px;color:#c3cbd6;font-size:12px;transition:transform .18s,color .18s;}
  .pw-svc:hover .pw-svc-ar{color:var(--gold);transform:translateX(3px);}

  .pw-powered{text-align:center;font-size:11px;color:var(--muted);margin-top:20px;}
  .pw-powered a{color:var(--gold);text-decoration:none;font-weight:700;}
  .pw-foot{display:flex;margin-top:16px;border:1px solid var(--line);border-radius:13px;overflow:hidden;}
  .pw-foot a{flex:1;text-align:center;font-weight:700;font-size:12.5px;color:var(--navy);text-decoration:none;padding:13px 8px;transition:background .15s;}
  .pw-foot a:hover{background:var(--soft);}
  .pw-foot a:first-child{border-right:1px solid var(--line);}

  .pw-dock{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);width:calc(100% - 24px);max-width:416px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:rgba(14,27,52,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:8px;z-index:50;box-shadow:0 12px 34px rgba(0,0,0,.3);}
  @media(min-width:520px){.pw-dock{display:none;}}
  .pw-dock a,.pw-dock button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px;border-radius:11px;background:transparent;border:none;color:rgba(255,255,255,.9);font-size:10px;font-weight:600;font-family:inherit;text-decoration:none;cursor:pointer;transition:background .15s;}
  .pw-dock a i,.pw-dock button i{font-size:16px;}
  .pw-dock a:active,.pw-dock button:active{background:rgba(255,255,255,.12);}
  .pw-dock .g{color:var(--gold);}
  `;

  const chrome = opts.thumb ? "" : `
    <div class="pw-foot">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Free Card</a>
    </div>`;

  const dock = opts.thumb ? "" : `
  <nav class="pw-dock" aria-label="Quick actions">
    ${phone ? `<a href="tel:${phone}" aria-label="Call"><i class="fa fa-phone-alt g"></i> Call</a>` : ""}
    ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp" style="color:#25D366"></i> WhatsApp</a>` : ""}
    <a href="${vcardHref}" download="${slug || "contact"}.vcf" aria-label="Save contact"><i class="fa fa-user-plus"></i> Save</a>
    ${showShare ? `<button type="button" onclick="pwShare()" aria-label="Share profile"><i class="fa fa-share-alt"></i> Share</button>` : ""}
  </nav>`;

  const shareName = s(c.company_name) || s(c.name) || "this business";
  const waShareText = `Hi 👋\n\nTake a look at *${shareName}*'s digital visiting card 📇\n\nEverything in one tap — call, WhatsApp, save the contact:\n${cardUrl}`;
  const shareUi = opts.thumb || !showShare ? "" : shareSheetHtml({ shareName, cardUrl, waShareText, accent: navy });
  // Full mini-website sections (About / Offers / Payments / Gallery / Videos /
  // Reviews / Enquiry) — same content set as the classic templates.
  // Services presentation (Products / Services → "Layout on your card"):
  //   "icons"  = the compact icon tiles below ("Our Solutions")
  //   default  = rich cards showing each service's photo (pwContentSections),
  //              falling back to a clean text card when a service has no image.
  // Exactly ONE of the two renders — previously BOTH did, so a card with
  // products showed the services twice.
  const svcIconsOnly = s(c.product_layout) === "icons";
  const cx = opts.thumb ? { css: "", html: "", js: "" }
    : pwContentSections(c, opts.extras || {}, slug, { skip: svcIconsOnly ? ["services"] : [], products });
  // Live view count: the parent page fetches the real total and posts it in
  // (same __dcViews message the classic card uses).
  const viewsJs = showViews ? `window.addEventListener('message',function(e){try{if(e.data&&typeof e.data.__dcViews==='number'){var el=document.getElementById('pw-view-count');if(el)el.textContent=Number(e.data.__dcViews).toLocaleString('en-IN');}}catch(_){}});` : "";
  const script = opts.thumb ? "" : `<script>${shareSheetJs(cardUrl)}${cx.js}${viewsJs}</script>`;

  return `<!doctype html><html lang="en"><head>${HEAD}<style>${css}${cx.css}${showShare && !opts.thumb ? shareSheetCss(navy) : ""}</style></head><body>
  <div class="pw">
    <header class="pw-hero">
      <div class="pw-hero-in">
        <div class="pw-top pw-rise">
          <div class="pw-logo">${brand}</div>
          ${showViews ? `<span class="pw-views"><i class="fa fa-eye"></i><span id="pw-view-count">${Number(c.views ?? 0).toLocaleString("en-IN")}</span></span>` : ""}
        </div>
        <div class="pw-idrow pw-rise d1">
          ${avatar}
          <div class="pw-idtx">
            <h1 class="pw-name">${name}</h1>
            ${desig ? `<p class="pw-role">${desig}</p>` : ""}
            ${company ? `<p class="pw-org">${company}</p>` : ""}
          </div>
        </div>
        <div class="pw-contacts pw-rise d2">${contacts}</div>
        ${showQr ? `<div class="pw-scan pw-rise d2">
          <div class="pw-scan-qr"><img src="${qrSrc}" alt="Scan to view this card" ${IMG}></div>
          <div class="pw-scan-tx"><b>Scan to connect</b><small>Open &amp; save my card in one tap</small></div>
        </div>` : ""}
        <div class="pw-cta pw-rise d3">
          <a class="pw-btn pw-btn-gold" href="${vcardHref}" download="${slug || "contact"}.vcf" aria-label="Save contact"><i class="fa fa-user-plus"></i> Save Contact</a>
          ${showShare ? `<button type="button" class="pw-btn pw-btn-ghost" onclick="pwShare()" aria-label="Share profile"><i class="fa fa-share-alt"></i> Share Profile</button>` : ""}
        </div>
      </div>
    </header>
    <main class="pw-body">
      ${socials ? `<section class="pw-sec pw-rise"><h2 class="pw-h2">Connect With Me</h2><div class="pw-socials">${socials}</div></section>` : ""}
      ${svcIconsOnly && services ? `<section class="pw-sec pw-rise"><h2 class="pw-h2">${esc(s(c.product) || "Our Solutions")}</h2><div class="pw-svcs">${services}</div></section>` : ""}
      ${cx.html}
      <div class="pw-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
      ${chrome}
    </main>
  </div>
  ${dock}
  ${shareUi}
  ${script}
  </body></html>`;
}

// ── Professional Profile (image #4): cover banner, overlapping circular photo,
// 3 contact buttons, social row, 4 action tiles, QR modal, website + address cards ──
function professionalProfile(c: PCRecord, products: PCProduct[], opts: { thumb?: boolean; extras?: PremiumExtras }): string {
  const brand = s(c.color) || "#2563eb";
  const dark = s(c.color2) || "#0f2747";
  const nameCol = lum(brand) < 0.62 ? brand : dark; // keep the name readable on white
  const name = esc(c.name) || "Your Name";
  const desig = esc(c.designation);
  const company = esc(c.company_name);
  const tag = esc(s(c.nature) || s(c.about_us).replace(/<[^>]*>/g, "").trim().slice(0, 64));
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug || "card"}`;
  const photo = s(c.photo);
  const logo = s(c.logo);
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const email = s(c.email);
  const url = s(c.url);
  const about = s(c.about_us).replace(/<[^>]*>/g, "").trim();
  const mapHref = s(c.google_map) || (s(c.address) ? `https://maps.google.com/?q=${encodeURIComponent(s(c.address))}` : "");
  const youtube = s(c.youtube);
  const qrSrc = (n: number) => `https://api.qrserver.com/v1/create-qr-code/?size=${n}x${n}&margin=8&data=${encodeURIComponent(cardUrl)}`;

  const primary = [
    wa ? { ic: "fab fa-whatsapp", lb: "WhatsApp", href: `https://wa.me/${wa}`, ext: true } : (phone ? { ic: "fa fa-comment-dots", lb: "Text", href: `sms:${phone}`, ext: false } : null),
    phone ? { ic: "fa fa-phone-alt", lb: "Call", href: `tel:${phone}`, ext: false } : null,
    email ? { ic: "fa fa-envelope", lb: "Email", href: `mailto:${email}`, ext: false } : null,
  ].filter(Boolean).map((a) => `<a class="pp-act" href="${esc((a as { href: string }).href)}"${(a as { ext: boolean }).ext ? ' target="_blank" rel="noopener"' : ""} aria-label="${(a as { lb: string }).lb}"><span class="pp-act-ic"><i class="${(a as { ic: string }).ic}"></i></span><span>${(a as { lb: string }).lb}</span></a>`).join("");

  const socials = premiumSocials(c, "pp-soc");

  const tiles = [
    { ic: "fa fa-user-plus", lb: "Save", attr: `href="data:text/vcard;charset=utf-8,${encodeURIComponent(["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`, `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\n"))}" download="${slug || "contact"}.vcf"`, tag: "a" },
    youtube ? { ic: "fa fa-play", lb: "Watch", attr: `href="${esc(youtube)}" target="_blank" rel="noopener"`, tag: "a" } : null,
    about ? { ic: "fa fa-user", lb: "About", attr: `href="javascript:void(0)" onclick="document.getElementById('pp-about').scrollIntoView({behavior:'smooth'})"`, tag: "a" } : null,
    { ic: "fa fa-qrcode", lb: "Scan", attr: `type="button" onclick="ppQR(true)"`, tag: "button" },
  ].filter(Boolean).map((t) => { const x = t as { ic: string; lb: string; attr: string; tag: string }; return `<${x.tag} class="pp-tile" ${x.attr} aria-label="${x.lb}"><span class="pp-tile-ic"><i class="${x.ic}"></i></span><span>${x.lb}</span></${x.tag}>`; }).join("");

  const ref = s(c.referral_code) || slug;
  // Logo size scales the cover mark; square/round wrap it in a white chip
  // (chip shows the logo's REAL colours — the white-invert only suits raw marks).
  const ppLogoH = Math.round(30 * (Math.max(70, Math.min(160, Number(s(c.logo_size)) || 100)) / 100));
  const ppShape = s(c.logo_shape);
  const ppBrandImg = logo ? `<img src="${esc(logo)}" alt="${company || name}" style="max-height:${ppLogoH}px;max-width:${ppLogoH * 5}px" ${IMG}>` : "";
  const brandTxt = logo
    ? (ppShape === "square" || ppShape === "round" ? `<span class="pp-logo-chip${ppShape === "round" ? " rd" : ""}">${ppBrandImg}</span>` : ppBrandImg)
    : (company ? `<span class="pp-cover-txt">${company}</span>` : "");

  const css = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  :root{--brand:${brand};--dark:${dark};--name:${nameCol};--ink:#101828;--muted:#667085;--line:#eef1f5;--soft:#f6f8fb;}
  html{-webkit-text-size-adjust:100%;}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:#eef1f6;color:var(--ink);line-height:1.5;}
  .pp{max-width:430px;margin:0 auto;min-height:100vh;background:#f4f6fa;box-shadow:0 24px 70px rgba(16,24,40,.14);overflow:hidden;}
  .pp-in{padding:0 14px 26px;}
  @keyframes ppUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  .pp-rise{animation:ppUp .45s cubic-bezier(.2,.7,.2,1) both;}
  @media(prefers-reduced-motion:reduce){.pp-rise{animation:none;}}
  .pp-cover{position:relative;height:132px;background:linear-gradient(135deg,var(--brand),var(--dark) 130%);overflow:hidden;}
  .pp-cover::after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 80% 10%,rgba(255,255,255,.18),transparent 55%);}
  .pp-cover-logo{position:absolute;top:14px;left:16px;z-index:2;}
  .pp-cover-logo img{max-height:30px;max-width:140px;object-fit:contain;filter:brightness(0) invert(1);opacity:.96;}
  .pp-logo-chip{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:11px;padding:6px 11px;box-shadow:0 6px 16px rgba(16,24,40,.25);}
  .pp-logo-chip.rd{border-radius:999px;padding:7px 14px;}
  .pp-logo-chip img{filter:none!important;opacity:1!important;}
  .pp-cover-txt{color:#fff;font-family:'Sora',sans-serif;font-weight:800;font-size:15px;letter-spacing:.3px;}
  .pp-share{position:absolute;top:14px;right:16px;z-index:2;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;backdrop-filter:blur(4px);}
  .pp-card{position:relative;background:#fff;border-radius:22px;margin-top:-26px;padding:64px 20px 22px;text-align:center;box-shadow:0 10px 30px rgba(16,24,40,.06);}
  .pp-photo{position:absolute;top:-52px;left:50%;transform:translateX(-50%);width:104px;height:104px;border-radius:50%;padding:4px;background:#fff;box-shadow:0 10px 26px rgba(16,24,40,.18);}
  .pp-photo::before{content:"";position:absolute;inset:0;border-radius:50%;border:2.5px solid var(--brand);}
  .pp-photo img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}
  .pp-name{font-family:'Sora',sans-serif;font-weight:800;font-size:23px;line-height:1.15;color:var(--name);letter-spacing:-.01em;}
  .pp-role{font-size:13.5px;font-weight:600;color:var(--ink);margin-top:5px;}
  .pp-org{font-size:12.5px;color:var(--muted);margin-top:2px;}
  .pp-tag{font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;}
  .pp-acts{display:flex;justify-content:center;gap:26px;margin-top:20px;}
  .pp-act{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:var(--muted);font-size:11.5px;font-weight:600;}
  .pp-act-ic{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--dark) 160%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 20px ${brand}44;transition:transform .16s;}
  .pp-act:active .pp-act-ic{transform:scale(.92);}
  .pp-socials{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px;}
  .pp-soc{width:40px;height:40px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;color:var(--dark);background:var(--soft);border:1px solid var(--line);text-decoration:none;transition:transform .15s,color .2s,box-shadow .2s;}
  .pp-soc svg{width:16px;height:16px;display:block;fill:currentColor;}
  .pp-soc:hover{transform:translateY(-2px);color:var(--brand);box-shadow:0 8px 18px rgba(16,24,40,.1);}
  .pp-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:22px;}
  .pp-tile{display:flex;flex-direction:column;align-items:center;gap:7px;padding:13px 4px;border:1px solid var(--line);border-radius:15px;background:#fff;color:var(--ink);font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;box-shadow:0 2px 8px rgba(16,24,40,.04);transition:transform .15s,box-shadow .2s,border-color .2s;font-family:inherit;}
  .pp-tile:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(16,24,40,.09);border-color:${brand}55;}
  .pp-tile-ic{width:34px;height:34px;border-radius:10px;background:${brand}14;color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:15px;}
  .pp-cta{display:flex;align-items:center;gap:13px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-top:14px;text-decoration:none;box-shadow:0 2px 10px rgba(16,24,40,.04);transition:transform .15s,box-shadow .2s;}
  .pp-cta:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(16,24,40,.1);}
  .pp-cta-ic{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--dark) 160%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
  .pp-cta-tx{flex:1;min-width:0;} .pp-cta-tx b{display:block;font-family:'Sora',sans-serif;font-size:14px;color:var(--ink);} .pp-cta-tx small{display:block;font-size:11.5px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pp-cta-ar{color:#c3cbd6;font-size:14px;}
  .pp-addr{display:flex;gap:13px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-top:12px;box-shadow:0 2px 10px rgba(16,24,40,.04);align-items:center;}
  .pp-addr-map{width:66px;height:66px;border-radius:12px;background:linear-gradient(135deg,${brand}22,${dark}22);display:flex;align-items:center;justify-content:center;color:var(--brand);font-size:22px;flex-shrink:0;}
  .pp-addr-tx{flex:1;min-width:0;} .pp-addr-tx b{font-family:'Sora',sans-serif;font-size:12.5px;color:var(--ink);} .pp-addr-tx p{font-size:11.5px;color:var(--muted);margin-top:3px;line-height:1.45;}
  .pp-go{display:inline-flex;align-items:center;gap:6px;background:var(--brand);color:#fff;font-size:11.5px;font-weight:700;padding:9px 14px;border-radius:10px;text-decoration:none;flex-shrink:0;align-self:center;}
  .pp-about{background:#fff;border:1px solid var(--line);border-radius:16px;padding:17px;margin-top:12px;box-shadow:0 2px 10px rgba(16,24,40,.04);}
  .pp-about h3{font-family:'Sora',sans-serif;font-size:13px;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;gap:8px;}
  .pp-about h3::before{content:"";width:18px;height:3px;border-radius:3px;background:var(--brand);}
  .pp-about p{font-size:12.5px;color:var(--muted);line-height:1.6;}
  .pp-powered{text-align:center;font-size:11px;color:var(--muted);margin-top:18px;}
  .pp-powered a{color:var(--brand);text-decoration:none;font-weight:700;}
  .pp-foot{display:flex;margin-top:14px;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:#fff;}
  .pp-foot a{flex:1;text-align:center;font-weight:700;font-size:12.5px;color:var(--dark);text-decoration:none;padding:12px 8px;}
  .pp-foot a:first-child{border-right:1px solid var(--line);}
  .pp-modal{display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:80;align-items:center;justify-content:center;padding:20px;}
  .pp-modal-in{background:#fff;border-radius:22px;max-width:320px;width:100%;padding:26px 22px 22px;text-align:center;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.35);}
  .pp-modal-x{position:absolute;top:12px;right:12px;width:30px;height:30px;border:none;background:var(--soft);border-radius:50%;color:var(--muted);font-size:17px;cursor:pointer;}
  .pp-qr-big{background:#fff;padding:8px;border:1px solid var(--line);border-radius:16px;display:inline-block;line-height:0;}
  .pp-qr-big img{width:190px;height:190px;display:block;}
  .pp-qr-name{font-family:'Sora',sans-serif;font-weight:700;font-size:16px;margin-top:14px;color:var(--ink);}
  .pp-qr-sub{font-size:12px;color:var(--muted);margin-top:2px;}
  .pp-qr-btns{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px;}
  .pp-qr-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:44px;border-radius:12px;font-weight:700;font-size:12.5px;text-decoration:none;cursor:pointer;border:none;font-family:inherit;background:var(--brand);color:#fff;}
  .pp-qr-btn.ghost{background:var(--soft);color:var(--dark);border:1px solid var(--line);}
  `;

  const chrome = opts.thumb ? "" : `
    <div class="pp-foot">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}" target="_top">Create Free Card</a>
    </div>`;

  const modal = opts.thumb ? "" : `
  <div id="ppqr" class="pp-modal" onclick="if(event.target===this)ppQR(false)">
    <div class="pp-modal-in">
      <button class="pp-modal-x" type="button" onclick="ppQR(false)" aria-label="Close">&times;</button>
      <div class="pp-qr-big"><img src="${qrSrc(240)}" alt="QR code for ${name}" ${IMG}></div>
      <div class="pp-qr-name">${name}</div>
      <div class="pp-qr-sub">Scan to View My Digital Card</div>
      <div class="pp-qr-btns">
        <a class="pp-qr-btn" href="${qrSrc(600)}" target="_blank" rel="noopener" download="${slug || "card"}-qr.png"><i class="fa fa-download"></i> Download</a>
        <button class="pp-qr-btn ghost" type="button" onclick="pwShare()"><i class="fa fa-share-alt"></i> Share</button>
      </div>
    </div>
  </div>`;

  const shareName = s(c.company_name) || s(c.name) || "this business";
  const waShareText = `Hi 👋\n\nTake a look at *${shareName}*'s digital visiting card 📇\n\nEverything in one tap — call, WhatsApp, save the contact:\n${cardUrl}`;
  const shareUi = opts.thumb ? "" : shareSheetHtml({ shareName, cardUrl, waShareText, accent: dark });
  // Full mini-website sections — same content set as the classic templates. The
  // pwx styles read --navy/--gold, so alias them onto this design's palette.
  const cx = opts.thumb ? { css: "", html: "", js: "" }
    : pwContentSections(c, opts.extras || {}, slug, { skip: ["about"], products });
  const cxCss = cx.css ? `:root{--navy:${dark};--gold:${brand};}${cx.css}\n.pwx-sec{padding:0 4px;}` : "";
  const script = opts.thumb ? "" : `<script>
  function ppQR(o){var m=document.getElementById('ppqr');if(m)m.style.display=o?'flex':'none';}
  ${shareSheetJs(cardUrl)}
  ${cx.js}
  </script>`;

  return `<!doctype html><html lang="en"><head>${HEAD}<style>${css}${cxCss}${shareSheetCss(dark)}</style></head><body>
  <div class="pp">
    <div class="pp-cover">
      <div class="pp-cover-logo">${brandTxt}</div>
      <button class="pp-share" type="button" onclick="pwShare()" aria-label="Share profile"><i class="fa fa-share-alt"></i></button>
    </div>
    <div class="pp-in">
      <div class="pp-card pp-rise">
        <div class="pp-photo" style="transform:translateX(-50%) scale(${Math.max(70, Math.min(160, Number(s(c.photo_size)) || 100)) / 100});transform-origin:50% 100%"><img src="${esc(photo) || initialPh(c, brand)}" alt="${name}" ${IMG} onerror="this.onerror=null;this.src='${initialPh(c, brand)}'"></div>
        <h1 class="pp-name">${name}</h1>
        ${desig ? `<p class="pp-role">${desig}</p>` : ""}
        ${company ? `<p class="pp-org">${company}</p>` : ""}
        ${tag ? `<p class="pp-tag">${tag}</p>` : ""}
        ${primary ? `<div class="pp-acts">${primary}</div>` : ""}
        ${socials ? `<div class="pp-socials">${socials}</div>` : ""}
        <div class="pp-tiles">${tiles}</div>
      </div>
      ${url ? `<a class="pp-cta pp-rise" href="${esc(/^https?:/i.test(url) ? url : "https://" + url)}" target="_blank" rel="noopener"><span class="pp-cta-ic"><i class="fa fa-globe"></i></span><span class="pp-cta-tx"><b>Check Out My Website!</b><small>${esc(url.replace(/^https?:\/\//i, "").replace(/\/$/, ""))}</small></span><i class="fa fa-arrow-right pp-cta-ar"></i></a>` : ""}
      ${s(c.address) ? `<div class="pp-addr pp-rise"><span class="pp-addr-map"><i class="fa fa-map-marked-alt"></i></span><span class="pp-addr-tx"><b>Visit Us</b><p>${esc(c.address)}</p></span>${mapHref ? `<a class="pp-go" href="${esc(mapHref)}" target="_blank" rel="noopener"><i class="fa fa-location-arrow"></i> Go</a>` : ""}</div>` : ""}
      ${about ? `<div id="pp-about" class="pp-about pp-rise"><h3>About</h3><p>${esc(about.slice(0, 420))}</p></div>` : ""}
      ${cx.html}
      <div class="pp-powered">Powered by <a href="https://digitalcarda.in" target="_blank" rel="noopener">DigitalCarda</a></div>
      ${chrome}
    </div>
  </div>
  ${modal}
  ${shareUi}
  ${script}
  </body></html>`;
}
