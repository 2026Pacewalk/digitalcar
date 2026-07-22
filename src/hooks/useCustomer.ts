import { useCallback, useEffect, useState } from "react";

export type CustomerRecord = Record<string, unknown> & {
  id: number; name: string; username: string; slug: string; email: string;
  package_id: number; views: number;
};

export const DEFAULT_CUSTOMER: CustomerRecord = {
  id: 8, name: "Shekhar Jain", username: "pacewalk", slug: "pacewalk",
  designation: "Director", company_name: "PACEWALK", gst: "", logo: "",
  mobile1: "+919988144844", mobile2: "919988144844", email: "md@pacewalk.com",
  url: "https://pacewalk.com", address: "SCO-209, Green Lotus Avenue, Zirakpur, Punjab",
  establishment: "2014", nature: "Digital Marketing Agency", about_us: "",
  specialties_title: "Our Specialties", specialities: "",
  bank_name: "", ifsc: "", account_holder: "", account_number: "", account_type: "current",
  paytm_number: "", phone_pe: "", google_pay: "", upi: "",
  facebook: "", twitter: "", instagram: "", youtube: "", pinterest: "", linkedin: "",
  google_map: "https://g.page/pacewalk?share", google_review: "", social_title: "Follow Us",
  password: "Admin@786", activated_on: "2026-07-20", expired_on: "2029-07-19",
  package_id: 6, views: 5627,
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

export function useCustomer() {
  const [data, setData] = useState<CustomerRecord>(DEFAULT_CUSTOMER);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dc_customer");
      if (raw) setData({ ...DEFAULT_CUSTOMER, ...JSON.parse(raw) });
    } catch { /* keep default */ }
  }, []);

  const update = useCallback((patch: Partial<CustomerRecord>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("dc_customer", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { data, update };
}

/* Generic localStorage-backed collection (products, gallery, videos, uploads…).
   When the key is absent, `asyncSeed` (if given) loads the real content once and persists it. */
export function useLocalList<T extends { id: number }>(key: string, seed: T[] = [], asyncSeed?: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const raw = read(key);
    let parsed: T[] | null = null;
    try { parsed = raw ? (JSON.parse(raw) as T[]) : null; } catch { parsed = null; }
    const seededMark = key + "::seeded";
    const alreadySeeded = read(seededMark) === "1";
    const isEmpty = !parsed || (Array.isArray(parsed) && parsed.length === 0);

    // Seed real content once when the list is missing/empty and hasn't been seeded before.
    if (asyncSeed && isEmpty && !alreadySeeded) {
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
