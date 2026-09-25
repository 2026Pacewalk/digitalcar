/* The wallet: one balance per user, and a statement line for every change.

   Referral rewards and reseller commission are both credited here, and both are
   paid out through the same withdrawal queue. This is the only code that moves
   a wallet balance.

   Every change locks the user's row for the length of a transaction. Before
   this existed, a credit read the balance and then wrote it back in a second
   step, so two credits landing together could both start from the same number
   and one would vanish — and two payout requests could both pass the balance
   check and spend the same money twice. */
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { users, walletTransactions } from "@db/schema";
import type { getDb } from "../queries/connection";

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => v.toFixed(2);

export type WalletEntry = {
  type: "reward" | "withdrawal" | "adjustment" | "commission";
  status?: "pending" | "completed" | "reversed";
  referralId?: number;
  withdrawalId?: number;
  note?: string;
};

/** Apply a signed amount (positive = credit, negative = debit) and record the
    statement line, as one step. A debit that would take the balance below zero
    is refused, so a payout can never spend money that isn't there.
    Pass `tx` to make this part of a larger atomic step — the row lock is then
    held until that transaction commits. Returns the balance afterwards. */
export async function applyWallet(db: Db, userId: number, amount: number, entry: WalletEntry, tx?: Tx): Promise<number> {
  const run = async (t: Tx) => {
    const [row] = await t.select({ walletBalance: users.walletBalance }).from(users)
      .where(eq(users.id, userId)).for("update");
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
    const next = Math.round((n(row.walletBalance) + amount) * 100) / 100;
    if (next < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Amount exceeds your wallet balance" });
    await t.update(users).set({ walletBalance: money(next) }).where(eq(users.id, userId));
    await t.insert(walletTransactions).values({
      userId,
      type: entry.type,
      amount: money(amount),
      balanceAfter: money(next),
      status: entry.status ?? "completed",
      referralId: entry.referralId ?? null,
      withdrawalId: entry.withdrawalId ?? null,
      note: entry.note ?? null,
    });
    return next;
  };
  return tx ? run(tx) : db.transaction(run);
}

/** Rows touched by an UPDATE — mysql2 reports it in one of two shapes. */
export function affectedRows(result: unknown): number {
  return (result as { affectedRows?: number }[])?.[0]?.affectedRows
    ?? (result as { affectedRows?: number })?.affectedRows ?? 0;
}
