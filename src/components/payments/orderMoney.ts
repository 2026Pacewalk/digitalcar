/* Money for the Payment Orders module (admin, reseller and customer views): the
   row shape, each row's own currency, ₹ values, summary stats and the CSV. Pure
   and DOM-free, so it's shared by orderUi.tsx and unit-tested from
   api/lib/payment-reporting.test.ts.

   A payment row is in ₹ or $. Rows show their own currency; totals are ₹ (the ₹
   equivalent once $ rows are mixed in, at each payment's own rate). Every
   all-₹ figure here is exactly what it was before USD existed. */
import { formatMoney, isCurrency, isValidRate, DEFAULT_RATE, type Currency } from "@contracts/money";

export type PaymentOrderRow = {
  id: number;
  userId: number;
  planName: string | null;
  billingCycle: string;
  /** In `currency`. */
  amount: number;
  currency: Currency;
  /** ₹ per unit of `currency` at checkout: 1 for INR. amount × fxRate is the ₹ value. */
  fxRate: number;
  method: "upi" | "bank";
  gateway: "manual" | "razorpay";
  reference: string;
  status: "pending" | "verified" | "rejected";
  adminNote: string | null;
  createdAt: string | Date;
  verifiedAt: string | Date | null;
  user: { name: string; email: string; phone?: string | null } | null;
};

/** A payment_orders row as the payment router returns it (decimals may be strings). */
export type OrderRowInput = Omit<PaymentOrderRow, "amount" | "currency" | "fxRate" | "user"> & {
  amount: number | string;
  currency?: string | null;
  fxRate?: number | string | null;
  user?: PaymentOrderRow["user"];
};

/** Normalise a router row. Anything that isn't a known currency is a pre-USD row,
    which is INR at rate 1. A USD row always gets a usable rate, so its ₹ value is
    never computed at 1. */
export function toOrderRow(o: OrderRowInput): PaymentOrderRow {
  const currency: Currency = isCurrency(o.currency) ? o.currency : "INR";
  const rate = Number(o.fxRate);
  return {
    ...o,
    amount: Number(o.amount) || 0,
    currency,
    fxRate: currency === "INR" ? 1 : isValidRate(rate) ? rate : DEFAULT_RATE,
    user: o.user ?? null,
  };
}

/** A ledger amount in its own currency: "₹1,234.00" (byte-identical to the old
    inr()) or "$12.00". */
export const money = (v: unknown, cur: Currency = "INR") => formatMoney(Number(v) || 0, cur, { decimals: 2 });

/** What an order is worth in ₹. INR rows return their amount untouched, so every
    INR total is exactly what it was before USD existed. */
export const inrValue = (o: Pick<PaymentOrderRow, "amount" | "currency" | "fxRate">) =>
  o.currency === "INR" ? o.amount : Math.round(o.amount * o.fxRate * 100) / 100;

export const fmt = (s: string | Date | null | undefined) => {
  if (!s) return "—";
  const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** The orders as CSV text. Amount is in each row's own currency; when any row
    isn't ₹, Currency and INR value columns follow it so the file still adds up
    for bookkeeping. An all-₹ export is exactly the file it always was. */
export function ordersCsv(list: PaymentOrderRow[]): string {
  const mixed = list.some((o) => o.currency !== "INR");
  const head = ["ID", "Date", "Customer", "Email", "Phone", "Plan", "Cycle", "Amount", ...(mixed ? ["Currency", "INR value"] : []), "Gateway", "Method", "Reference", "Status", "Verified At", "Note"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map((o) => [
    o.id, fmt(o.createdAt), o.user?.name ?? "", o.user?.email ?? "", o.user?.phone ?? "",
    o.planName ?? "", o.billingCycle, o.amount, ...(mixed ? [o.currency, inrValue(o)] : []),
    o.gateway, o.method, o.reference, o.status, fmt(o.verifiedAt), o.adminNote ?? "",
  ].map(esc).join(","));
  return [head.join(","), ...rows].join("\n");
}

export type OrderStats = {
  revenue: number; monthRevenue?: number; pending: number; verified: number; rejected?: number; razorpayRevenue?: number; manualRevenue?: number;
  /** What the revenue figures are in. INR (the default) means ₹, or the ₹
      equivalent when some payments were in $. */
  currency?: Currency;
  /** The $ payments inside a ₹-equivalent revenue, for the "incl. $X" sub-line. */
  usdRevenue?: number; usdCount?: number;
};

/** Compute summary stats client-side from a list (reseller/customer views).
    Every paid row in $ → totals in $ (a US customer sees what they paid). Any ₹
    row among them → ₹ equivalent, with the $ part for the sub-line. All ₹ →
    exactly the old sums, since inrValue returns an INR amount untouched. */
export function computeStats(list: PaymentOrderRow[]): OrderStats & { rejected: number; razorpayRevenue: number; manualRevenue: number } {
  const verifiedRows = list.filter((o) => o.status === "verified");
  const currency: Currency = verifiedRows.length > 0 && verifiedRows.every((o) => o.currency === "USD") ? "USD" : "INR";
  const value = (o: PaymentOrderRow) => (currency === "USD" ? o.amount : inrValue(o));
  const sum = (rows: PaymentOrderRow[]) => rows.reduce((s, o) => s + value(o), 0);
  const usdRows = currency === "INR" ? verifiedRows.filter((o) => o.currency === "USD") : [];
  return {
    revenue: sum(verifiedRows),
    pending: list.filter((o) => o.status === "pending").length,
    verified: verifiedRows.length,
    rejected: list.filter((o) => o.status === "rejected").length,
    razorpayRevenue: sum(verifiedRows.filter((o) => o.gateway === "razorpay")),
    manualRevenue: sum(verifiedRows.filter((o) => o.gateway === "manual")),
    currency,
    usdRevenue: usdRows.reduce((s, o) => s + o.amount, 0),
    usdCount: usdRows.length,
  };
}
