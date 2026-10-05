import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getActiveCardId, getAuthUser, isUntouchedSeed, noteUnsavedEdit, readCustomer, readUnsaved, scopedKey, signalContentReloaded, writeUnsaved } from "./useCustomer";
import { whenSavesSettle } from "./useAutoPublish";
import { loadMyLegacyProfile, loadMySnapshot, loadCustomerContent, imgUrl, decodeSpecialities, type MySnapshot } from "@/lib/cardContent";
import { healUploadUrl } from "@/lib/img";
import { currentSlot, getToken } from "@/lib/session";
import {
  CHANGED_ELSEWHERE, decideFirstLoad, decideOnLoad, firstLoadDropsEdit, firstPublishOnLoad, markFirstLoadFailed, retryFirstLoad, sameCard,
  type LoadAction,
} from "@/lib/snapshotSync";

const s = (v: unknown) => String(v ?? "");

/* "This browser's first load of the card failed." Set when a browser that has
   never held the card couldn't get it, cleared by the load that goes through.
   While it is set what is here is NOT the card — only the blank sign-in record
   and whatever was typed into it since — so nothing is saved by itself
   (useAutoPublish), the owner is told on every page (ResponsiveDashboardLayout),
   no screen says "Saved", and the next visit runs the first load again
   (retryFirstLoad). Stored beside the card, like the unsaved mark. */
export function firstLoadFailed(): boolean {
  try { return localStorage.getItem(scopedKey("dc_load_failed")) === "1"; } catch { return false; }
}
export function setFirstLoadFailed(on: boolean): void {
  try {
    if (on === firstLoadFailed()) return;
    if (on) localStorage.setItem(scopedKey("dc_load_failed"), "1");
    else localStorage.removeItem(scopedKey("dc_load_failed"));
  } catch { /* storage full: the next visit still retries a blank record */ }
  try { window.dispatchEvent(new CustomEvent("dc:load-state")); } catch { /* SSR / no window */ }
}
const onLoadState = (changed: () => void) => {
  window.addEventListener("dc:load-state", changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener("dc:load-state", changed);
    window.removeEventListener("storage", changed);
  };
};
/** That mark, for a screen to show — in the customer's own portal only (on
    /admin pages the main session can be a customer the admin signed in as). */
export function useFirstLoadFailed(): boolean {
  return useSyncExternalStore(
    onLoadState,
    () => currentSlot() === "main" && getAuthUser()?.role === "customer" && firstLoadFailed(),
    () => false,
  );
}

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

/* This browser's copy of the card, exactly as a save sends it. */
export function readLocalCard() {
  const list = (base: string): unknown[] => {
    try {
      const arr = JSON.parse(localStorage.getItem(scopedKey(base)) || "[]");
      // Heal stale image hosts so the published snapshot never carries a dead
      // (e.g. old dev-host) URL — see healUploadUrl.
      return Array.isArray(arr)
        ? arr.map((it) => (it && typeof it.filename === "string" ? { ...it, filename: healUploadUrl(it.filename) } : it))
        : [];
    } catch { return []; }
  };
  return {
    customer: readCustomer(),
    products: list("dc_products"), gallery: list("dc_gallery"), videos: list("dc_videos"),
    offers: list("dc_offers"), qrcodes: list("dc_qrcode"),
  };
}

/* Write a published snapshot (the LIVE card's data — the primary copy) into the
   scoped localStorage keys the dashboard reads, and record which server version
   local content is based on (dc_snap_ts). Used by first-load hydration, by the
   freshness check on every later load, by a save the server refused as out of
   date, and by admin "Login as Client".

   All or nothing: if the browser's storage fills up part-way, what was there
   before is put back and the error is thrown — half of one version under the
   other's stamp would be saved as if it were the card. Open screens are told
   to re-read (dc:content-reloaded); nothing is saved because of it. */
export function applySnapshotToLocal(u: { id: number; email: string }, snap: MySnapshot): boolean {
  const d = snap?.data as Record<string, unknown> | undefined;
  if (!d || !d.customer) return false;
  const cust = { ...(d.customer as Record<string, unknown>), id: u.id, email: (d.customer as Record<string, unknown>).email || u.email, slug: s(snap.slug) };
  const writes: [string, string][] = [[scopedKey("dc_customer"), JSON.stringify(cust)]];
  const put = (base: string, arr: unknown) => {
    writes.push([scopedKey(base), JSON.stringify(arr || [])], [scopedKey(base) + "::seeded", "1"]);
  };
  put("dc_products", d.products);
  put("dc_gallery", d.gallery);
  put("dc_videos", d.videos);
  put("dc_offers", d.offers);
  put("dc_qrcode", d.qrcodes);
  writes.push([scopedKey("dc_snap_ts"), s(snap.updatedAt)], [scopedKey("dc_hydrated"), "1"]);

  const before = writes.map(([k]) => [k, localStorage.getItem(k)] as const);
  try {
    for (const [k, v] of writes) localStorage.setItem(k, v);
  } catch (e) {
    try {
      for (const [k] of before) localStorage.removeItem(k);
      for (const [k, v] of before) if (v !== null) localStorage.setItem(k, v);
    } catch { /* best effort */ }
    throw e;
  }
  // The local copy IS the server's version now: no edit is waiting to be saved
  // — and whatever load failed before, this browser has the card.
  writeUnsaved(null);
  setFirstLoadFailed(false);
  signalContentReloaded();
  return true;
}

/* The server's copy of the card being edited: null when it has none, throws
   when the server couldn't be asked. */
export function loadActiveSnapshot(): Promise<MySnapshot | null> {
  return loadMySnapshot(getActiveCardId());
}

/* Replace this browser's copy with the server's latest (the server wins). Used
   when a save was refused as out of date (the card was changed from another
   device). Returns null when there was nothing to load; otherwise whether the
   server's card actually differed from what was here. Throws when the server
   couldn't be asked or the browser's storage is full. */
export async function pullLatestSnapshot(): Promise<{ differed: boolean } | null> {
  const u = getAuthUser();
  if (!u || u.role !== "customer") return null;
  const scope = scopedKey("dc_customer");
  const snap = await loadActiveSnapshot();
  // The session or the active card changed while the server was answering.
  if (!snap || scopedKey("dc_customer") !== scope) return null;
  const differed = !sameCard(readLocalCard(), snap.data);
  return applySnapshotToLocal(u, snap) ? { differed } : null;
}

const STORAGE_FULL = "Couldn't load the latest version of your card — this browser's storage is full.";
// How long the load-time check waits for a save that is still uploading, and
// how often it asks again when this browser's version moved under the answer.
const SETTLE_MS = 10_000;
const MAX_ASKS = 3;

/* Is the stored record a card loaded from the old site (mapProfile's shape),
   lists and all — as opposed to a signup seed, or a load that stopped part-way
   (dc_banks is the last list the old-site load writes)? */
function isOldSiteCard(): boolean {
  try {
    const rec = JSON.parse(localStorage.getItem(scopedKey("dc_customer")) || "null") as Record<string, unknown> | null;
    return !!rec && ["status", "about_on", "email_verify"].every((k) => k in rec)
      && localStorage.getItem(scopedKey("dc_banks") + "::seeded") === "1";
  } catch { return false; }
}

/* Hydration of the dashboard from the user's REAL card.
   The dashboard is a per-browser localStorage editor; the published snapshot on
   the server is the PRIMARY copy (it's what the public card shows). First load
   on a clean browser hydrates from the snapshot (falling back to the legacy
   customers.json card only when there is no snapshot at all). Every later load
   checks this browser's copy against the server's: a copy that is merely old is
   replaced, a copy holding an edit that never got saved is saved — see
   decideOnLoad for the rules. Loading a card never publishes one — with one
   exception, an old-site card the server has no card for yet (see
   firstPublishOnLoad). */
export function useCardHydration(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getAuthUser();
    // Only real customers hydrate from a legacy card (admins/resellers skip) —
    // and only in the customer's own portal: on /admin pages the main session
    // can be a customer the admin signed in as, whose card isn't shown there.
    if (!u || u.role !== "customer" || currentSlot() !== "main") { setReady(true); return; }
    const marker = scopedKey("dc_hydrated");
    const scope = scopedKey("dc_customer");
    let cancelled = false;
    // This screen went away, or the session / active card changed, while the
    // server was answering: what came back is not for the card now open.
    const gone = () => cancelled || scopedKey("dc_customer") !== scope;

    // A card "already exists locally" once it was hydrated — or was put there
    // without us: one the signup just seeded with the chosen design, or one the
    // user has been editing this session.
    const wasHydrated = localStorage.getItem(marker) === "1";
    const primaryCard = getActiveCardId() === 1;
    // An admin signed in as this customer ("Login as Client") is looking at the
    // card, not moving it: the one first publish below is the owner's.
    const adminVisit = !!getToken("admin");
    // A sign-in that can only look: an admin's preview of an old-site customer
    // who has no account. The server can't be asked on its behalf at all.
    const previewOnly = getToken("main").startsWith("impersonate_");
    // An earlier first load failed here and none has gone through since.
    const failedBefore = firstLoadFailed() && !previewOnly;
    let hasLocal = wasHydrated;
    if (!hasLocal) {
      try {
        const cur = JSON.parse(localStorage.getItem(scope) || "null") as { name?: string; slug?: string; theme?: unknown } | null;
        hasLocal = !!cur && (!!String(cur.name || "").trim() || !!String(cur.slug || "").trim() || cur.theme !== undefined);
      } catch { /* fall through to hydrate */ }
      // …but not the blank record a screen made from the sign-in details after a
      // first load that failed — nor that record with something typed into it
      // since (the failure is marked): that load is simply run again.
      if (hasLocal && retryFirstLoad({
        hydrated: wasHydrated, localTs: localStorage.getItem(scopedKey("dc_snap_ts")) || "", primaryCard,
        untouchedSeed: isUntouchedSeed(), failedBefore,
      })) hasLocal = false;
    }

    // The old-site card just loaded (or found here, never yet on the server) is
    // published once: marked unsaved, and auto-publish (mounted beside this
    // hook) sends it like any edit — see firstPublishOnLoad.
    const firstPublish = () => {
      noteUnsavedEdit();
      window.dispatchEvent(new CustomEvent("dc:unsaved-changes"));
    };

    /* A copy is already here. The SERVER snapshot is primary: if it moved on
       since this browser last synced (another device published), the newer
       version replaces the local one — unless the local one holds an edit the
       server never got and nothing else changed meanwhile, in which case that
       edit is saved now. */
    const syncExisting = async () => {
      let snap: MySnapshot | null = null;
      let failed = false;
      let action: LoadAction = "keep-local";
      for (let asks = 1; ; asks++) {
        // A save of this browser's own may still be on its way (the edit made
        // just before this page opened). Asked before it lands, the server
        // answers with the card from before it — so wait for it first.
        await whenSavesSettle(SETTLE_MS);
        if (gone()) return;
        const askedTs = localStorage.getItem(scopedKey("dc_snap_ts")) || "";
        snap = null;
        failed = false;
        try { snap = await loadActiveSnapshot(); } catch { failed = true; /* offline / server error — keep local */ }
        if (gone()) return;
        const answer = snap;
        action = decideOnLoad({
          failed,
          serverTs: s(answer?.updatedAt),
          localTs: localStorage.getItem(scopedKey("dc_snap_ts")) || "",
          askedTs,
          unsaved: readUnsaved(),
          sameContent: () => sameCard(readLocalCard(), answer?.data),
        });
        if (action !== "ask-again") break;
        // Still moving after several answers: leave the card alone this time.
        if (asks >= MAX_ASKS) { failed = true; action = "keep-local"; break; }
      }
      try {
        if ((action === "take-server" || action === "take-server-notify") && snap && applySnapshotToLocal(u, snap)) {
          if (action === "take-server-notify") toast.warning(CHANGED_ELSEWHERE, { id: "dc-changed-elsewhere", duration: 10_000 });
          return;
        }
        const publishFirst = action === "keep-local" && firstPublishOnLoad({
          failed, hasSnapshot: !!snap, primaryCard, adminVisit,
          localTs: localStorage.getItem(scopedKey("dc_snap_ts")) || "",
          unsaved: readUnsaved(),
          oldSiteCard: wasHydrated && isOldSiteCard(),
        });
        // The card here stands. It counts as hydrated once the server has had
        // its say; after a failed check a card that was never hydrated stays
        // that way, which keeps auto-publish off for this page — and is marked,
        // so its owner is told and the next visit starts the load over.
        if (!failed) localStorage.setItem(marker, "1");
        setFirstLoadFailed(markFirstLoadFailed({ failed, hydrated: wasHydrated, previewOnly }));
        // Ask auto-publish (mounted beside this hook) to send the unsaved edit.
        if (action === "push-local") window.dispatchEvent(new CustomEvent("dc:unsaved-changes"));
        else if (publishFirst) firstPublish();
      } catch { toast.error(STORAGE_FULL, { id: "dc-storage-full" }); }
    };

    /* A genuinely EMPTY browser (a returning user on a fresh device). */
    const hydrateEmpty = async () => {
      const put = (base: string, arr: unknown[]) => {
        localStorage.setItem(scopedKey(base), JSON.stringify(arr || []));
        localStorage.setItem(scopedKey(base) + "::seeded", "1");
      };
      let hydrated = false;
      let publishFirst = false;
      // The card just loaded replaced something typed into the blank record on
      // a visit where this load had failed.
      let dropped = false;
      try {
        // The published SNAPSHOT is the primary copy — it is exactly what the
        // live public card shows, and it moves with every publish from any
        // device. Hydrate from it first; the frozen legacy customers.json is
        // only a fallback for accounts that were never snapshot-published —
        // never for a snapshot that merely failed to load.
        let snap: MySnapshot | null = null;
        let failed = false;
        try { snap = await loadActiveSnapshot(); } catch { failed = true; }
        if (gone()) return;
        const action = decideFirstLoad({ failed, hasSnapshot: !!snap });
        if (action === "use-snapshot" && snap) {
          const typed = readUnsaved();
          hydrated = applySnapshotToLocal(u, snap);
          dropped = firstLoadDropsEdit({ failedBefore, loaded: hydrated, unsaved: typed });
        } else if (action === "use-old-site") {
          // Everything is loaded BEFORE anything is written: a profile without
          // its lists would later be published as the whole card.
          const row = await loadMyLegacyProfile();
          const slug = row ? s(row.slug).toLowerCase() : "";
          const content = slug ? await loadCustomerContent(slug, { strict: true }) : null;
          if (gone()) return;
          if (row) {
            const typed = readUnsaved();
            localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(mapProfile(row, u)));

            if (content) {
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
            // What was typed into the blank record went with it: it is not an
            // edit of this card, and must not be saved as one.
            writeUnsaved(null);
            dropped = firstLoadDropsEdit({ failedBefore, loaded: true, unsaved: typed });
            // Screens that opened before this finished hold the blank seed and
            // empty lists (the Card Builder would publish exactly that): have
            // them re-read, as after any other load.
            signalContentReloaded();
          }
          hydrated = true; // reached the end without throwing
          publishFirst = firstPublishOnLoad({
            failed: false, hasSnapshot: false, primaryCard, adminVisit,
            localTs: localStorage.getItem(scopedKey("dc_snap_ts")) || "",
            unsaved: readUnsaved(),
            oldSiteCard: !!row && !!content,
          });
        }
      } catch { /* leave whatever's there — never block the dashboard on this */ }
      finally {
        // Only claim "hydrated" when it actually SUCCEEDED. This marker is what
        // releases auto-publish (see useAutoPublish), so setting it after a
        // failed load was a data-loss path: open the dashboard on a new device,
        // have the snapshot fetch fail, and auto-publish would then overwrite
        // the live card with the empty local one. On failure we leave the marker
        // unset, which keeps auto-publish disabled for this session — the
        // dashboard still works, it just won't republish from a bad state — and
        // the next visit runs this load again. The failure is marked, so the
        // owner is told, and so that load runs again even if they type into the
        // blank card meanwhile.
        try {
          if (hydrated && !gone()) {
            localStorage.setItem(marker, "1");
            setFirstLoadFailed(false);
            if (dropped) toast.warning(CHANGED_ELSEWHERE, { id: "dc-changed-elsewhere", duration: 10_000 });
            if (publishFirst) firstPublish();
          } else if (!hydrated && !gone()) {
            setFirstLoadFailed(markFirstLoadFailed({ failed: true, hydrated: false, previewOnly }));
          }
        } catch { /* ignore */ }
      }
    };

    (async () => {
      // A browser that already holds the card shows it straight away. The check
      // against the server — and the wait for a save still uploading, which
      // takes as long as the upload does — runs behind the page, and open
      // screens re-read if the server's copy is taken (dc:content-reloaded).
      // Only a browser with no card yet has to wait: there is nothing to show.
      if (wasHydrated) setReady(true);
      await (hasLocal ? syncExisting() : hydrateEmpty());
      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  return ready;
}
