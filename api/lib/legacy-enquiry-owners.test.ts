import { describe, expect, it } from "vitest";

// Who the deploy-time import (db/import-legacy-enquiries.mjs, plain JS) hands
// an old-site enquiry to, by the enquiry's `uname`.
const importerPath = "../../db/import-legacy-enquiries.mjs";

type Owner = { userId: number; cardId: number | null } | null;
type Resolve = (input: {
  customers: { id?: unknown; username?: string; slug?: string; email?: string }[];
  hiddenIds: Iterable<string | number>;
  userIdByEmail: Map<string, number>;
  cards: { slug: string; userId: number; cardId: number }[];
  publishedCards: { slug: string; userId: number }[];
}) => Map<string, Owner>;

const load = async () => ((await import(/* @vite-ignore */ importerPath)) as { legacyEnquiryOwners: Resolve }).legacyEnquiryOwners;

// Legacy customer 11 ("asha") has an account (user 7); 12 ("ravi") has none;
// 13 ("meena") was erased. User 99 is someone new whose card took an old name.
const customers = [
  { id: 11, username: "asha123", slug: "asha-sweets", email: "Asha@Example.com " },
  { id: 12, username: "ravi77", slug: "ravi-tailors", email: "ravi@example.com" },
  { id: 13, username: "meena5", slug: "meena-salon", email: "meena@example.com" },
];
const userIdByEmail = new Map([["asha@example.com", 7], ["meena@example.com", 8], ["new@example.com", 99]]);

async function resolve(over: Partial<Parameters<Resolve>[0]> = {}) {
  return (await load())({ customers, hiddenIds: ["13"], userIdByEmail, cards: [], publishedCards: [], ...over });
}

describe("legacy enquiry owners", () => {
  it("a legacy username wins over a new card published at the same address", async () => {
    const owners = await resolve({ publishedCards: [{ slug: "asha123", userId: 99 }] });
    expect(owners.get("asha123")).toEqual({ userId: 7, cardId: null });
    expect(owners.get("asha-sweets")).toEqual({ userId: 7, cardId: null });
  });

  it("a legacy name whose customer has no account belongs to nobody — never to a card there", async () => {
    const owners = await resolve({
      cards: [{ slug: "ravi77", userId: 99, cardId: 5 }],
      publishedCards: [{ slug: "ravi-tailors", userId: 99 }],
    });
    expect(owners.get("ravi77")).toBeNull();
    expect(owners.get("ravi-tailors")).toBeNull();
  });

  it("an erased (hidden) legacy customer belongs to nobody, even when the email has an account again", async () => {
    const owners = await resolve({ publishedCards: [{ slug: "meena5", userId: 99 }] });
    expect(owners.get("meena5")).toBeNull();
    expect(owners.get("meena-salon")).toBeNull();
    // Hidden ids arrive as numbers or strings.
    expect((await resolve({ hiddenIds: [13] })).get("meena5")).toBeNull();
    expect((await resolve({ hiddenIds: [] })).get("meena5")).toEqual({ userId: 8, cardId: null });
  });

  it("a name the old site never had resolves through cards, then published cards", async () => {
    const owners = await resolve({
      cards: [{ slug: "fresh-card", userId: 99, cardId: 5 }],
      publishedCards: [{ slug: "fresh-card", userId: 42 }, { slug: "snap-only", userId: 42 }],
    });
    expect(owners.get("fresh-card")).toEqual({ userId: 99, cardId: 5 });
    expect(owners.get("snap-only")).toEqual({ userId: 42, cardId: null });
    expect(owners.get("nobody-here")).toBeUndefined();
  });

  it("usernames are claimed before slugs, and a legacy owner keeps their own relational card", async () => {
    const owners = await resolve({
      customers: [
        { id: 21, username: "a1", slug: "shared", email: "asha@example.com" },
        { id: 22, username: "shared", slug: "b2", email: "new@example.com" },
      ],
      cards: [{ slug: "b2", userId: 99, cardId: 6 }, { slug: "a1", userId: 42, cardId: 7 }],
    });
    expect(owners.get("shared")).toEqual({ userId: 99, cardId: null });
    expect(owners.get("b2")).toEqual({ userId: 99, cardId: 6 });
    expect(owners.get("a1")).toEqual({ userId: 7, cardId: null });
  });
});
