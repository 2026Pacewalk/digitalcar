import { useCallback, useEffect, useState } from "react";
import { healUploadUrl } from "@/lib/img";

/* Re-point stored image URLs (baked with a possibly-stale host at hydration
   time) to the current image base, so dashboard tiles never break when the
   base changes. See healUploadUrl. Applied when reading stored data back. */
function healItemImgs<T>(arr: T[]): T[] {
  return arr.map((it) =>
    it && typeof (it as { filename?: unknown }).filename === "string"
      ? { ...it, filename: healUploadUrl((it as { filename?: unknown }).filename) }
      : it,
  );
}
function healCustomerImgs<T extends Record<string, unknown>>(rec: T): T {
  return typeof rec.logo === "string" ? { ...rec, logo: healUploadUrl(rec.logo) } : rec;
}

/* Fire a debounce-able signal whenever the owner edits card content, so an
   auto-publish listener can re-snapshot a live card to its public page.
   (Bulk hydration writes localStorage directly and does NOT call this, so
   loading a card never triggers a publish — only real edits do.) */
export function signalContentChanged(): void {
  try { window.dispatchEvent(new CustomEvent("dc:content-changed")); } catch { /* SSR / no window */ }
}

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

/* Per-plan content limits — the single source of truth for what each plan
   unlocks, matching the public pricing page (Trial gets full Gold features;
   Platinum lifts the caps and allows 3 cards). Keyed by the stored package_id:
   7 = Trial · 5 = Gold · 6 = Platinum. `cards` = how many digital cards the
   login may hold (the multi-card limit). */
export const PACKAGE_LIMITS: Record<number, Record<string, number>> = {
  7: { product: 25, offer: 15, gallery: 20, video: 8, uploads: 5, qrcode: 5, cards: 1 },      // Trial (full Gold features)
  5: { product: 25, offer: 15, gallery: 20, video: 8, uploads: 5, qrcode: 5, cards: 1 },      // Gold
  6: { product: 999, offer: 999, gallery: 60, video: 25, uploads: 20, qrcode: 10, cards: 3 }, // Platinum
};
export function packageLimit(packageId: number | undefined, key: string): number {
  const p = PACKAGE_LIMITS[Number(packageId)] || PACKAGE_LIMITS[7];
  return p[key] ?? (key === "cards" ? 1 : 5);
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

/* ── Multi-card (Approach A) ────────────────────────────────────────
   One login can hold several template cards (plan-gated). Content is
   namespaced by user AND by the ACTIVE card. The first/primary card
   (id 1) keeps the original un-suffixed keys, so every existing
   single-card user's data is preserved untouched; extra cards get a
   `__c{id}` suffix. The registry + active pointer are user-scoped
   (shared across all of that user's cards). */
export type CardMeta = { id: number; name: string; slug: string };
const PRIMARY_CARD_ID = 1;

/** A key shared across all of a user's cards (registry, active pointer). */
function userKey(base: string): string {
  const u = getAuthUser();
  return u ? `${base}__u${u.id}` : base;
}

/** Which card is currently being edited (defaults to the primary card). */
export function getActiveCardId(): number {
  try { const v = Number(localStorage.getItem(userKey("dc_active_card"))); return v > 0 ? v : PRIMARY_CARD_ID; }
  catch { return PRIMARY_CARD_ID; }
}
export function setActiveCardId(id: number): void {
  try { localStorage.setItem(userKey("dc_active_card"), String(id)); } catch { /* ignore */ }
}

/** The account's plan (package_id). Always read from the PRIMARY card's record,
    because the plan is account-level even when a non-primary card is active
    (a non-primary card's package_id is frozen at creation and can go stale). */
export function accountPackageId(): number {
  const u = getAuthUser();
  if (!u) return 7;
  try {
    const raw = localStorage.getItem(`dc_customer__u${u.id}`);
    if (raw) return Number((JSON.parse(raw) as { package_id?: number }).package_id) || 7;
  } catch { /* ignore */ }
  return 7;
}

/** Namespace a base localStorage key to the current user + active card.
    Primary card (id 1) → legacy `base__u{id}` keys (no data migration). */
export function scopedKey(base: string): string {
  const u = getAuthUser();
  // No signed-in user → an isolated anonymous namespace, NEVER the bare `base`.
  // The un-suffixed `dc_customer`/`dc_products`/… keys are legacy data (a card an
  // earlier browser owner published); reading them would leak that card into
  // another session (the "shekhar sir's link for a different user" bug). Keeping
  // them out of every real code path makes that impossible for present + future.
  if (!u) return `${base}__anon`;
  const k = `${base}__u${u.id}`;
  const cardId = getActiveCardId();
  return cardId > PRIMARY_CARD_ID ? `${k}__c${cardId}` : k;
}

/** The user's card registry. Seeds a primary entry from their existing card
    (its keys already exist) the first time it's read. */
export function getCards(): CardMeta[] {
  try {
    const raw = localStorage.getItem(userKey("dc_cards"));
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr as CardMeta[]; }
  } catch { /* seed below */ }
  const c = readCustomer();
  const primary: CardMeta = { id: PRIMARY_CARD_ID, name: String(c.company_name || c.name || "My Card"), slug: String(c.slug || "card") };
  try { localStorage.setItem(userKey("dc_cards"), JSON.stringify([primary])); } catch { /* ignore */ }
  return [primary];
}
function saveCards(cards: CardMeta[]): void {
  try { localStorage.setItem(userKey("dc_cards"), JSON.stringify(cards)); } catch { /* ignore */ }
}

/** Sync one card's name/slug into the registry (e.g. after profile edits). */
export function syncCardMeta(patch: Partial<CardMeta>): void {
  const id = getActiveCardId();
  const cards = getCards().map((c) => (c.id === id ? { ...c, ...patch, id } : c));
  saveCards(cards);
}

/** Create a new blank card, gated by the plan's `cards` limit.
    Returns the new card meta, or null when the plan limit is reached. */
export function createCard(name: string): CardMeta | null {
  const u = getAuthUser();
  if (!u) return null;
  const cards = getCards();
  const pkg = accountPackageId();
  const max = packageLimit(pkg, "cards");
  if (cards.length >= max) return null;
  const id = Math.max(PRIMARY_CARD_ID, ...cards.map((x) => x.id)) + 1;
  const baseSlug = (name || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";
  const slug = `${baseSlug}-${id}`;
  const meta: CardMeta = { id, name: name || `Card ${id}`, slug };
  saveCards([...cards, meta]);
  setActiveCardId(id);
  const seed: CustomerRecord = {
    ...seedFromAuth(u),
    package_id: pkg,
    name: name || u.fullName || slug,
    company_name: name || "",
    slug, username: slug,
  };
  try { localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(seed)); } catch { /* ignore */ }
  return meta;
}

/** Delete a non-primary card and all of its scoped content. */
export function deleteCard(id: number): void {
  const u = getAuthUser();
  if (!u || id === PRIMARY_CARD_ID) return;
  saveCards(getCards().filter((c) => c.id !== id));
  const suffix = `__u${u.id}__c${id}`;
  try {
    Object.keys(localStorage).filter((k) => k.includes(suffix)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  if (getActiveCardId() === id) setActiveCardId(PRIMARY_CARD_ID);
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
    activated_on: today(), expired_on: plusDays(30), package_id: 7, views: 0,
  };
}

/** Read the current user's card record synchronously (scoped + seeded). */
export function readCustomer(): CustomerRecord {
  const u = getAuthUser();
  try {
    const raw = localStorage.getItem(scopedKey("dc_customer"));
    if (raw) return healCustomerImgs({ ...DEFAULT_CUSTOMER, ...JSON.parse(raw) });
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
      if (raw) { setData(healCustomerImgs({ ...DEFAULT_CUSTOMER, ...JSON.parse(raw) })); return; }
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
      // Keep the card registry's label/slug in step with profile edits.
      if (patch.name !== undefined || patch.company_name !== undefined || patch.slug !== undefined) {
        syncCardMeta({ name: String(next.company_name || next.name || "My Card"), slug: String(next.slug || "card") });
      }
      signalContentChanged();
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
    if (parsed) setItems(healItemImgs(parsed));
    else setItems([]);
    setReady(true);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = useCallback((next: T[]) => {
    setItems(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    signalContentChanged();
  }, [key]);

  const add = useCallback((item: Omit<T, "id">) => {
    setItems((cur) => {
      const id = Math.max(0, ...cur.map((i) => i.id)) + 1;
      const next = [...cur, { ...item, id } as T];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    signalContentChanged();
  }, [key]);

  const update = useCallback((id: number, patch: Partial<T>) => {
    setItems((cur) => {
      const next = cur.map((i) => (i.id === id ? { ...i, ...patch } : i));
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    signalContentChanged();
  }, [key]);

  const remove = useCallback((id: number) => {
    setItems((cur) => {
      const next = cur.filter((i) => i.id !== id);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    signalContentChanged();
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
