import mainCss from "./main.css?raw";
import type { CustomerRecord } from "@/hooks/useCustomer";
import { fixMojibake } from "@/lib/cardContent";

/* All 31 legacy templates (style1.css … style31.css) loaded as raw strings. */
const STYLE_MODULES = import.meta.glob("./styles/style*.css", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const STYLES: Record<string, string> = {};
for (const [path, css] of Object.entries(STYLE_MODULES)) {
  const n = path.match(/style(\d+)\.css$/)?.[1];
  if (n) STYLES[n] = css;
}
export const TEMPLATE_COUNT = 31;

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

const styleFor = (theme: number) => STYLES[String(Math.min(TEMPLATE_COUNT, Math.max(1, Number(theme) || 1)))] || STYLES["1"] || "";

type Product = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
type Gallery = { id: number; name: string; filename: string };
type Vid = { id: number; title: string; url: string };
type Offer = { id: number; title: string; description: string; valid: string; filename: string };
type Qr = { id: number; name: string; filename: string };
type Review = { id: number; name: string; rating: number | string; text: string; date?: string };

const s = (v: unknown) => String(v ?? "").trim();
const on = (v: unknown) => Number(v ?? 1) === 1;
const esc = (v: unknown) => s(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ytId = (url: string) => (url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/) || [])[1] || "";
const IMG = 'referrerpolicy="no-referrer"';
const darken = (hex: string, f: number) => {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return hex;
  const p = m.map((x) => Math.max(0, Math.round(parseInt(x, 16) * (1 - f))));
  return `#${p.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};

const SOCIAL_FA: Record<string, string> = {
  facebook: "fab fa-facebook-f", instagram: "fab fa-instagram", youtube: "fab fa-youtube",
  twitter: "fab fa-twitter", pinterest: "fab fa-pinterest-p", linkedin: "fab fa-linkedin",
};

export function buildCardHtml(c: CustomerRecord, products: Product[], gallery: Gallery[], videos: Vid[], offers: Offer[] = [], qrcodes: Qr[] = [], reviews: Review[] = []): string {
  const accent = s(c.color) || "#F7B31C";
  const accentDark = darken(accent, 0.16);
  const secondary = s(c.color2);
  const theme = String(Math.min(TEMPLATE_COUNT, Math.max(1, Number(c.theme) || 1)));
  const slug = s(c.slug);
  const cardUrl = `https://digitalcarda.in/c/${slug}`;
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const specs = s(c.specialities).split(/[,|]/).map((x) => x.trim()).filter(Boolean);
  const initial = (s(c.name)[0] || "D").toUpperCase();
  const logoPlaceholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><rect width='140' height='140' rx='12' fill='${accent}'/><text x='50%' y='50%' font-size='64' fill='#fff' text-anchor='middle' font-family='Arial,sans-serif' dominant-baseline='central'>${initial}</text></svg>`)}`;

  const social = Object.keys(SOCIAL_FA).filter((k) => s(c[k]))
    .map((k) => `<li><a href="${esc(c[k])}" target="_blank"><i class="${SOCIAL_FA[k]}"></i></a></li>`).join("");

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
        ${s(c.about_us) ? `<div class="about-text"><i class="fa fa-quote-left about-quote"></i><p>${esc(c.about_us)}</p></div>` : ""}
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
          ${p.description ? `<div class="heading-2" style="margin-top:14px"><h5>Other Detail</h5></div><div style="font-size:13px">${fixMojibake(p.description)}</div>` : ""}
          <div class="text-right" style="margin-top:12px"><a href="${b.href}" class="product-enquiry-btn" target="${b.target}" rel="noopener"><i class="${b.icon}" style="margin-right:6px"></i>${esc(p.button_title || "Send Enquiry")}</a></div>
        </div>`;
      }).join("")}
    </div>` : "";

  const payIcon = (name: string) => `https://digitalcarda.in/images/${name}.png`;
  const payRow = (cls: string, icon: string, v: string) =>
    v ? `<tr class="table-row ${cls}"><td class="lable" style="text-align:center;width:35%"><img src="${payIcon(icon)}" style="height:34px;max-width:100%;object-fit:contain" ${IMG} onerror="this.replaceWith(document.createTextNode('${cls.toUpperCase()}'))"></td><td class="lable-text" style="font-weight:bold;padding:12px">${esc(v)}</td></tr>` : "";
  const hasPay = s(c.upi) || s(c.paytm_number) || s(c.phone_pe) || s(c.google_pay);
  const hasBank = s(c.account_number) || s(c.bank_name);
  const paymentSection = on(c.payment_on) && (hasPay || hasBank) ? `
    <div id="payment-section" class="section-container">
      <div class="section-header">Payment Details</div>
      ${hasPay ? `<table class="payment-table" style="width:100%">
        ${payRow("bhim", "bhim", s(c.upi))}
        ${payRow("paytm", "paytm", s(c.paytm_number))}
        ${payRow("phonepe", "phonepe", s(c.phone_pe))}
        ${payRow("gpay", "gpay", s(c.google_pay))}
      </table>` : ""}
      ${hasBank ? `<div class="heading-2" style="margin-top:16px"><h5>Bank Account Details</h5></div>
      <div class="bank-detail-box">
        <table class="bank-detail-card">
          ${s(c.bank_name) ? `<tr><td><i class="fa fa-university"></i>Bank Name</td><td>:</td><td>${esc(c.bank_name)}</td></tr>` : ""}
          ${s(c.ifsc) ? `<tr><td><i class="fa fa-hashtag"></i>IFSC Code</td><td>:</td><td>${esc(c.ifsc)}</td></tr>` : ""}
          ${s(c.account_holder) ? `<tr><td><i class="fa fa-user"></i>A/c Holder</td><td>:</td><td>${esc(c.account_holder)}</td></tr>` : ""}
          ${s(c.account_number) ? `<tr><td><i class="fa fa-credit-card"></i>Account No.</td><td>:</td><td>${esc(c.account_number)}</td></tr>` : ""}
          ${s(c.account_type) ? `<tr><td><i class="fa fa-wallet"></i>Account Type</td><td>:</td><td>${esc(c.account_type)}</td></tr>` : ""}
        </table>
      </div>` : ""}
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
  const googleReviewSection = (s(c.google_review) || ratingNum > 0 || reviews.length) ? `
    <div id="review-section" class="section-container">
      <div class="section-header">Google Reviews</div>
      ${summaryBlock}
      ${reviewCards}
      ${s(c.google_review) ? `<div class="grev-btn-wrap"><a href="${esc(c.google_review)}" target="_blank" class="grev-btn"><i class="fab fa-google"></i> Write a Review</a></div>` : ""}
    </div>` : "";

  const qrSection = on(c.qrcode_on) && (qrcodes.length || slug) ? `
    <div id="qrcode-section" class="section-container" style="text-align:center">
      <div class="section-header" style="text-align:left">QR Code</div>
      ${qrcodes.length ? qrcodes.map((q) => `<div class="qrcode-card" style="text-align:center;margin-bottom:16px">
        <img src="${esc(q.filename)}" style="max-width:240px;width:100%;border-radius:6px" ${IMG} onerror="this.style.display='none'">
        <div><a href="${cardUrl}" class="qrcode-enquiry-btn" target="_blank">${esc(q.name) || "Pay Online"}</a></div>
      </div>`).join("") : `<div class="qrcode-card" style="text-align:center">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cardUrl)}" style="width:170px;height:170px" ${IMG}>
        <div><a href="${cardUrl}" class="qrcode-enquiry-btn" target="_blank">Pay Online</a></div>
      </div>`}
    </div>` : "";

  const offersSection = on(c.offer_on) && offers.length ? `
    <div id="offers-section" class="section-container">
      <div class="section-header">${esc(s(c.offer) || "Offers")}</div>
      ${offers.map((o) => `<div class="offer-card">
        ${o.filename ? `<img src="${esc(o.filename)}" class="img-fluid" style="width:100%;border-radius:4px" ${IMG} onerror="this.style.display='none'">` : ""}
        ${o.title ? `<h5 style="font-weight:700;margin-top:8px">${esc(o.title)}</h5>` : ""}
        ${o.valid ? `<p style="font-size:12px;color:#666;margin-top:2px"><i class="fa fa-clock"></i> Valid till: ${esc(o.valid)}</p>` : ""}
        ${o.description ? `<p style="font-size:13px;margin-top:4px">${esc(o.description)}</p>` : ""}
      </div>`).join("")}
    </div>` : "";

  const gallerySection = on(c.gallery_on) && gallery.length ? `
    <div id="gallery-section" class="section-container">
      <div class="section-header">${esc(s(c.gallery) || "Graphic Portfolio")}</div>
      <div class="gallery card-columns">
        ${gallery.map((g, gi) => `<div class="card"><img src="${esc(g.filename)}" class="img-fluid" style="width:100%;border-radius:4px;cursor:pointer" ${IMG} onclick="lbOpen(${gi})" onerror="this.parentNode.style.display='none'"></div>`).join("")}
      </div>
    </div>` : "";

  const videoSection = on(c.video_on) && videos.length ? `
    <div id="video-section" class="section-container">
      <div class="section-header">${esc(s(c.video) || "Video Portfolio")}</div>
      ${videos.map((v) => { const vid = ytId(v.url); return `<div style="margin-bottom:14px">
        <div class="video-thumb" onclick="playVid(this,'${vid}')" style="position:relative;cursor:pointer;border-radius:6px;overflow:hidden;background:#000">
          <img src="https://img.youtube.com/vi/${vid}/hqdefault.jpg" style="width:100%;display:block" ${IMG}>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="width:54px;height:54px;border-radius:50%;background:rgba(255,0,0,.88);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4)"><i class="fa fa-play" style="color:#fff;font-size:20px;margin-left:3px"></i></span></span>
        </div>
        <p style="font-size:13px;margin-top:4px">${esc(v.title)}</p></div>`; }).join("")}
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
      <form onsubmit="var n=this.num.value.replace(/[^0-9]/g,'');if(n)window.open('https://wa.me/'+ (n.length===10?'91'+n:n) +'/?text=' + encodeURIComponent('${cardUrl}'),'_blank');return false;">
        <div class="dc-phone" style="max-width:340px;margin:0 auto 8px">
          <span class="cc"><i class="fas fa-mobile-alt" style="color:var(--theme-color)"></i> +91</span>
          <input name="num" placeholder="Enter WhatsApp number" inputmode="numeric" required>
        </div>
        <div style="max-width:340px;margin:0 auto"><button type="submit" class="dc-btn dc-btn-wa"><i class="fab fa-whatsapp" style="font-size:16px"></i> Share</button></div>
      </form>
      <div style="max-width:340px;margin:8px auto 0">
        <a href="javascript:void(0)" onclick="saveVCard()" class="dc-btn dc-btn-dark"><i class="fa fa-download"></i> Save Contact in Your Phonebook</a>
      </div>
    </div>`;

  // Footer icons mirror the sections that are actually on the card — disable a
  // module in Settings and its section string is empty, so its icon drops out.
  const footerItems = [
    { id: "home-section", icon: "fa fa-home", label: "Home", show: true },
    { id: "about-section", icon: "fas fa-briefcase", label: s(c.about) || "About Us", show: !!aboutSection },
    { id: "products-section", icon: "fas fa-box-open", label: s(c.product) || "Services", show: !!servicesSection },
    { id: "offers-section", icon: "fas fa-tags", label: s(c.offer) || "Offers", show: !!offersSection },
    { id: "payment-section", icon: "fas fa-money-bill-alt", label: s(c.payment) || "Payment", show: !!paymentSection },
    { id: "qrcode-section", icon: "fas fa-qrcode", label: "QR Code", show: !!qrSection },
    { id: "review-section", icon: "fab fa-google", label: "Reviews", show: !!googleReviewSection },
    { id: "gallery-section", icon: "fa fa-photo-video", label: s(c.gallery) || "Gallery", show: !!gallerySection },
    { id: "video-section", icon: "fa fa-video", label: s(c.video) || "Video", show: !!videoSection },
    { id: "enquiry-section", icon: "fas fa-comment-alt", label: s(c.enquiry) || "Enquiry", show: !!enquirySection },
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
:root{--theme-color:${accent};${secondary ? `--theme-secondary:${secondary};` : ""}}
html{scroll-behavior:smooth;}
body{background:#f1f1f1;}
main{padding-bottom:78px;box-shadow:none;}
.footer{position:fixed;left:0;bottom:0;width:100%;z-index:999;}
.footer-menu{display:flex;justify-content:space-between;list-style:none;margin:0;padding:0;}
.footer-menu li{flex:1 1 0;min-width:0;}
.footer-menu-link{padding:6px 1px;}
.footer-menu-link i{font-size:15px;}
.footer-menu-link p{font-size:8px;line-height:1.1;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 1px;}
.section-header{font-size:19px;}
.speciality-list li i{color:var(--theme-color);}
#shareModal .popup-share-icons ul{list-style:none;display:flex;justify-content:center;flex-wrap:wrap;padding:0;margin:0 0 8px;}
#shareModal .popup-share-icons ul li a i{height:46px;width:46px;line-height:46px;min-width:46px;border-radius:8px;font-size:17px;margin:4px;}
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
/* Compact Share section */
.dc-share{padding-top:12px;padding-bottom:12px;}
.dc-share .section-header{margin-bottom:12px;}
.dc-share .dc-phone .cc,.dc-share .dc-phone input{height:40px;}
.dc-share .dc-btn{height:40px;font-size:14px;border-radius:10px;}
.dc-sent{color:#12a150;font-weight:600;text-align:center;padding:16px 0;}
/* Bottom login / signup bar */
.dc-bottom-bar{display:flex;background:#fdf0d5;border-top:2px solid #f3d9a0;margin-top:16px;border-radius:8px;overflow:hidden;}
.dc-bottom-bar a{flex:1;text-align:center;font-weight:700;font-size:14px;color:#14243E;text-decoration:none;padding:15px 8px;transition:background .15s;}
.dc-bottom-bar a:first-child{border-right:1px solid #e6c98a;}
.dc-bottom-bar a:hover{background:#fbe6b8;}
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
        <div class="view"><div class="view-icon"><i class="fa fa-eye"></i></div><div class="view-number"><p>${Number(c.views ?? 0).toLocaleString("en-IN")}</p></div></div>
        <div class="home-brand"><div class="home-brand-img"><img src="${esc(c.logo) || logoPlaceholder}" alt="${esc(c.name)}" ${IMG} onerror="this.onerror=null;this.src='${logoPlaceholder}'"></div></div>
        <div class="home-social"><p>Follow Us</p><ul class="social-icons">${social}</ul></div>
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
    ${googleReviewSection}
    ${servicesSection}
    ${offersSection}
    ${paymentSection}
    ${qrSection}
    ${gallerySection}
    ${videoSection}
    ${enquirySection}
    ${shareSection}
    <div class="copyright-wrapper"><p>Powered by <a href="https://digitalcarda.in" target="_blank">DigitalCarda</a></p></div>
    <div class="dc-bottom-bar">
      <a href="/login" target="_top">Customer Login</a>
      <a href="/signup${(s(c.referral_code) || slug) ? `?ref=${encodeURIComponent(s(c.referral_code) || slug)}` : ""}" target="_top">Create Your Free Card</a>
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
<div id="shareModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99998;align-items:center;justify-content:center;padding:16px">
  <div style="background:#fff;border-radius:8px;max-width:420px;width:100%;box-shadow:0 12px 45px rgba(0,0,0,.35);overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:center;position:relative;padding:15px;border-bottom:1px solid #eee">
      <h3 style="margin:0;font-size:22px;font-weight:700;color:#111">Share Profile</h3>
      <span onclick="closeShare()" style="position:absolute;right:16px;top:12px;font-size:24px;cursor:pointer;color:#333;line-height:1">&times;</span>
    </div>
    <div class="popup-share-icons" style="padding:22px 16px">
      <p style="text-align:center;margin:0 0 16px;color:#555"><em>Share my Digital Card in your network</em></p>
      <ul>
        <li><a href="https://wa.me/?text=${encodeURIComponent(cardUrl)}" target="_blank"><i class="fab fa-whatsapp"></i></a></li>
        <li><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardUrl)}" target="_blank"><i class="fab fa-facebook-f"></i></a></li>
        <li><a href="https://twitter.com/share?url=${encodeURIComponent(cardUrl)}" target="_blank"><i class="fab fa-twitter"></i></a></li>
        <li><a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(cardUrl)}" target="_blank"><i class="fab fa-linkedin-in"></i></a></li>
      </ul>
      <ul>
        <li><a href="sms:?body=${encodeURIComponent(cardUrl)}"><i class="fas fa-comment-dots"></i></a></li>
        <li><a href="https://pinterest.com/pin/create/link/?url=${encodeURIComponent(cardUrl)}" target="_blank"><i class="fab fa-pinterest-p"></i></a></li>
        <li><a href="mailto:?subject=Digital%20Card&body=${encodeURIComponent(cardUrl)}"><i class="fa fa-envelope"></i></a></li>
        <li><a href="javascript:void(0)" onclick="copyShare()"><i class="fas fa-copy"></i></a></li>
      </ul>
    </div>
  </div>
</div>
<script>
var galImgs = ${JSON.stringify(gallery.map((g) => s(g.filename)))};
var lbI = 0;
function lbShow(){ document.getElementById('lbImg').src = galImgs[lbI]; document.getElementById('lbCount').textContent = (lbI+1)+' / '+galImgs.length; }
function lbOpen(i){ lbI=i; document.getElementById('lightbox').style.display='flex'; lbShow(); }
function lbClose(){ document.getElementById('lightbox').style.display='none'; }
function lbPrev(e){ if(e&&e.stopPropagation)e.stopPropagation(); lbI=(lbI-1+galImgs.length)%galImgs.length; lbShow(); }
function lbNext(e){ if(e&&e.stopPropagation)e.stopPropagation(); lbI=(lbI+1)%galImgs.length; lbShow(); }
function playVid(el,id){ el.outerHTML='<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:6px;overflow:hidden"><iframe src="https://www.youtube.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe></div>'; }
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
    var key='dc_new_enquiries', list=[];
    try{ list=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(list))list=[]; }catch(_){ list=[]; }
    list.push(e);
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem('dc_enquiry_ping', String(d.getTime())); /* wake cross-tab listeners */
    try{ window.dispatchEvent(new CustomEvent('dc:new-enquiry',{detail:e})); }catch(_){}
    try{ if(window.parent && window.parent!==window) window.parent.dispatchEvent(new CustomEvent('dc:new-enquiry',{detail:e})); }catch(_){}
  }catch(err){}
  form.innerHTML='<p class="dc-sent">✓ Thank you! We will get back to you shortly.</p>';
  return false;
}
function openShare(){ document.getElementById('shareModal').style.display='flex'; }
function closeShare(){ document.getElementById('shareModal').style.display='none'; }
function copyShare(){ var u='${cardUrl}'; if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){alert('Link copied');});}else{alert(u);} }
document.getElementById('shareModal').addEventListener('click', function(e){ if(e.target.id==='shareModal') closeShare(); });
function saveVCard(){
  var v = "${vcard}";
  var b = new Blob([v], {type:'text/vcard'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '${slug || "card"}.vcf'; a.click();
}
</script>
</body></html>`;
}

/* Renders only the FIRST PAGE (home section) of a card with a given template —
   used for the template picker thumbnails. No scripts, no other sections. */
export function buildCardThumb(c: CustomerRecord, themeNum: number): string {
  const accent = s(c.color) || "#F7B31C";
  const secondary = s(c.color2);
  const theme = Math.min(TEMPLATE_COUNT, Math.max(1, Number(themeNum) || 1));
  const wa = s(c.mobile2 || c.mobile1).replace(/[^\d+]/g, "");
  const initial = (s(c.name)[0] || "D").toUpperCase();
  const logoPlaceholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><rect width='140' height='140' rx='12' fill='${accent}'/><text x='50%' y='50%' font-size='64' fill='#fff' text-anchor='middle' font-family='Arial,sans-serif' dominant-baseline='central'>${initial}</text></svg>`)}`;
  const social = Object.keys(SOCIAL_FA).filter((k) => s(c[k]))
    .map((k) => `<li><a href="javascript:void(0)"><i class="${SOCIAL_FA[k]}"></i></a></li>`).join("")
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
:root{--theme-color:${accent};${secondary ? `--theme-secondary:${secondary};` : ""}}
html,body{margin:0;background:#fff;overflow:hidden;}
main{box-shadow:none;padding:0;}
#home-card-share,.view,.footer{display:none !important;}
</style></head>
<body data-theme="${theme}">
<main><div class="page-wrapper"><section id="home-section">
  <div class="home-section-content">
    <div class="home-brand"><div class="home-brand-img"><img src="${esc(c.logo) || logoPlaceholder}" ${IMG} onerror="this.onerror=null;this.src='${logoPlaceholder}'"></div></div>
    <div class="home-social"><p>Follow Us</p><ul class="social-icons">${social}</ul></div>
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
