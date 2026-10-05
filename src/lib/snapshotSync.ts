/* Which copy of a card wins: this browser's, or the server's.

   Every browser keeps a whole copy of the card and saves it whole; the server
   keeps the live one and stamps each version (its updatedAt). A copy that is
   merely OLD must never be saved over a newer card — that is what used to bring
   old pictures back — while an edit that simply hasn't been saved yet must
   never be thrown away without a word. These are the rules for both, on opening
   the dashboard and after a save. No browser APIs here, so they are tested
   directly (api/lib/snapshot-sync.test.ts). */

/** Shown whenever the server's copy replaced an edit that hadn't been saved. */
export const CHANGED_ELSEWHERE = "This card was changed on another device. The latest version is loaded — please redo your last change.";
/** Shown when a save didn't go through for any other reason; the edit stays here. */
export const SAVE_FAILED = "Couldn't save your changes — we'll try again when you edit";
/** Shown for as long as this browser has not managed to load the card at all. */
export const LOAD_FAILED = "We couldn't load your card. Check your connection and reload.";

/* ── Version stamps ── */

/** Two stamps name the same version. "" (none recorded) only equals "". */
export function sameStamp(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const x = Date.parse(a);
  return Number.isFinite(x) && x === Date.parse(b);
}

/** `a` names an earlier version than `b`. False when either is missing. */
export function olderStamp(a: string, b: string): boolean {
  const x = Date.parse(a);
  const y = Date.parse(b);
  return Number.isFinite(x) && Number.isFinite(y) && x < y;
}

/* ── "There is an edit here the server hasn't got" ── */

/** `base` is the version the first unsaved edit was made on; `rev` changes with
    every edit, so a save can tell whether another edit came in while it was
    on its way. */
export type UnsavedMark = { base: string; rev: string };

export function parseUnsaved(raw: string | null | undefined): UnsavedMark | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<UnsavedMark> | null;
    return m && typeof m.base === "string" && typeof m.rev === "string" ? { base: m.base, rev: m.rev } : null;
  } catch { return null; }
}

/** The mark after one more edit, made while this browser's copy is at `localTs`. */
export function markUnsaved(current: UnsavedMark | null, localTs: string, rev: string): UnsavedMark {
  return { base: current ? current.base : localTs, rev };
}

/** The mark after a save went through as version `savedTs`: gone, unless
    another edit was made while the save was on its way — that one is still
    unsaved, and is now an edit of the version just saved. */
export function unsavedAfterSave(atSend: UnsavedMark | null, now: UnsavedMark | null, savedTs: string): UnsavedMark | null {
  if (!now || (atSend && atSend.rev === now.rev)) return null;
  return { base: savedTs || now.base, rev: now.rev };
}

/* ── Do the two copies hold the same card? ── */

/** The parts of a card the dashboard saves. */
const CARD_PARTS = ["customer", "products", "gallery", "videos", "offers", "qrcodes"] as const;
/** Fields the server never stores (api/publish-router.ts, sanitizeSnapshot). */
const NEVER_STORED = new Set(["password", "email_verify_on", "email_verify", "otp", "reset_token"]);

/** JSON with keys in a fixed order — the database returns them in its own. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** True when taking the server's copy would change nothing here — e.g. the
    newer version is this browser's own save whose answer never arrived, or a
    design change that is already in both. Then nothing was lost and there is
    nothing to tell the owner. */
export function sameCard(local: unknown, server: unknown): boolean {
  const part = (card: unknown, key: (typeof CARD_PARTS)[number]): unknown => {
    const v = (card as Record<string, unknown> | null | undefined)?.[key];
    if (key !== "customer") return Array.isArray(v) ? v : [];
    const c = { ...((v && typeof v === "object" ? v : {}) as Record<string, unknown>) };
    for (const k of NEVER_STORED) delete c[k];
    return c;
  };
  return CARD_PARTS.every((k) => stable(part(local, k)) === stable(part(server, k)));
}

/* A screen that opens tidies the stored record: demo values cleared, a leaked
   password dropped, an image address re-pointed. Is the tidy copy worth
   storing? Only when something that WAS in the record changed. Blank fields the
   tidy copy merely adds, and an empty one it leaves out, are not a change — and
   writing the record back for those tells every other tab of this browser that
   the card changed, which makes them drop whatever is being typed there. */
export function tidyingChanged(stored: Record<string, unknown>, tidy: Record<string, unknown>): boolean {
  return Object.keys(stored).some((k) => (k in tidy ? stable(stored[k]) !== stable(tidy[k]) : stored[k] !== "" && stored[k] != null));
}

/* Is the card stored in this browser under an account's id really that
   account's? An admin's preview of an old-site customer who has no account is
   stored under that customer's OLD id, which can be a real account's id — and a
   copy kept on the strength of the id alone opens, and then saves, one
   customer's card as another's. The record says whose it is: its email is the
   account's own, or the one on that account's live card. */
export function storedCardIsFor(storedEmail: unknown, accountEmails: unknown[]): boolean {
  const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const stored = norm(storedEmail);
  return !!stored && accountEmails.some((e) => norm(e) === stored);
}

/* ── Opening the dashboard ── */

export type LoadAction =
  | "take-server"         // replace this browser's copy with the server's
  | "take-server-notify"  // same, and tell the owner their unsaved edit is gone
  | "push-local"          // keep this copy and save it (it carries an unsaved edit)
  | "keep-local"          // nothing to do — and nothing is saved
  | "ask-again";          // this browser's copy moved on while the server was answering

/* A browser that already holds the card, checking it against the server.
   - couldn't ask the server → keep what is here, save nothing
   - this browser's version changed while the server was answering (its own
     save landed, or the latest was loaded) → the answer may be from before
     that: ask again, apply nothing
   - the server's version is OLDER than this browser's → never applied: it can
     only be an answer read before this browser's own save
   - no unsaved edit → the server's copy wins whenever it is a different version
   - an unsaved edit, server still on the version it was made on → save it
   - an unsaved edit, server moved on → the server's copy wins, and say so */
export function decideOnLoad(i: {
  failed: boolean;             // the server couldn't be asked (offline, 5xx, signed out)
  serverTs: string;            // "" = the server has no card
  localTs: string;             // the version this browser's copy came from ("" = none recorded)
  askedTs?: string;            // localTs as it was when the server was asked
  unsaved: UnsavedMark | null;
  sameContent: () => boolean;  // sameCard(local, server); only asked when it matters
}): LoadAction {
  if (i.failed) return "keep-local";
  if (i.askedTs !== undefined && !sameStamp(i.askedTs, i.localTs)) return "ask-again";
  if (!i.serverTs) return i.unsaved ? "push-local" : "keep-local";
  if (olderStamp(i.serverTs, i.localTs)) return i.unsaved ? "push-local" : "keep-local";
  if (!i.unsaved) return sameStamp(i.serverTs, i.localTs) ? "keep-local" : "take-server";
  if (sameStamp(i.serverTs, i.localTs) || sameStamp(i.serverTs, i.unsaved.base)) return "push-local";
  return i.sameContent() ? "take-server" : "take-server-notify";
}

export type FirstLoadAction =
  | "use-snapshot"  // load the live card
  | "use-old-site"  // no live card at all: load the old site's record
  | "wait";         // couldn't ask: stay un-hydrated, so nothing is published

/* A browser with no copy of the card yet. The old site's record is used ONLY
   when the server says there is no live card — never because it failed to
   answer, which used to put years-old content back on a live card. */
export function decideFirstLoad(i: { failed: boolean; hasSnapshot: boolean }): FirstLoadAction {
  if (i.failed) return "wait";
  return i.hasSnapshot ? "use-snapshot" : "use-old-site";
}

/* Is what this browser holds really a card — or only the blank record a screen
   makes from the sign-in details when nothing is stored yet? A first load that
   failed leaves just that behind, and it must not pass for the card on the
   next visit: the first load is run again. Only for the primary card (an extra
   card starts as such a record on purpose) and only while nothing was ever
   loaded from, or saved to, the server.

   `failedBefore`: that failure was recorded (see markFirstLoadFailed). Then it
   no longer matters what the record looks like — its owner may have typed into
   it, or added a product beside it, and it is still not their card. */
export function retryFirstLoad(i: {
  hydrated: boolean;        // a load has succeeded in this browser before
  localTs: string;          // "" = no server version was ever recorded
  primaryCard: boolean;
  untouchedSeed: boolean;   // the stored record is exactly the sign-in seed
  failedBefore?: boolean;   // an earlier first load failed, and none has gone through since
}): boolean {
  if (i.hydrated || !i.primaryCard) return false;
  return !!i.failedBefore || (!i.localTs && i.untouchedSeed);
}

/* Does a load leave this browser marked "first load failed"? Only when it
   failed in a browser that has never held the card: until a load goes through,
   nothing here is saved by itself, the owner is told (LOAD_FAILED), and the next
   visit starts over. A browser that has the card is never marked — a check that
   fails there costs nothing. Nor is a sign-in that can only look (an admin's
   preview of an old-site customer with no account): the server is never asked
   on its behalf, so "couldn't ask" says nothing. */
export function markFirstLoadFailed(i: { failed: boolean; hydrated: boolean; previewOnly: boolean }): boolean {
  return i.failed && !i.hydrated && !i.previewOnly;
}

/* A first load that goes through on a later visit puts the real card here. If
   anything was typed into the blank record on a visit where it had failed — or
   a product added beside it — that went with it, and the owner is told, as for
   any edit a load replaces. (On a browser's very first load nothing can have
   been typed: the dashboard isn't shown until that load ends.) */
export function firstLoadDropsEdit(i: { failedBefore: boolean; loaded: boolean; unsaved: UnsavedMark | null }): boolean {
  return i.failedBefore && i.loaded && !!i.unsaved;
}

/* The ONE save that opening the dashboard may make by itself: an old-site card
   that has no card on the server yet is published once, so the owner's link
   and the phone app (which only knows published cards) get it. It is an
   insert — the save names no version, so the server refuses it if a card
   appeared meanwhile. Never after a failed load, never for an extra card,
   never for a copy that was once in step with the server (a card its owner
   took down stays down), and never on an admin's visit. */
export function firstPublishOnLoad(i: {
  failed: boolean;          // the server (or the old site) couldn't be asked
  hasSnapshot: boolean;     // the server has a card
  primaryCard: boolean;
  localTs: string;          // "" = no server version was ever recorded
  unsaved: UnsavedMark | null;
  oldSiteCard: boolean;     // the local record came from the old site, fully loaded
  adminVisit: boolean;      // an admin is signed in as this customer
}): boolean {
  return !i.failed && !i.hasSnapshot && i.primaryCard && !i.localTs && !i.unsaved && i.oldSiteCard && !i.adminVisit;
}

/* ── A design change the server makes itself (Templates → Apply) ── */

/* The server puts the new design on whatever card it holds and answers with the
   version it replaced. Only if that is the version this browser's copy came
   from (same whole second — all the column keeps) does this browser now hold
   the new version too. Otherwise its copy is older than the card the design
   went onto: the stamp stays as it is and the latest is loaded. */
export function designWriteCoversLocal(localTs: string, replaced: string | null | undefined): boolean {
  const x = Date.parse(localTs);
  const y = Date.parse(replaced || "");
  return Number.isFinite(x) && Number.isFinite(y) && Math.floor(x / 1000) === Math.floor(y / 1000);
}

/* ── After a save ── */

export type SaveRefusal =
  | "stale"    // SNAPSHOT_STALE: the card was saved from elsewhere since this copy was made
  | "no-base"  // SNAPSHOT_NO_BASE: this copy can't say which version it was made from
  | "taken"    // the card link belongs to someone else
  | "other";   // offline, signed out, server error…

export function saveRefusal(error: unknown): SaveRefusal {
  const msg = String((error as { message?: unknown } | null | undefined)?.message ?? error ?? "");
  if (msg.includes("SNAPSHOT_STALE")) return "stale";
  if (msg.includes("SNAPSHOT_NO_BASE")) return "no-base";
  if (/taken/i.test(msg)) return "taken";
  return "other";
}

/* What a refused save leads to. Stale or no base → "reload": load the latest
   version; the same copy is never sent again without the owner asking for it.
   Anything else → "keep": the edit stays in this browser and nothing is loaded. */
export function afterSaveError(error: unknown): "reload" | "keep" {
  const why = saveRefusal(error);
  return why === "stale" || why === "no-base" ? "reload" : "keep";
}

/* A save went through — but is the copy in this browser still the one that was
   sent? If the server's card was loaded over it while the save was uploading
   (counted per tab in `reloads`; another tab doing it shows as a changed
   stamp), the answer's version describes a card that is no longer here, and
   recording it would let that other copy be saved as if it were current. */
export function copyReplacedDuringSave(atSend: { reloads: number; ts: string }, now: { reloads: number; ts: string }): boolean {
  return atSend.reloads !== now.reloads || atSend.ts !== now.ts;
}
