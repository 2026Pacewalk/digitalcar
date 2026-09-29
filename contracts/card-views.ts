/* Extra card views: Admin → Customers → ⋮ → Card views (super admin only).
 *
 * A card can carry extra views on top of the visits it really had. They are
 * added to the number GET /api/views/:slug answers, which is the view counter
 * on the public card, the total on the owner's dashboard, and Card Studio and
 * its live preview. Real visits stay in card_events untouched, and everything
 * that reads card_events (the owner's Analytics page, the admin dashboard, the
 * funnel) keeps counting real visits only. Extra views are never written into
 * card_events.
 *
 * Stored in card_view_boosts (db/schema.ts); read and saved by
 * api/card-views-router.ts; added to the count by api/lib/card-views.ts. */

export const EXTRA_VIEWS_MAX = 10_000_000;
export const VIEW_NOTE_MAX = 200;
/** The quick "+N" buttons in the modal. */
export const EXTRA_VIEW_STEPS = [100, 500, 1000, 5000] as const;
/** The activity-log action for a change, which the modal's history reads back. */
export const CARD_VIEWS_ACTION = "Changed card views";

export type CardViewsChange = { at: string; by: string; summary: string | null };

export type CardViews = {
  slug: string;
  /** Tracked visits: the card's "view" events, all time. */
  realViews: number;
  /** Added by the super admin; 0 when none. */
  extraViews: number;
  /** real + extra: what the card and the owner's dashboard show. */
  shownViews: number;
  /** The super admin's private note. */
  note: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  /** What their card on the old site showed, when the old list has a number for it. */
  oldSiteViews: number | null;
  /** The last few changes, newest first. */
  recent: CardViewsChange[];
};

/** Indian digit grouping: 1234567 → "12,34,567". */
export const groupIn = (n: number): string => Math.round(n).toLocaleString("en-IN");

/** A number of extra views the server accepts: a whole number, 0 … 1 crore. */
export function isExtraViews(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= EXTRA_VIEWS_MAX;
}

/** What was typed in the box, read the way the server will take it. Commas
    and spaces are allowed ("12,000"), a blank box means 0. */
export function readExtraViews(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = text.replace(/[\s,_]/g, "");
  if (!t) return { ok: true, value: 0 };
  if (/^-/.test(t)) return { ok: false, error: "Extra views can't be below 0." };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Use a whole number of views, like 1200." };
  const value = Number(t);
  if (!isExtraViews(value)) return { ok: false, error: `Extra views can be at most ${groupIn(EXTRA_VIEWS_MAX)}.` };
  return { ok: true, value };
}

/** One of the "+N" buttons: adds `step`, never past the maximum. */
export const addExtraViews = (current: number, step: number): number =>
  Math.min(EXTRA_VIEWS_MAX, Math.max(0, Math.floor(current) || 0) + Math.max(0, Math.floor(step) || 0));

// Bidirectional overrides and isolates can make a note read differently from
// what it says, so they go too.
const BIDI = /[‪-‮⁦-⁩]/g;

/** The private note as it is stored: control characters (line breaks, tabs
    and the like) become spaces, runs of spaces become one, ends trimmed;
    nothing left → null. The caller refuses one over VIEW_NOTE_MAX. */
export function cleanViewNote(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(BIDI, "").replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return s || null;
}

/** The activity-log line for a change: "pacewalk: extra views 11,542 → 12,000". */
export function viewsChangeSummary(slug: string, from: number, to: number, noteChanged: boolean): string {
  if (from === to) return `${slug}: note changed`;
  return `${slug}: extra views ${groupIn(from)} → ${groupIn(to)}${noteChanged ? ", note changed" : ""}`;
}
