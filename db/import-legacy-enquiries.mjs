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
 * Owner resolution for each enquiry's `uname` (legacyEnquiryOwners below):
 *   1. customers.json username → email → users.id   (the key the old site used)
 *   2. customers.json slug     → email → users.id
 *   3. cards.slug              → user_id (+ card_id)  — only for a uname the
 *   4. published_cards.slug    → user_id                old site never had
 * A legacy username/slug whose customer has no account here, or was erased /
 * removed by an admin (app_settings.hidden_customers), belongs to NOBODY: it
 * never falls through to a new card that happens to use the same address.
 * Enquiries whose uname maps to no account are skipped (counted, never guessed).
 * The legacy demo/test bucket (uname 'admin' → hundreds of spam submissions on
 * the demo card) is intentionally excluded so it never floods a real CRM.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

/** The hash an owner's deletion leaves behind (lead_tombstones), so this import
    never brings a deleted enquiry back. Keep in step with legacyLeadKeyHash in
    api/lib/lead-tombstones.ts. */
export function legacyLeadKeyHash(userId, fullName, createdAt) {
  return createHash("sha256").update(`${userId}|${fullName}|${createdAt}`, "utf8").digest("hex");
}

async function readJson(file) {
  for (const p of [`./dist/public/${file}.json`, `./public/${file}.json`]) {
    try { return JSON.parse(await readFile(p, "utf8")); } catch { /* try next */ }
  }
  return [];
}

// Legacy status → new CRM enum (leads.status).
const STATUS_MAP = { new: "new", pending: "contacted", closed: "closed", converted: "converted" };

// Legacy usernames to never import (demo/test buckets that collected spam).
const SKIP_UNAMES = new Set(["admin"]);

// Normalise legacy created_on to a stable 'YYYY-MM-DD HH:MM:SS' string (tz-free,
// so dedup is deterministic across runs). Falls back to a fixed date if unusable.
function normalizeDt(s) {
  const v = String(s || "").trim();
  const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (!m) return "2020-01-01 00:00:00";
  return `${m[1]} ${m[2] || "00:00:00"}`;
}

const lc = (v) => String(v || "").toLowerCase().trim();

/** uname → { userId, cardId|null } | null (null = a legacy name with no owner
    here). Pure, so the order is unit-tested (api/lib/legacy-enquiry-owners.test.ts).
    Most legacy usernames differ from the customer's slug, and card URLs were
    only kept clear of legacy SLUGS — so a new card could sit on someone's old
    username. The legacy file therefore decides first, for every name it has;
    usernames before slugs, as the old site filed enquiries under the username.
    A hidden (erased or admin-removed) customer still claims its names, so its
    enquiries go nowhere rather than to whoever else matches.
    cards / published_cards rows: { slug, userId, cardId } with slug lowercased. */
export function legacyEnquiryOwners({ customers, hiddenIds, userIdByEmail, cards, publishedCards }) {
  const hidden = new Set([...hiddenIds].map(String));
  const cardBySlug = new Map();
  for (const r of cards) if (r.slug && !cardBySlug.has(r.slug)) cardBySlug.set(r.slug, r);
  const owners = new Map();
  for (const field of ["username", "slug"]) {
    for (const c of customers) {
      const key = lc(c[field]);
      if (!key || owners.has(key)) continue;
      const email = lc(c.email);
      const userId = email && !hidden.has(String(c.id)) ? userIdByEmail.get(email) : undefined;
      const card = cardBySlug.get(key);
      owners.set(key, userId ? { userId, cardId: card && card.userId === userId ? card.cardId : null } : null);
    }
  }
  for (const r of cards) if (r.slug && !owners.has(r.slug)) owners.set(r.slug, { userId: r.userId, cardId: r.cardId });
  for (const r of publishedCards) if (r.slug && !owners.has(r.slug)) owners.set(r.slug, { userId: r.userId, cardId: null });
  return owners;
}

/* The customers.json ids an erasure or an admin removed (the same list the
   admin screens hide). An unreadable list stops the import rather than
   handing a removed customer's enquiries back to an account. */
async function hiddenCustomerIds(conn) {
  let rows;
  try { [rows] = await conn.query("SELECT value FROM app_settings WHERE `key` = 'hidden_customers'"); }
  catch (e) { if (e.code === "ER_NO_SUCH_TABLE") return new Set(); throw e; }
  if (!rows[0]?.value) return new Set();
  const arr = JSON.parse(rows[0].value);
  if (!Array.isArray(arr)) throw new Error("app_settings.hidden_customers is not a list");
  return new Set(arr.map(String));
}

export async function importLegacyEnquiries(conn, log = (s) => console.log(s)) {
  const enquiries = await readJson("enquiries");
  if (!enquiries.length) { log("• legacy enquiries: file not found / empty (skipped)"); return { imported: 0, dup: 0, noOwner: 0 }; }
  const customers = await readJson("customers");
  // Without the old customer list every old username would fall through to
  // whichever new card uses that address — so import nothing instead.
  if (!customers.length) { log("• legacy enquiries: customers.json not found / empty (skipped)"); return { imported: 0, dup: 0, noOwner: 0 }; }

  // uname → { userId, cardId|null } | null — the legacy file first (see above).
  const [cardRows] = await conn.query("SELECT id, user_id, LOWER(slug) AS slug FROM cards WHERE slug IS NOT NULL AND slug <> ''");
  let pcRows = [];
  try {
    [pcRows] = await conn.query("SELECT user_id, LOWER(slug) AS slug FROM published_cards WHERE slug IS NOT NULL AND slug <> ''");
  } catch { /* table may not exist yet */ }
  const userIdByEmail = new Map();
  const [userRows] = await conn.query("SELECT id, LOWER(TRIM(email)) AS email FROM users WHERE email IS NOT NULL");
  for (const u of userRows) userIdByEmail.set(u.email, u.id);
  const ownerOf = legacyEnquiryOwners({
    customers, hiddenIds: await hiddenCustomerIds(conn), userIdByEmail,
    cards: cardRows.map((r) => ({ slug: r.slug, userId: r.user_id, cardId: r.id })),
    publishedCards: pcRows.map((r) => ({ slug: r.slug, userId: r.user_id })),
  });

  // Existing legacy dedup keys (user_id | full_name | created_at string).
  const [existing] = await conn.query(
    "SELECT user_id, full_name, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS cstr FROM leads WHERE source = 'legacy'");
  const seen = new Set(existing.map((r) => `${r.user_id}|${r.full_name}|${r.cstr}`));
  // Enquiries their owner deleted — never import those again.
  let deletedKeys = new Set();
  try {
    const [rows] = await conn.query("SELECT user_id, key_hash FROM lead_tombstones");
    deletedKeys = new Set(rows.map((r) => `${r.user_id}|${r.key_hash}`));
  } catch { /* table not created yet: nothing has been deleted */ }

  let imported = 0, dup = 0, noOwner = 0, skipped = 0, deleted = 0;
  const batch = [];
  for (const e of enquiries) {
    const uname = lc(e.uname);
    if (SKIP_UNAMES.has(uname)) { skipped++; continue; }
    const owner = ownerOf.get(uname);
    if (!owner) { noOwner++; continue; }
    const name = (String(e.name || "").trim()) || "Anonymous";
    const dt = normalizeDt(e.created_on);
    const key = `${owner.userId}|${name}|${dt}`;
    if (seen.has(key)) { dup++; continue; }
    // The same identity the delete hashed: the name as stored (≤255 chars).
    if (deletedKeys.has(`${owner.userId}|${legacyLeadKeyHash(owner.userId, name.slice(0, 255), dt)}`)) { deleted++; continue; }
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
  log(`✓ legacy enquiries import — ${imported} imported, ${dup} already present, ${deleted} deleted by their owner, ${noOwner} no matching account, ${skipped} test-bucket skipped`);
  return { imported, dup, noOwner, skipped, deleted };
}
