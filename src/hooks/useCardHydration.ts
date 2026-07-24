import { useEffect, useState } from "react";
import { getAuthUser, scopedKey } from "./useCustomer";
import { loadMyLegacyProfile, loadCustomerContent, imgUrl, decodeSpecialities } from "@/lib/cardContent";

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

    let cancelled = false;
    (async () => {
      try {
        const row = await loadMyLegacyProfile();
        if (row && !cancelled) {
          const slug = s(row.slug).toLowerCase();
          localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(mapProfile(row, u)));

          if (slug) {
            const content = await loadCustomerContent(slug);
            const put = (base: string, arr: unknown[]) => {
              localStorage.setItem(scopedKey(base), JSON.stringify(arr));
              localStorage.setItem(scopedKey(base) + "::seeded", "1");
            };
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
        }
      } catch { /* leave whatever's there — never block the dashboard on this */ }
      finally {
        if (!cancelled) { try { localStorage.setItem(marker, "1"); } catch { /* ignore */ } setReady(true); }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return ready;
}
