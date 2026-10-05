import { useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { readCustomer, scopedKey, getActiveCardId, getAuthUser, readUnsaved, writeUnsaved, contentReloads } from "@/hooks/useCustomer";
import { firstLoadFailed, pullLatestSnapshot, readLocalCard } from "@/hooks/useCardHydration";
import { loadMySnapshot } from "@/lib/cardContent";
import { currentSlot } from "@/lib/session";
import {
  CHANGED_ELSEWHERE, SAVE_FAILED, afterSaveError, copyReplacedDuringSave, designWriteCoversLocal, saveRefusal, unsavedAfterSave,
} from "@/lib/snapshotSync";

/* Saving a card to the server.

   The dashboard keeps the card in this browser and sends it WHOLE, so every
   save says which server version its copy was made from (baseTs = dc_snap_ts).
   The server refuses a copy made from an older version, and one that names no
   version at all — and a refused copy is never sent again on its own. Only the
   owner, told that the card changed elsewhere, can choose to overwrite it
   (`force`, from the Card Builder's Publish).

   Everything here lives at module level, not in the hook: each dashboard page
   mounts its own layout, so anything tied to one mount (a mutation's callbacks,
   a timer in a ref) was lost on every page change — including the version
   stamp of the save that had just gone out, which made the next save look
   out of date. */

type SnapshotInput = { slug: string; cardId: number; data: unknown; baseTs?: string; force?: boolean; client?: number };
export type SnapshotSender = (input: SnapshotInput) => Promise<{ updatedAt?: string | null }>;
export type SnapshotSaveResult =
  | { status: "saved" }
  | { status: "skipped" }                 // there was nothing to send
  | { status: "conflict" }                // refused: the card changed elsewhere (or no base); the server kept its copy
  | { status: "failed"; error: unknown }; // anything else; the edit is still in this browser

/* Sent with every save: this dashboard always names the version its copy came
   from, so the server refuses any save of its that doesn't. (A page left open
   since before that rule re-sends a refused copy with no version; the server
   tells the two apart by this number.) */
const CLIENT = 2;

let turn: Promise<unknown> = Promise.resolve();
/* The two below are kept per card (its storage key, which names the account
   too): an admin goes from one customer to the next in the same tab, and one
   customer's count or pause must never be read as another's. */
// Edits made in this tab that no save has covered yet. Backs up the stored
// mark (readUnsaved), which can fail to be written when storage is full.
const unsavedHere = new Map<string, number>();
const unsavedIn = (card: string = scopedKey("dc_customer")): number => unsavedHere.get(card) ?? 0;
// The card whose automatic saves are paused, if any (see holdAutoSave).
let held: string | null = null;
const isHeld = (card: string = scopedKey("dc_customer")): boolean => held === card;

/* One write to the card at a time, in order — whole-card saves and the design
   write alike. Each takes its version from the one before it; two on their way
   together would refuse each other.

   In order within this tab (the queue below) — and one at a time across the
   tabs of this browser too, where it has the Web Locks API: a second tab that
   saved while the first was still uploading sent the version from before that
   save, and one of the two was refused. Every job reads the stored card and
   its version when it starts, which is once the lock is held, so it goes out on
   what the other tab's save left. */
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = () => acrossTabs(job);
  const result = turn.then(run, run);
  turn = result.catch(() => undefined);
  return result;
}

/* The lock is the browser's: it is let go when the job settles, whichever way
   it ends, and when the tab goes away — so a tab can't be left holding it. A
   request that hangs holds it only until the browser gives up on that request,
   as it already held this tab's own queue. Nothing here takes a second lock, so
   two tabs can't wait on each other.

   And the wait for it has an end: a tab the browser has put to sleep in the
   middle of a save (a phone does that to a tab left in the background) keeps
   the lock until it wakes. After LOCK_WAIT_MS this tab's write goes without it —
   at worst refused by the server, as before. The same where the API is
   missing, or the lock can't be asked for: this tab's queue alone. */
const LOCK_WAIT_MS = 15_000;
function acrossTabs<T>(job: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return job();
  let started = false;
  const waiting = new AbortController();
  const giveUp = setTimeout(() => waiting.abort(), LOCK_WAIT_MS);
  // Named for the card open when the job's turn comes: the one it reads and writes.
  const locked = locks.request(`dc-card-write:${scopedKey("dc_customer")}`, { signal: waiting.signal }, () => {
    started = true;
    clearTimeout(giveUp);
    return job();
  }) as Promise<T>;
  // Not granted (given up on, or refused by the browser): the job hasn't run.
  return locked.catch((e: unknown) => { clearTimeout(giveUp); if (started) throw e; return job(); });
}

/** There is an edit in this browser that no save has covered yet. */
export function hasUnsavedEdit(): boolean {
  return !!readUnsaved() || unsavedIn() > 0;
}

/* Send one snapshot — one at a time, in order. A second save started while the
   first is still uploading would carry the version from before it, and be
   refused as out of date by the very save it followed.

   `build` is called when the save's turn comes, so it sends the card as it is
   then; returning null skips the save. The version stamp of a save that went
   through is recorded from the awaited answer, whatever page is open by then.
   `holdOnConflict` pauses automatic saves the moment this one is refused (see
   holdAutoSave), before the next one in line can go out. */
export function saveCardSnapshot(
  send: SnapshotSender,
  build: () => { slug: string; data: unknown } | null,
  opts: { force?: boolean; holdOnConflict?: boolean } = {},
): Promise<SnapshotSaveResult> {
  return inTurn(async (): Promise<SnapshotSaveResult> => {
    // Fixed now: the answer can arrive after the owner switched card or signed
    // out, and must still be filed under the card it belongs to.
    const cardKey = scopedKey("dc_customer");
    const tsKey = scopedKey("dc_snap_ts");
    const unsavedKey = scopedKey("dc_dirty");
    const sentMark = readUnsaved(unsavedKey);
    const sentHere = unsavedIn(cardKey);
    const card = build();
    if (!card) return { status: "skipped" };
    const input: SnapshotInput = { slug: card.slug, cardId: getActiveCardId(), data: card.data, client: CLIENT };
    // Optimistic-concurrency base: the server rejects this save if the card
    // was published from another device since this browser last synced —
    // a stale browser can never silently roll the live card back.
    const base = localStorage.getItem(tsKey) || "";
    if (opts.force) input.force = true;
    else if (base) input.baseTs = base;
    const atSend = { reloads: contentReloads(cardKey), ts: base };
    try {
      const res = await send(input);
      const ts = res?.updatedAt || "";
      // The server's card was loaded over this copy while the save was on its
      // way: the answer's version is not the version of what is here now.
      // Nothing is recorded — the next load puts the two back in step.
      if (copyReplacedDuringSave(atSend, { reloads: contentReloads(cardKey), ts: localStorage.getItem(tsKey) || "" })) return { status: "saved" };
      if (ts) { try { localStorage.setItem(tsKey, ts); } catch { /* ignore */ } }
      writeUnsaved(unsavedAfterSave(sentMark, readUnsaved(unsavedKey), ts), unsavedKey);
      unsavedHere.set(cardKey, Math.max(0, unsavedIn(cardKey) - sentHere));
      return { status: "saved" };
    } catch (error) {
      if (afterSaveError(error) !== "reload") return { status: "failed", error };
      if (opts.holdOnConflict) held = cardKey;
      return { status: "conflict" };
    }
  });
}

/* ── The design write (Templates → Apply) ── */

type DesignInput = { cardId: number; theme: string; color?: string; color2?: string; baseTs?: string };
export type DesignSender = (input: DesignInput) => Promise<{ published?: boolean; updatedAt?: string | null; replaced?: string | null } | undefined>;
export type DesignSaveResult =
  | { status: "live" }                    // the public card shows the design
  | { status: "not-published" }           // no public card yet: the design is in this browser only
  | { status: "failed"; error: unknown }; // couldn't be sent; the next save carries it

/* Put a design on the LIVE card straight away. The server applies it to the
   card it holds — which may be newer than this browser's copy — so it goes
   through the same queue as the saves (a save still uploading would otherwise
   be refused as out of date by this very write), and its answer moves this
   browser's version on only when the card it replaced is the one held here.
   If not, the design went onto a card this browser hasn't got: that card is
   loaded, design included, and nothing of the old copy is saved over it.

   `hadEdit`: an edit was waiting to be saved before the design was applied
   here (hasUnsavedEdit(), asked before the local write). */
export function saveCardDesign(
  send: DesignSender,
  design: { theme: string; color?: string; color2?: string },
  opts: { hadEdit?: boolean } = {},
): Promise<DesignSaveResult> {
  // The design's own unsaved mark, to tell a later edit from it.
  const own = readUnsaved()?.rev ?? "";
  // The card it was applied to. Its turn can come after another account (an
  // admin going from one customer to the next) or another card was opened —
  // and everything below is read then: it must never be sent for that one.
  const cardKey = scopedKey("dc_customer");
  return inTurn(async (): Promise<DesignSaveResult> => {
    // Nothing is sent: the design stays in its own card's copy here, marked
    // unsaved, and goes with that card's next save.
    if (scopedKey("dc_customer") !== cardKey) return { status: "failed", error: new Error("Another card was opened before the design could be sent.") };
    const tsKey = scopedKey("dc_snap_ts");
    const unsavedKey = scopedKey("dc_dirty");
    const input: DesignInput = { cardId: getActiveCardId(), ...design };
    const base = localStorage.getItem(tsKey) || "";
    if (base) input.baseTs = base;
    const atSend = { reloads: contentReloads(cardKey), ts: base };
    let res: Awaited<ReturnType<DesignSender>>;
    try { res = await send(input); } catch (error) { return { status: "failed", error }; }
    if (!res?.published) return { status: "not-published" };
    const ts = res.updatedAt || "";
    const local = localStorage.getItem(tsKey) || "";
    // (A card loaded over this copy while the design was on its way may be the
    // one from just before it — as after a save, its version isn't taken then.)
    const sameCopy = !copyReplacedDuringSave(atSend, { reloads: contentReloads(cardKey), ts: local });
    if (ts && sameCopy && designWriteCoversLocal(local, res.replaced)) {
      try { localStorage.setItem(tsKey, ts); } catch { /* ignore */ }
      return { status: "live" };
    }
    // The owner switched card or signed out meanwhile: nothing to load here.
    if (scopedKey("dc_customer") !== cardKey) return { status: "live" };
    // Only an edit OTHER than the design can be lost by loading the latest —
    // the design itself is in it.
    const waiting = readUnsaved(unsavedKey);
    const onlyDesign = !waiting || (!opts.hadEdit && waiting.rev === own);
    await takeServerCopy(onlyDesign);
    return { status: "live" };
  });
}

/* ── Auto-publish ── */

let sender: SnapshotSender | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
// Automatic saves that have started and not yet finished (see whenSavesSettle).
const running = new Set<Promise<AutoSaveOutcome>>();
// Cards known to be public already (see isLive). Only "yes" is remembered: a
// card that isn't live yet can go live at any moment.
const knownLive = new Set<string>();

/* The Card Builder is asking the owner what to do about a card that changed
   elsewhere. Automatic saves wait meanwhile, so the question isn't answered
   for them — including one that was already in line when it was asked. */
export function holdAutoSave(on: boolean): void {
  held = on ? scopedKey("dc_customer") : null;
}

/* Resolves once no write to the card is on its way: nothing in the queue and
   no automatic save still starting or finishing. The load-time check waits for
   this before it asks the server — asked earlier, it gets the card from before
   this browser's own save and would put that back. `maxMs` gives up waiting
   (an upload on a dead connection can hang); the caller still has to cope. */
export function whenSavesSettle(maxMs = 0): Promise<void> {
  const settled = (async () => {
    for (;;) {
      const queued = turn;
      await Promise.allSettled([queued, ...running]);
      if (queued === turn && running.size === 0) return;
    }
  })();
  if (!maxMs) return settled;
  return Promise.race([settled, new Promise<void>((done) => setTimeout(done, maxMs))]);
}

async function isLive(data: Record<string, unknown>, slug: string): Promise<boolean> {
  if (Number(data.published) === 1 || Number(data.status) === 1) return true;
  const key = `${scopedKey("dc_customer")}:${slug}`;
  if (knownLive.has(key)) return true;
  try {
    // A published SNAPSHOT means the card is already public. This is the
    // new-flow case: /api/card/:slug only knows legacy customers.json
    // cards, so it 404s for every account created through signup — which
    // made auto-publish decide their live card "isn't live" and return
    // without ever pushing their edits.
    let live = !!(await loadMySnapshot(getActiveCardId()))?.slug;
    if (!live) {
      const r = await fetch(`/api/card/${encodeURIComponent(slug)}`);
      live = r.ok && !!(await r.json())?.name;
    }
    if (live) knownLive.add(key);
    return live;
  } catch { return false; /* couldn't ask — the next save asks again */ }
}

/* The server refused the save: the card was changed from another device since
   this copy was made (or this copy can't say which version it came from). The
   owner's decision: never write over the newer card — load it, and say so.
   `quiet`: nothing of the owner's is lost by loading it, so nothing is said. */
export async function takeServerCopy(quiet = false): Promise<void> {
  try {
    const got = await pullLatestSnapshot();
    if (got) {
      // Nothing to announce when the newer version holds this very card (e.g.
      // a design change this browser made itself): nothing was lost.
      if (got.differed && !quiet) toast.warning(CHANGED_ELSEWHERE, { id: "dc-changed-elsewhere", duration: 10_000 });
      return;
    }
  } catch { /* offline, or this browser's storage is full — said below */ }
  toast.error("This card was changed on another device, but the latest version couldn't be loaded. Refresh the page before you edit again.", { id: "dc-changed-elsewhere", duration: 10_000 });
}

type AutoSaveOutcome = SnapshotSaveResult["status"] | "off";

async function runAutoSave(): Promise<AutoSaveOutcome> {
  if (isHeld() || !sender) return "off";
  // Only a card owner publishes a card. A partner (or an admin) who was once a
  // customer in this browser can still hold that card in storage — never push
  // it. Nor from an /admin page, where requests carry the admin's own session.
  if (getAuthUser()?.role !== "customer" || currentSlot() !== "main") return "off";
  const scope = scopedKey("dc_customer");
  const slugOf = (c: Record<string, unknown>) => String(c.slug || c.username || "").trim().toLowerCase();
  const data = readCustomer();
  if (slugOf(data).length < 3) return "off";
  // Don't publish until first-load hydration has SETTLED. useCardHydration
  // sets this marker when it finishes (or when it finds a card already here and
  // the server had its say). Publishing before then can snapshot a
  // half-hydrated readCustomer() — name + phone present but company, title,
  // website, address and the products/gallery/videos lists still blank — and
  // silently overwrite a good public snapshot with that stub. Gate on it.
  // (And never while the first load is marked failed: what is here then is the
  // blank sign-in record and whatever was typed into it, not the card.)
  if (localStorage.getItem(scopedKey("dc_hydrated")) !== "1" || firstLoadFailed()) return "off";
  if (!(await isLive(data, slugOf(data)))) return "off"; // never auto-activate a fresh card
  if (isHeld(scope)) return "off";

  const result = await saveCardSnapshot(sender, () => {
    // Its turn has come: the session may have changed while it waited, an
    // earlier save (or a reload of the server's copy) may have covered it —
    // or the save before it was refused and the owner is being asked.
    if (isHeld(scope) || scopedKey("dc_customer") !== scope) return null;
    if (!readUnsaved() && unsavedIn(scope) === 0) return null;
    const card = readLocalCard();
    const slug = slugOf(card.customer);
    if (slug.length < 3) return null;
    // SAFETY NET: never let auto-publish REPLACE a live card with a stub.
    // The signup seed leaves name + account email + phone and nothing else; a
    // card that is already live was published with more than that. If all the
    // "substance" fields are empty AND there is no content at all, treat this
    // as a half-loaded state rather than a real edit and skip the publish.
    // (A manual Publish still works — this only guards the automatic path.)
    const filled = (k: string) => String((card.customer as Record<string, unknown>)[k] ?? "").trim().length > 0;
    const hasSubstance =
      ["company_name", "designation", "about_us", "address", "url", "nature"].some(filled) ||
      card.products.length || card.gallery.length || card.videos.length || card.offers.length || card.qrcodes.length;
    return hasSubstance ? { slug, data: card } : null;
  });

  if (scopedKey("dc_customer") !== scope) return result.status;
  if (result.status === "conflict") await takeServerCopy();
  else if (result.status === "failed") {
    // Not swallowed: an edit that looks saved but isn't is how changes went
    // missing. The edit stays in this browser either way.
    toast.error(saveRefusal(result.error) === "taken" ? "That card link is already taken — pick another in Settings." : SAVE_FAILED, { id: "dc-save-failed" });
  }
  return result.status;
}

function autoSave(): Promise<AutoSaveOutcome> {
  const run = runAutoSave().catch((): AutoSaveOutcome => "off");
  running.add(run);
  void run.then(() => { running.delete(run); });
  return run;
}

/* Forms hold a typed field for a moment before storing it (CardStudio,
   useCardAutosave). Ask them to store it now — the page is about to go. */
function storePendingEdits(): void {
  try { window.dispatchEvent(new CustomEvent("dc:flush-edits")); } catch { /* SSR / no window */ }
}

/* The dashboard is being left for good (an admin going back to /admin, which
   signs the customer out of this browser): send what is still waiting and wait
   for it to land. False when a save didn't go through — the owner has been
   told why, and the page should stay as it is. Never waits longer than `maxMs`. */
export function finishSaves(maxMs = 10_000): Promise<boolean> {
  storePendingEdits();
  const work = (async () => {
    const pending = [...running];
    if (timer) {
      clearTimeout(timer);
      timer = null;
      pending.push(autoSave());
    }
    const outcomes = await Promise.all(pending);
    await whenSavesSettle();
    return !outcomes.some((o) => o === "conflict" || o === "failed");
  })();
  return Promise.race([work, new Promise<boolean>((done) => setTimeout(() => done(true), maxMs))]);
}

/* Auto-publish: keep a LIVE card's public page in step with dashboard edits.

   When the owner of an already-live card (a published new-flow card, or a legacy
   customers.json card that is status:1) adds or edits content, re-snapshot it to
   the server so /slug updates without a manual "Publish" click. Debounced so a
   burst of edits results in one save. Brand-new, never-published cards are left
   alone until their owner does the first intentional Publish (which also starts
   their trial) — we never auto-activate a card.

   A save happens only after a real edit (dc:content-changed) — or, on load, for
   an edit an earlier visit never got saved (dc:unsaved-changes, from
   useCardHydration; it also asks this way for the one first publish of an
   old-site card that has no card on the server yet). Opening the dashboard does
   not publish what this browser happens to hold: that is how a device with an
   old copy put it back over newer work.

   Mount once, high in the dashboard tree (ResponsiveDashboardLayout). */
export function useAutoPublish(): void {
  const client = trpc.useUtils().client;

  useEffect(() => {
    sender = (input) => client.publish.saveSnapshot.mutate(input);

    const soon = () => {
      if (timer) clearTimeout(timer);
      // Cleared inside the callback: once the save has gone out there must be
      // nothing left for a page change to flush a second time.
      timer = setTimeout(() => { timer = null; void autoSave(); }, 1500);
    };
    const now = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      void autoSave();
    };
    const onEdit = () => { const card = scopedKey("dc_customer"); unsavedHere.set(card, unsavedIn(card) + 1); soon(); };
    const onUnsaved = () => { void autoSave(); };
    // The server's copy replaced the local one: nothing here is unsaved now.
    const onReloaded = () => { unsavedHere.delete(scopedKey("dc_customer")); };
    // The tab is being hidden or left: a field still held by its form is
    // stored, and a save still waiting out the pause above goes now. A phone
    // can drop a hidden page without ever running the timer.
    const onLeave = () => { storePendingEdits(); now(); };
    const onHidden = () => { if (document.visibilityState === "hidden") onLeave(); };

    window.addEventListener("dc:content-changed", onEdit);
    window.addEventListener("dc:unsaved-changes", onUnsaved);
    window.addEventListener("dc:content-reloaded", onReloaded);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      window.removeEventListener("dc:content-changed", onEdit);
      window.removeEventListener("dc:unsaved-changes", onUnsaved);
      window.removeEventListener("dc:content-reloaded", onReloaded);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onHidden);
      // Flush a pending debounced save instead of dropping it, so an edit made
      // right before navigating away (e.g. leaving the dashboard to view the
      // public card) still reaches the server.
      now();
    };
  }, [client]);
}
