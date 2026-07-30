/*
 * DigitalCarda — one-time-safe import of legacy enquiries.json into the CRM.
 * ------------------------------------------------------------------
 * The old platform stored card enquiries in a flat public/enquiries.json file.
 * The new CRM lives in the relational `leads` table (scoped by user_id). New
 * card submissions already land in `leads`; this back-fills the HISTORICAL
 * enquiries so every lead — old and new — shows in one place (/dashboard/leads).
 *
 * 100% additive & idempotent: never deletes the JSON, never updates existing
 * rows. Re-running inserts nothing (dedup by user_id + name + created_at).
 * Imported rows carry source='legacy' so they're easy to identify/rollback.
 *
 * Owner resolution for each enquiry's slug (uname), first match wins:
 *   1. cards.slug            → user_id (+ card_id)
 *   2. published_cards.slug  → user_id
 *   3. customers.json slug   → email → users.id
 * Enquiries whose slug maps to no account are skipped (counted, never guessed).
 */
import { readFile } from "node:fs/promises";

async function readJson(file) {
  for (const p of [`./dist/public/${file}.json`, `./public/${file}.json`]) {
    try { return JSON.parse(await readFile(p, "utf8")); } catch { /* try next */ }
  }
  return [];
}

// Legacy status → new CRM enum (leads.status).
const STATUS_MAP = { new: "new", pending: "contacted", closed: "closed", converted: "converted" };

// Normalise legacy created_on to a stable 'YYYY-MM-DD HH:MM:SS' string (tz-free,
// so dedup is deterministic across runs). Falls back to a fixed date if unusable.
function normalizeDt(s) {
  const v = String(s || "").trim();
  const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (!m) return "2020-01-01 00:00:00";
  return `${m[1]} ${m[2] || "00:00:00"}`;
}

export async function importLegacyEnquiries(conn, log = (s) => console.log(s)) {
  const enquiries = await readJson("enquiries");
  if (!enquiries.length) { log("• legacy enquiries: file not found / empty (skipped)"); return { imported: 0, dup: 0, noOwner: 0 }; }
  const customers = await readJson("customers");

  // Build slug → { userId, cardId|null }
  const slugToOwner = new Map();
  const [cardRows] = await conn.query("SELECT id, user_id, LOWER(slug) AS slug FROM cards WHERE slug IS NOT NULL AND slug <> ''");
  for (const r of cardRows) if (!slugToOwner.has(r.slug)) slugToOwner.set(r.slug, { userId: r.user_id, cardId: r.id });
  try {
    const [pcRows] = await conn.query("SELECT user_id, LOWER(slug) AS slug FROM published_cards WHERE slug IS NOT NULL AND slug <> ''");
    for (const r of pcRows) if (!slugToOwner.has(r.slug)) slugToOwner.set(r.slug, { userId: r.user_id, cardId: null });
  } catch { /* table may not exist yet */ }
  const emailToUserId = new Map();
  const [userRows] = await conn.query("SELECT id, LOWER(email) AS email FROM users WHERE email IS NOT NULL");
  for (const u of userRows) emailToUserId.set(u.email, u.id);
  for (const c of customers) {
    const slug = String(c.slug || "").toLowerCase();
    const email = String(c.email || "").toLowerCase();
    if (slug && !slugToOwner.has(slug) && emailToUserId.has(email)) {
      slugToOwner.set(slug, { userId: emailToUserId.get(email), cardId: null });
    }
  }

  // Existing legacy dedup keys (user_id | full_name | created_at string).
  const [existing] = await conn.query(
    "SELECT user_id, full_name, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS cstr FROM leads WHERE source = 'legacy'");
  const seen = new Set(existing.map((r) => `${r.user_id}|${r.full_name}|${r.cstr}`));

  let imported = 0, dup = 0, noOwner = 0;
  const batch = [];
  for (const e of enquiries) {
    const owner = slugToOwner.get(String(e.uname || "").toLowerCase());
    if (!owner) { noOwner++; continue; }
    const name = (String(e.name || "").trim()) || "Anonymous";
    const dt = normalizeDt(e.created_on);
    const key = `${owner.userId}|${name}|${dt}`;
    if (seen.has(key)) { dup++; continue; }
    seen.add(key);
    const status = STATUS_MAP[String(e.status || "new").toLowerCase()] || "new";
    batch.push([
      owner.cardId, owner.userId, name.slice(0, 255),
      (e.email ? String(e.email).slice(0, 255) : null),
      (e.contact ? String(e.contact).slice(0, 50) : null),
      (e.description ? String(e.description) : null),
      "legacy", status, dt,
    ]);
    imported++;
  }
  if (batch.length) {
    // Bulk insert (mysql2 nested-array VALUES). created_at set explicitly;
    // updated_at defaults. No existing row is touched.
    await conn.query(
      "INSERT INTO leads (card_id, user_id, full_name, email, phone, message, source, status, created_at) VALUES ?",
      [batch]);
  }
  log(`✓ legacy enquiries import — ${imported} imported, ${dup} already present, ${noOwner} skipped (no matching account)`);
  return { imported, dup, noOwner };
}
