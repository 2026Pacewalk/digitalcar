/*
 * Repair "mojibake" — text from the old site where UTF-8 was stored/read as
 * Latin-1, so emoji and accents show up as garbage (e.g. "gardenÃ¢ËÂºÃ°Å¸â¢Â").
 * Repairs one mis-encoding layer where possible, then removes leftover garbage
 * runs. Safe on normal text (single accented letters, real emoji are kept).
 */
export function cleanText(input: unknown): string {
  let s = String(input ?? "");
  if (!s) return s;

  // 1) Repair a layer of UTF-8 mis-decoded as Latin-1 (fixes é, ₹, …).
  if (/[ÃÂ][-¿]|â|Ã°/.test(s)) {
    try {
      const r = decodeURIComponent(escape(s));
      if (r) s = r;
    } catch { /* invalid sequence — fall through to stripping */ }
  }

  // 2) Remove mojibake runs: a tell-tale lead char (Ã Â â Å ð Ê) followed by
  //    one or more high/symbol chars — plus any stray box/block/replacement.
  //    Real emoji (surrogate pairs, U+D800+) and lone accents are left intact.
  s = s
    .replace(/[ÂÃâÅðÊ][-⯿]+/g, " ")
    .replace(/[─-▟�]+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  return s;
}
