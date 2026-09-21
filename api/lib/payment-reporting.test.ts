/* Payment reporting with USD: the Payment Orders module (admin, reseller and
   customer views), and the admin referral suggestion.

   The golden tests pin today's INR behaviour: every INR figure, the CSV and the
   summary cards must come out exactly as they did before USD existed, compared
   with inline copies of the pre-USD code. */
import { describe, expect, it } from "vitest";
import { createElement as h, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckCircle2, Clock, IndianRupee, Receipt } from "lucide-react";
import {
  computeStats, inrValue, money, ordersCsv, toOrderRow,
  type OrderRowInput, type OrderStats, type PaymentOrderRow,
} from "../../src/components/payments/orderMoney";
import { referralPlanValue } from "./referral-value";

/* The components are JSX, which the server typecheck (tsconfig.server.json, no
   --jsx) can't compile but vitest can: a non-literal specifier keeps tsc from
   resolving the .tsx while the rendering golden tests still run. */
type UiModule = {
  SummaryCards: ComponentType<{ stats: OrderStats }>;
  OrdersTable: ComponentType<{ list: PaymentOrderRow[]; onRow: (o: PaymentOrderRow) => void }>;
  OrderDrawer: ComponentType<{ order: PaymentOrderRow; onClose: () => void }>;
};
const UI_PATH: string = "../../src/components/payments/orderUi.tsx";
const { SummaryCards, OrdersTable, OrderDrawer } = (await import(/* @vite-ignore */ UI_PATH)) as UiModule;

/* ── Fixtures ── */
let nextId = 1;
const row = (p: Partial<OrderRowInput> & { amount: number | string }): PaymentOrderRow => toOrderRow({
  id: nextId++, userId: 7, planName: "Gold", billingCycle: "yearly", method: "upi", gateway: "razorpay",
  reference: `pay_${nextId}`, status: "verified", adminNote: null,
  createdAt: new Date("2026-09-01T10:00:00Z"), verifiedAt: new Date("2026-09-01T10:00:05Z"),
  user: { name: "Asha, \"A\" Rao", email: "asha@example.com", phone: "9000000000" },
  ...p,
});

const inrRows = (): PaymentOrderRow[] => [
  row({ amount: "999.00", currency: "INR", fxRate: "1.0000" }),
  row({ amount: "89.00", gateway: "manual", method: "bank" }),
  row({ amount: 24.92, status: "pending", gateway: "manual" }),
  row({ amount: "1999.50", adminNote: "paid, twice\nrefunded one" }),
  row({ amount: 4999, status: "rejected", gateway: "manual" }),
  row({ amount: "2499.99", currency: null, fxRate: null }),
];

/* ── Pre-USD code, copied verbatim (orderUi.tsx before USD) ── */
const inr = (v: unknown) =>
  "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const oldFmt = (s: string | Date | null | undefined) => {
  if (!s) return "—";
  const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function oldComputeStats(list: PaymentOrderRow[]) {
  const verifiedRows = list.filter((o) => o.status === "verified");
  const revenue = verifiedRows.reduce((s, o) => s + o.amount, 0);
  return {
    revenue,
    pending: list.filter((o) => o.status === "pending").length,
    verified: verifiedRows.length,
    rejected: list.filter((o) => o.status === "rejected").length,
    razorpayRevenue: verifiedRows.filter((o) => o.gateway === "razorpay").reduce((s, o) => s + o.amount, 0),
    manualRevenue: verifiedRows.filter((o) => o.gateway === "manual").reduce((s, o) => s + o.amount, 0),
  };
}

function oldCsv(list: PaymentOrderRow[]) {
  const head = ["ID", "Date", "Customer", "Email", "Phone", "Plan", "Cycle", "Amount", "Gateway", "Method", "Reference", "Status", "Verified At", "Note"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map((o) => [
    o.id, oldFmt(o.createdAt), o.user?.name ?? "", o.user?.email ?? "", o.user?.phone ?? "",
    o.planName ?? "", o.billingCycle, o.amount, o.gateway, o.method, o.reference, o.status, oldFmt(o.verifiedAt), o.adminNote ?? "",
  ].map(esc).join(","));
  return [head.join(","), ...rows].join("\n");
}

type OldStats = { revenue: number; monthRevenue?: number; pending: number; verified: number };
function OldSummaryCards({ stats }: { stats: OldStats }) {
  const cards = [
    { label: "Total collected", value: inr(stats.revenue), icon: IndianRupee, bg: "#DCFCE7", fg: "#16A34A" },
    ...(stats.monthRevenue !== undefined ? [{ label: "This month", value: inr(stats.monthRevenue), icon: Receipt, bg: "#E0E7FF", fg: "#4F46E5" }] : []),
    { label: "Pending", value: String(stats.pending), icon: Clock, bg: "#FEF3C7", fg: "#D97706" },
    { label: "Verified", value: String(stats.verified), icon: CheckCircle2, bg: "#DCFCE7", fg: "#16A34A" },
  ];
  return h("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" },
    cards.map((s) => h("div", { key: s.label, className: "bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3" },
      h("div", { className: "w-11 h-11 rounded-xl flex items-center justify-center shrink-0", style: { background: s.bg } },
        h(s.icon as ComponentType<{ size: number; style: object }>, { size: 19, style: { color: s.fg } })),
      h("div", { className: "min-w-0" },
        h("p", { className: "text-lg font-bold text-[#0F172A] leading-none truncate" }, s.value),
        h("p", { className: "text-[11px] text-[#64748B] mt-1" }, s.label)))));
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

/* ── Tests ── */
describe("toOrderRow", () => {
  it("reads router rows: decimal strings, currency and rate", () => {
    const o = toOrderRow({ ...row({ amount: 1 }), amount: "999.00", currency: "INR", fxRate: "1.0000", user: undefined });
    expect([o.amount, o.currency, o.fxRate, o.user]).toEqual([999, "INR", 1, null]);
    const u = toOrderRow({ ...row({ amount: 1 }), amount: "12.00", currency: "USD", fxRate: "85.0000" });
    expect([u.amount, u.currency, u.fxRate]).toEqual([12, "USD", 85]);
  });

  it("treats a missing or unknown currency as a pre-USD INR row at rate 1", () => {
    for (const currency of [null, undefined, "", "EUR", "usd"]) {
      const o = toOrderRow({ ...row({ amount: 1 }), amount: "499", currency, fxRate: "3.5" });
      expect([o.currency, o.fxRate]).toEqual(["INR", 1]);
    }
  });

  it("never values a USD row at rate 1", () => {
    for (const fxRate of ["1.0000", null, "abc", "0", "500"]) {
      expect(toOrderRow({ ...row({ amount: 1 }), amount: 12, currency: "USD", fxRate }).fxRate).toBe(85);
    }
  });
});

describe("money / inrValue", () => {
  it("formats INR byte-identically to the old inr()", () => {
    for (const v of [0, 1, 24.92, 89, 99, 999, 1234.5, 2499.99, 123456.78, 10000000, "899.00", "", null, undefined, "abc"]) {
      expect(money(v)).toBe(inr(v));
      expect(money(v, "INR")).toBe(inr(v));
    }
  });

  it("formats USD with the $ sign and two decimals", () => {
    expect(money(12, "USD")).toBe("$12.00");
    expect(money(9.18, "USD")).toBe("$9.18");
    expect(money(1056, "USD")).toBe("$1,056.00");
  });

  it("returns an INR amount untouched and converts USD at its own rate, to the paisa", () => {
    expect(inrValue({ amount: 999.99, currency: "INR", fxRate: 1 })).toBe(999.99);
    expect(inrValue({ amount: 12, currency: "USD", fxRate: 85 })).toBe(1020);
    expect(inrValue({ amount: 9.18, currency: "USD", fxRate: 85 })).toBe(780.3);
    expect(inrValue({ amount: 10.2, currency: "USD", fxRate: 88.1234 })).toBe(898.86);
  });
});

describe("computeStats", () => {
  it("golden: an all-INR list gives exactly the pre-USD numbers", () => {
    const list = inrRows();
    const stats = computeStats(list);
    const { currency, usdRevenue, usdCount, ...rest } = stats;
    expect(rest).toEqual(oldComputeStats(list));
    expect([currency, usdRevenue, usdCount]).toEqual(["INR", 0, 0]);
    expect(computeStats([])).toMatchObject({ ...oldComputeStats([]), currency: "INR", usdCount: 0 });
  });

  it("shows an all-USD customer their totals in $", () => {
    const list = [
      row({ amount: "12.00", currency: "USD", fxRate: "85" }),
      row({ amount: 2, currency: "USD", fxRate: "88", billingCycle: "monthly" }),
      row({ amount: 24, currency: "USD", fxRate: "85", status: "pending" }),
    ];
    expect(computeStats(list)).toMatchObject({
      currency: "USD", revenue: 14, razorpayRevenue: 14, manualRevenue: 0, pending: 1, verified: 2, usdCount: 0,
    });
  });

  it("gives a mixed list its ₹ equivalent, each $ row at its own rate, plus the $ part", () => {
    const list = [
      row({ amount: 999 }),
      row({ amount: 89, gateway: "manual" }),
      row({ amount: 12, currency: "USD", fxRate: 85 }),
      row({ amount: 9.18, currency: "USD", fxRate: 88 }),
      row({ amount: 30, currency: "USD", fxRate: 85, status: "rejected" }),
    ];
    expect(computeStats(list)).toMatchObject({
      currency: "INR",
      revenue: 999 + 89 + 1020 + 807.84,
      razorpayRevenue: 999 + 1020 + 807.84,
      manualRevenue: 89,
      usdRevenue: 21.18,
      usdCount: 2,
      verified: 4,
      rejected: 1,
    });
  });
});

describe("ordersCsv", () => {
  it("golden: an all-INR export is byte-identical to the pre-USD file", () => {
    const list = inrRows();
    expect(ordersCsv(list)).toBe(oldCsv(list));
    expect(ordersCsv([])).toBe(oldCsv([]));
  });

  it("adds Currency and INR value next to Amount once any row is in $", () => {
    const list = [row({ amount: 999 }), row({ amount: "12.00", currency: "USD", fxRate: "85.0000" })];
    // A CSV line's cells: names and dates contain commas, so they are quoted.
    const cells = (line: string) => {
      const out: string[] = [];
      let cur = "", quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
          if (c !== '"') cur += c;
          else if (line[i + 1] === '"') { cur += '"'; i++; }
          else quoted = false;
        } else if (c === '"') quoted = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
      return [...out, cur];
    };
    const [head, a, b] = ordersCsv(list).split("\n");
    const cols = cells(head);
    expect(cols).toHaveLength(16);
    expect(cols.slice(7, 11)).toEqual(["Amount", "Currency", "INR value", "Gateway"]);
    expect(cells(a)).toHaveLength(16);
    expect(cells(a).slice(7, 11)).toEqual(["999", "INR", "999", "razorpay"]);
    expect(cells(b).slice(7, 11)).toEqual(["12", "USD", "1020", "razorpay"]);
  });
});

describe("SummaryCards", () => {
  it("golden: ₹ stats render exactly the pre-USD markup", () => {
    const admin = { revenue: 123456.5, monthRevenue: 999, pending: 2, verified: 10 };
    expect(html(h(SummaryCards, { stats: { ...admin, usdRevenue: 0, usdCount: 0 } }))).toBe(html(h(OldSummaryCards, { stats: admin })));
    expect(html(h(SummaryCards, { stats: admin }))).toBe(html(h(OldSummaryCards, { stats: admin })));
    const client = computeStats(inrRows());
    expect(html(h(SummaryCards, { stats: client }))).toBe(html(h(OldSummaryCards, { stats: oldComputeStats(inrRows()) })));
  });

  it("labels a total with $ payments in it as the ₹ equivalent", () => {
    const out = html(h(SummaryCards, { stats: { revenue: 2019, monthRevenue: 1020, pending: 0, verified: 2, usdRevenue: 12, usdCount: 1 } }));
    expect(out).toContain("₹2,019.00");
    expect(out).toContain("₹ equivalent · incl. $12.00 from 1 USD payment<");
    expect(out.match(/₹ equivalent/g)).toHaveLength(2); // total and this month
  });

  it("shows an all-USD total in $", () => {
    const out = html(h(SummaryCards, { stats: computeStats([row({ amount: 12, currency: "USD", fxRate: 85 })]) }));
    expect(out).toContain("$12.00");
    expect(out).not.toContain("₹");
  });
});

describe("OrdersTable / OrderDrawer", () => {
  it("golden: an INR amount cell and drawer are unchanged", () => {
    const o = row({ amount: "999.00" });
    const table = html(h(OrdersTable, { list: [o], onRow: () => {} }));
    expect(table).toContain('<td class="px-4 py-3 font-bold text-[#0F172A] whitespace-nowrap">₹999.00</td>');
    const drawer = html(h(OrderDrawer, { order: o, onClose: () => {} }));
    expect(drawer).toContain('<p class="text-lg font-bold text-[#0F172A]">₹999.00</p>');
    expect(drawer).toContain("Card / UPI / Netbanking");
    expect(drawer).not.toContain("In ₹");
    // The rows, verbatim: label then value, in the pre-USD order.
    const labels = [...drawer.matchAll(/<span class="text-\[12px\] text-\[#94A3B8\] shrink-0">([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(labels).toEqual(["Customer", "Email", "Phone", "Plan", "Payment ID", "Created", "Verified"]);
    expect(drawer).toContain('<span class="text-[13px] font-semibold text-[#0F172A] text-right break-all font-mono">pay_');
  });

  it("shows a USD row in $ with its ₹ value", () => {
    const o = row({ amount: 12, currency: "USD", fxRate: 85 });
    expect(html(h(OrdersTable, { list: [o], onRow: () => {} }))).toContain("$12.00<span class=\"block text-[11px] font-medium text-[#94A3B8]\">≈ ₹1,020.00</span>");
    const drawer = html(h(OrderDrawer, { order: o, onClose: () => {} }));
    expect(drawer).toContain("$12.00");
    expect(drawer).toContain("₹1,020.00 at ₹85/$");
    expect(drawer).toContain("International payment");
    expect(drawer).not.toContain("UPI");
  });
});

describe("referralPlanValue (admin referral suggestion)", () => {
  const usdOrders = [
    { userId: 1, packageId: 5, amount: "12.00", fxRate: "88.0000" },
    { userId: 1, packageId: 6, amount: "24.00", fxRate: "85.0000" },
    { userId: 2, packageId: 5, amount: "2.00", fxRate: "1.0000" },
  ];

  it("golden: an INR plan is worth exactly its amount", () => {
    for (const amount of ["99.00", "999.00", "2499.00", 199, "1999.50"]) {
      expect(referralPlanValue({ userId: 1, packageId: 5, amount, currency: "INR" }, usdOrders, 85))
        .toEqual({ currency: "INR", paid: Number(amount), inr: Number(amount) });
    }
  });

  it("values a USD plan at the rate of the payment that created it", () => {
    expect(referralPlanValue({ userId: 1, packageId: 6, amount: "24.00", currency: "USD" }, usdOrders, 85))
      .toEqual({ currency: "USD", paid: 24, inr: 2040 });
    expect(referralPlanValue({ userId: 1, packageId: 5, amount: "12.00", currency: "USD" }, usdOrders, 85))
      .toEqual({ currency: "USD", paid: 12, inr: 1056 });
  });

  it("treats a 'USD' row with no $ payment on record as a pre-USD ₹ row", () => {
    expect(referralPlanValue({ userId: 3, packageId: 5, amount: "999.00", currency: "USD" }, usdOrders, 85))
      .toEqual({ currency: "INR", paid: 999, inr: 999 });
    expect(referralPlanValue({ userId: 1, packageId: 5, amount: "999.00", currency: "USD" }, [], 85))
      .toEqual({ currency: "INR", paid: 999, inr: 999 });
  });

  it("falls back to the configured rate when the stored one is unusable", () => {
    expect(referralPlanValue({ userId: 2, packageId: 5, amount: "2.00", currency: "USD" }, usdOrders, 86))
      .toEqual({ currency: "USD", paid: 2, inr: 172 });
  });
});
