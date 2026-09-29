import { createHash } from "node:crypto";

/* Old-site enquiries an owner deleted stay deleted.

   Every deploy re-runs the back-fill of the old site's enquiries.json into
   `leads` (db/import-legacy-enquiries.mjs), which skips an enquiry only while
   its lead still exists — so a deleted one came back on the next deploy. When
   an owner deletes an imported lead we keep a hash of its identity (owner |
   name | date, exactly as the import builds it), and the import skips those.
   The hash is all that's kept: no name, email or phone. */

/** The identity the import dedups on. `createdAt` is the lead's created_at as
    MySQL's DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') returns it — the same
    string the import inserted. Keep in step with legacyLeadKeyHash in
    db/import-legacy-enquiries.mjs. */
export function legacyLeadKeyHash(userId: number, fullName: string, createdAt: string): string {
  return createHash("sha256").update(`${userId}|${fullName}|${createdAt}`, "utf8").digest("hex");
}
