import { and, eq, inArray } from "drizzle-orm";
import { resellerAssignments } from "@db/schema";
import type { getDb } from "../queries/connection";

/* Customers an admin linked to a reseller (Admin → Customers → Assign to
   reseller) rather than ones the reseller created. The reseller earns on their
   plan payments from the link date (commission is worked out when a payment is
   verified), and sees their payments from that date only — not the history
   from before they were the customer's partner. */

type Db = ReturnType<typeof getDb>;

/** When each of these customers was last linked to this reseller by an admin.
    Customers the reseller created themselves have no entry. */
export async function linkedSince(db: Db, resellerUserId: number, customerIds: number[]): Promise<Map<number, Date>> {
  const out = new Map<number, Date>();
  if (!customerIds.length) return out;
  const rows = await db.select({ userId: resellerAssignments.customerUserId, at: resellerAssignments.createdAt })
    .from(resellerAssignments)
    .where(and(eq(resellerAssignments.toResellerId, resellerUserId), inArray(resellerAssignments.customerUserId, customerIds)));
  for (const r of rows) {
    const at = new Date(r.at);
    const prev = out.get(r.userId);
    if (!Number.isNaN(at.getTime()) && (!prev || at > prev)) out.set(r.userId, at);
  }
  return out;
}

const time = (v: Date | string | null | undefined) => {
  if (!v) return NaN;
  return new Date(v).getTime();
};

/** Can the reseller see this payment order? Always for customers they created
    (no link date). For a linked customer, only orders placed on or after the
    link date — plus an older one VERIFIED after it, since that earned them
    commission. (An older one rejected after the link stays hidden.) */
export function visibleSinceLink(
  order: { createdAt: Date | string | null; verifiedAt?: Date | string | null; status?: string | null },
  since: Date | null | undefined,
): boolean {
  if (!since) return true;
  const from = since.getTime();
  return time(order.createdAt) >= from || (order.status === "verified" && time(order.verifiedAt) >= from);
}
