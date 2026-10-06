/* The legacy site stored card text UTF-8-as-latin1 mangled, often twice over.
   Inputs here are written with \u escapes so the test says exactly which bytes
   a card holds. */
import { describe, expect, it } from "vitest";
import { fixMojibake } from "../../src/lib/mojibake";

describe("fixMojibake", () => {
  it("repairs the doubly mangled dashes and quotes legacy cards hold", () => {
    // What /property1313 stores where an en dash belongs.
    expect(fixMojibake("Possibilities \u00c3\u00a2\u00e2\u0082\u00ac\u00e2\u0080\u009c We are")).toBe(
      "Possibilities \u2013 We are",
    );
    // What dr-kochar-s-house-of-smiles stores where an em dash belongs.
    expect(fixMojibake("advice\u00c3\u00a2\u00e2\u0082\u00ac\u00e2\u0080\u009densuring")).toBe(
      "advice\u2014ensuring",
    );
  });

  it("repairs a single mangling layer, raw bytes or CP1252", () => {
    expect(fixMojibake("\u00e2\u0080\u0093")).toBe("\u2013");
    expect(fixMojibake("\u00e2\u20ac\u201c")).toBe("\u2013");
    expect(fixMojibake("Sharma\u00e2\u0080\u0099s")).toBe("Sharma\u2019s");
    expect(fixMojibake("Caf\u00c3\u00a9")).toBe("Caf\u00e9");
    expect(fixMojibake("\u00f0\u009f\u0099\u008f")).toBe("\ud83d\ude4f");
  });

  it("keeps the rupee sign, which loses a byte and can't be decoded back", () => {
    expect(fixMojibake("\u00e2\u0082\u00b9499")).toBe("\u20b9499");
    expect(fixMojibake("\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00b9499")).toBe("\u20b9499");
  });

  it("leaves text that was never mangled alone", () => {
    for (const s of [
      "Zirakpur, Punjab 140603",
      "Pati\u0101la",
      "\u20b92,999 per card",
      "terry--g@gmail.com",
      "\u201cwell\u2014done\u201d",
      "wait\u2026\u201dok",
    ]) {
      expect(fixMojibake(s)).toBe(s);
    }
  });

  /* An accented capital next to one piece of smart punctuation is a valid UTF-8
     pair, so a decoder with no gate "repairs" ordinary typed text into nonsense:
     CAFE'S with a curly apostrophe became CAFEoS. Customers type this - it is
     what a phone or Word produces - and it reaches here through the card name,
     the company name and the owner-written SEO title and description. */
  it("does not touch an accented capital that is only next to punctuation", () => {
    for (const s of [
      "CAF\u00c9\u2019S PIZZA",          // curly apostrophe
      "CAF\u00c9\u2026",                 // ellipsis
      "JOS\u00c9\u2013BAR",              // en dash
      "CAF\u00c9\u00a0BAR",              // non-breaking space
      "FRAN\u00c7\u2022",                // bullet
      "\u00d8\u00ae Nordic",             // slashed O then a registered mark
      "\u00e9\u2013\u2014",              // lowercase, two dashes
      "Caf\u00e9\u00a0\u00a0Bar",        // two non-breaking spaces, as pasted from Word
      "Ch\u00e2teau \u2014 CAF\u00c9\u2019S",   // a circumflex elsewhere in the same line
    ]) {
      expect(fixMojibake(s)).toBe(s);
    }
  });

  it("collapses a garbage run that no decoder can recover into a bullet", () => {
    expect(fixMojibake("Service \u00c3\u00a2\u00c5\u00a1 ready")).toBe("Service \u2022 ready");
  });

  it("takes anything", () => {
    expect(fixMojibake(null)).toBe("");
    expect(fixMojibake(undefined)).toBe("");
    expect(fixMojibake(12)).toBe("12");
  });
});
