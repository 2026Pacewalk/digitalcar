/* A reseller's account with DigitalCarda: the card orders they place offline
 * (phone, WhatsApp, in person) and the cash / UPI / bank / cheque payments they
 * make, turned into a statement with a running balance.
 *
 * Shared by the admin's view of an account (Admin → Resellers → a reseller) and
 * the reseller's own (/reseller/statement), so the two can never disagree about
 * a row or a balance. Pure — no database, no React — and it knows nothing about
 * the admin's private notes: the admin page adds those itself.
 *
 * Money model, per order (worked out on the server when the order is saved):
 *   order value = quantity × price per card
 *   commission  = order value × the reseller's commission %
 *   payable     = order value − commission          (what the reseller owes)
 * Balance = opening balance + payable on every non-cancelled order − payments.
 */

export const ORDER_STATUSES = ["pending", "in_progress", "delivered", "cancelled"] as const;
export type LedgerOrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "upi", "bank", "cheque", "other"] as const;
export type LedgerPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUS_LABEL: Record<LedgerOrderStatus, string> = {
  pending: "Pending", in_progress: "In progress", delivered: "Delivered", cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABEL: Record<LedgerPaymentMethod, string> = {
  cash: "Cash", upi: "UPI", bank: "Bank transfer", cheque: "Cheque", other: "Other",
};

export const methodLabel = (m: string) => PAYMENT_METHOD_LABEL[m as LedgerPaymentMethod] ?? m;
export const statusLabel = (s: string) => ORDER_STATUS_LABEL[s as LedgerOrderStatus] ?? s;

/** What a statement needs from an order. Amounts are rupees, as numbers. */
export type LedgerOrder = {
  id: number;
  orderDate: Date | string;
  title: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
};

export type LedgerPayment = {
  id: number;
  amount: number;
  method: string;
  reference: string | null;
  paidOn: Date | string;
};

export type StatementRow = {
  date: Date;
  kind: "opening" | "order" | "payment";
  /** The order's or payment's id; null on the opening-balance row. */
  id: number | null;
  label: string;
  sub: string;
  /** Added to what's owed (an order, or an opening balance owed). */
  debit: number;
  /** Taken off it (a payment, or an opening balance in their favour). */
  credit: number;
  balance: number;
};

export type LedgerTotals = {
  orders: number;
  cards: number;
  orderValue: number;
  commission: number;
  /** Opening balance + payable on every order: everything they've owed. */
  payable: number;
  paid: number;
  /** payable − paid. Above 0 they owe it; below 0 they're in credit. */
  balance: number;
  lastPaymentAt: Date | null;
};

/** Sums of paise amounts drift in floating point (0.1 + 0.2); a balance must
    land on exactly 0 when it's settled. Round every money total with this. */
export const paise = (n: number) => Math.round(n * 100) / 100;

/** ₹1,234.5 — the admin statement's own format, kept for its detail lines. */
// Paise shown in full when there are any (₹500.50, not ₹500.5).
export const inr2 = (n: number) => { const v = paise(n); return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }); };

/** ₹1,234 for whole rupees, ₹1,234.50 with paise (never ₹1,234.5). */
export const rupees = (n: number) => {
  const v = paise(n);
  return (v < 0 ? "−₹" : "₹") + Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};

/** Where a reseller stands, in their words: "₹1,200" still due, "All settled",
    or "In credit ₹300" when they've paid more than they owe. */
export const balanceText = (balance: number) => {
  const b = paise(balance);
  return b > 0 ? rupees(b) : b < 0 ? `In credit ${rupees(-b)}` : "All settled";
};

const time = (d: Date | string) => new Date(d).getTime();

/** The statement, oldest first: the opening balance (when there is one), then
    every order that isn't cancelled (+) and every payment (−), each with the
    balance after it. Entries on the same day keep the order the admin
    statement has always shown them in — orders before payments, the most
    recently recorded first — so a printed copy and the screen agree. */
export function buildStatement(
  account: { openingBalance: number; openedAt: Date | string },
  orders: LedgerOrder[],
  payments: LedgerPayment[],
): StatementRow[] {
  const events = [
    ...orders.filter((o) => o.status !== "cancelled").map((o) => ({
      date: new Date(o.orderDate), kind: "order" as const, id: o.id, label: o.title,
      sub: `${o.quantity} × ${inr2(o.unitPrice)} = ${inr2(o.grossAmount)} − ${o.commissionRate}% commission ${inr2(o.commissionAmount)}`,
      debit: o.netAmount, credit: 0,
    })),
    ...payments.map((p) => ({
      date: new Date(p.paidOn), kind: "payment" as const, id: p.id, label: `Payment · ${methodLabel(p.method)}`,
      sub: p.reference ?? "", debit: 0, credit: p.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.kind === b.kind ? b.id - a.id : a.kind === "order" ? -1 : 1));

  const out: StatementRow[] = [];
  let balance = paise(account.openingBalance);
  if (balance) {
    // It comes before everything else, so it's dated no later than the first
    // entry — orders are often entered after the fact, with their own dates.
    const opened = time(account.openedAt);
    const first = events.length ? events[0].date.getTime() : opened;
    out.push({
      date: new Date(Math.min(opened, first)), kind: "opening", id: null, label: "Opening balance",
      // Below 0 it's a credit: they'd paid ahead, not fallen behind.
      sub: balance > 0 ? "Owed before this record started" : "In your favour before this record started",
      debit: balance > 0 ? balance : 0, credit: balance < 0 ? -balance : 0, balance,
    });
  }
  for (const e of events) {
    balance = paise(balance + e.debit - e.credit);
    out.push({ ...e, balance });
  }
  return out;
}

/** The account's totals, on the same rules as the statement. */
export function ledgerTotals(openingBalance: number, orders: LedgerOrder[], payments: LedgerPayment[]): LedgerTotals {
  const live = orders.filter((o) => o.status !== "cancelled");
  const sum = <T,>(list: T[], f: (x: T) => number) => paise(list.reduce((s, x) => s + f(x), 0));
  const payable = paise(openingBalance + sum(live, (o) => o.netAmount));
  const paid = sum(payments, (p) => p.amount);
  const last = payments.reduce<number | null>((m, p) => (m === null || time(p.paidOn) > m ? time(p.paidOn) : m), null);
  return {
    orders: live.length,
    cards: live.reduce((s, o) => s + o.quantity, 0),
    orderValue: sum(live, (o) => o.grossAmount),
    commission: sum(live, (o) => o.commissionAmount),
    payable,
    paid,
    balance: paise(payable - paid),
    lastPaymentAt: last === null ? null : new Date(last),
  };
}
