import { describe, it, expect } from "vitest";
import { checkSnapshotSave, nextSnapshotStamp, OLD_PAGE_SAVE_CUTOFF } from "./snapshot-version";

const T = "2026-10-01T10:00:00.000Z";
const at = (iso: string, plusMs = 0) => new Date(Date.parse(iso) + plusMs);

// The dashboard that knows the rule, and a page left open from before it — on
// either side of the day old pages stop being let through.
const CUTOFF = Date.parse(OLD_PAGE_SAVE_CUTOFF);
const NEW = { client: 2 };
const OLD_BEFORE = { now: CUTOFF - 1 };
const OLD_AFTER = { now: CUTOFF };

describe("may a save replace the stored card", () => {
  it("yes, when it was made from the stored version", () => {
    expect(checkSnapshotSave(at(T), T, NEW)).toBe("ok");
    expect(checkSnapshotSave(T, T, NEW)).toBe("ok");
    expect(checkSnapshotSave(Date.parse(T), T, NEW)).toBe("ok");
  });

  it("no, when someone saved since — however long ago the copy was made", () => {
    expect(checkSnapshotSave(at(T, 1000), T, NEW)).toBe("stale");
    expect(checkSnapshotSave(at(T, 5000), T, NEW)).toBe("stale");   // inside the old 10 s allowance
    expect(checkSnapshotSave(at(T, 86_400_000), T, NEW)).toBe("stale");
  });

  it("a difference below the column's whole seconds is not a difference", () => {
    expect(checkSnapshotSave(at(T, 999), T, NEW)).toBe("ok");
    expect(checkSnapshotSave(at(T), "2026-10-01T10:00:00.400Z", NEW)).toBe("ok");
  });

  it("an older stored card (a restored database) never blocks a save", () => {
    expect(checkSnapshotSave(at(T, -3_600_000), T, NEW)).toBe("ok");
    expect(checkSnapshotSave(null, T, NEW)).toBe("ok");
    expect(checkSnapshotSave("not a date", T, NEW)).toBe("ok");
  });

  it("no, when the dashboard doesn't say what its copy is based on", () => {
    expect(checkSnapshotSave(at(T), undefined, NEW)).toBe("no_base");
    expect(checkSnapshotSave(at(T), null, NEW)).toBe("no_base");
    expect(checkSnapshotSave(at(T), "", NEW)).toBe("no_base");
    expect(checkSnapshotSave(at(T), "undefined", NEW)).toBe("no_base");
    expect(checkSnapshotSave(at(T), undefined, { ...NEW, force: false })).toBe("no_base");
    expect(checkSnapshotSave(at(T), undefined, { client: 3 })).toBe("no_base");
    // The day makes no difference to it.
    expect(checkSnapshotSave(at(T), undefined, { ...NEW, ...OLD_BEFORE })).toBe("no_base");
    expect(checkSnapshotSave(at(T), undefined, { ...NEW, ...OLD_AFTER })).toBe("no_base");
  });

  it("the owner's confirmed overwrite always goes through", () => {
    expect(checkSnapshotSave(at(T), undefined, { ...NEW, force: true })).toBe("ok");
    expect(checkSnapshotSave(at(T, 86_400_000), T, { ...NEW, force: true })).toBe("ok");
    expect(checkSnapshotSave(at(T), "garbage", { ...NEW, force: true })).toBe("ok");
    expect(checkSnapshotSave(at(T), undefined, { ...OLD_AFTER, force: true })).toBe("ok");
  });
});

describe("a page still open from before the rule (it sends no client)", () => {
  it("stops being let through at midnight on 13 October, India time", () => {
    expect(CUTOFF).toBe(Date.parse("2026-10-12T18:30:00.000Z"));
  });

  it("is let through without a base until then, and told apart from a checked save", () => {
    expect(checkSnapshotSave(at(T), undefined, OLD_BEFORE)).toBe("ok_legacy");
    expect(checkSnapshotSave(at(T), null, OLD_BEFORE)).toBe("ok_legacy");
    expect(checkSnapshotSave(at(T), "", OLD_BEFORE)).toBe("ok_legacy");
    expect(checkSnapshotSave(at(T), "not-a-date", OLD_BEFORE)).toBe("ok_legacy");
    expect(checkSnapshotSave(at(T, 86_400_000), undefined, OLD_BEFORE)).toBe("ok_legacy");
    // Anything below 2 is an older page too.
    expect(checkSnapshotSave(at(T), undefined, { ...OLD_BEFORE, client: 1 })).toBe("ok_legacy");
  });

  it("is refused without a base from then on", () => {
    expect(checkSnapshotSave(at(T), undefined, OLD_AFTER)).toBe("no_base");
    expect(checkSnapshotSave(at(T), "", { now: CUTOFF + 86_400_000 })).toBe("no_base");
    expect(checkSnapshotSave(at(T), undefined, { ...OLD_AFTER, client: 1 })).toBe("no_base");
  });

  it("has its base checked like anyone else's, before and after", () => {
    for (const old of [OLD_BEFORE, OLD_AFTER]) {
      expect(checkSnapshotSave(at(T), T, old)).toBe("ok");
      expect(checkSnapshotSave(at(T, 999), T, old)).toBe("ok");
      expect(checkSnapshotSave(at(T, 1000), T, old)).toBe("stale");
      expect(checkSnapshotSave(at(T, -3_600_000), T, old)).toBe("ok");
    }
  });

  it("goes by today's date when none is given", () => {
    const today = Date.now() < CUTOFF ? "ok_legacy" : "no_base";
    expect(checkSnapshotSave(at(T), undefined)).toBe(today);
    expect(checkSnapshotSave(at(T), undefined, {})).toBe(today);
  });
});

describe("the stamp a write gets", () => {
  const stored = at(T);

  it("is the current time, to the second", () => {
    expect(nextSnapshotStamp(stored, Date.parse(T) + 90_500).toISOString()).toBe("2026-10-01T10:01:30.000Z");
  });

  it("is always later than the one it replaces", () => {
    // Same second, and a clock that is behind the stored stamp.
    expect(nextSnapshotStamp(stored, Date.parse(T) + 300).toISOString()).toBe("2026-10-01T10:00:01.000Z");
    expect(nextSnapshotStamp(stored, Date.parse(T) - 19_800_000).toISOString()).toBe("2026-10-01T10:00:01.000Z");
    expect(nextSnapshotStamp("2026-10-01T10:00:00.700Z", Date.parse(T) + 800).toISOString()).toBe("2026-10-01T10:00:01.000Z");
  });

  it("so a copy made before any write is always refused after it", () => {
    let row = stored;
    for (const now of [100, 200, 300, 5000]) {
      const before = row.toISOString();
      row = nextSnapshotStamp(row, Date.parse(T) + now);
      expect(checkSnapshotSave(row, before, NEW)).toBe("stale");
      expect(checkSnapshotSave(row, row.toISOString(), NEW)).toBe("ok");
    }
  });

  it("starts from now when there is nothing stored", () => {
    expect(nextSnapshotStamp(null, Date.parse(T) + 250).toISOString()).toBe(T);
  });
});
