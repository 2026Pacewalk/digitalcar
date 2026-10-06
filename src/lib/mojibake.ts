/* Repair for text the legacy site stored UTF-8-as-latin1 mangled.
   Deliberately free of imports: the browser card, the SSR <head> and the Node
   server bundle all pull this in, and src/lib/cardSeo.ts must stay cheap to
   import from api/. Written with \u escapes so the mangled shapes survive any
   editor or tool that re-encodes this file. */

/* The characters CP1252 shows for the bytes 0x80-0x9F. Legacy rows carry a
   CP1252 layer on top of the latin1 one — an en dash came back as "a" + EURO
   + LEFT QUOTE, i.e. the bytes E2 80 93 read through CP1252 — so undoing the
   mangling means mapping each of these back to the byte it stands for. */
const CP1252: Record<string, number> = {
  "\u20ac": 0x80, "\u201a": 0x82, "\u0192": 0x83, "\u201e": 0x84, "\u2026": 0x85,
  "\u2020": 0x86, "\u2021": 0x87, "\u02c6": 0x88, "\u2030": 0x89, "\u0160": 0x8a,
  "\u2039": 0x8b, "\u0152": 0x8c, "\u017d": 0x8e, "\u2018": 0x91, "\u2019": 0x92,
  "\u201c": 0x93, "\u201d": 0x94, "\u2022": 0x95, "\u2013": 0x96, "\u2014": 0x97,
  "\u02dc": 0x98, "\u2122": 0x99, "\u0161": 0x9a, "\u203a": 0x9b, "\u0153": 0x9c,
  "\u017e": 0x9e, "\u0178": 0x9f,
};

/* One mangled character: a UTF-8 lead byte that came through as a Latin-1
   letter, plus the 1-3 bytes that followed it — each either a raw 0x80-0xBF
   character or the CP1252 stand-in for one. */
const MANGLED = new RegExp(
  "[\u00c2-\u00f4][\u0080-\u00bf" + Object.keys(CP1252).join("") + "]{1,3}",
  "g",
);

const UTF8 = new TextDecoder("utf-8", { fatal: true });

/* Read a run back as the bytes it was meant to be. A run that isn't valid
   UTF-8 was never mangled text (an accented word beside a dash, say), so it
   is handed back untouched. */
function unmangle(run: string): string {
  const bytes = new Uint8Array(run.length);
  for (let i = 0; i < run.length; i++) {
    const ch = run[i] as string;
    const cp = ch.codePointAt(0) as number;
    bytes[i] = cp <= 0xff ? cp : (CP1252[ch] as number);
  }
  try {
    return UTF8.decode(bytes);
  } catch {
    return run;
  }
}

/* Characters the mangling produces (plus CP1252 punctuation). A run of 2+ of
   them that still holds a Latin-1 tell-tale after decoding is unrecoverable
   garbage — usually a mangled bullet or checkmark. */
const MOJI_CLUSTER = new RegExp(
  "[-\u00bf\u00c2\u00c3\u00c5\u00e2\u0152\u0153\u0160\u0161\u0178" +
    "\u017d\u017e\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c" +
    "\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]{2,}",
  "g",
);

/* The rupee sign lost a byte on the way through CP1252 (E2 82 B9 came back as
   "a" + EURO + SUPERSCRIPT ONE, which decodes to an unrelated character), so
   the two shapes legacy prices arrive in are named outright and repaired
   before any decoding. */
const RUPEE = /\u00c3\u00a2[^\x00-\x7f]{0,3}\u00c2?\u00b9|\u00e2[^\x00-\x7f]{0,2}\u00b9/g;

/* Proof that a string really was mangled. Without this gate the decoder is too
   eager to be safe on text nobody mangled: an accented capital followed by one
   piece of smart punctuation is a valid UTF-8 pair, so a company name typed as
   CAFE'S with the curly apostrophe a phone produces would "repair" into
   nonsense. None of these three shapes occurs in text that was typed rather
   than mangled - a C1 control is not legal text at all, and the other two are
   the signatures the legacy import left behind. Checked against 69,687 strings
   of live data: the gate keeps every one of the 641 repairs. */
const WAS_MANGLED = /[\u0080-\u009f\u00c2\u00c3]|\u00e2\u20ac/;

/* Legacy data is doubly mangled, so decode until it stops changing, patch the
   leftovers of a half-mangled quote or dash, and collapse what remains of an
   undecodable garbage run into a clean bullet.

   The gate is read once, on the way in, and not re-tested per pass: a half
   decoded Devanagari or Cyrillic row no longer looks mangled by the second
   pass, and re-testing would strand those repairs half done. */
export function fixMojibake(raw: unknown): string {
  let out = String(raw ?? "");
  if (WAS_MANGLED.test(out)) out = decodeRuns(out.replace(RUPEE, "\u20b9"));
  return patch(out);
}

function decodeRuns(input: string): string {
  let out = input;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(MANGLED, unmangle);
    if (next === out) break;
    out = next;
  }
  return out;
}

/* What no decoder can recover: a quote or dash that lost a byte on the way, and
   a run of garbage left where a bullet or a checkmark used to be. */
function patch(out: string): string {
  return out
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153|\u00e2\u20ac/g, '"')
    .replace(/\u00e2\u20ac\u201c|\u00e2\u20ac\u201d/g, "-")
    .replace(MOJI_CLUSTER, (m) => (/[\u00c2\u00c3\u00c5\u00e2]/.test(m) ? "\u2022" : m))
    .replace(/[\u00c2\u00c3](?=\s|$|\u2022)/g, "");
}
