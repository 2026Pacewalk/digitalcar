import { describe, it, expect } from "vitest";
import {
  istDayKey, istMonthKey, istDayStart, istMonthStart, lastMonths, lastDays,
  zeroFill, growthPct, sameDaysLastMonth, windows, isCardSlug, cardPath, balanceTotals, oldSiteSkip, DAY_MS,
} from "./admin-dashboard";

/* The dashboard counts in India time whatever the server's clock says. India's
   next day (and month) begins at 18:30 UTC, so that is where the edge cases
   sit. utc() and ist() read a wall-clock time in that zone. */
const utc = (s: string) => Date.parse(`${s}Z`);
const ist = (s: string) => Date.parse(`${s}+05:30`);

describe("India day and month keys", () => {
  it("a new India day starts at 18:30 UTC", () => {
    expect(istDayKey(utc("2026-09-30T18:29:59"))).toBe("2026-09-30");
    expect(istDayKey(utc("2026-09-30T18:30:00"))).toBe("2026-10-01");
  });

  it("the month rolls over at the same moment", () => {
    expect(istMonthKey(utc("2026-09-30T18:29:59"))).toBe("2026-09");
    expect(istMonthKey(utc("2026-09-30T18:30:00"))).toBe("2026-10");
    expect(istMonthKey(utc("2026-12-31T18:30:00"))).toBe("2027-01");
  });

  it("day and month starts are India midnight", () => {
    expect(istDayStart(utc("2026-10-01T02:00:00"))).toBe(ist("2026-10-01T00:00:00"));
    // 23:59 IST on the 30th still belongs to the 30th.
    expect(istDayStart(ist("2026-09-30T23:59:00"))).toBe(ist("2026-09-30T00:00:00"));
    expect(istMonthStart(ist("2026-09-28T13:45:00"))).toBe(ist("2026-09-01T00:00:00"));
    expect(istMonthStart(ist("2026-09-28T13:45:00"), -1)).toBe(ist("2026-08-01T00:00:00"));
    expect(istMonthStart(ist("2026-01-15T10:00:00"), -1)).toBe(ist("2025-12-01T00:00:00"));
    expect(istMonthStart(ist("2026-01-15T10:00:00"), -11)).toBe(ist("2025-02-01T00:00:00"));
  });
});

describe("series", () => {
  it("the last 12 months end with this India month, oldest first", () => {
    const m = lastMonths(ist("2026-09-28T09:00:00"), 12);
    expect(m).toHaveLength(12);
    expect(m[0]).toEqual({ ym: "2025-10", label: "Oct ’25" });
    expect(m[11]).toEqual({ ym: "2026-09", label: "Sep ’26" });
    expect(new Set(m.map((p) => p.ym)).size).toBe(12);
  });

  it("uses India's month at the 18:30 UTC edge", () => {
    expect(lastMonths(utc("2026-09-30T18:30:00"), 1)[0].ym).toBe("2026-10");
    expect(lastMonths(utc("2026-09-30T18:29:00"), 1)[0].ym).toBe("2026-09");
  });

  it("the last 30 days end today, with no gaps", () => {
    const d = lastDays(ist("2026-10-02T08:00:00"), 30);
    expect(d).toHaveLength(30);
    expect(d[29]).toEqual({ date: "2026-10-02", label: "2 Oct" });
    expect(d[0]).toEqual({ date: "2026-09-03", label: "3 Sep" });
    for (let i = 1; i < d.length; i++) expect(Date.parse(d[i].date) - Date.parse(d[i - 1].date)).toBe(DAY_MS);
  });

  it("zero-fills points with no row, keeping order", () => {
    const pts = [{ ym: "2026-07" }, { ym: "2026-08" }, { ym: "2026-09" }];
    const rows = new Map([["2026-09", { total: 5 }], ["2026-07", { total: 2 }]]);
    expect(zeroFill(pts, (p) => p.ym, rows, { total: 0 })).toEqual([
      { ym: "2026-07", total: 2 }, { ym: "2026-08", total: 0 }, { ym: "2026-09", total: 5 },
    ]);
  });
});

describe("comparisons", () => {
  it("growthPct is null when there is nothing to compare with", () => {
    expect(growthPct(500, 0)).toBeNull();
    expect(growthPct(0, 0)).toBeNull();
    expect(growthPct(150, 100)).toBe(50);
    expect(growthPct(50, 200)).toBe(-75);
    expect(growthPct(1, 3)).toBe(-66.7);
  });

  it("same days last month stops at the same point in the month", () => {
    const now = ist("2026-09-10T12:00:00");
    const { from, to } = sameDaysLastMonth(now);
    expect(from).toBe(ist("2026-08-01T00:00:00"));
    expect(to).toBe(ist("2026-08-10T12:00:00"));
  });

  it("never runs into this month when last month is shorter", () => {
    const { from, to } = sameDaysLastMonth(ist("2026-03-31T20:00:00"));
    expect(from).toBe(ist("2026-02-01T00:00:00"));
    expect(to).toBe(ist("2026-03-01T00:00:00"));
  });

  it("the 30-day windows are whole India days that add up to the chart", () => {
    const now = ist("2026-09-28T09:00:00");
    const w = windows(now);
    expect(w.today).toBe(ist("2026-09-28T00:00:00"));
    expect(w.last7).toBe(ist("2026-09-22T00:00:00"));
    expect(w.day30).toBe(Date.parse(`${lastDays(now, 30)[0].date}T00:00:00+05:30`));
    expect(w.day30 - w.day60).toBe(30 * DAY_MS);
    expect(w.months12).toBe(ist("2025-10-01T00:00:00"));
  });

  it("windows up to now end at India midnight tonight", () => {
    const w = windows(ist("2026-09-28T09:00:00"));
    expect(w.tomorrow).toBe(ist("2026-09-29T00:00:00"));
    // A payment the team dates today is stored at noon: inside, even before noon.
    expect(ist("2026-09-28T12:00:00")).toBeLessThan(w.tomorrow);
    // One dated tomorrow is not.
    expect(ist("2026-09-29T12:00:00")).toBeGreaterThanOrEqual(w.tomorrow);
    // Late on the 30th in India (UTC's same day) the window still ends at the 1st.
    expect(windows(utc("2026-09-30T18:29:00")).tomorrow).toBe(ist("2026-10-01T00:00:00"));
  });
});

describe("most-viewed cards", () => {
  it("only card addresses are linked", () => {
    expect(isCardSlug("pacewalk")).toBe(true);
    expect(isCardSlug("dr-rao_clinic2")).toBe(true);
    expect(isCardSlug("9to5")).toBe(true);
    expect(isCardSlug("/evil.example")).toBe(false);
    expect(isCardSlug("\\evil.example")).toBe(false);
    expect(isCardSlug("evil.example")).toBe(false);
    expect(isCardSlug("-lead")).toBe(true); // the publish flow allows a leading - or _
    expect(isCardSlug("a/b")).toBe(false);
    expect(isCardSlug("Upper")).toBe(false);
    expect(isCardSlug("a b")).toBe(false);
    expect(isCardSlug("")).toBe(false);
    expect(isCardSlug("a".repeat(191))).toBe(true);
    expect(isCardSlug("a".repeat(192))).toBe(false);
  });

  it("links stay on this site", () => {
    expect(cardPath("pacewalk")).toBe("/pacewalk");
    expect(cardPath("/evil.example")).toBe("/%2Fevil.example");
    expect(cardPath("\\evil.example")).toBe("/%5Cevil.example");
  });
});

describe("old-site plan holders", () => {
  const legacy = [
    { id: 1, email: "On.Plan@example.com" },
    { id: 2, email: "erased@example.com" },
    { id: 3, email: "twice@example.com" },
    { id: 4, email: "twice@example.com" },
    { id: 5, email: " kept@example.com " },
    { id: 6 },
  ];

  it("leaves out people on a plan here and customers the admin hid", () => {
    const skip = oldSiteSkip(["on.plan@example.com"], legacy, new Set(["2", "3", "6"]));
    expect([...skip].sort()).toEqual(["erased@example.com", "on.plan@example.com"]);
  });

  it("keeps an email that still has a row shown, and works with no old-site list", () => {
    expect(oldSiteSkip([], legacy, new Set(["3"])).has("twice@example.com")).toBe(false);
    expect(oldSiteSkip([], legacy, new Set(["5"])).has("kept@example.com")).toBe(true);
    expect([...oldSiteSkip(["a@example.com"], [], new Set(["1"]))]).toEqual(["a@example.com"]);
  });
});

describe("reseller balances", () => {
  it("credit never hides what another partner owes", () => {
    // A owes 5,000, B is 6,000 in credit: the net says settled, but 5,000 is still to collect.
    expect(balanceTotals([5000, -6000])).toEqual({ outstanding: -1000, toCollect: 5000, credit: 6000 });
  });

  it("settled partners add nothing, and paise add up exactly", () => {
    expect(balanceTotals([0, 0])).toEqual({ outstanding: 0, toCollect: 0, credit: 0 });
    expect(balanceTotals([])).toEqual({ outstanding: 0, toCollect: 0, credit: 0 });
    expect(balanceTotals([799.2, 799.2, 799.2, -0.1])).toEqual({ outstanding: 2397.5, toCollect: 2397.6, credit: 0.1 });
  });
});
