/*
 * One-time import of legacy enquiries.json into the leads table, so historical
 * enquiries show up in each cardholder's CRM (/dashboard/leads).
 *
 * DRY RUN (default) — reports what WOULD happen, writes nothing:
 *   node db/import-enquiries.mjs
 *
 * COMMIT — actually insert the leads:
 *   node db/import-enquiries.mjs --commit
 *
 * SAFE:
 *  - Additive only. NEVER edits or deletes enquiries.json or any existing lead.
 *  - Idempotent. A second run skips already-imported enquiries (dedup on
 *    card + created-timestamp + name), so it can't create duplicates.
 *  - Every imported lead carries source='legacy', so they are easy to find or
 *    undo:  DELETE FROM leads WHERE source='legacy';
 *  - Reads DATABASE_URL from .env automatically.
 */
import "dotenv/config";
import fs from "node:fs";
import mysql from "mysql2/promise";

const COMMIT = process.argv.includes("--commit");
const url = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3307/digitalcarda";

function readEnquiries() {
  for (const p of ["public/enquiries.json", "dist/public/enquiries.json"]) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { /* try next */ }
  }
  throw new Error("enquiries.json not found (looked in public/ and dist/public/)");
}

const conn = await mysql.createConnection(url);
const enq = readEnquiries();

// slug -> { id, userId }
const [cardRows] = await conn.query("SELECT id, user_id AS userId, LOWER(slug) AS slug FROM cards WHERE slug IS NOT NULL AND slug <> ''");
const cardBySlug = new Map(cardRows.map((r) => [r.slug, { id: r.id, userId: r.userId }]));

let mapped = 0, unmapped = 0, dupes = 0, inserted = 0;
const unmappedSlugs = new Set();
const affectedCards = new Set();

for (const e of enq) {
  const slug = String(e.uname || "").trim().toLowerCase();
  const card = slug ? cardBySlug.get(slug) : null;
  if (!card) { unmapped++; if (slug) unmappedSlugs.add(slug); continue; }
  mapped++;

  const name = String(e.name || "").trim() || "Enquiry";
  const phone = e.contact ? String(e.contact).trim() : null;
  const email = e.email ? String(e.email).trim() : null;
  const message = e.description ? String(e.description).trim() : null;
  const parsed = e.created_on ? new Date(String(e.created_on).replace(" ", "T")) : new Date();
  const createdAt = isNaN(parsed.getTime()) ? new Date() : parsed;

  // dedup — already imported (or already present) for this card at this moment?
  const [[dup]] = await conn.query(
    "SELECT id FROM leads WHERE card_id=? AND full_name=? AND created_at=? LIMIT 1",
    [card.id, name, createdAt]
  );
  if (dup) { dupes++; continue; }

  if (COMMIT) {
    await conn.execute(
      "INSERT INTO leads (card_id, user_id, full_name, email, phone, message, source, status, created_at) VALUES (?,?,?,?,?,?, 'legacy', 'new', ?)",
      [card.id, card.userId, name, email, phone, message, createdAt]
    );
    affectedCards.add(card.id);
  }
  inserted++;
}

// keep cards.lead_count accurate for the cards we touched
if (COMMIT && affectedCards.size) {
  for (const id of affectedCards) {
    await conn.execute("UPDATE cards SET lead_count = (SELECT COUNT(*) FROM leads WHERE card_id=?) WHERE id=?", [id, id]);
  }
}

console.log(`\nEnquiries in file:            ${enq.length}`);
console.log(`Mapped to a card:            ${mapped}`);
console.log(`Unmapped (no card for slug): ${unmapped}${unmappedSlugs.size ? `  -> ${[...unmappedSlugs].join(", ")}` : ""}`);
console.log(`Already present (skipped):   ${dupes}`);
console.log(
  COMMIT
    ? `\n✓ INSERTED ${inserted} leads (source='legacy'); lead_count refreshed for ${affectedCards.size} cards.`
    : `\n→ WOULD INSERT ${inserted} leads.  DRY RUN — nothing written. Re-run with --commit to apply.`
);
await conn.end();
