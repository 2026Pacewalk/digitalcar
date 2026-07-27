/*
 * DigitalCarda — Phase 03: PRODUCT / TEMPLATE / INSTANCE mapping analyzer.
 * DRY RUN ONLY — reads production JSON, writes nothing. Sizes the product
 * catalogue and the card→product/template mapping from real usage.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (f) => JSON.parse(readFileSync(join(APP_DIR, "public", f), "utf8"));
const S = (v) => String(v ?? "").trim();
const customers = pub("customers.json");

const top = (map, n = 12) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const tally = (arr, keyFn) => arr.reduce((m, x) => { const k = keyFn(x); if (k) m.set(k, (m.get(k) || 0) + 1); return m; }, new Map());

console.log("\n📦  PHASE 03 — PRODUCT / TEMPLATE / INSTANCE MAPPING (dry run)\n" + "=".repeat(60));

// ── TEMPLATE usage (theme number 1..44) ───────────────────────────
console.log("\n── TEMPLATE (design) usage across cards ──");
const themes = tally(customers, (c) => `theme ${S(c.theme) || "1"}`);
const distinctThemes = new Set(customers.map((c) => S(c.theme) || "1"));
console.log(`   Distinct templates in use: ${distinctThemes.size} of 44`);
for (const [k, v] of top(themes, 10)) console.log(`   ${k.padEnd(12)} ${v} cards`);

// ── COLOUR usage (drives product visual variety) ──────────────────
const colors = tally(customers, (c) => S(c.color).toLowerCase());
console.log(`\n   Distinct brand colours in use: ${colors.size}`);

// ── PROFESSION / CATEGORY signal (business "nature") ──────────────
console.log("\n── CATEGORY signal (from business 'nature') ──");
const natures = tally(customers, (c) => S(c.nature).toLowerCase());
console.log(`   Cards with a stated nature: ${[...natures.values()].reduce((a, b) => a + b, 0)} of ${customers.length}`);
console.log("   Top stated business natures (→ marketplace categories):");
for (const [k, v] of top(natures, 15)) console.log(`     ${String(v).padStart(3)}  ${k.slice(0, 46)}`);

// ── PROPOSED product catalogue sizing ─────────────────────────────
console.log("\n── PROPOSED product catalogue ──");
console.log(`   Templates to promote to catalogue rows: 44 (31 card + 13 link-bio)`);
console.log(`   Initial products = 1 per template (admin renames/curates later): 44`);
console.log(`   Existing cards to map to a default product: ${customers.length}`);
console.log(`   → each existing card keeps its current theme; product = the`);
console.log(`     product whose template == that theme (zero visual change).`);

console.log("\n" + "=".repeat(60));
console.log("✅  Dry run complete. Nothing written.\n");
