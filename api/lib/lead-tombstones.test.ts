import { describe, expect, it } from "vitest";
import { legacyLeadKeyHash } from "./lead-tombstones";

// The deploy-time import is plain JS (db/import-legacy-enquiries.mjs). Its hash
// must match the app's exactly, or a deleted enquiry would come back.
const importerPath = "../../db/import-legacy-enquiries.mjs";

describe("legacy lead tombstones", () => {
  it("the app and the deploy-time import hash a lead identically", async () => {
    const importer = (await import(/* @vite-ignore */ importerPath)) as { legacyLeadKeyHash: (u: number, n: string, d: string) => string };
    for (const [u, n, d] of [
      [7, "Raman Arora", "2023-09-22 10:15:00"],
      [7, "Anonymous", "2024-08-13 00:00:00"],
      [42, "रमन अरोड़ा", "2020-01-01 00:00:00"],
    ] as const) {
      expect(importer.legacyLeadKeyHash(u, n, d)).toBe(legacyLeadKeyHash(u, n, d));
    }
  });

  it("is a fixed-length hash that tells owners, names and times apart", () => {
    const base = legacyLeadKeyHash(7, "Raman Arora", "2023-09-22 10:15:00");
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(legacyLeadKeyHash(8, "Raman Arora", "2023-09-22 10:15:00")).not.toBe(base);
    expect(legacyLeadKeyHash(7, "Raman Arora ", "2023-09-22 10:15:00")).not.toBe(base);
    expect(legacyLeadKeyHash(7, "Raman Arora", "2023-09-22 10:15:01")).not.toBe(base);
  });
});
