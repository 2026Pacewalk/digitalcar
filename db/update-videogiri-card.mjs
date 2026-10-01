/*
 * One-off: refresh the VideoGiri card (/videogiri) from the details published on
 * videogiri.com — contact, address, services with prices, hours and social links.
 *
 * Safe by design:
 *   • Writes ONLY the published_cards row for slug "videogiri".
 *   • Backs the current row up to db/backups/videogiri-<timestamp>.json first.
 *   • Never deletes anything, never touches another card, user or table.
 *   • Merges: fields it doesn't know about are kept exactly as they are.
 *
 * Run against the database in .env (local), or on the VPS for the live card:
 *   node db/update-videogiri-card.mjs            # apply
 *   node db/update-videogiri-card.mjs --dry-run  # show what would change
 */
import mysql from "mysql2/promise";
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";

const SLUG = "videogiri";
const DRY = process.argv.includes("--dry-run");

/* ── The content, taken from videogiri.com (Oct 2026) ───────────────────── */
const PHONE = "+91 87388 00007";
/* Brand assets, served from VideoGiri's own CDN (the business owns both sites). */
const CDN = "https://videogiri.com/cdn/shop";
const LOGO = `${CDN}/files/videogiri_1_logo.png`;
/* Brand colours picked off videogiri.com: the pink its links and buttons use,
   with a deep plum behind it. */
const BRAND_PINK = "#E02C50";
const BRAND_DEEP = "#4A0D21";

const CUSTOMER = {
  // The card speaks as the BRAND, not as one employee.
  name: "VideoGiri",
  designation: "Digital Invitations & Video Animation",
  company_name: "VideoGiri",
  logo: LOGO,
  color: BRAND_PINK,
  color2: BRAND_DEEP,
  nature: "Video Animation",
  mobile1: PHONE,
  mobile2: PHONE,                              // WhatsApp — same number on the site
  email: "hello@videogiri.com",
  url: "https://videogiri.com",
  address: "SCO-209, Green Lotus Avenue, Zirakpur, Punjab 140603",
  google_map: "https://maps.google.com/?q=SCO-209+Green+Lotus+Avenue+Zirakpur+Punjab+140603",
  about_us:
    "VideoGiri, powered by PACEWALK, makes digital invitation videos and business animations. " +
    "Wedding, engagement, haldi, mehndi, birthday, baby shower, house warming and puja invites — " +
    "personalised with your names, photos and the song you choose. For businesses we make explainer " +
    "videos, logo animations, motion graphics, whiteboard animation and documentary films. " +
    "eCards are ready in 24 working hours, video and caricature invites in 48, with the first revision free.",
  specialties_title: "What we make",
  specialities:
    "Wedding invitation videos, Caricature invitations, Birthday & baby invites, Puja & house warming invites, " +
    "Business explainer videos, Logo animation, Motion graphics, Welcome sign boards",
  // Open hours stated on the site
  establishment: "2014",
  tagline: "Powered by PACEWALK · Mon–Sat 10 AM – 6:30 PM",
  facebook: "https://www.facebook.com/videogiri.in/",
  instagram: "https://www.instagram.com/videogiri.in",
  pinterest: "https://in.pinterest.com/videogiri/",
  // Sections to switch on
  about_on: 1, product_on: 1, enquiry_on: 1, offer_on: 1, qrcode_on: 1, cardqr_on: 1,
  gallery_on: 1,
};

/* Services with the prices and artwork shown on videogiri.com. */
const PRODUCTS = [
  { name: "Wedding Invitation Video", description: "Traditional or modern themes with your names, date, venue, photos and song. Ready in 48 working hours.", price: "2499", offer_price: "1799", button_title: "WhatsApp", filename: `${CDN}/files/Wedding_Invitation_928759a9-dee6-43bf-97cd-d215a323a495.jpg` },
  { name: "Caricature Wedding Invite", description: "Hand-drawn caricatures of the couple and family, animated into your invitation film.", price: "3999", offer_price: "2499", button_title: "WhatsApp", filename: `${CDN}/files/Caricature_Nikkah_Invitation_Video_8.jpg` },
  { name: "Save the Date eCard", description: "A quick announcement card for WhatsApp and Instagram. Ready in 24 working hours.", price: "1199", offer_price: "999", button_title: "WhatsApp", filename: `${CDN}/files/10-Days-To-Go-Wedding-Invitation-Video.webp` },
  { name: "Haldi, Mehndi & Sangeet Invites", description: "Bright, function-wise invitations for every ceremony in the wedding week.", price: "1999", offer_price: "999", button_title: "WhatsApp", filename: `${CDN}/files/Haldi-Ceremony-Invitation-Video.webp` },
  { name: "Birthday & Baby Invitations", description: "Birthday parties, baby showers, naming and cradle ceremonies, in any theme.", price: "1499", offer_price: "", button_title: "WhatsApp", filename: `${CDN}/files/birthday_invitation_maker_videogiri.jpg` },
  { name: "Puja & House Warming Invites", description: "Akhand Path, Mata Ki Chowki, Sunderkand, Satyanarayan Katha and griha pravesh invitations.", price: "1499", offer_price: "", button_title: "WhatsApp", filename: `${CDN}/collections/PRINCESS_e9baaf37-db1d-47f1-aa9b-42e663cb7d98.webp` },
  { name: "Business Explainer Video", description: "Explain your product or service in 60–90 seconds, with script, voiceover and animation.", price: "", offer_price: "", button_title: "Get Quote", filename: `${CDN}/files/digital_invitation_maker_videogiri.jpg` },
  { name: "Logo Animation & Motion Graphics", description: "An animated logo sting and social media motion graphics for your brand.", price: "", offer_price: "", button_title: "Get Quote", filename: `${CDN}/files/Modern_Caricature_Video_Invitation_1.jpg` },
];

/* Gallery — a few invitation stills from the site. */
const GALLERY = [
  `${CDN}/files/Indian-WhatsApp-Wedding-Video-Invitation.webp`,
  `${CDN}/files/Caricature-Wedding-Function-Invitation-Video-scaled.webp`,
  `${CDN}/files/Affordable-Wedding-Invitation-Video-1.webp`,
  `${CDN}/files/wedding-caricature-card-design.webp`,
];

const OFFERS = [
  {
    title: "Up to 40% off on wedding caricatures",
    description: "Running now on caricature wedding and multifunction invitation videos. Share your date on WhatsApp for the current price.",
  },
];

/* ── Apply ──────────────────────────────────────────────────────────────── */
const url = process.env.DATABASE_URL;
if (!url) { console.error("✗ No DATABASE_URL"); process.exit(1); }
const conn = await mysql.createConnection(url);

const [rows] = await conn.query("SELECT id, user_id, card_id, data FROM published_cards WHERE slug = ? LIMIT 1", [SLUG]);
if (!rows.length) {
  console.error(`✗ No published card for "${SLUG}" in this database. Run this where that card lives (the live server).`);
  await conn.end();
  process.exit(1);
}
const row = rows[0];
const snap = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
const before = JSON.stringify(snap);

// Back up the current snapshot before touching it.
await mkdir("db/backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await writeFile(`db/backups/${SLUG}-${stamp}.json`, before);

// Merge — anything not listed above keeps its current value.
snap.customer = { ...(snap.customer || {}), ...CUSTOMER };
snap.products = PRODUCTS.map((p, i) => ({
  ...(snap.products?.[i] || {}),
  id: snap.products?.[i]?.id ?? i + 1,
  name: p.name, description: p.description,
  price: p.price, offer_price: p.offer_price,
  button: "", button_title: p.button_title,
  filename: p.filename || snap.products?.[i]?.filename || "",
}));
snap.gallery = GALLERY.map((f, i) => ({
  ...(snap.gallery?.[i] || {}),
  id: snap.gallery?.[i]?.id ?? i + 1,
  name: `VideoGiri invitation ${i + 1}`,
  filename: f,
}));
snap.offers = OFFERS.map((o, i) => ({
  ...(snap.offers?.[i] || {}),
  id: snap.offers?.[i]?.id ?? i + 1,
  title: o.title, description: o.description,
  valid: snap.offers?.[i]?.valid || new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10),
  filename: snap.offers?.[i]?.filename || "",
}));

const after = JSON.stringify(snap);
console.log(`• ${SLUG}: ${before.length} → ${after.length} bytes, ${snap.products.length} services, ${snap.gallery.length} gallery, ${snap.offers.length} offer`);
console.log(`• backup: db/backups/${SLUG}-${stamp}.json`);

if (DRY) {
  console.log("• dry run — nothing written");
} else {
  await conn.query("UPDATE published_cards SET data = ?, updated_at = NOW() WHERE id = ?", [after, row.id]);
  console.log("✓ card updated");
}
await conn.end();
