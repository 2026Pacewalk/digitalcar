import { asc, desc, eq, inArray } from "drizzle-orm";
import { resellerAccounts, resellerOrders, resellerPayments } from "@db/schema";
import { getDb } from "../queries/connection";
import { buildStatement, ledgerTotals, paise } from "@contracts/reseller-ledger";

/* Reading a reseller's offline book (reseller_accounts, reseller_orders,
   reseller_payments). The admin's side lives in api/reseller-ledger-router.ts;
   the reseller's own read-only statement is built here, from the same rules
   (contracts/reseller-ledger.ts). */

type Db = ReturnType<typeof getDb>;
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Order and payment totals per account, for the admin's list and statement. */
export async function accountTotals(db: Db, accountIds: number[]) {
  const orders = accountIds.length
    ? await db.select().from(resellerOrders).where(inArray(resellerOrders.accountId, accountIds))
    : [];
  const payments = accountIds.length
    ? await db.select().from(resellerPayments).where(inArray(resellerPayments.accountId, accountIds))
    : [];
  const out = new Map<number, { orders: number; cards: number; gross: number; commission: number; due: number; received: number; lastPayment: Date | null }>();
  for (const id of accountIds) out.set(id, { orders: 0, cards: 0, gross: 0, commission: 0, due: 0, received: 0, lastPayment: null });
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const t = out.get(o.accountId)!;
    t.orders++; t.cards += o.quantity; t.gross += num(o.grossAmount); t.commission += num(o.commissionAmount); t.due += num(o.netAmount);
  }
  for (const p of payments) {
    const t = out.get(p.accountId)!;
    t.received += num(p.amount);
    if (!t.lastPayment || p.paidOn > t.lastPayment) t.lastPayment = p.paidOn;
  }
  // 3 × ₹799.20 sums to 2397.6000000000004; round so a paid-up account nets to 0.
  for (const t of out.values()) {
    t.gross = paise(t.gross); t.commission = paise(t.commission); t.due = paise(t.due); t.received = paise(t.received);
  }
  return out;
}

/** A reseller's own statement: the ledger account linked to their login
    (reseller_accounts.reseller_user_id — the lowest id if the admin linked
    more than one), or { linked: false }.

    Every column is named on purpose. The ledger is the admin's book: its notes
    on the account, orders and payments are private, and the account's contact
    fields are whatever the admin typed — none of it is the reseller's to read. */
export async function resellerStatementFor(db: Db, resellerUserId: number) {
  const [account] = await db.select({
    id: resellerAccounts.id,
    name: resellerAccounts.name,
    company: resellerAccounts.company,
    commissionRate: resellerAccounts.commissionRate,
    openingBalance: resellerAccounts.openingBalance,
    createdAt: resellerAccounts.createdAt,
  }).from(resellerAccounts)
    .where(eq(resellerAccounts.resellerUserId, resellerUserId))
    .orderBy(asc(resellerAccounts.id))
    .limit(1);
  if (!account) return { linked: false as const };

  const orderRows = await db.select({
    id: resellerOrders.id,
    orderDate: resellerOrders.orderDate,
    title: resellerOrders.title,
    plan: resellerOrders.plan,
    quantity: resellerOrders.quantity,
    unitPrice: resellerOrders.unitPrice,
    grossAmount: resellerOrders.grossAmount,
    commissionRate: resellerOrders.commissionRate,
    commissionAmount: resellerOrders.commissionAmount,
    netAmount: resellerOrders.netAmount,
    customerNames: resellerOrders.customerNames,
    status: resellerOrders.status,
  }).from(resellerOrders)
    .where(eq(resellerOrders.accountId, account.id))
    .orderBy(desc(resellerOrders.orderDate), desc(resellerOrders.id));

  const paymentRows = await db.select({
    id: resellerPayments.id,
    orderId: resellerPayments.orderId,
    amount: resellerPayments.amount,
    method: resellerPayments.method,
    reference: resellerPayments.reference,
    paidOn: resellerPayments.paidOn,
  }).from(resellerPayments)
    .where(eq(resellerPayments.accountId, account.id))
    .orderBy(desc(resellerPayments.paidOn), desc(resellerPayments.id));

  const orders = orderRows.map((o) => ({
    ...o,
    unitPrice: num(o.unitPrice), grossAmount: num(o.grossAmount), commissionRate: num(o.commissionRate),
    commissionAmount: num(o.commissionAmount), netAmount: num(o.netAmount),
  }));
  const payments = paymentRows.map((p) => ({ ...p, amount: num(p.amount) }));
  const openingBalance = num(account.openingBalance);

  return {
    linked: true as const,
    account: {
      name: account.name,
      company: account.company,
      commissionRate: num(account.commissionRate),
      openingBalance,
      openedAt: account.createdAt,
    },
    orders,
    payments,
    totals: ledgerTotals(openingBalance, orders, payments),
    statement: buildStatement({ openingBalance, openedAt: account.createdAt }, orders, payments),
  };
}
