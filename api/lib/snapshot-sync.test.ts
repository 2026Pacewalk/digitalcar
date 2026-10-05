import { describe, it, expect } from "vitest";
import {
  afterSaveError, copyReplacedDuringSave, decideFirstLoad, decideOnLoad, designWriteCoversLocal, firstLoadDropsEdit, firstPublishOnLoad,
  markFirstLoadFailed, markUnsaved, olderStamp, parseUnsaved, retryFirstLoad, sameCard, sameStamp, saveRefusal, storedCardIsFor,
  tidyingChanged, unsavedAfterSave, type UnsavedMark,
} from "../../src/lib/snapshotSync";

const T0 = "2026-10-01T10:00:00.000Z"; // the version this browser last synced
const T1 = "2026-10-01T10:05:00.000Z"; // a later save from somewhere else
const edit: UnsavedMark = { base: T0, rev: "a" };
const differs = () => false;
const load = (over: Partial<Parameters<typeof decideOnLoad>[0]>) =>
  decideOnLoad({ failed: false, serverTs: T0, localTs: T0, unsaved: null, sameContent: differs, ...over });

describe("opening the dashboard with a copy of the card already here", () => {
  it("clean and the server moved on: take the server's copy", () => {
    expect(load({ serverTs: T1 })).toBe("take-server");
  });

  it("clean with no version recorded: take the server's copy", () => {
    expect(load({ localTs: "" })).toBe("take-server");
  });

  it("clean and already on the server's version: nothing to do", () => {
    expect(load({})).toBe("keep-local");
  });

  it("an unsaved edit and the server still on the version it was made on: save it", () => {
    expect(load({ unsaved: edit })).toBe("push-local");
  });

  it("an unsaved edit and the server moved on: take the server's copy and say so", () => {
    expect(load({ serverTs: T1, unsaved: edit })).toBe("take-server-notify");
  });

  it("an unsaved edit on a copy with no version recorded never overwrites the live card", () => {
    expect(load({ localTs: "", unsaved: { base: "", rev: "a" } })).toBe("take-server-notify");
  });

  it("the server moved on but holds this very card: take it without a word", () => {
    expect(load({ serverTs: T1, unsaved: edit, sameContent: () => true })).toBe("take-server");
  });

  it("the design was changed on the server from this browser: its unsaved edit is still saved", () => {
    // Templates records the new version (T1) after its own server-side change;
    // the edit itself was made on T0.
    expect(load({ serverTs: T1, localTs: T1, unsaved: edit })).toBe("push-local");
  });

  it("the server couldn't be asked: keep the local copy and save nothing", () => {
    expect(load({ failed: true, serverTs: "" })).toBe("keep-local");
    expect(load({ failed: true, serverTs: "", unsaved: edit })).toBe("keep-local");
  });

  it("no card on the server: keep the local copy, and save an unsaved edit", () => {
    expect(load({ serverTs: "", localTs: "" })).toBe("keep-local");
    expect(load({ serverTs: "", localTs: "", unsaved: { base: "", rev: "a" } })).toBe("push-local");
  });

  it("only compares the two cards when the answer depends on it", () => {
    const never = () => { throw new Error("compared"); };
    expect(load({ serverTs: T1, sameContent: never })).toBe("take-server");
    expect(load({ unsaved: edit, sameContent: never })).toBe("push-local");
    expect(load({ failed: true, unsaved: edit, sameContent: never })).toBe("keep-local");
    expect(load({ askedTs: T0, localTs: T1, unsaved: edit, sameContent: never })).toBe("ask-again");
    expect(load({ serverTs: T0, localTs: T1, askedTs: T1, unsaved: edit, sameContent: never })).toBe("push-local");
  });
});

/* The answer was read before this browser's own save landed (the owner edited,
   then changed page while the save was still uploading). */
describe("the server's answer is older than what this browser now holds", () => {
  it("this browser's save landed while the server was answering: ask again, apply nothing", () => {
    // Asked at T0; the save's answer moved the local version to T1 and cleared the mark.
    expect(load({ serverTs: T0, askedTs: T0, localTs: T1 })).toBe("ask-again");
    // The same with a second edit already waiting to be saved.
    expect(load({ serverTs: T0, askedTs: T0, localTs: T1, unsaved: { base: T1, rev: "b" } })).toBe("ask-again");
  });

  it("the latest version was loaded while the server was answering: ask again", () => {
    expect(load({ serverTs: T1, askedTs: T0, localTs: T1 })).toBe("ask-again");
  });

  it("the version did not move while the server was answering: decided as usual", () => {
    expect(load({ serverTs: T1, askedTs: T0 })).toBe("take-server");
    expect(load({ askedTs: T0 })).toBe("keep-local");
    expect(load({ askedTs: T0, unsaved: edit })).toBe("push-local");
    expect(load({ serverTs: T1, askedTs: T0, unsaved: edit })).toBe("take-server-notify");
  });

  it("an older version from the server is never applied", () => {
    expect(load({ serverTs: T0, localTs: T1, askedTs: T1 })).toBe("keep-local");
    expect(load({ serverTs: T0, localTs: T1 })).toBe("keep-local");
  });

  it("an older version from the server never costs an unsaved edit: it is saved, and the server decides", () => {
    expect(load({ serverTs: T0, localTs: T1, unsaved: { base: T1, rev: "b" } })).toBe("push-local");
    expect(load({ serverTs: T0, localTs: T1, unsaved: edit })).toBe("push-local");
  });

  it("a server that couldn't be asked is still just that", () => {
    expect(load({ failed: true, serverTs: "", askedTs: T0, localTs: T1 })).toBe("keep-local");
  });

  it("no version recorded here is not 'newer' than the server's", () => {
    expect(load({ localTs: "", askedTs: "" })).toBe("take-server");
    expect(olderStamp(T0, "")).toBe(false);
    expect(olderStamp("", T0)).toBe(false);
    expect(olderStamp(T0, T1)).toBe(true);
    expect(olderStamp(T1, T0)).toBe(false);
    expect(olderStamp(T0, T0)).toBe(false);
  });
});

describe("a save's answer arrives after the card here was replaced", () => {
  const sent = { reloads: 2, ts: T0 };

  it("nothing was loaded meanwhile: the answer's version is recorded", () => {
    expect(copyReplacedDuringSave(sent, { reloads: 2, ts: T0 })).toBe(false);
  });

  it("the server's card was loaded over it in this tab: not recorded", () => {
    expect(copyReplacedDuringSave(sent, { reloads: 3, ts: T0 })).toBe(true);
    expect(copyReplacedDuringSave(sent, { reloads: 3, ts: T1 })).toBe(true);
  });

  it("another tab loaded it (the version here changed): not recorded", () => {
    expect(copyReplacedDuringSave(sent, { reloads: 2, ts: T1 })).toBe(true);
    expect(copyReplacedDuringSave({ reloads: 0, ts: "" }, { reloads: 0, ts: T0 })).toBe(true);
  });

  it("a first publish (no version before or during): recorded", () => {
    expect(copyReplacedDuringSave({ reloads: 0, ts: "" }, { reloads: 0, ts: "" })).toBe(false);
  });
});

describe("a design the server put on the card itself (Templates → Apply)", () => {
  it("it replaced the version this browser holds: this browser is on the new version", () => {
    expect(designWriteCoversLocal(T0, T0)).toBe(true);
    expect(designWriteCoversLocal(T0, "2026-10-01T10:00:00Z")).toBe(true);
    expect(designWriteCoversLocal("2026-10-01T10:00:00.400Z", "2026-10-01T10:00:00.900Z")).toBe(true); // same whole second
  });

  it("it replaced a NEWER card (a stale tab): the version here stays, the latest is loaded", () => {
    expect(designWriteCoversLocal(T0, T1)).toBe(false);
  });

  it("it replaced an older card than this browser thinks it has: not adopted either", () => {
    expect(designWriteCoversLocal(T1, T0)).toBe(false);
  });

  it("no version here, or none in the answer (an older server): not adopted", () => {
    expect(designWriteCoversLocal("", T0)).toBe(false);
    expect(designWriteCoversLocal(T0, "")).toBe(false);
    expect(designWriteCoversLocal(T0, null)).toBe(false);
    expect(designWriteCoversLocal(T0, undefined)).toBe(false);
    expect(designWriteCoversLocal("", "")).toBe(false);
  });
});

describe("a first load that failed is run again", () => {
  const seed = { hydrated: false, localTs: "", primaryCard: true, untouchedSeed: true };

  it("only the sign-in seed is here and nothing was ever loaded: load again", () => {
    expect(retryFirstLoad(seed)).toBe(true);
  });

  it("a card that was loaded, saved, or typed into is a card", () => {
    expect(retryFirstLoad({ ...seed, hydrated: true })).toBe(false);
    expect(retryFirstLoad({ ...seed, localTs: T0 })).toBe(false);
    expect(retryFirstLoad({ ...seed, untouchedSeed: false })).toBe(false);
  });

  it("an extra card starts as a seed on purpose", () => {
    expect(retryFirstLoad({ ...seed, primaryCard: false })).toBe(false);
  });
});

/* The failure itself is recorded, so the retry no longer depends on the blank
   record still being blank. */
describe("a first load that failed leaves a mark", () => {
  const typedInto = { hydrated: false, localTs: "", primaryCard: true, untouchedSeed: false, failedBefore: true };

  it("is set when a browser that never held the card couldn't load it", () => {
    expect(markFirstLoadFailed({ failed: true, hydrated: false, previewOnly: false })).toBe(true);
  });

  it("is not set by a load that went through, nor in a browser that has the card", () => {
    expect(markFirstLoadFailed({ failed: false, hydrated: false, previewOnly: false })).toBe(false);
    expect(markFirstLoadFailed({ failed: true, hydrated: true, previewOnly: false })).toBe(false);
  });

  it("is not set for a sign-in that can only look (the server is never asked for it)", () => {
    expect(markFirstLoadFailed({ failed: true, hydrated: false, previewOnly: true })).toBe(false);
  });

  it("while it is set the first load is run again, whatever was typed into the blank record since", () => {
    expect(retryFirstLoad(typedInto)).toBe(true);
    // Without the mark a typed-into record is a card (see above).
    expect(retryFirstLoad({ ...typedInto, failedBefore: false })).toBe(false);
  });

  it("means nothing once a load has gone through, and never sends an extra card to the old site", () => {
    expect(retryFirstLoad({ ...typedInto, hydrated: true })).toBe(false);
    expect(retryFirstLoad({ ...typedInto, primaryCard: false })).toBe(false);
  });

  it("the load that then goes through says so when it replaced something typed meanwhile", () => {
    expect(firstLoadDropsEdit({ failedBefore: true, loaded: true, unsaved: edit })).toBe(true);
    expect(firstLoadDropsEdit({ failedBefore: true, loaded: true, unsaved: null })).toBe(false);
  });

  it("no card anywhere: nothing was loaded, so what was typed is kept and nothing is said", () => {
    expect(firstLoadDropsEdit({ failedBefore: true, loaded: false, unsaved: edit })).toBe(false);
  });

  it("a browser's very first load has nothing typed to lose, whatever is marked", () => {
    expect(firstLoadDropsEdit({ failedBefore: false, loaded: true, unsaved: edit })).toBe(false);
  });
});

describe("the one publish that opening the dashboard may make (an old-site card not yet on the server)", () => {
  const oldSite = { failed: false, hasSnapshot: false, primaryCard: true, localTs: "", unsaved: null, oldSiteCard: true, adminVisit: false };

  it("an old-site card, loaded in full, with no card on the server: published once", () => {
    expect(firstPublishOnLoad(oldSite)).toBe(true);
  });

  it("never after a load that failed", () => {
    expect(firstPublishOnLoad({ ...oldSite, failed: true })).toBe(false);
  });

  it("never over a card the server already has", () => {
    expect(firstPublishOnLoad({ ...oldSite, hasSnapshot: true })).toBe(false);
  });

  it("never for a copy that was once in step with the server (a card taken down stays down)", () => {
    expect(firstPublishOnLoad({ ...oldSite, localTs: T0 })).toBe(false);
  });

  it("never for anything but a fully loaded old-site card, the primary one, on the owner's own visit", () => {
    expect(firstPublishOnLoad({ ...oldSite, oldSiteCard: false })).toBe(false);
    expect(firstPublishOnLoad({ ...oldSite, primaryCard: false })).toBe(false);
    expect(firstPublishOnLoad({ ...oldSite, adminVisit: true })).toBe(false);
  });

  it("not again while the first one is still waiting to go out", () => {
    expect(firstPublishOnLoad({ ...oldSite, unsaved: { base: "", rev: "a" } })).toBe(false);
    // …that one is sent as any unsaved edit is.
    expect(load({ serverTs: "", localTs: "", unsaved: { base: "", rev: "a" } })).toBe("push-local");
  });
});

describe("opening the dashboard on a browser with no copy of the card", () => {
  it("loads the live card when there is one", () => {
    expect(decideFirstLoad({ failed: false, hasSnapshot: true })).toBe("use-snapshot");
  });

  it("uses the old site's record only when the server says there is no card", () => {
    expect(decideFirstLoad({ failed: false, hasSnapshot: false })).toBe("use-old-site");
  });

  it("an error is not 'no card': nothing is loaded, so nothing can be published", () => {
    expect(decideFirstLoad({ failed: true, hasSnapshot: false })).toBe("wait");
  });
});

describe("a save the server refused", () => {
  const stale = new Error("SNAPSHOT_STALE: this card was updated elsewhere — refresh to load the latest version.");
  const noBase = new Error("SNAPSHOT_NO_BASE: this page is out of date — refresh it to load the latest version of your card, then make your change again.");

  it("stale: load the latest version, never send the same copy again", () => {
    expect(saveRefusal(stale)).toBe("stale");
    expect(afterSaveError(stale)).toBe("reload");
  });

  it("no base: load the latest version", () => {
    expect(saveRefusal(noBase)).toBe("no-base");
    expect(afterSaveError(noBase)).toBe("reload");
  });

  it("anything else: keep the edit here and load nothing", () => {
    for (const e of [new Error("Failed to fetch"), new Error("That card URL is already taken."), { message: "UNAUTHORIZED" }, "boom", null, undefined]) {
      expect(afterSaveError(e)).toBe("keep");
    }
    expect(saveRefusal(new Error("That card URL is already taken."))).toBe("taken");
    expect(saveRefusal(new Error("Failed to fetch"))).toBe("other");
  });
});

describe("the unsaved-edit mark", () => {
  it("remembers the version the first unsaved edit was made on", () => {
    const first = markUnsaved(null, T0, "a");
    expect(first).toEqual({ base: T0, rev: "a" });
    expect(markUnsaved(first, T1, "b")).toEqual({ base: T0, rev: "b" });
  });

  it("is cleared by a save that covered every edit", () => {
    expect(unsavedAfterSave(edit, edit, T1)).toBeNull();
    expect(unsavedAfterSave(edit, null, T1)).toBeNull();
    expect(unsavedAfterSave(null, null, T1)).toBeNull();
  });

  it("stays when another edit was made while the save was on its way", () => {
    expect(unsavedAfterSave(edit, { base: T0, rev: "b" }, T1)).toEqual({ base: T1, rev: "b" });
    expect(unsavedAfterSave(null, { base: T0, rev: "b" }, T1)).toEqual({ base: T1, rev: "b" });
  });

  it("survives storage and ignores anything that isn't a mark", () => {
    expect(parseUnsaved(JSON.stringify(edit))).toEqual(edit);
    for (const raw of [null, undefined, "", "1", "{", "null", JSON.stringify({ base: 1, rev: "a" })]) {
      expect(parseUnsaved(raw)).toBeNull();
    }
  });
});

describe("version stamps", () => {
  it("match by moment, not by spelling", () => {
    expect(sameStamp(T0, T0)).toBe(true);
    expect(sameStamp(T0, "2026-10-01T10:00:00Z")).toBe(true);
    expect(sameStamp(T0, T1)).toBe(false);
  });

  it("no stamp only matches no stamp", () => {
    expect(sameStamp("", "")).toBe(true);
    expect(sameStamp("", T0)).toBe(false);
    expect(sameStamp(T0, "")).toBe(false);
    expect(sameStamp("garbage", "rubbish")).toBe(false);
  });
});

describe("do two copies hold the same card", () => {
  const card = {
    customer: { id: 7, name: "Asha", theme: "3", color: "#F7B31C" },
    products: [{ id: 1, name: "Web design", filename: "data:image/png;base64,AAAA" }],
    gallery: [], videos: [], offers: [], qrcodes: [],
  };

  it("yes, whatever order the database returns the fields in", () => {
    const stored = {
      qrcodes: [], offers: [], videos: [], gallery: [],
      products: [{ filename: "data:image/png;base64,AAAA", name: "Web design", id: 1 }],
      customer: { color: "#F7B31C", theme: "3", name: "Asha", id: 7 },
      reviews: [],
    };
    expect(sameCard(card, stored)).toBe(true);
  });

  it("yes, when the only difference is a field the server never stores", () => {
    expect(sameCard({ ...card, customer: { ...card.customer, email_verify: 1 } }, card)).toBe(true);
  });

  it("no, when a picture, a field or the order of items differs", () => {
    expect(sameCard(card, { ...card, products: [{ ...card.products[0], filename: "data:image/png;base64,BBBB" }] })).toBe(false);
    expect(sameCard(card, { ...card, customer: { ...card.customer, name: "Asha K" } })).toBe(false);
    const two = [{ id: 1 }, { id: 2 }];
    expect(sameCard({ ...card, gallery: two }, { ...card, gallery: [...two].reverse() })).toBe(false);
  });

  it("no, against nothing at all", () => {
    expect(sameCard(card, null)).toBe(false);
    expect(sameCard(card, undefined)).toBe(false);
  });
});

/* Every screen tidies the stored record as it opens. Writing it back when
   nothing in it changed reached the other tabs as "the card changed". */
describe("is a tidied record worth storing again", () => {
  const stored = { id: 7, name: "Asha", logo: "", password: "" };

  it("no, when the tidy copy only adds blank fields and leaves an empty one out", () => {
    expect(tidyingChanged(stored, { id: 7, name: "Asha", logo: "", designation: "", views: 0 })).toBe(false);
    expect(tidyingChanged({ ...stored, otp: null }, { id: 7, name: "Asha", logo: "" })).toBe(false);
  });

  it("no, whatever order the fields come in", () => {
    expect(tidyingChanged({ a: { x: 1, y: 2 }, b: 1 }, { b: 1, a: { y: 2, x: 1 } })).toBe(false);
  });

  it("yes, when a demo value was cleared or an image address re-pointed", () => {
    expect(tidyingChanged({ ...stored, url: "https://acmedigital.example" }, { ...stored, url: "" })).toBe(true);
    expect(tidyingChanged({ ...stored, logo: "https://old.example/otdo-panel/uploads/home/a.png" }, { ...stored, logo: "https://new.example/a.png" })).toBe(true);
  });

  it("yes, when a password that leaked into the record was dropped", () => {
    expect(tidyingChanged({ ...stored, password: "not-empty" }, { id: 7, name: "Asha", logo: "" })).toBe(true);
  });
});

/* Admin "Login as Client": a copy is kept (with its unsaved edit) only when it
   is that customer's. */
describe("is the card stored under an account's id that account's", () => {
  it("yes, when its email is the account's", () => {
    expect(storedCardIsFor("asha@example.com", ["asha@example.com"])).toBe(true);
    expect(storedCardIsFor(" Asha@Example.com ", ["asha@example.com", undefined])).toBe(true);
  });

  it("yes, when it is the email shown on that account's live card", () => {
    expect(storedCardIsFor("hello@asha-studio.example", ["asha@example.com", "hello@asha-studio.example"])).toBe(true);
  });

  it("no, for another customer's card that happens to sit under the same id", () => {
    expect(storedCardIsFor("someone-else@example.com", ["asha@example.com", "hello@asha-studio.example"])).toBe(false);
  });

  it("no, when the record names no one, or there is nothing to compare with", () => {
    expect(storedCardIsFor("", ["asha@example.com"])).toBe(false);
    expect(storedCardIsFor(undefined, ["asha@example.com"])).toBe(false);
    expect(storedCardIsFor("", [""])).toBe(false);
    expect(storedCardIsFor("asha@example.com", [])).toBe(false);
    expect(storedCardIsFor("asha@example.com", [null, ""])).toBe(false);
  });
});
