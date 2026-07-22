import { useCallback, useEffect, useState } from "react";

export type CustomerRecord = Record<string, unknown> & {
  id: number; name: string; username: string; slug: string; email: string;
  package_id: number; views: number;
};

/* Fictional demo business — placeholder data for the demo account.
   Not a real person or company; safe to show and edit. */
export const DEFAULT_CUSTOMER: CustomerRecord = {
  id: 8, name: "Aarav Sharma", username: "acme-digital", slug: "acme-digital",
  designation: "Founder & CEO", company_name: "Acme Digital", gst: "", logo: "",
  mobile1: "+91 98765 43210", mobile2: "919876543210", email: "hello@acmedigital.example",
  url: "https://acmedigital.example", address: "MG Road, Bengaluru, Karnataka 560001",
  establishment: "2020", nature: "Digital Marketing Agency", about_us: "",
  specialties_title: "Our Specialties", specialities: "",
  bank_name: "", ifsc: "", account_holder: "", account_number: "", account_type: "current",
  paytm_number: "", phone_pe: "", google_pay: "", upi: "",
  facebook: "", twitter: "", instagram: "", youtube: "", pinterest: "", linkedin: "",
  google_map: "https://maps.google.com/", google_review: "", social_title: "Follow Us",
  password: "", activated_on: "2026-07-20", expired_on: "2029-07-19",
  package_id: 6, views: 1284,
};

/* Per-package content limits (from the `package` table) */
export const PACKAGE_LIMITS: Record<number, Record<string, number>> = {
  5: { product: 15, offer: 5, gallery: 10, video: 5, uploads: 2, qrcode: 5 },   // Starter
  6: { product: 20, offer: 10, gallery: 15, video: 10, uploads: 5, qrcode: 5 }, // Standard
  7: { product: 5, offer: 2, gallery: 5, video: 2, uploads: 1, qrcode: 5 },     // Trial
};
export function packageLimit(packageId: number | undefined, key: string): number {
  const p = PACKAGE_LIMITS[Number(packageId)] || PACKAGE_LIMITS[7];
  return p[key] ?? 5;
}

/* ── Per-user scoping ──────────────────────────────────────────────
   Card data lives in localStorage. It must belong to the logged-in
   user, not a single shared blob — otherwise every account sees (and
   overwrites) the same card. We namespace every key by the auth user's
   id, and seed a brand-new real user from their own account details.
   The demo/showcase account (and logged-out visitors) keep the
   fictional Aarav Sharma sample so the demo still looks complete. */

type AuthUserLite = { id: number; email: string; fullName: string; role: string };
const SHOWCASE_EMAIL = "demo@digitalcarda.com";

export function getAuthUser(): AuthUserLite | null {
  try {
    const raw = localStorage.getItem("digitalcarda_user");
    return raw ? (JSON.parse(raw) as AuthUserLite) : null;
  } catch { return null; }
}

function isShowcase(u: AuthUserLite | null): boolean {
  return !u || u.email?.toLowerCase() === SHOWCASE_EMAIL;
}

/** Namespace a base localStorage key to the current logged-in user. */
export function scopedKey(base: string): string {
  const u = getAuthUser();
  return u ? `${base}__u${u.id}` : base;
}

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Build a fresh card record from a real user's account details (blank business fields). */
function seedFromAuth(u: AuthUserLite): CustomerRecord {
  const handle =
    (u.email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  return {
    ...DEFAULT_CUSTOMER,
    id: u.id,
    name: u.fullName || handle,
    username: handle,
    slug: handle,
    email: u.email,
    // clear the fictional showcase business details
    designation: "", company_name: "", gst: "", logo: "",
    mobile1: "", mobile2: "", url: "", address: "",
    establishment: "", nature: "", about_us: "", specialities: "",
    bank_name: "", ifsc: "", account_holder: "", account_number: "",
    paytm_number: "", phone_pe: "", google_pay: "", upi: "",
    facebook: "", twitter: "", instagram: "", youtube: "", pinterest: "", linkedin: "",
    google_review: "",
    activated_on: today(), expired_on: plusDays(7), package_id: 7, views: 0,
  };
}

/** Read the current user's card record synchronously (scoped + seeded). */
export function readCustomer(): CustomerRecord {
  const u = getAuthUser();
  try {
    const raw = localStorage.getItem(scopedKey("dc_customer"));
    if (raw) return { ...DEFAULT_CUSTOMER, ...JSON.parse(raw) };
  } catch { /* fall through to seed */ }
  return u && !isShowcase(u) ? seedFromAuth(u) : DEFAULT_CUSTOMER;
}

export function useCustomer() {
  const [data, setData] = useState<CustomerRecord>(DEFAULT_CUSTOMER);

  useEffect(() => {
    const u = getAuthUser();
    const key = scopedKey("dc_customer");
    try {
      const raw = localStorage.getItem(key);
      if (raw) { setData({ ...DEFAULT_CUSTOMER, ...JSON.parse(raw) }); return; }
    } catch { /* seed below */ }
    // First visit for this user → seed from their own account (or the showcase sample).
    const seed = u && !isShowcase(u) ? seedFromAuth(u) : DEFAULT_CUSTOMER;
    setData(seed);
    try { localStorage.setItem(key, JSON.stringify(seed)); } catch { /* ignore */ }
  }, []);

  const update = useCallback((patch: Partial<CustomerRecord>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { data, update };
}

/* Generic localStorage-backed collection (products, gallery, videos, uploads…).
   When the key is absent, `asyncSeed` (if given) loads the real content once and persists it. */
export function useLocalList<T extends { id: number }>(baseKey: string, seed: T[] = [], asyncSeed?: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);
  // Namespace the list to the logged-in user so accounts don't share content.
  const key = scopedKey(baseKey);

  useEffect(() => {
    let cancelled = false;
    const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const raw = read(key);
    let parsed: T[] | null = null;
    try { parsed = raw ? (JSON.parse(raw) as T[]) : null; } catch { parsed = null; }
    const seededMark = key + "::seeded";
    const alreadySeeded = read(seededMark) === "1";
    const isEmpty = !parsed || (Array.isArray(parsed) && parsed.length === 0);

    // Only seed the sample content for the showcase/demo account (and logged-out visitors).
    // Real users start with an empty list — they add their own content.
    if (asyncSeed && isEmpty && !alreadySeeded && isShowcase(getAuthUser())) {
      asyncSeed()
        .then((arr) => {
          if (cancelled) return;
          setItems(arr);
          try { localStorage.setItem(key, JSON.stringify(arr)); localStorage.setItem(seededMark, "1"); } catch { /* ignore */ }
        })
        .catch(() => { /* leave empty */ })
        .finally(() => { if (!cancelled) setReady(true); });
      return () => { cancelled = true; };
    }
    if (parsed) setItems(parsed);
    else setItems([]);
    setReady(true);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = useCallback((next: T[]) => {
    setItems(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);

  const add = useCallback((item: Omit<T, "id">) => {
    setItems((cur) => {
      const id = Math.max(0, ...cur.map((i) => i.id)) + 1;
      const next = [...cur, { ...item, id } as T];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  const update = useCallback((id: number, patch: Partial<T>) => {
    setItems((cur) => {
      const next = cur.map((i) => (i.id === id ? { ...i, ...patch } : i));
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  const remove = useCallback((id: number) => {
    setItems((cur) => {
      const next = cur.filter((i) => i.id !== id);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  return { items, ready, add, update, remove, persist };
}

/* Read a data URL from a file input (for demo image uploads, no backend) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
