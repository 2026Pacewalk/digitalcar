import { useEffect, useState } from "react";
import { getAuthUser, scopedKey } from "./useCustomer";
import { loadMyLegacyProfile, loadMySnapshot, loadCustomerContent, imgUrl, decodeSpecialities } from "@/lib/cardContent";

const s = (v: unknown) => String(v ?? "");

/* Map a raw legacy customers.json row → the dashboard's CustomerRecord shape. */
function mapProfile(row: Record<string, unknown>, u: { id: number; fullName: string; email: string }) {
  return {
    id: u.id,
    name: s(row.name) || u.fullName || "",
    username: s(row.username) || s(row.slug),
    slug: s(row.slug).toLowerCase(),
    email: s(row.email) || u.email,
    designation: s(row.designation),
    company_name: s(row.company_name),
    gst: s(row.gst),
    logo: imgUrl("home", row.logo),
    mobile1: s(row.mobile1),
    mobile2: s(row.mobile2) || s(row.mobile1),
    url: s(row.url),
    address: s(row.address),
    establishment: s(row.establishment),
    nature: s(row.nature),
    about_us: s(row.about_us) || s(row.about),
    specialities: decodeSpecialities(row.specialities),
    specialties_title: s(row.specialties_title) || "Our Specialties",
    bank_name: s(row.bank_name),
    ifsc: s(row.ifsc),
    account_holder: s(row.account_holder),
    account_number: s(row.account_number),
    account_type: s(row.account_type) || "current",
    paytm_number: s(row.paytm_number),
    phone_pe: s(row.phone_pe),
    google_pay: s(row.google_pay),
    upi: s(row.upi),
    facebook: s(row.facebook), twitter: s(row.twitter), instagram: s(row.instagram),
    youtube: s(row.youtube), pinterest: s(row.pinterest), linkedin: s(row.linkedin),
    google_map: s(row.google_map),
    google_review: s(row.google_review),
    social_title: s(row.social_title) || "Follow Us",
    activated_on: s(row.activated_on),
    expired_on: s(row.expired_on) || null,
    package_id: Number(row.package_id) || 7,
    views: Number(row.views) || 0,
    email_verify: Number(row.email_verify) || 0,
    // Legacy "live" flag — a status:1 card is already public, so the auto-publish
    // listener may keep its snapshot in sync with dashboard edits.
    status: Number(row.status) || 0,
    // Appearance + section visibility, so a published snapshot renders identically
    // to the legacy card (theme, colour, which sections show, their titles).
    theme: s(row.theme) || "1",
    color: s(row.color) || "#F7B31C",
    video_layout: s(row.video_layout),
    about_on: Number(row.about_on ?? 1), product_on: Number(row.product_on ?? 1),
    payment_on: Number(row.payment_on ?? 1), gallery_on: Number(row.gallery_on ?? 1),
    video_on: Number(row.video_on ?? 1), qrcode_on: Number(row.qrcode_on ?? 1),
    offer_on: Number(row.offer_on ?? 0), uploads_on: Number(row.uploads_on ?? 0),
    enquiry_on: Number(row.enquiry_on ?? 1), feedback_on: Number(row.feedback_on ?? 0),
    review_on: Number(row.review_on ?? 1), cardqr_on: Number(row.cardqr_on ?? 1),
    about: s(row.about), product: s(row.product), payment: s(row.payment),
    gallery: s(row.gallery), video: s(row.video), qrcode: s(row.qrcode),
    offer: s(row.offer), uploads: s(row.uploads), enquiry: s(row.enquiry),
    review: s(row.review), cardqr: s(row.cardqr),
  };
}

/* One-time hydration of the dashboard from the user's REAL legacy card.
   The dashboard is a per-browser localStorage editor; a returning customer on a
   clean browser has no local card, so without this it seeds a blank one. This
   loads their real profile + content (products, gallery, videos, offers, QR,
   uploads, payment) once and writes it into the scoped localStorage keys the
   module pages read. Read-only against the backend; runs once per user. */
export function useCardHydration(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getAuthUser();
    // Only real customers hydrate from a legacy card (admins/resellers skip).
    if (!u || u.role !== "customer") { setReady(true); return; }
    const marker = scopedKey("dc_hydrated");
    if (localStorage.getItem(marker) === "1") { setReady(true); return; }
    // Never clobber a card that already exists locally — e.g. one the signup just
    // seeded with the chosen design, or one the user has been editing this
    // session. Hydration is only for a genuinely EMPTY browser (a returning user
    // on a fresh device). Without this, the snapshot/legacy load overwrote the
    // signup's theme (customer picked Coral → card opened on the default).
    try {
      const cur = JSON.parse(localStorage.getItem(scopedKey("dc_customer")) || "null") as { name?: string; slug?: string; theme?: unknown } | null;
      if (cur && (String(cur.name || "").trim() || String(cur.slug || "").trim() || cur.theme !== undefined)) {
        localStorage.setItem(marker, "1"); setReady(true); return;
      }
    } catch { /* fall through to hydrate */ }

    let cancelled = false;
    let hydrated = false;
    (async () => {
      const put = (base: string, arr: unknown[]) => {
        localStorage.setItem(scopedKey(base), JSON.stringify(arr || []));
        localStorage.setItem(scopedKey(base) + "::seeded", "1");
      };
      try {
        const row = await loadMyLegacyProfile();
        if (row && !cancelled) {
          const slug = s(row.slug).toLowerCase();
          localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(mapProfile(row, u)));

          if (slug) {
            const content = await loadCustomerContent(slug);
            put("dc_products", content.products);
            put("dc_offers", content.offers);
            put("dc_gallery", content.gallery);
            put("dc_videos", content.videos);
            put("dc_qrcode", content.qrcodes);
            put("dc_uploads", content.uploads);
            // Legacy keeps a single UPI + bank account on the profile itself.
            put("dc_upi", row.upi ? [{ id: 1, label: "UPI", upi: s(row.upi) }] : []);
            put("dc_banks", (row.bank_name || row.account_number)
              ? [{ id: 1, holder: s(row.account_holder), bank: s(row.bank_name), account: s(row.account_number), ifsc: s(row.ifsc), type: s(row.account_type) || "current" }]
              : []);
          }
        } else if (!cancelled) {
          // NEW-FLOW user (not in customers.json): hydrate from their published
          // snapshot so the full mini-website loads on any device — not just the
          // browser it was built in. This fixes "I only see links, where's my
          // products/gallery/about" for server-backed cards.
          const snap = await loadMySnapshot();
          const d = snap?.data as Record<string, unknown> | undefined;
          if (d && d.customer && !cancelled) {
            const cust = { ...(d.customer as Record<string, unknown>), id: u.id, email: (d.customer as Record<string, unknown>).email || u.email, slug: s(snap?.slug) };
            localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(cust));
            put("dc_products", (d.products as unknown[]) || []);
            put("dc_gallery", (d.gallery as unknown[]) || []);
            put("dc_videos", (d.videos as unknown[]) || []);
            put("dc_offers", (d.offers as unknown[]) || []);
            put("dc_qrcode", (d.qrcodes as unknown[]) || []);
          }
        }
        hydrated = true; // reached the end without throwing
      } catch { /* leave whatever's there — never block the dashboard on this */ }
      finally {
        if (!cancelled) {
          // Only claim "hydrated" when it actually SUCCEEDED. This marker is what
          // releases auto-publish (see useAutoPublish), so setting it after a
          // failed load was a data-loss path: open the dashboard on a new device,
          // have the snapshot fetch fail, and auto-publish would then overwrite
          // the live card with the empty local one. On failure we leave the marker
          // unset, which keeps auto-publish disabled for this session — the
          // dashboard still works, it just won't republish from a bad state.
          try { if (hydrated) localStorage.setItem(marker, "1"); } catch { /* ignore */ }
          setReady(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return ready;
}
