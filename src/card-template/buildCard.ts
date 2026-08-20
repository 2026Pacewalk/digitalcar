import mainCss from "./main.css?raw";
import type { CustomerRecord } from "@/hooks/useCustomer";
import { fixMojibake } from "@/lib/cardContent";
import { parseVideo } from "@/lib/video";
import { buildLinkBioHtml, LINKBIO_START, LINKBIO_COUNT } from "./linkbio";
import { buildPremiumCardHtml, PREMIUM_COUNT } from "./premiumCards";
import { SOCIAL_BY_KEY, readSocialLinks } from "@/lib/socialPlatforms";

/* All 31 legacy templates (style1.css … style31.css) loaded as raw strings. */
const STYLE_MODULES = import.meta.glob("./styles/style*.css", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const STYLES: Record<string, string> = {};
for (const [path, css] of Object.entries(STYLE_MODULES)) {
  const n = path.match(/style(\d+)\.css$/)?.[1];
  if (n) STYLES[n] = css;
}
/* 31 legacy business-card styles, then the link-in-bio variants (numbers 32+). */
const CARD_STYLE_COUNT = 31;
/* Template number ranges: 1..31 scrolling styles, then link-in-bio, then the
   premium single-screen card designs — each block appended so numbers are stable. */
const PREMIUM_START = LINKBIO_START + LINKBIO_COUNT;
export const TEMPLATE_COUNT = LINKBIO_START - 1 + LINKBIO_COUNT + PREMIUM_COUNT;
/* True when a template number selects the link-in-bio layout instead of a card style. */
export const isLinkBio = (theme: number | string) => Number(theme) >= LINKBIO_START && Number(theme) < PREMIUM_START;
/* True when a template number selects a premium single-screen card design. */
export const isPremiumCard = (theme: number | string) => Number(theme) >= PREMIUM_START && Number(theme) < PREMIUM_START + PREMIUM_COUNT;

/* Perceived brightness of a #rrggbb colour (0 dark … 1 light). */
const lumOf = (hex: string) => {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/* Make each template's dark *background* colours user-customisable: swap them for
   var(--theme-secondary, #original). With no secondary set the fallback keeps the
   template's original look, so this is a zero-risk change until the user opts in.
   Text colours (color:) are untouched, so contrast is preserved. */
const themeableSecondary = (css: string) =>
  css.replace(/(background(?:-color|-image)?)\s*:\s*([^;{}]+)/gi, (_m, prop: string, val: string) => {
    const nv = val.replace(/#([0-9a-fA-F]{6})\b/g, (hx, h: string) => (lumOf("#" + h) < 0.5 ? `var(--theme-secondary, #${h})` : hx));
    return `${prop}: ${nv}`;
  });
for (const n of Object.keys(STYLES)) STYLES[n] = themeableSecondary(STYLES[n]);

const styleFor = (theme: number) => STYLES[String(Math.min(CARD_STYLE_COUNT, Math.max(1, Number(theme) || 1)))] || STYLES["1"] || "";

/* First-page height normalisation. Every card's front should be the size of the
   Midnight Gold design (style 1 ≈ 626px) so the catalogue and live cards share a
   consistent first page. Shorter templates were cramped in the contact section;
   we give the contact section a min-height and spread its rows EVENLY with flex
   (space-evenly) — the balanced, airy feel of style 1 — instead of leaving them
   clustered up top with a gap below. The value is the section's content-box
   min-height in px. Style 28 is special-cased: its rows use a tall vertical
   icon-over-text layout that already fills the space, so it just gets padding. */
const FIRST_PAGE_FILL: Record<number, number> = {
  2: 265, 3: 312, 4: 259, 5: 287, 7: 232, 8: 280, 10: 232, 13: 281, 14: 184,
  15: 292, 16: 253, 17: 222, 18: 197, 19: 282, 20: 237, 21: 252, 23: 254,
  24: 263, 29: 229, 30: 212, 31: 257,
};
const FIRST_PAGE_PAD: Record<number, [number, number]> = { 28: [30, 29] };
const firstPagePadCss = (theme: number) => {
  const t = Number(theme);
  const h = FIRST_PAGE_FILL[t];
  if (h) {
    return `#home-section .home-details{min-height:${h}px !important;padding-top:18px !important;padding-bottom:18px !important;`
      + `display:flex !important;flex-direction:column !important;justify-content:space-evenly !important;}`
      + `#home-section .home-details .home-single-details a{margin-bottom:0 !important;}`;
  }
  const p = FIRST_PAGE_PAD[t];
  return p ? `#home-section .home-details{padding-top:${p[0]}px !important;padding-bottom:${p[1]}px !important;}` : "";
};

/* A few templates render the job title (designation) at only 9–10px — too small
   to read. Lift those to a comfortable 12px. Kept in one place so it's easy to
   tune; it wins over the per-style CSS via source order + !important. */
const SMALL_DESIG = new Set([3, 6, 7, 12, 13, 16, 28]);
const desigFontCss = (theme: number) =>
  SMALL_DESIG.has(Number(theme)) ? `#home-section .owner-designation{font-size:12px !important;letter-spacing:.2px;}` : "";

/* Clear visual hierarchy for the hero: the person's NAME should read larger than
   their DESIGNATION. Several templates set both to the same size (1.5rem), which
   looks flat. We only shrink the designation (never touch the name's size or
   position — that would break the ribbon layout it sits inside). Injected BEFORE
   desigFontCss so the tight small-designation templates keep their 12px handling. */
const ownerHierarchyCss =
  `#home-section .owner-designation{font-size:1.05rem !important;font-weight:500 !important;letter-spacing:.5px;}`;

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };
type Review = { id: number; name: string; rating: number | string; text: string; date?: string };

const s = (v: unknown) => String(v ?? "").trim();
const on = (v: unknown) => Number(v ?? 1) === 1;
const esc = (v: unknown) => s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Legacy rich-text fields (product/offer descriptions, about) are stored as HTML
// from a WYSIWYG editor. Render them as HTML but strip anything executable so the
// sandboxed card can't be abused: scripts, event handlers, and javascript: URLs.
const sanitizeHtml = (v: unknown) =>
  s(v)
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|form|input|base)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
// Safe interpolation of user data inside an inline <script> — quotes it as a JS
// string literal and neutralises "</script>" so it can't break out (Phase 31 XSS).
const jsq = (v: unknown) => JSON.stringify(String(v ?? "")).replace(/</g, "\\u003c");
const IMG = 'referrerpolicy="no-referrer"';
const darken = (hex: string, f: number) => {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return hex;
  const p = m.map((x) => Math.max(0, Math.round(parseInt(x, 16) * (1 - f))));
  return `#${p.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};

// The card loads Font Awesome 5, which predates the X (formerly Twitter) logo, so
// render it as an inline SVG for the share sheet. currentColor inherits the fill.
const X_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" style="display:inline-block;vertical-align:-2px"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.21-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>`;
// Owner's "Follow Us" icons from the flexible social list. In "brand" mode each
// icon takes its network's real colour; otherwise the card theme colour (via CSS).
const safeSocialHref = (u: string) => {
  const t = String(u ?? "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;      // already a full URL
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return "https://" + t; // bare domain → https
  return "#";                                            // block javascript:/data: etc.
};
const renderSocialIcons = (c: CustomerRecord, clickable: boolean) => {
  const brand = String(c.social_icon_style ?? "") === "brand";
  return readSocialLinks(c as Record<string, unknown>).map(({ platform, url }) => {
    const p = SOCIAL_BY_KEY[platform];
    if (!p) return "";
    const ic = p.svg || `<i class="${p.fa}"></i>`;
    const st = brand ? ` style="background:${p.color};color:${p.fg || "#fff"}"` : "";
    const href = clickable ? `href="${esc(safeSocialHref(url))}" target="_blank" rel="noopener"` : `href="javascript:void(0)"`;
    return `<li><a ${href}${st}>${ic}</a></li>`;
  }).join("");
};

export function buildCardHtml(c: CustomerRecord, products: Product[], gallery: Gallery[], videos: Vid[], offers: Offer[] = [], qrcodes: Qr[] = [], reviews: Review[] = []): string {
  // Link-in-bio and premium single-screen cards use completely different layouts.
  const tNum = Math.min(TEMPLATE_COUNT, Math.max(1, Number(c.theme) || 1));
  if (isPremiumCard(tNum)) return buildPremiumCardHtml(c as Record<string, unknown>, products as unknown as Parameters<typeof buildPremiumCardHtml>[1], tNum - PREMIUM_START);
  if (isLinkBio(tNum)) return buildLinkBioHtml(c as Record<string, unknown>, products, tNum - LINKBIO_START);

  const accent = s(c.color) || "#F7B31C";
  const accentDark = darken(accent, 0.16);
  const secondary = s(c.color2);
  const theme = String(Math.min(TEMPLATE_COUNT, Math.max(1, Number(c.theme) || 1)));
  // Sanitize to URL/identifier-safe chars: a no-op for valid slugs, but it
  // neutralises any injected quote / angle-bracket before slug (and cardUrl,
  // which derives from it) flows into href attributes and inline scripts (Phase 31).
  const slug = s(c.slug).replace(/[^a-zA-Z0-9_-]/g, "");
  const cardUrl = `https://digitalcarda.in/${slug}`;
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  // Friendly, ready-to-send WhatsApp message when a visitor shares this card —
  // beats forwarding a bare link. Works whether it's the owner or a visitor
  // passing it along (refers to the business by name, not "my").
  const shareName = s(c.company_name) || s(c.name) || "this business";
  const shareSub = [s(c.company_name) ? s(c.name) : "", s(c.designation)].filter(Boolean).join(" · ");
  const waShareText =
    `Hi 👋\n\n` +
    `Take a look at *${shareName}*'s digital visiting card 📇` +
    (shareSub ? `\n${shareSub}` : "") +
    `\n\nEverything in one tap — call, WhatsApp, directions, products & save the contact:\n${cardUrl}`;
  const specs = s(c.specialities).split(/[,|]/).map((x) => x.trim()).filter(Boolean);
  const initial = (s(c.name)[0] || "D").toUpperCase();
  const logoPlaceholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><rect width='140' height='140' rx='12' fill='${accent}'/><text x='50%' y='50%' font-size='64' fill='#fff' text-anchor='middle' font-family='Arial,sans-serif' dominant-baseline='central'>${initial}</text></svg>`)}`;

  // Paid-plan trust badge on the logo — Gold (pkg 5) = crown, Platinum (pkg 6) =
  // gem; both gold. Trial/Free show none, and the owner can hide it (badge_on=0).
  const pkgId = Number(c.package_id);
  const planBadge = Number(c.badge_on) === 0 ? "" : pkgId === 6
    ? `<span class="dc-plan-badge dc-plan-platinum" title="Platinum member" aria-label="Platinum member"><i class="fa fa-gem"></i></span>`
    : pkgId === 5
    ? `<span class="dc-plan-badge dc-plan-gold" title="Gold member" aria-label="Gold member"><i class="fa fa-crown"></i></span>`
    : "";

  const social = renderSocialIcons(c, true);

  const detail = (icon: string, href: string, text: string) =>
    text ? `<div class="home-single-details"><a href="${esc(href)}" target="_blank"><i class="${icon}"></i><span>${esc(text)}</span></a></div>` : "";
  const homeDetails = [
    detail("fa fa-phone-alt", `tel:${s(c.mobile1)}`, s(c.mobile1)),
    detail("fa fa-globe", s(c.url), s(c.url)),
    detail("fa fa-envelope", `mailto:${s(c.email)}`, s(c.email)),
    detail("fa fa-map-marker-alt", s(c.google_map) || "#", s(c.address)),
  ].join("");

  const infoItem = (icon: string, label: string, v: string) =>
    v ? `<div class="about-info-item">
        <span class="about-info-ic"><i class="${icon}"></i></span>
        <span class="about-info-txt"><span class="about-info-k">${esc(label)}</span><span class="about-info-v">${esc(v)}</span></span>
      </div>` : "";
  const aboutInfo = [
    infoItem("fa fa-building", "Company", s(c.company_name)),
    infoItem("fa fa-briefcase", "Business", s(c.nature)),
    infoItem("fa fa-calendar-alt", "Established", s(c.establishment)),
    infoItem("fa fa-file-invoice", "GST Number", s(c.gst)),
  ].join("");

  const aboutSection = on(c.about_on) && (s(c.company_name) || s(c.about_us)) ? `
    <div id="about-section" class="section-container">
      <div class="section-header">${esc(s(c.about) || "About Us")}</div>
      <div class="about-modern">
        ${aboutInfo ? `<div class="about-info">${aboutInfo}</div>` : ""}
        ${s(c.about_us) ? `<div class="about-text"><i class="fa fa-quote-left about-quote"></i><p>${sanitizeHtml(fixMojibake(c.about_us))}</p></div>` : ""}
        ${specs.length ? `<p class="about-spec-title"><i class="fa fa-star"></i> ${esc(s(c.specialties_title) || "Our Specialties")}</p>
          <div class="about-chips">${specs.map((x) => `<span class="about-chip"><i class="fa fa-check"></i>${esc(x)}</span>`).join("")}</div>` : ""}
      </div>
    </div>` : "";

  // Smart product CTA — the action adapts to the button label the user chose.
  const phone = s(c.mobile1).replace(/[^\d+]/g, "");
  const mapLink = s(c.google_map);
  const email = s(c.email);
  const waMsg = (name: string) => encodeURIComponent(`Hi, I'm interested in "${s(name)}". Please share more details.`);
  const smartBtn = (p: Product): { href: string; target: string; icon: string } => {
    const t = s(p.button_title).toLowerCase();
    const link = s(p.button);
    if (/call|phone|dial|ring/.test(t) && phone) return { href: `tel:${phone}`, target: "_self", icon: "fa fa-phone-alt" };
    if (/whatsapp|chat/.test(t) && wa) return { href: `https://wa.me/${wa}/?text=${waMsg(p.name)}`, target: "_blank", icon: "fab fa-whatsapp" };
    if (/visit|map|location|direction|reach|near|store|shop\b/.test(t) && (mapLink || link)) return { href: mapLink || link, target: "_blank", icon: "fa fa-map-marker-alt" };
    if (/mail|email/.test(t) && email) return { href: `mailto:${email}?subject=${encodeURIComponent("Enquiry: " + s(p.name))}&body=${waMsg(p.name)}`, target: "_self", icon: "fa fa-envelope" };
    if (/buy|order|shop|cart|book|reserve|site|web|learn|know|offer|quote|get/.test(t) && link) return { href: link, target: "_blank", icon: "fa fa-arrow-right" };
    if (link) return { href: link, target: "_blank", icon: "fa fa-external-link-alt" };
    if (wa) return { href: `https://wa.me/${wa}/?text=${waMsg(p.name)}`, target: "_blank", icon: "fa fa-paper-plane" };
    return { href: "#enquiry-section", target: "_self", icon: "fa fa-paper-plane" };
  };

  const servicesSection = on(c.product_on) && products.length ? `
    <div id="products-section" class="section-container">
      <div class="section-header">${esc(s(c.product) || "Services")}</div>
      ${products.map((p) => {
        const b = smartBtn(p);
        return `
        <div class="product-card">
          <div class="heading-2"><h5>${esc(p.name)}</h5></div>
          ${(p.price || p.offer_price) ? `<div style="padding:2px 0 6px" class="heading-2">Price ${p.price && p.offer_price ? `<strike style="color:#666"> ₹${esc(p.price)}</strike>` : ""} <strong> ₹${esc(p.offer_price || p.price)}</strong></div>` : ""}
          ${p.filename ? `<img src="${esc(p.filename)}" class="img-fluid" style="width:100%;border-radius:4px" ${IMG} onerror="this.style.display='none'">` : ""}
          ${p.description ? `<div class="heading-2" style="margin-top:14px"><h5>Other Detail</h5></div><div style="font-size:13px">${sanitizeHtml(fixMojibake(p.description))}</div>` : ""}
          <div class="text-right" style="margin-top:12px"><a href="${b.href}" class="product-enquiry-btn" target="${b.target}" rel="noopener"><i class="${b.icon}" style="margin-right:6px"></i>${esc(p.button_title || "Send Enquiry")}</a></div>
        </div>`;
      }).join("")}
    </div>` : "";

  const payIcon = (name: string) => `https://digitalcarda.in/images/${name}.png`;
  const payMeta: Record<string, { n: string; short: string; c: string }> = {
    bhim: { n: "BHIM UPI", short: "BHIM", c: "#5f259f" },
    paytm: { n: "Paytm", short: "Paytm", c: "#00b9f1" },
    phonepe: { n: "PhonePe", short: "PhonePe", c: "#673ab7" },
    gpay: { n: "Google Pay", short: "GPay", c: "#1a73e8" },
  };
  const payRow = (icon: string, v: string) => {
    if (!v) return "";
    const m = payMeta[icon] || { n: icon.toUpperCase(), short: icon.toUpperCase(), c: accent };
    return `<div class="dc-pay-item">
      <span class="dc-pay-ic"><img src="${payIcon(icon)}" alt="${m.n}" ${IMG} onerror="var p=this.parentNode;p.style.background='${m.c}';p.textContent='${m.short}'"></span>
      <div class="dc-pay-mid"><span class="dc-pay-name">${m.n}</span><span class="dc-pay-val">${esc(v)}</span></div>
      <button type="button" class="dc-pay-copy" data-copy="${esc(v)}" onclick="dcCopy(this)" title="Copy" aria-label="Copy ${m.n}"><i class="fa fa-copy"></i><span>Copy</span></button>
    </div>`;
  };
  const hasPay = s(c.upi) || s(c.paytm_number) || s(c.phone_pe) || s(c.google_pay);
  const hasBank = s(c.account_number) || s(c.bank_name) || s(c.gst);
  // Clean, shareable "copy all" message for the bank details.
  const cap = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v);
  const bankLines = [
    s(c.account_holder) ? `A/c Holder: ${s(c.account_holder)}` : "",
    s(c.account_number) ? `A/c No.: ${s(c.account_number)}` : "",
    s(c.bank_name) ? `Bank: ${s(c.bank_name)}` : "",
    s(c.ifsc) ? `IFSC: ${s(c.ifsc)}` : "",
    s(c.account_type) ? `Account Type: ${cap(s(c.account_type))}` : "",
    s(c.gst) ? `GST: ${s(c.gst)}` : "",
  ].filter(Boolean);
  const bankCopyText = `Bank Account Details —\n\n${bankLines.join("\n")}`;
  const bankRow = (icon: string, k: string, v: string) =>
    v ? `<div class="dc-bank-row"><span class="dc-bank-ic"><i class="fa ${icon}"></i></span><div class="dc-bank-kv"><span class="k">${k}</span><span class="v">${esc(v)}</span></div></div>` : "";
  // Payment QR is part of the Payment Details section — render its inner content
  // here and fold it in below the bank card (no separate top-level section).
  const hasQr = on(c.qrcode_on) && (qrcodes.length || slug);
  const qrContent = hasQr
    ? (qrcodes.length ? qrcodes.map((q) => `<div class="qrcode-card" style="text-align:center;margin-bottom:16px">
        <img src="${esc(q.filename)}" style="max-width:240px;width:100%;border-radius:6px" ${IMG} onerror="this.style.display='none'">
        <div><a href="${cardUrl}" class="qrcode-enquiry-btn" target="_blank">${esc(q.name) || "Pay Online"}</a></div>
      </div>`).join("") : `<div class="qrcode-card" style="text-align:center">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cardUrl)}" style="width:170px;height:170px" ${IMG}>
        <div><a href="${cardUrl}" class="qrcode-enquiry-btn" target="_blank">Pay Online</a></div>
      </div>`)
    : "";

  const hasPaymentBody = on(c.payment_on) && (hasPay || hasBank);
  const paymentSection = hasPaymentBody || qrContent ? `
    <div id="payment-section" class="section-container">
      <div class="section-header">Payment Details</div>
      ${hasPay ? `<div class="dc-pay-list">
        ${payRow("bhim", s(c.upi))}
        ${payRow("paytm", s(c.paytm_number))}
        ${payRow("phonepe", s(c.phone_pe))}
        ${payRow("gpay", s(c.google_pay))}
      </div>` : ""}
      ${hasBank ? `<div class="dc-bank">
        <div class="dc-bank-head"><span class="dc-bank-title"><i class="fa fa-university"></i>Bank Account Details</span><button type="button" class="dc-bank-copy" data-copy="${esc(bankCopyText).replace(/\n/g, "&#10;")}" onclick="dcCopy(this)" title="Copy bank details"><i class="fa fa-copy"></i><span>Copy</span></button></div>
        <div class="dc-bank-body">
          ${bankRow("fa-user", "A/c Holder", s(c.account_holder))}
          ${bankRow("fa-credit-card", "Account No.", s(c.account_number))}
          ${bankRow("fa-university", "Bank Name", s(c.bank_name))}
          ${bankRow("fa-hashtag", "IFSC Code", s(c.ifsc))}
          ${bankRow("fa-wallet", "Account Type", cap(s(c.account_type)))}
          ${bankRow("fa-file-invoice", "GST No.", s(c.gst))}
        </div>
      </div>` : ""}
      ${qrContent ? `<div class="dc-qr-sub"><div class="dc-qr-sub-title">Payment QR Code</div>${qrContent}</div>` : ""}
    </div>` : "";

  const ratingNum = Number(s(c.google_rating)) || 0;
  const reviewCount = s(c.google_review_count);
  const starRow = (rating: number, extraClass = "") => {
    const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
    return `<span class="grev-stars ${extraClass}"><span class="grev-stars-fill" style="width:${pct}%">★★★★★</span>★★★★★</span>`;
  };
  const summaryBlock = ratingNum > 0
    ? `<div class="grev-summary">
        <div class="grev-score">${ratingNum.toFixed(1)}</div>
        <div class="grev-summary-txt">
          ${starRow(ratingNum)}
          ${reviewCount ? `<span class="grev-count"><i class="fab fa-google"></i> Based on ${esc(reviewCount)} Google reviews</span>` : ""}
        </div>
      </div>`
    : `<div class="grev-empty">
        <div class="grev-empty-stars">★★★★★</div>
        <p class="grev-empty-txt">Loved our service? Rate us on Google!</p>
      </div>`;
  const reviewCards = reviews.length
    ? `<div class="grev-list">${reviews.slice(0, 5).map((rv) => `
        <div class="grev-card">
          <div class="grev-card-top">
            <span class="grev-ava">${(s(rv.name)[0] || "G").toUpperCase()}</span>
            <span class="grev-card-meta">
              <span class="grev-name">${esc(rv.name) || "Google user"}</span>
              ${starRow(Number(rv.rating) || 5, "grev-stars-sm")}
            </span>
            <i class="fab fa-google grev-g"></i>
          </div>
          ${s(rv.text) ? `<p class="grev-text">${esc(rv.text)}</p>` : ""}
          ${s(rv.date) ? `<span class="grev-date">${esc(rv.date)}</span>` : ""}
        </div>`).join("")}</div>`
    : "";
  const googleReviewSection = on(c.review_on) && (s(c.google_review) || ratingNum > 0 || reviews.length) ? `
    <div id="review-section" class="section-container">
      <div class="section-header">${esc(s(c.review) || "Google Reviews")}</div>
      ${summaryBlock}
      ${reviewCards}
      ${s(c.google_review) ? `<div class="grev-btn-wrap"><a href="${esc(c.google_review)}" target="_blank" class="grev-btn"><i class="fab fa-google"></i> Write a Review</a></div>` : ""}
    </div>` : "";

  // (Payment QR is now rendered inside the Payment Details section above.)

  // Card-share QR — an opt-in section showing a scannable QR of this card's own
  // URL, so a visitor can scan to open & save the card (or show it to someone
  // else). Off by default so existing live cards are unchanged until enabled.
  const cardQrSection = Number(c.cardqr_on ?? 0) === 1 && slug ? `
    <div id="cardqr-section" class="section-container dc-cardqr">
      <div class="section-header">${esc(s(c.cardqr) || "Scan My Card")}</div>
      <div class="dc-cardqr-box">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(cardUrl)}" alt="Scan to view my digital card" style="width:190px;height:190px" ${IMG}>
        <p class="dc-cardqr-cap">Scan to view &amp; save my digital card</p>
      </div>
    </div>` : "";

  const offersSection = on(c.offer_on) && offers.length ? `
    <div id="offers-section" class="section-container">
      <div class="section-header">${esc(s(c.offer) || "Offers")}</div>
      ${offers.map((o) => `<div class="offer-card">
        ${o.filename ? `<img src="${esc(o.filename)}" class="img-fluid" style="width:100%;border-radius:4px" ${IMG} onerror="this.style.display='none'">` : ""}
        ${o.title ? `<h5 style="font-weight:700;margin-top:8px">${esc(o.title)}</h5>` : ""}
        ${o.valid ? `<p style="font-size:12px;color:#666;margin-top:2px"><i class="fa fa-clock"></i> Valid till: ${esc(o.valid)}</p>` : ""}
        ${o.description ? `<p style="font-size:13px;margin-top:4px">${sanitizeHtml(fixMojibake(o.description))}</p>` : ""}
      </div>`).join("")}
    </div>` : "";

  const gallerySection = on(c.gallery_on) && gallery.length ? `
    <div id="gallery-section" class="section-container">
      <div class="section-header">${esc(s(c.gallery) || "Graphic Portfolio")}</div>
      <div class="gallery card-columns">
        ${gallery.map((g, gi) => `<div class="card"><img src="${esc(g.filename)}" class="img-fluid" style="width:100%;border-radius:4px;cursor:pointer" ${IMG} onclick="lbOpen(${gi})" onerror="this.parentNode.style.display='none'"></div>`).join("")}
      </div>
    </div>` : "";

  // A single video card (shared by both layouts). YouTube shows a real frame with
  // a blurred fill behind it (so any aspect ratio fills the tile cleanly — no gaps),
  // Instagram / other links show a branded tile. Title sits in a gradient overlay.
  const playBtn = (bg: string) => `<span class="dc-vid-play"><span style="background:${bg}"><i class="fa fa-play"></i></span></span>`;
  const titleOverlay = (t: string) => `<span class="dc-vid-title">${esc(t)}</span>`;
  const videoCard = (v: Vid) => {
    const info = parseVideo(v.url);
    const vert = info?.vertical ? " vertical" : ""; // Shorts / reels
    if (info?.provider === "youtube") {
      return `<div class="dc-vid-item${vert}">
        <div class="video-thumb dc-vid-media" onclick="playVid(this,'${info.id}','youtube',${info.vertical ? 1 : 0})">
          <span class="dc-vid-bg" style="background-image:url('${info.thumb}')"></span>
          <img class="dc-vid-fg" src="${info.thumb}" ${IMG}>
          ${playBtn("rgba(255,0,0,.9)")}${titleOverlay(v.title)}
        </div></div>`;
    }
    if (info?.provider === "instagram") {
      return `<div class="dc-vid-item${vert}">
        <div class="video-thumb dc-vid-media dc-ig-thumb" onclick="playVid(this,'${info.id}','instagram',1)">
          <span class="dc-ig-badge"><i class="fab fa-instagram"></i> Instagram</span>
          ${playBtn("rgba(0,0,0,.55)")}${titleOverlay(v.title)}
        </div></div>`;
    }
    // Any other link — a branded tile that opens the video in a new tab.
    return `<div class="dc-vid-item${vert}">
        <a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" class="video-thumb dc-vid-media dc-other-thumb">
          ${playBtn("rgba(0,0,0,.55)")}${titleOverlay(v.title)}
        </a></div>`;
  };
  // Owner chooses how the portfolio reads on the public card: "swipe" is a compact
  // horizontal carousel (one video at a time); "stack" (default) lists them vertically.
  const vidLayout = String(c.video_layout ?? "stack").toLowerCase() === "swipe" ? "swipe" : "stack";
  const videoSection = on(c.video_on) && videos.length ? `
    <div id="video-section" class="section-container">
      <div class="section-header">${esc(s(c.video) || "Video Portfolio")}</div>
      ${vidLayout === "swipe"
        ? `<div class="dc-vid-swipe-wrap">${videos.length > 1 ? `<button type="button" class="dc-vid-nav prev" onclick="dcVidScroll(this,-1)" aria-label="Previous video"><i class="fa fa-chevron-left"></i></button>` : ""}<div class="dc-vid-swipe">${videos.map((v) => `<div class="dc-vid-slide">${videoCard(v)}</div>`).join("")}</div>${videos.length > 1 ? `<button type="button" class="dc-vid-nav next" onclick="dcVidScroll(this,1)" aria-label="Next video"><i class="fa fa-chevron-right"></i></button>` : ""}</div>${videos.length > 1 ? `<div class="dc-vid-hint"><i class="fa fa-arrows-alt-h"></i> Swipe or use the arrows</div>` : ""}`
        : `<div class="dc-vid-stack">${videos.map(videoCard).join("")}</div>`}
    </div>` : "";

  const enquirySection = on(c.enquiry_on) ? `
    <div id="enquiry-section" class="section-container">
      <div class="section-header">${esc(s(c.enquiry) || "Enquiry Form")}</div>
      <form onsubmit="return dcSendEnquiry(this)">
        <div class="dc-field"><i class="fa fa-user"></i><input name="name" class="dc-input" placeholder="Your Name" required></div>
        <div class="dc-field"><i class="fa fa-phone-alt"></i><input name="contact" class="dc-input" placeholder="Contact Number" required></div>
        <div class="dc-field"><i class="fa fa-envelope"></i><input name="email" class="dc-input" type="email" placeholder="Email"></div>
        <div class="dc-field ta"><i class="fa fa-comment-dots"></i><textarea name="description" class="dc-input" placeholder="Your requirement" rows="3"></textarea></div>
        <button type="submit" class="dc-btn dc-btn-primary"><i class="fa fa-paper-plane"></i> Send Enquiry</button>
      </form>
    </div>` : "";

  const shareSection = `
    <div class="section-container dc-share">
      <div class="section-header">Share with others on WhatsApp</div>
      <form class="dc-wa-form" onsubmit="return dcShareWa(this)">
        <span class="dc-wa-cc"><i class="fas fa-mobile-alt"></i>+91</span>
        <input name="num" class="dc-wa-input" placeholder="WhatsApp number" inputmode="numeric" required>
        <button type="submit" class="dc-wa-btn"><i class="fab fa-whatsapp"></i><span>Share</span></button>
      </form>
      <a href="javascript:void(0)" onclick="saveVCard()" class="dc-save-contact"><i class="fa fa-download"></i> Save Contact in Your Phonebook</a>
    </div>`;

  // Footer icons mirror the sections that are actually on the card — disable a
  // module in Settings and its section string is empty, so its icon drops out.
  // Bottom-nav labels must stay short: a renamed section title (e.g. a long
  // tagline like "Human Strategy. AI Speed. Real Growth.") otherwise truncates to
  // something meaningless ("Huma…"). Use the first word of the title, capped,
  // falling back to a short default. The full title still shows as the section
  // header inside the card.
  const navLabel = (custom: unknown, def: string) => {
    const t = s(custom).trim();
    if (!t) return def;
    const first = t.split(/\s+/)[0].replace(/[.,;:!|/–—-]+$/, "");
    return first.length > 11 ? first.slice(0, 10) + "…" : first;
  };
  const footerItems = [
    { id: "home-section", icon: "fa fa-home", label: "Home", show: true },
    { id: "about-section", icon: "fas fa-briefcase", label: navLabel(c.about, "About"), show: !!aboutSection },
    { id: "products-section", icon: "fas fa-box-open", label: navLabel(c.product, "Services"), show: !!servicesSection },
    { id: "offers-section", icon: "fas fa-tags", label: navLabel(c.offer, "Offers"), show: !!offersSection },
    { id: "payment-section", icon: "fas fa-money-bill-alt", label: navLabel(c.payment, "Payment"), show: !!paymentSection },
    { id: "gallery-section", icon: "fa fa-photo-video", label: navLabel(c.gallery, "Gallery"), show: !!gallerySection },
    { id: "video-section", icon: "fa fa-video", label: navLabel(c.video, "Video"), show: !!videoSection },
    { id: "review-section", icon: "fab fa-google", label: "Reviews", show: !!googleReviewSection },
    { id: "enquiry-section", icon: "fas fa-comment-alt", label: navLabel(c.enquiry, "Enquiry"), show: !!enquirySection },
    { id: "cardqr-section", icon: "fas fa-qrcode", label: navLabel(c.cardqr, "QR"), show: !!cardQrSection },
  ].filter((f) => f.show);
  const footer = `<div class="footer"><ul class="footer-menu">${footerItems.map((f) =>
    `<li><a href="javascript:void(0)" onclick="goSection('${f.id}')" class="footer-menu-link"><i class="${f.icon}"></i><p>${f.label}</p></a></li>`).join("")}</ul></div>`;

  const vcard = ["BEGIN:VCARD", "VERSION:3.0", `FN:${s(c.name)}`, `ORG:${s(c.company_name)}`, `TITLE:${s(c.designation)}`,
    `TEL;TYPE=CELL:${s(c.mobile1)}`, `EMAIL:${s(c.email)}`, `URL:${s(c.url)}`, `ADR:;;${s(c.address)};;;;`, "END:VCARD"].join("\\n");

  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@400;600;700&display=swap">
<style>
${mainCss}
${styleFor(Number(theme))}
${firstPagePadCss(Number(theme))}
${ownerHierarchyCss}
${desigFontCss(Number(theme))}
:root{--theme-color:${accent};${secondary ? `--theme-secondary:${secondary};` : ""}}
html{scroll-behavior:smooth;scrollbar-gutter:stable;}
body{background:#f1f1f1;}
main{padding-bottom:78px;box-shadow:none;}
.footer{position:fixed;left:0;bottom:0;width:100%;z-index:999;}
.footer-menu{display:flex;justify-content:space-between;list-style:none;margin:0;padding:0;}
.footer-menu li{flex:1 1 0;min-width:0;}
.footer-menu-link{padding:6px 1px;}
.footer-menu-link i{font-size:15px;}
.footer-menu-link p{font-size:8px;line-height:1.1;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 1px;}
.section-header{font-size:19px;}
/* ── Video Portfolio ─────────────────────────────────────────────
   Each tile: a blurred fill of the frame behind the frame itself, so any
   aspect ratio (landscape or vertical short/reel) fills the tile cleanly
   with no white gaps. Title sits in a gradient overlay at the bottom. */
.dc-vid-media{position:relative;display:block;overflow:hidden;border-radius:14px;background:#0b0b0f;cursor:pointer;box-shadow:0 6px 20px rgba(15,20,32,.14);}
.dc-vid-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(22px) brightness(.5);transform:scale(1.18);}
.dc-vid-fg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1;}
.dc-vid-play{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;}
.dc-vid-play > span{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:transform .18s;}
.dc-vid-media:hover .dc-vid-play > span{transform:scale(1.08);}
.dc-vid-play i{color:#fff;font-size:21px;margin-left:3px;}
.dc-vid-title{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:26px 12px 11px;font-size:13px;font-weight:600;line-height:1.3;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.72));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* Stack: full-width tiles (landscape 16:9; vertical capped & centered) */
.dc-vid-stack .dc-vid-item{margin-bottom:16px;}
.dc-vid-stack .dc-vid-item:last-child{margin-bottom:0;}
.dc-vid-stack .dc-vid-media{aspect-ratio:16/9;}
.dc-vid-stack .dc-vid-item.vertical .dc-vid-media{aspect-ratio:9/16;max-width:260px;margin:0 auto;}
/* Swipe: uniform portrait "reels" tiles → shorts fill, landscape centered on blur,
   one consistent height so there are never white gaps between slides. */
.dc-vid-swipe-wrap{position:relative;}
.dc-vid-swipe{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:2px 2px 10px;scrollbar-width:none;}
.dc-vid-swipe::-webkit-scrollbar{display:none;}
.dc-vid-swipe .dc-vid-slide{flex:0 0 74%;scroll-snap-align:center;}
.dc-vid-swipe .dc-vid-media{aspect-ratio:9/16;}
/* Desktop navigation arrows (touch devices swipe instead) */
.dc-vid-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.97);box-shadow:0 3px 12px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#111;font-size:14px;}
.dc-vid-nav.prev{left:-4px;} .dc-vid-nav.next{right:-4px;}
.dc-vid-nav:active{transform:translateY(-50%) scale(.92);}
@media (hover:none){.dc-vid-nav{display:none;}}
.dc-vid-hint{text-align:center;font-size:11px;color:#9aa0a6;margin-top:2px;}
.dc-vid-hint i{margin-right:5px;color:var(--theme-color);}
/* Branded tiles for links with no fetchable thumbnail (Instagram / other) */
.dc-ig-thumb{background:linear-gradient(135deg,#F58529 0%,#DD2A7B 55%,#8134AF 100%);}
.dc-other-thumb{background:linear-gradient(135deg,#334155,#0f172a);}
.dc-ig-badge{position:absolute;top:10px;left:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.32);padding:4px 9px;border-radius:999px;}
.dc-ig-badge i{font-size:13px;}
.speciality-list li i{color:var(--theme-color);}
/* Beautiful share sheet */
#shareModal .dc-share-sheet{background:#fff;border-radius:22px;max-width:384px;width:100%;box-shadow:0 24px 64px rgba(2,6,23,.4);overflow:hidden;animation:dcSheetIn .22s cubic-bezier(.2,.8,.2,1);}
@keyframes dcSheetIn{from{opacity:0;transform:translateY(14px) scale(.97);}to{opacity:1;transform:none;}}
#shareModal .dc-sh-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 10px;}
#shareModal .dc-sh-title{margin:0;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.2px;}
#shareModal .dc-sh-x{width:32px;height:32px;border:none;background:#f1f5f9;border-radius:50%;color:#475569;font-size:19px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s;}
#shareModal .dc-sh-x:hover{background:#e2e8f0;}
#shareModal .dc-sh-sub{margin:0 20px 14px;font-size:12.5px;color:#94a3b8;line-height:1.5;}
#shareModal .dc-sh-copy{display:flex;align-items:center;gap:9px;margin:0 20px 16px;background:#f8fafc;border:1px solid #e6e8eb;border-radius:12px;padding:7px 7px 7px 13px;}
#shareModal .dc-sh-copy > i{color:#94a3b8;font-size:13px;}
#shareModal .dc-sh-copy span{flex:1;min-width:0;font-size:12.5px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;}
#shareModal .dc-sh-copy button{border:none;background:var(--theme-color);color:#111;font-weight:700;font-size:12.5px;padding:8px 15px;border-radius:9px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:filter .15s,transform .1s;}
#shareModal .dc-sh-copy button:hover{filter:brightness(1.05);}
#shareModal .dc-sh-copy button.dc-copied{background:#16a34a;color:#fff;}
#shareModal .dc-sh-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 12px 20px;}
#shareModal .dc-sh-item{display:flex;flex-direction:column;align-items:center;gap:7px;padding:11px 4px;border-radius:14px;text-decoration:none;transition:background .15s;}
#shareModal .dc-sh-item:hover{background:#f6f7f9;}
#shareModal .dc-sh-item:active{transform:scale(.95);}
#shareModal .dc-sh-ic{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px;box-shadow:0 5px 12px rgba(16,24,40,.16);}
#shareModal .dc-sh-ic svg{width:19px;height:19px;}
#shareModal .dc-sh-item > span:last-child{font-size:11px;font-weight:600;color:#475569;}
/* beautified enquiry + share */
.dc-field{position:relative;margin-bottom:12px;}
.dc-field > i{position:absolute;left:14px;top:24px;transform:translateY(-50%);color:#9aa0a6;font-size:14px;z-index:1;}
.dc-field.ta > i{top:18px;transform:none;}
.dc-input{width:100%;box-sizing:border-box;height:48px;border:1.5px solid #e6e8eb;border-radius:12px;padding:0 14px 0 40px;font-size:14px;outline:none;background:#fafbfc;transition:border-color .2s,box-shadow .2s,background .2s;color:#111;}
.dc-input::placeholder{color:#9aa0a6;}
.dc-input:focus{border-color:${accent};background:#fff;box-shadow:0 0 0 3px ${accent}30;}
textarea.dc-input{height:auto;min-height:104px;padding-top:13px;resize:vertical;line-height:1.5;}
.dc-btn{width:100%;box-sizing:border-box;height:50px;border:none;border-radius:12px;font-size:15px;font-weight:700;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;transition:transform .15s,box-shadow .2s,filter .2s;text-decoration:none;}
.dc-btn:hover{transform:translateY(-1px);filter:brightness(1.05);}
.dc-btn:active{transform:translateY(0);}
.dc-btn-primary{background:linear-gradient(135deg,${accent},${accentDark});box-shadow:0 6px 16px ${accent}66;}
.dc-btn-wa{background:linear-gradient(135deg,#2bd576,#1faa55);box-shadow:0 6px 16px rgba(37,211,102,.35);}
.dc-btn-dark{background:linear-gradient(135deg,#1e2536,#0f1420);box-shadow:0 6px 16px rgba(15,20,32,.3);}
.dc-phone{display:flex;align-items:stretch;border:1.5px solid #e6e8eb;border-radius:12px;overflow:hidden;background:#fafbfc;transition:border-color .2s,box-shadow .2s;}
.dc-phone:focus-within{border-color:${accent};background:#fff;box-shadow:0 0 0 3px ${accent}30;}
.dc-phone .cc{display:flex;align-items:center;gap:5px;padding:0 14px;background:#f1f3f5;font-weight:700;font-size:14px;color:#333;border-right:1px solid #e6e8eb;}
.dc-phone input{flex:1;min-width:0;border:none;outline:none;padding:0 14px;height:48px;font-size:14px;background:transparent;color:#111;}
/* Card-share QR — scannable QR of this card's own URL */
.dc-cardqr .dc-cardqr-box{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px 6px;}
.dc-cardqr-box img{border-radius:12px;background:#fff;padding:12px;box-shadow:0 4px 14px rgba(16,24,40,.08);border:1px solid #eef0f3;}
.dc-cardqr-cap{margin:0;font-size:13.5px;font-weight:600;color:#475569;text-align:center;}
/* Compact Share section — inline number + Share, slim Save-Contact */
.dc-share{padding-top:14px;padding-bottom:14px;}
.dc-share .section-header{margin-bottom:12px;}
.dc-wa-form{display:flex;align-items:stretch;max-width:400px;margin:0 auto;border-radius:12px;box-shadow:0 3px 10px rgba(16,24,40,.06);}
.dc-wa-cc{display:flex;align-items:center;gap:5px;padding:0 12px;background:#f1f3f5;border:1.5px solid #e6e8eb;border-right:none;border-radius:12px 0 0 12px;font-weight:700;font-size:13px;color:#333;white-space:nowrap;}
.dc-wa-cc i{color:var(--theme-color);}
.dc-wa-input{flex:1;min-width:0;border:1.5px solid #e6e8eb;border-left:none;border-right:none;outline:none;padding:0 12px;height:46px;font-size:14px;background:#fafbfc;color:#111;}
.dc-wa-form:focus-within .dc-wa-cc,.dc-wa-form:focus-within .dc-wa-input{border-color:${accent};}
.dc-wa-input:focus{background:#fff;}
.dc-wa-btn{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:none;background:linear-gradient(135deg,#2bd576,#1faa55);color:#fff;font-weight:700;font-size:14px;border-radius:0 12px 12px 0;padding:0 18px;height:46px;cursor:pointer;box-shadow:0 4px 12px rgba(37,211,102,.3);transition:filter .15s,transform .1s;}
.dc-wa-btn i{font-size:17px;}
.dc-wa-btn:hover{filter:brightness(1.06);}
.dc-wa-btn:active{transform:scale(.98);}
.dc-save-contact{display:flex;align-items:center;justify-content:center;gap:8px;max-width:400px;margin:10px auto 0;height:44px;border-radius:12px;background:linear-gradient(135deg,#1e2536,#0f1420);color:#fff;font-weight:700;font-size:13.5px;text-decoration:none;box-shadow:0 4px 12px rgba(15,20,32,.28);transition:filter .15s,transform .1s;}
.dc-save-contact:hover{filter:brightness(1.15);}
.dc-save-contact:active{transform:scale(.99);}
.dc-sent{color:#12a150;font-weight:600;text-align:center;padding:16px 0;}
/* Bottom nav: keep each tab a fixed width and let the bar scroll sideways (it
   already has edge-fade shadows for this) instead of squeezing 9–10 tabs into
   the width and truncating every label. Smaller, single-line labels. */
#body-content .footer-menu,.footer-menu{display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x proximity;}
.footer-menu::-webkit-scrollbar{display:none;}
/* Exactly 5 buttons per view; any more scroll horizontally. flex-grow lets a card
   with 5 or fewer sections still fill the bar evenly, while no-shrink keeps each
   button a fifth wide (no cramming) once there are more than five. */
.footer-menu li{flex:1 0 20%;min-width:0;scroll-snap-align:start;}
.footer-menu-link{padding:8px 6px;}
.footer-menu-link i{font-size:20px;}
.footer-menu-link p{font-size:10px;white-space:nowrap;margin-top:3px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;}
/* Paid-plan trust badge — small golden seal on the logo (Gold=crown, Platinum=gem) */
#home-section .home-brand-img{position:relative;display:inline-block;}
.dc-plan-badge{position:absolute;top:0;right:0;transform:translate(38%,-30%);z-index:6;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;font-size:8px;line-height:1;background:linear-gradient(135deg,#FCE4A0,#E8A317);color:#5b3d00;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);}
.dc-plan-badge i{font-size:8px;}
/* Card footer — compact CTAs + powered-by */
.dc-foot{margin:12px -15px 0;padding:10px 15px 11px;background:linear-gradient(180deg,#ffffff,#f7f8fa);border-top:1px solid #eef0f3;}
.dc-foot-actions{display:flex;gap:8px;max-width:400px;margin:0 auto;}
.dc-foot-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:10px;font-weight:700;font-size:12.5px;text-decoration:none;transition:transform .1s,box-shadow .2s,filter .15s;}
.dc-foot-btn:active{transform:scale(.97);}
.dc-foot-login{background:#fff;color:#0f172a;border:1.5px solid #e2e6ec;}
.dc-foot-login:hover{border-color:${accent};color:${accentDark};}
.dc-foot-create{background:linear-gradient(135deg,${accent},${accentDark});color:#0f172a;box-shadow:0 4px 11px ${accent}4d;}
.dc-foot-create:hover{filter:brightness(1.05);}
.dc-foot-powered{text-align:center;margin:8px 0 0;font-size:11px;color:#98a1b0;}
.dc-foot-powered a{color:#0f172a;font-weight:700;text-decoration:none;}
.dc-copied{color:#12a150;}
/* Small copy button after a UPI id / pay number */
.dc-copy{background:none;border:none;cursor:pointer;color:#9aa1ab;margin-left:8px;font-size:12px;padding:2px 5px;vertical-align:middle;line-height:1;}
.dc-copy:hover{color:var(--theme-color);}
.dc-copy i{pointer-events:none;}
/* Payment methods — modern cards */
.dc-pay-list{display:flex;flex-direction:column;gap:10px;}
.dc-pay-item{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #eceef1;border-radius:14px;padding:10px 12px;box-shadow:0 1px 3px rgba(16,24,40,.04);transition:box-shadow .2s,border-color .2s;}
.dc-pay-item:hover{border-color:${accent}66;box-shadow:0 5px 16px rgba(16,24,40,.09);}
.dc-pay-ic{width:46px;height:46px;border-radius:12px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#f6f7f9;overflow:hidden;color:#fff;font-weight:800;font-size:10px;letter-spacing:.3px;text-align:center;}
.dc-pay-ic img{width:100%;height:100%;object-fit:contain;padding:6px;box-sizing:border-box;}
.dc-pay-mid{flex:1;min-width:0;}
.dc-pay-name{display:block;font-size:10.5px;font-weight:700;color:#8a93a3;text-transform:uppercase;letter-spacing:.5px;}
.dc-pay-val{display:block;font-size:14.5px;font-weight:800;color:#111827;word-break:break-all;line-height:1.3;margin-top:1px;}
.dc-pay-copy{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;border:1px solid ${accent}66;background:${accent}14;color:${accentDark};font-weight:700;font-size:12px;border-radius:10px;padding:7px 12px;cursor:pointer;transition:background .15s,transform .1s;}
.dc-pay-copy:hover{background:${accent}26;}
.dc-pay-copy:active{transform:scale(.95);}
/* Bank account details — premium compact card */
.dc-qr-sub{margin-top:18px;text-align:center;}
.dc-qr-sub-title{text-align:left;font-size:13.5px;font-weight:700;color:#334155;margin-bottom:10px;padding-top:14px;border-top:1px solid #eef0f3;}
.dc-bank{margin-top:16px;border-radius:14px;overflow:hidden;border:1px solid #edeff2;box-shadow:0 6px 18px rgba(16,24,40,.09);}
.dc-bank-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;background:linear-gradient(135deg,${accent},${accentDark});color:#fff;font-weight:800;font-size:13.5px;letter-spacing:.3px;}
.dc-bank-title{display:flex;align-items:center;gap:9px;}
.dc-bank-title i{font-size:14px;opacity:.95;}
.dc-bank-copy{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-weight:700;font-size:11.5px;border-radius:8px;padding:5px 10px;cursor:pointer;transition:background .15s,transform .1s;}
.dc-bank-copy:hover{background:rgba(255,255,255,.34);}
.dc-bank-copy:active{transform:scale(.95);}
.dc-bank-body{background:#fff;}
.dc-bank-row{display:flex;align-items:center;gap:11px;padding:8px 14px;}
.dc-bank-row + .dc-bank-row{border-top:1px solid #f2f4f7;}
.dc-bank-ic{width:28px;height:28px;flex:0 0 auto;border-radius:8px;background:${accent}16;color:${accent};display:flex;align-items:center;justify-content:center;font-size:12px;}
.dc-bank-kv{flex:1;min-width:0;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.dc-bank-kv .k{font-size:10.5px;font-weight:600;color:#98a1b0;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;}
.dc-bank-kv .v{font-size:13.5px;font-weight:800;color:#101828;text-align:right;word-break:break-all;}
@media(max-width:360px){.dc-pay-copy span{display:none;}}
/* Floating Save Contact button (small) */
.dc-save-fab{position:fixed;right:14px;bottom:150px;width:44px;height:44px;border-radius:50%;background:#14243E;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.28);z-index:1000;color:#fff;font-size:17px;text-decoration:none;transition:transform .15s;}
.dc-save-fab:hover{transform:scale(1.08);}
</style></head>
<body data-theme="${theme}">
<main>
  <div class="page-wrapper">
    <section id="home-section">
      <a href="javascript:void(0)" id="home-card-share" onclick="openShare()"><i class="fa fa-share-alt"></i></a>
      <div class="home-section-content">
        <div class="view"><div class="view-icon"><i class="fa fa-eye"></i></div><div class="view-number"><p id="dc-view-count">${Number(c.views ?? 0).toLocaleString("en-IN")}</p></div></div>
        <div class="home-brand"><div class="home-brand-img"><img src="${esc(c.logo) || logoPlaceholder}" alt="${esc(c.name)}" ${IMG} onerror="this.onerror=null;this.src='${logoPlaceholder}'">${planBadge}</div></div>
        <div class="home-social"><p>${esc(s(c.social_title) || "Follow Us")}</p><ul class="social-icons">${social}</ul></div>
        <div class="owner-details"><h4 class="owner-name">${esc(c.name) || "Your Name"}</h4><p class="owner-designation">${esc(c.designation)}</p></div>
        <div class="home-details">${homeDetails}</div>
        <div class="home-call-whatsapp">
          <a href="tel:${esc(c.mobile1)}" class="call-icon"><i class="fa fa-phone-alt"></i><span>Call</span></a>
          <a href="https://wa.me/${esc(wa)}" class="whatapp-icon" target="_blank"><i class="fab fa-whatsapp"></i><span>Whatsapp</span></a>
        </div>
      </div>
      <div class="home-extra-one"></div><div class="home-extra-two"></div><div class="home-extra-three"></div><div class="home-extra-four"></div>
    </section>
    ${aboutSection}
    ${servicesSection}
    ${offersSection}
    ${paymentSection}
    ${gallerySection}
    ${videoSection}
    ${googleReviewSection}
    ${enquirySection}
    ${cardQrSection}
    ${shareSection}
    <div class="dc-foot">
      <div class="dc-foot-actions">
        <a href="/login" target="_top" class="dc-foot-btn dc-foot-login"><i class="fa fa-user"></i> Customer Login</a>
        <a href="/signup${(s(c.referral_code) || slug) ? `?ref=${encodeURIComponent(s(c.referral_code) || slug)}` : ""}" target="_top" class="dc-foot-btn dc-foot-create"><i class="fa fa-bolt"></i> Create Free Card</a>
      </div>
      <p class="dc-foot-powered">Powered by <a href="https://digitalcarda.in" target="_blank">DigitalCarda</a></p>
    </div>
  </div>
</main>
<a href="javascript:void(0)" onclick="saveVCard()" class="dc-save-fab" aria-label="Save Contact" title="Save Contact"><i class="fa fa-user-plus"></i></a>
${footer}
<div id="lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:99999;align-items:center;justify-content:center;flex-direction:column">
  <span onclick="lbClose()" style="position:absolute;top:12px;right:18px;color:#fff;font-size:32px;line-height:1;cursor:pointer">&times;</span>
  <span onclick="lbPrev(event)" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);color:#fff;font-size:40px;cursor:pointer;padding:12px;user-select:none">&#8249;</span>
  <img id="lbImg" referrerpolicy="no-referrer" style="max-width:90%;max-height:80%;border-radius:6px;box-shadow:0 4px 30px rgba(0,0,0,.6)">
  <span onclick="lbNext(event)" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);color:#fff;font-size:40px;cursor:pointer;padding:12px;user-select:none">&#8250;</span>
  <div id="lbCount" style="color:#fff;margin-top:14px;font-size:13px;letter-spacing:1px"></div>
</div>
<div id="shareModal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:99998;align-items:center;justify-content:center;padding:16px">
  <div class="dc-share-sheet">
    <div class="dc-sh-head">
      <h3 class="dc-sh-title">Share this card</h3>
      <button class="dc-sh-x" onclick="closeShare()" aria-label="Close">&times;</button>
    </div>
    <p class="dc-sh-sub">Send ${esc(shareName)}'s digital card to anyone — they can save the contact, call or message in a single tap.</p>
    <div class="dc-sh-copy"><i class="fa fa-link"></i><span>${esc(cardUrl.replace(/^https?:\/\//, ""))}</span><button id="dc-copy-btn" onclick="copyShare()"><i class="fa fa-copy"></i> Copy</button></div>
    <div class="dc-sh-grid">
      <a class="dc-sh-item" href="https://wa.me/?text=${encodeURIComponent(waShareText)}" target="_blank"><span class="dc-sh-ic" style="background:#25D366"><i class="fab fa-whatsapp"></i></span><span>WhatsApp</span></a>
      <a class="dc-sh-item" href="https://t.me/share/url?url=${encodeURIComponent(cardUrl)}&text=${encodeURIComponent("Take a look at " + shareName + "'s digital card")}" target="_blank"><span class="dc-sh-ic" style="background:#229ED9"><i class="fab fa-telegram-plane"></i></span><span>Telegram</span></a>
      <a class="dc-sh-item" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardUrl)}" target="_blank"><span class="dc-sh-ic" style="background:#1877F2"><i class="fab fa-facebook-f"></i></span><span>Facebook</span></a>
      <a class="dc-sh-item" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(cardUrl)}" target="_blank"><span class="dc-sh-ic" style="background:#000">${X_SVG}</span><span>X</span></a>
      <a class="dc-sh-item" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}" target="_blank"><span class="dc-sh-ic" style="background:#0A66C2"><i class="fab fa-linkedin-in"></i></span><span>LinkedIn</span></a>
      <a class="dc-sh-item" href="https://pinterest.com/pin/create/link/?url=${encodeURIComponent(cardUrl)}" target="_blank"><span class="dc-sh-ic" style="background:#E60023"><i class="fab fa-pinterest-p"></i></span><span>Pinterest</span></a>
      <a class="dc-sh-item" href="sms:?body=${encodeURIComponent(cardUrl)}"><span class="dc-sh-ic" style="background:#6366F1"><i class="fas fa-comment-dots"></i></span><span>Message</span></a>
      <a class="dc-sh-item" href="mailto:?subject=${encodeURIComponent(shareName + " — Digital Card")}&body=${encodeURIComponent(waShareText)}"><span class="dc-sh-ic" style="background:#EA4335"><i class="fa fa-envelope"></i></span><span>Email</span></a>
    </div>
  </div>
</div>
<script>
/* Real engagement tracking (Phase 20): a view ping + a delegated tap listener.
   Suppressed inside the dashboard builder preview and /demo pages so the owner's
   own editing/previews never inflate their numbers (§36 — real data only). */
var DC_SLUG = ${JSON.stringify(slug)};
var DC_WA_TEXT = ${jsq(waShareText)};
function dcShareWa(form){ var n=(form.num.value||'').replace(/[^0-9]/g,''); if(!n) return false; if(n.length===10) n='91'+n; window.open('https://wa.me/'+n+'/?text='+encodeURIComponent(DC_WA_TEXT),'_blank'); return false; }
var DC_OFF = false;
try { var _pp = (window.parent && window.parent !== window && window.parent.location.pathname) || ""; if (/^\\/dashboard|^\\/demo\\//.test(_pp)) DC_OFF = true; } catch (e) {}
/* text/plain body = CORS-safelisted (no preflight) so it works from the
   sandboxed public-card iframe (opaque origin). Server parses text as JSON. */
function dcTrack(t){ if(!DC_SLUG||DC_OFF) return; try{ var b=new Blob([JSON.stringify({slug:DC_SLUG,type:t})],{type:'text/plain'}); if(!navigator.sendBeacon||!navigator.sendBeacon('/api/track',b)) throw 0; }catch(e){ try{ fetch('/api/track',{method:'POST',keepalive:true,body:JSON.stringify({slug:DC_SLUG,type:t})}); }catch(_){} } }
dcTrack('view');
/* The parent page fetches the REAL view count (same-origin, reliable) and posts
   it in; we just render it. Avoids an unreliable cross-origin fetch from this
   sandboxed opaque-origin iframe. */
window.addEventListener('message', function(e){ try{ if(e.data&&typeof e.data.__dcViews==='number'){ var el=document.getElementById('dc-view-count'); if(el) el.textContent=Number(e.data.__dcViews).toLocaleString('en-IN'); } }catch(_){} });
document.addEventListener('click', function(e){ var a=e.target.closest?e.target.closest('a,button'):null; if(!a) return; var href=(a.getAttribute&&a.getAttribute('href'))||''; var oc=(a.getAttribute&&a.getAttribute('onclick'))||''; if(/saveVCard/.test(oc)) return dcTrack('save_contact'); if(/openShare/.test(oc)) return dcTrack('share'); if(href.indexOf('tel:')===0) return dcTrack('call'); if(href.indexOf('mailto:')===0) return dcTrack('email'); if(/wa\\.me|whatsapp/i.test(href)) return dcTrack('whatsapp'); if(/maps\\.google|google\\.[a-z.]+\\/maps|goo\\.gl\\/maps/i.test(href)) return dcTrack('directions'); if(a.closest&&a.closest('.product-card')) return dcTrack('product'); if(/facebook|instagram|youtube|twitter|linkedin|pinterest/i.test(href)) return dcTrack('social'); if(href.indexOf('http')===0) return dcTrack('website'); }, true);
var galImgs = ${JSON.stringify(gallery.map((g) => s(g.filename)))};
var lbI = 0;
function lbShow(){ document.getElementById('lbImg').src = galImgs[lbI]; document.getElementById('lbCount').textContent = (lbI+1)+' / '+galImgs.length; }
function lbOpen(i){ lbI=i; document.getElementById('lightbox').style.display='flex'; lbShow(); }
function lbClose(){ document.getElementById('lightbox').style.display='none'; }
function lbPrev(e){ if(e&&e.stopPropagation)e.stopPropagation(); lbI=(lbI-1+galImgs.length)%galImgs.length; lbShow(); }
function lbNext(e){ if(e&&e.stopPropagation)e.stopPropagation(); lbI=(lbI+1)%galImgs.length; lbShow(); }
function dcVidScroll(btn,dir){ var w=btn.parentNode.querySelector('.dc-vid-swipe'); if(w) w.scrollBy({left:dir*w.clientWidth*0.9,behavior:'smooth'}); }
function playVid(el,id,provider,vertical){ var ig=provider==='instagram';
  // In the PUBLIC card the iframe is sandboxed without allow-same-origin, so a
  // nested YouTube/Instagram player can't run. Detect that (opaque origin) and
  // ask the trusted parent page to play it in a lightbox instead. Non-sandboxed
  // preview contexts (dashboard/demo) fall through and play inline.
  var sandboxed=false; try{ sandboxed=(window.origin==='null'); }catch(e){ sandboxed=true; }
  if(sandboxed){ try{ window.parent.postMessage({__dcVideo:{id:id,provider:provider,vertical:!!vertical}},'*'); return; }catch(e){} }
  var src=ig?'https://www.instagram.com/reel/'+id+'/embed/':'https://www.youtube.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1'; var pad=ig?'125%':(vertical?'177.78%':'56.25%'); el.outerHTML='<div style="position:relative;padding-bottom:'+pad+';height:0;border-radius:12px;overflow:hidden;background:#000"><iframe src="'+src+'" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe></div>'; }
document.getElementById('lightbox').addEventListener('click', function(e){ if(e.target.id==='lightbox') lbClose(); });
document.addEventListener('keydown', function(e){ var lb=document.getElementById('lightbox'); if(lb&&lb.style.display==='flex'){ if(e.key==='Escape')lbClose(); else if(e.key==='ArrowLeft')lbPrev(); else if(e.key==='ArrowRight')lbNext(); } });
function goSection(id){ var el=document.getElementById(id); if(!el) return; var h=document.documentElement, b=document.body, prev=h.style.scrollBehavior; h.style.scrollBehavior='auto'; var y=el.getBoundingClientRect().top+(window.pageYOffset||h.scrollTop||b.scrollTop||0); window.scrollTo(0,y); h.style.scrollBehavior=prev; }
function dcSendEnquiry(form){
  try{
    function pad(n){return (n<10?'0':'')+n;}
    var d=new Date();
    var ts=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
    var e={ id:'new_'+d.getTime()+'_'+Math.floor(Math.random()*1e4),
      name:(form.name.value||'').trim(), contact:(form.contact.value||'').trim(),
      email:(form.email.value||'').trim(), description:(form.description.value||'').trim(),
      uname:'${slug}', created_on:ts, status:'new' };
    /* Send to the server FIRST (owner stored + emailed) — the important path.
       Runs before any localStorage, which throws in the sandboxed public card. */
    try{ fetch('/api/enquiry',{method:'POST',body:JSON.stringify({slug:e.uname,name:e.name,contact:e.contact,email:e.email,description:e.description})}).catch(function(){}); }catch(_){}
    /* Best-effort local mirror for the owner's dashboard — silently no-ops under sandbox. */
    try{ var key='dc_new_enquiries', list=[]; try{ list=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(list))list=[]; }catch(_){ list=[]; } list.push(e); localStorage.setItem(key, JSON.stringify(list)); localStorage.setItem('dc_enquiry_ping', String(d.getTime())); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('dc:new-enquiry',{detail:e})); }catch(_){}
    try{ if(window.parent && window.parent!==window) window.parent.dispatchEvent(new CustomEvent('dc:new-enquiry',{detail:e})); }catch(_){}
  }catch(err){}
  form.innerHTML='<p class="dc-sent">✓ Thank you! We will get back to you shortly.</p>';
  return false;
}
function dcShareModal(){ var el=document.getElementById('shareModal'); if(el) el.style.display='flex'; }
// Native share where allowed; otherwise (incl. the sandboxed card iframe, where
// navigator.share exists but rejects) fall back to our own share modal.
function openShare(){ try{ if(navigator.share){ navigator.share({title:(document.title||'Digital Card'), url:'${cardUrl}'}).catch(dcShareModal); return; } }catch(_){} dcShareModal(); }
function closeShare(){ document.getElementById('shareModal').style.display='none'; }
function copyShare(){ var u='${cardUrl}'; var btn=document.getElementById('dc-copy-btn');
  function ok(){ if(!btn) return; var h=btn.getAttribute('data-h')||btn.innerHTML; btn.setAttribute('data-h',h); btn.classList.add('dc-copied'); btn.innerHTML='<i class="fa fa-check"></i> Copied'; setTimeout(function(){ btn.classList.remove('dc-copied'); btn.innerHTML=h; },1600); }
  function ex(){ try{ var ta=document.createElement('textarea'); ta.value=u; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); var r=document.execCommand('copy'); document.body.removeChild(ta); return r; }catch(_){ return false; } }
  // clipboard API rejects inside the sandboxed card iframe → fall back to execCommand.
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(u).then(ok, function(){ if(ex()) ok(); }); }
  else { if(ex()) ok(); } }
function dcCopy(b){ var t=(b.getAttribute('data-copy')||''); var i=b.querySelector('i');
  function flash(){ if(i){ var o=i.className; i.className='fa fa-check'; b.classList.add('dc-copied'); setTimeout(function(){ i.className=o; b.classList.remove('dc-copied'); },1300); } }
  function exec(){ try{ var ta=document.createElement('textarea'); ta.value=t; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.top='0'; ta.style.left='0'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{ta.setSelectionRange(0,t.length);}catch(_){} var ok=document.execCommand('copy'); document.body.removeChild(ta); return ok; }catch(_){ return false; } }
  // clipboard API often rejects (async) inside the sandboxed card iframe, so fall
  // back to execCommand on rejection; only show the tick when a copy truly succeeds.
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(flash, function(){ if(exec()) flash(); }); }
  else { if(exec()) flash(); } }
document.getElementById('shareModal').addEventListener('click', function(e){ if(e.target.id==='shareModal') closeShare(); });
function saveVCard(){
  var v = ${jsq(vcard)};
  var b = new Blob([v], {type:'text/vcard'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '${slug || "card"}.vcf'; a.click();
}
</script>
</body></html>`;
}

/* Renders only the FIRST PAGE (home section) of a card with a given template —
   used for the template picker thumbnails. No scripts, no other sections. */
export function buildCardThumb(c: CustomerRecord, themeNum: number): string {
  const theme = Math.min(TEMPLATE_COUNT, Math.max(1, Number(themeNum) || 1));
  // Premium single-screen cards + link-in-bio render their own compact preview.
  if (isPremiumCard(theme)) {
    const demo = [{ name: "Fraud Sentinel 360", tagline: "Fraud & risk management" }, { name: "Whistle Sentinel", tagline: "Secure whistle-blower app" }, { name: "MeCard.me", tagline: "Digital card solutions" }];
    return buildPremiumCardHtml(c as Record<string, unknown>, demo, theme - PREMIUM_START, { thumb: true });
  }
  if (isLinkBio(theme)) {
    const sampleProducts = [{ name: "Our Services", button: "", button_title: "View Services" }];
    return buildLinkBioHtml(c as Record<string, unknown>, sampleProducts, theme - LINKBIO_START, { thumb: true });
  }
  const accent = s(c.color) || "#F7B31C";
  const secondary = s(c.color2);
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const initial = (s(c.name)[0] || "D").toUpperCase();
  const logoPlaceholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><rect width='140' height='140' rx='12' fill='${accent}'/><text x='50%' y='50%' font-size='64' fill='#fff' text-anchor='middle' font-family='Arial,sans-serif' dominant-baseline='central'>${initial}</text></svg>`)}`;
  const social = renderSocialIcons(c, false)
    || `<li><a href="javascript:void(0)"><i class="fab fa-facebook-f"></i></a></li><li><a href="javascript:void(0)"><i class="fab fa-instagram"></i></a></li>`;
  const detail = (icon: string, text: string) =>
    text ? `<div class="home-single-details"><a href="javascript:void(0)"><i class="${icon}"></i><span>${esc(text)}</span></a></div>` : "";
  const homeDetails = [
    detail("fa fa-phone-alt", s(c.mobile1) || "+91 00000 00000"),
    detail("fa fa-globe", s(c.url) || "www.yoursite.com"),
    detail("fa fa-envelope", s(c.email) || "you@email.com"),
    detail("fa fa-map-marker-alt", s(c.address) || "Your business address"),
  ].join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap">
<style>
${mainCss}
${styleFor(theme)}
${firstPagePadCss(theme)}
${ownerHierarchyCss}
${desigFontCss(theme)}
:root{--theme-color:${accent};${secondary ? `--theme-secondary:${secondary};` : ""}}
html,body{margin:0;background:#fff;overflow:hidden;}
main{box-shadow:none;padding:0;}
#home-card-share,.view,.footer{display:none !important;}
</style></head>
<body data-theme="${theme}">
<main><div class="page-wrapper"><section id="home-section">
  <div class="home-section-content">
    <div class="home-brand"><div class="home-brand-img"><img src="${esc(c.logo) || logoPlaceholder}" ${IMG} onerror="this.onerror=null;this.src='${logoPlaceholder}'"></div></div>
    <div class="home-social"><p>${esc(s(c.social_title) || "Follow Us")}</p><ul class="social-icons">${social}</ul></div>
    <div class="owner-details"><h4 class="owner-name">${esc(c.name) || "Your Name"}</h4><p class="owner-designation">${esc(c.designation) || "Designation"}</p></div>
    <div class="home-details">${homeDetails}</div>
    <div class="home-call-whatsapp">
      <a href="tel:${esc(c.mobile1)}" class="call-icon"><i class="fa fa-phone-alt"></i><span>Call</span></a>
      <a href="https://wa.me/${esc(wa)}" class="whatapp-icon" target="_blank"><i class="fab fa-whatsapp"></i><span>Whatsapp</span></a>
    </div>
  </div>
  <div class="home-extra-one"></div><div class="home-extra-two"></div><div class="home-extra-three"></div><div class="home-extra-four"></div>
</section></div></main>
</body></html>`;
}

/* Shown at the public card URL when the owner's plan/trial has expired.
   Keeps it visitor-friendly and turns the dead page into a signup opportunity. */
export function buildPausedHtml(c: CustomerRecord): string {
  const accent = s(c.color) || "#F7B31C";
  const name = esc(c.company_name) || esc(c.name) || "This business";
  const slug = s(c.slug);
  const ref = s(c.referral_code) || slug;
  const signup = `/signup${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Montserrat',system-ui,sans-serif;}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#0F172A,#1E293B);padding:24px;}
.pw{width:100%;max-width:360px;background:#fff;border-radius:24px;padding:34px 26px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);}
.ic{width:74px;height:74px;border-radius:20px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;background:${accent}1f;color:${accent};font-size:30px;}
h1{font-size:19px;font-weight:800;color:#0F172A;line-height:1.3;}
.sub{font-size:13px;color:#64748B;margin-top:8px;line-height:1.6;}
.name{font-weight:700;color:#0F172A;}
.cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:22px;height:50px;border-radius:14px;background:linear-gradient(135deg,${accent},${darken(accent, 0.16)});color:#0F172A;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 20px ${accent}55;}
.hint{font-size:11px;color:#94A3B8;margin-top:10px;}
.owner{display:inline-flex;align-items:center;gap:6px;margin-top:20px;padding-top:16px;border-top:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#0F172A;text-decoration:none;}
.owner i{color:${accent};}
.brand{margin-top:14px;font-size:11px;color:#94A3B8;}
.brand b{color:${accent};}
</style></head>
<body>
  <div class="pw">
    <div class="ic"><i class="fa fa-hourglass-half"></i></div>
    <h1>This card is currently unavailable</h1>
    <p class="sub"><span class="name">${name}</span>'s digital card is temporarily paused. Please check back soon.</p>
    <a class="cta" href="${signup}" target="_top"><i class="fa fa-bolt"></i> Create your own free card</a>
    <p class="hint">Set up your own digital card in minutes — 30 days free.</p>
    <a class="owner" href="/login?next=/dashboard/subscription" target="_top"><i class="fa fa-redo"></i> Own this card? Log in to reactivate it</a>
    <p class="brand">Powered by <b>DigitalCarda</b></p>
  </div>
</body></html>`;
}
