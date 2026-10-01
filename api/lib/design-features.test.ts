/* Build each new design with a card that has EVERY feature switched on, and
   check the rendered HTML actually contains each one. */
import { expect, test } from "vitest";
import { buildCardHtml } from "@/card-template/buildCard";

const customer = {
  slug: "feature-test", name: "Aarav Mehta", company_name: "Nayara Interiors",
  designation: "Founder & Principal Designer", tagline: "Interiors that feel like home",
  mobile1: "+91 90000 00011", mobile2: "+91 90000 00011", email: "hello@example.com",
  url: "https://example.com", address: "MG Road, Bengaluru 560001",
  google_map: "https://maps.google.com/?q=MG+Road", logo: "/brands/varnika-group.svg",
  photo: "/demo/interior/svc-1.webp",
  about_us: "We design homes and offices across South India.", specialities: "Home interiors, Modular kitchens, Office design, 3D views",
  specialties_title: "What we do",
  about_on: 1, product_on: 1, gallery_on: 1, video_on: 1, offer_on: 1, payment_on: 1,
  review_on: 1, enquiry_on: 1, cardqr_on: 1, share_on: 1, qrcode_on: 1, views_on: 1, feedback_on: 1,
  upi: "nayara@examplebank", google_pay: "nayara@examplebank", phone_pe: "nayara@examplebank",
  account_number: "000111222333", bank_name: "Example Bank", ifsc: "EXMP0000123",
  google_review: "https://g.page/r/example/review", google_rating: "4.8", google_review_count: "212",
  instagram: "https://instagram.com", facebook: "https://facebook.com", linkedin: "https://linkedin.com",
  views: 1284, referral_code: "AARAV",
};
const products = [
  { id: 1, name: "Full home interiors", description: "Turnkey design and execution for 2BHK and 3BHK homes.", price: "450000", offer_price: "399000", filename: "/demo/interior/svc-2.webp", button: "https://example.com/book", button_title: "Get Quote" },
  { id: 2, name: "Modular kitchen", description: "Hardware, counters and finishes chosen with you.", price: "180000", offer_price: "", filename: "", button: "", button_title: "" },
];
const gallery = [{ id: 1, name: "Living room", filename: "/demo/interior/gal-1.webp" }, { id: 2, name: "Kitchen", filename: "/demo/interior/gal-2.webp" }];
const videos = [{ id: 1, title: "Studio tour", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }];
const offers = [{ id: 1, title: "Free 3D design", description: "On projects booked this month.", valid: "2026-12-31", filename: "" }];
const reviews = [{ id: 1, name: "Priya", rating: 5, text: "Beautiful work, on time." }];

const CHECKS: [string, (h: string) => boolean][] = [
  ["contacts", (h) => h.includes("tel:") && h.includes("wa.me/")],
  ["save contact (vCard)", (h) => h.includes("BEGIN%3AVCARD") || h.includes("text/vcard")],
  ["share sheet", (h) => h.includes("pwShare(")],
  ["QR", (h) => h.includes("create-qr-code")],
  ["about", (h) => h.includes("about-section")],
  ["services + price", (h) => h.includes("products-section") && h.includes("Full home interiors") && /399000|3,99,000|399,000/.test(h)],
  ["service photo", (h) => h.includes("/demo/interior/svc-2.webp")],
  ["offers", (h) => h.includes("offers-section")],
  ["gallery", (h) => h.includes("gallery-section") && h.includes("gal-1.webp")],
  ["videos", (h) => h.includes("video-section")],
  ["payments/UPI", (h) => h.includes("payment-section") && h.includes("nayara@examplebank")],
  ["reviews", (h) => h.includes("review-section")],
  ["enquiry form", (h) => h.includes("enquiry-section") && h.includes("<form")],
  ["socials", (h) => h.includes("instagram.com")],
  ["view counter", (h) => h.includes("pw-view-count")],
  ["logo", (h) => h.includes("varnika-group.svg")],
];

/* Every one of the ten new designs must render every feature. */
for (let style = 53; style <= 72; style++) {
  test(`design ${style} renders every feature`, () => {
    const html = buildCardHtml({ ...customer, theme: style, color: "#6366F1", color2: "#1E1B4B" } as never, products as never, gallery as never, videos as never, offers as never, [], reviews as never);
    const missing = (CHECKS as [string, (h: string) => boolean][]).filter(([, fn]) => !fn(html)).map(([n]) => n);
    expect(missing, `style ${style} missing: ${missing.join(", ")}`).toEqual([]);
  });
}
