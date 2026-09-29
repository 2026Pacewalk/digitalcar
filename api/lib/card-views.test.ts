import { afterEach, describe, it, expect, vi } from "vitest";
import {
  EXTRA_VIEWS_MAX, VIEW_NOTE_MAX, addExtraViews, cleanViewNote, groupIn, isExtraViews, readExtraViews, viewsChangeSummary,
} from "@contracts/card-views";
import { extraViewsFor, forgetExtraViews, mergedBoost, oldSiteViewsOf } from "./card-views";
import { grantForPath } from "./staff-access";

describe("who may change card views", () => {
  it("is never a staff module, so it stays with the super admin", () => {
    expect(grantForPath("cardViews.get")).toBeNull();
    expect(grantForPath("cardViews.set")).toBeNull();
  });
});

describe("how many extra views", () => {
  it("takes whole numbers from 0 to 1 crore", () => {
    expect(isExtraViews(0)).toBe(true);
    expect(isExtraViews(11542)).toBe(true);
    expect(isExtraViews(EXTRA_VIEWS_MAX)).toBe(true);
    expect(isExtraViews(EXTRA_VIEWS_MAX + 1)).toBe(false);
    expect(isExtraViews(-1)).toBe(false);
    expect(isExtraViews(1.5)).toBe(false);
    expect(isExtraViews(Number.NaN)).toBe(false);
    expect(isExtraViews(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isExtraViews("500")).toBe(false);
  });

  it("reads the box the way the server will take it", () => {
    expect(readExtraViews("12,000")).toEqual({ ok: true, value: 12000 });
    expect(readExtraViews(" 1 00 000 ")).toEqual({ ok: true, value: 100000 });
    expect(readExtraViews("")).toEqual({ ok: true, value: 0 });
    expect(readExtraViews("10000000")).toEqual({ ok: true, value: EXTRA_VIEWS_MAX });
    expect(readExtraViews("10000001")).toMatchObject({ ok: false, error: expect.stringContaining("at most 1,00,00,000") });
    expect(readExtraViews("-5")).toMatchObject({ ok: false, error: expect.stringContaining("below 0") });
    expect(readExtraViews("1.5")).toMatchObject({ ok: false, error: expect.stringContaining("whole number") });
    expect(readExtraViews("1e3")).toMatchObject({ ok: false });
    expect(readExtraViews("abc")).toMatchObject({ ok: false });
  });

  it("the +N buttons stop at the maximum", () => {
    expect(addExtraViews(11542, 500)).toBe(12042);
    expect(addExtraViews(0, 100)).toBe(100);
    expect(addExtraViews(EXTRA_VIEWS_MAX - 50, 100)).toBe(EXTRA_VIEWS_MAX);
    expect(addExtraViews(-10, 100)).toBe(100);
  });

  it("groups digits the Indian way", () => {
    expect(groupIn(11542)).toBe("11,542");
    expect(groupIn(1234567)).toBe("12,34,567");
    expect(groupIn(EXTRA_VIEWS_MAX)).toBe("1,00,00,000");
    expect(groupIn(0)).toBe("0");
  });
});

describe("the private note", () => {
  it("is trimmed, with control characters and runs of spaces made single spaces", () => {
    expect(cleanViewNote("  Views from the old site  ")).toBe("Views from the old site");
    expect(cleanViewNote("line one\nline two\ttab\r\n")).toBe("line one line two tab");
    expect(cleanViewNote("a\u0000b\u0007c\u007Fd")).toBe("a b c d");
    expect(cleanViewNote("many     spaces")).toBe("many spaces");
  });

  it("loses bidirectional overrides", () => {
    expect(cleanViewNote("abc‮def⁦g⁩")).toBe("abcdefg");
  });

  it("is null when nothing is left, or it isn't text", () => {
    expect(cleanViewNote("")).toBeNull();
    expect(cleanViewNote(" \n\t ")).toBeNull();
    expect(cleanViewNote(undefined)).toBeNull();
    expect(cleanViewNote(42)).toBeNull();
  });

  it("keeps a note of exactly the limit whole", () => {
    const n = "x".repeat(VIEW_NOTE_MAX);
    expect(cleanViewNote(`  ${n}  `)).toBe(n);
  });
});

describe("the activity-log line", () => {
  it("names the card and both numbers", () => {
    expect(viewsChangeSummary("pacewalk", 11542, 12000, false)).toBe("pacewalk: extra views 11,542 → 12,000");
    expect(viewsChangeSummary("pacewalk", 11542, 0, true)).toBe("pacewalk: extra views 11,542 → 0, note changed");
    expect(viewsChangeSummary("pacewalk", 500, 500, true)).toBe("pacewalk: note changed");
  });
});

describe("extra views moving with a card to a new address", () => {
  it("land on a new address that has none", () => {
    expect(mergedBoost({ extraViews: 5000, note: "Old site" }, null)).toEqual({ extraViews: 5000, note: "Old site" });
    expect(mergedBoost({ extraViews: 5000, note: null }, { extraViews: 0, note: null })).toEqual({ extraViews: 5000, note: null });
  });

  it("add up with what the new address has, and keep its note", () => {
    expect(mergedBoost({ extraViews: 5000, note: "Moved" }, { extraViews: 300, note: "Already here" }))
      .toEqual({ extraViews: 5300, note: "Already here" });
  });

  it("bring their note when the new address has none", () => {
    expect(mergedBoost({ extraViews: 5000, note: "Moved" }, { extraViews: 300, note: null })).toEqual({ extraViews: 5300, note: "Moved" });
    expect(mergedBoost({ extraViews: 0, note: "Only a note" }, null)).toEqual({ extraViews: 0, note: "Only a note" });
  });

  it("never go past the maximum, or below 0", () => {
    expect(mergedBoost({ extraViews: EXTRA_VIEWS_MAX, note: null }, { extraViews: 10, note: null }).extraViews).toBe(EXTRA_VIEWS_MAX);
    expect(mergedBoost({ extraViews: -5, note: null }, { extraViews: 20, note: null }).extraViews).toBe(20);
    expect(mergedBoost({ extraViews: Number.NaN, note: null }, null)).toEqual({ extraViews: 0, note: null });
  });

  it("read numbers the database hands back as text", () => {
    expect(mergedBoost({ extraViews: "1200" as unknown as number, note: null }, { extraViews: "34" as unknown as number, note: null }).extraViews).toBe(1234);
  });
});

describe("the old site's number", () => {
  const rows = [
    { slug: "pacewalk", views: 5623, password: "never-read" },
    { slug: "Toys-Hub", views: "42" },
    { slug: "zero", views: 0 },
    { slug: "minus", views: -3 },
    { slug: "junk", views: "lots" },
    { slug: "frac", views: 12.9 },
    null,
    "not a row",
  ];

  it("is the positive views of the matching row, and only the number", () => {
    expect(oldSiteViewsOf(rows, "pacewalk")).toBe(5623);
    expect(oldSiteViewsOf(rows, "toys-hub")).toBe(42);
    expect(oldSiteViewsOf(rows, "frac")).toBe(12);
  });

  it("is null for no row, or no positive number", () => {
    expect(oldSiteViewsOf(rows, "nobody")).toBeNull();
    expect(oldSiteViewsOf(rows, "zero")).toBeNull();
    expect(oldSiteViewsOf(rows, "minus")).toBeNull();
    expect(oldSiteViewsOf(rows, "junk")).toBeNull();
    expect(oldSiteViewsOf(rows, "")).toBeNull();
    expect(oldSiteViewsOf([], "pacewalk")).toBeNull();
  });
});

/* extraViewsFor against a stand-in database: select().from().where().limit()
   answers with whatever `answer` gives, and the reads are counted. */
function fakeDb(answer: () => Promise<unknown[]>) {
  const state = { reads: 0 };
  const chain = { from: () => chain, where: () => chain, limit: () => { state.reads++; return answer(); } };
  const db = { select: () => chain } as unknown as Parameters<typeof extraViewsFor>[0];
  return { db, state };
}

describe("extra views on /api/views", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("reads a card once a minute", async () => {
    let n = 300;
    const { db, state } = fakeDb(async () => [{ n }]);
    expect(await extraViewsFor(db, "cache-a")).toBe(300);
    n = 400;
    expect(await extraViewsFor(db, "cache-a")).toBe(300);
    expect(state.reads).toBe(1);
  });

  it("shows a saved number at once", async () => {
    let n = 300;
    const { db, state } = fakeDb(async () => [{ n }]);
    expect(await extraViewsFor(db, "cache-b")).toBe(300);
    n = 12000;
    forgetExtraViews("cache-b");
    expect(await extraViewsFor(db, "cache-b")).toBe(12000);
    expect(state.reads).toBe(2);
  });

  it("is 0 for a card with no row, and never asks about a slug no card could have", async () => {
    const { db, state } = fakeDb(async () => []);
    expect(await extraViewsFor(db, "cache-none")).toBe(0);
    expect(await extraViewsFor(db, "not a card!")).toBe(0);
    expect(await extraViewsFor(db, "../etc")).toBe(0);
    expect(state.reads).toBe(1);
  });

  it("keeps the last known number when the database can't be read", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T10:00:00Z"));
    let fail = false;
    const { db } = fakeDb(async () => { if (fail) throw new Error("down"); return [{ n: 700 }]; });
    expect(await extraViewsFor(db, "cache-c")).toBe(700);
    fail = true;
    vi.setSystemTime(new Date("2026-09-29T10:01:01Z"));
    expect(await extraViewsFor(db, "cache-c")).toBe(700);
    expect(await extraViewsFor(db, "cache-d")).toBe(0);
  });

  it("a read that started before a save doesn't bring the old number back", async () => {
    let release: (rows: unknown[]) => void = () => {};
    let n = 100;
    const { db } = fakeDb(() => (n === 100 ? new Promise((r) => { release = r; }) : Promise.resolve([{ n }])));
    const slow = extraViewsFor(db, "cache-e");
    n = 900;
    forgetExtraViews("cache-e");
    release([{ n: 100 }]);
    expect(await slow).toBe(100);
    expect(await extraViewsFor(db, "cache-e")).toBe(900);
  });
});
