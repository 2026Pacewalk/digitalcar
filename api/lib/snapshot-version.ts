/* The version of a published card: published_cards.updated_at.

   Every device keeps its own copy of the whole card and saves it whole, so a
   save has to say which version that copy was made from. A copy made from an
   older version is refused rather than written over the newer card — that is
   what used to bring old pictures back. Pure functions, so the rule is tested
   without a database (snapshot-version.test.ts). */

/** The column keeps whole seconds. */
const STEP_MS = 1000;

/** The dashboard that sends a base with every save says so with `client: 2`.
    A page left open from before the rule sends no `client` at all. */
const BASE_RULE_CLIENT = 2;

/** Until this moment a save with no base from a page that sends no `client` —
    a dashboard still open from before the base rule, which answers a refusal
    by sending the same card again without a base — goes through as it did
    before the rule. Otherwise that page would stop saving without a word and
    lose its edits on its next load. From this moment on it is refused like
    any other save without a base. Once the date has passed, this constant,
    the "ok_legacy" answer and the `now` argument can be deleted. */
export const OLD_PAGE_SAVE_CUTOFF = "2026-10-13T00:00:00+05:30";

type Stamp = Date | string | number | null | undefined;

function toMs(v: Stamp): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

export type SnapshotSaveCheck = "ok" | "ok_legacy" | "stale" | "no_base";

/** May a save replace the card stored at `stored`?
    - `force` is the owner's confirmed "publish mine anyway" — always allowed.
    - A base older than the stored card is refused: someone saved in between.
      That holds for every client, old page or new.
    - No base (or one that isn't a date) is refused when the save comes from a
      dashboard that knows the rule (`client` 2 or later): a client that
      doesn't say what its copy is based on may not overwrite the card.
    - No base and no `client` is an older page: let through, as "ok_legacy",
      until OLD_PAGE_SAVE_CUTOFF, and refused from then on.
    One-sided on purpose: a stored card OLDER than the base (a restored
    database) never blocks a save. A difference within the column's precision
    is not a difference. */
export function checkSnapshotSave(
  stored: Stamp,
  baseTs: string | null | undefined,
  from: { force?: boolean; client?: number; now?: number } = {},
): SnapshotSaveCheck {
  if (from.force === true) return "ok";
  const base = baseTs ? Date.parse(baseTs) : NaN;
  if (Number.isFinite(base)) return toMs(stored) - base >= STEP_MS ? "stale" : "ok";
  if ((from.client ?? 0) >= BASE_RULE_CLIENT) return "no_base";
  return (from.now ?? Date.now()) < Date.parse(OLD_PAGE_SAVE_CUTOFF) ? "ok_legacy" : "no_base";
}

/** The stamp for a write over the card stored at `stored`: now, but always at
    least one step later than the stamp it replaces. So every write gets a
    stamp of its own — two saves in the same second, or a server clock that
    runs behind the database's, can never leave an older copy looking current.
    A whole second, so it is stored exactly as given. */
export function nextSnapshotStamp(stored: Stamp, now: number = Date.now()): Date {
  const floor = (n: number) => Math.floor(n / STEP_MS) * STEP_MS;
  return new Date(Math.max(floor(now), floor(toMs(stored)) + STEP_MS));
}
