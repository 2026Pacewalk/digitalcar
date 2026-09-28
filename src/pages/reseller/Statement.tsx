import { useState } from "react";
import { flushSync } from "react-dom";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { downloadCsv } from "@/lib/csv";
import { BRAND_NAME, CONTACT } from "@/lib/publicNav";
import { balanceText, methodLabel, rupees, statusLabel } from "@contracts/reseller-ledger";
import {
  ShoppingBag, Percent, ReceiptText, CheckCircle2, Scale, Download, Printer, FileText, MessageCircle, Mail,
  RefreshCw, Loader2, AlertTriangle, WifiOff,
} from "lucide-react";

/* Account statement — the reseller's side of the book the DigitalCarda team
   keeps for them: every card order they've placed with us (by phone, WhatsApp
   or in person) and every payment they've made, with a running balance.
   Read-only: the team records orders and payments. Rows and totals are worked
   out on the server on the same rules as the admin's copy
   (contracts/reseller-ledger.ts), so the two always agree. */

type Tab = "statement" | "orders" | "payments";
type Data = Extract<inferRouterOutputs<AppRouter>["reseller"]["statement"], { linked: true }>;

const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "—";
};
// Today in India, for the file name.
const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

const STATUS_PILL: Record<string, string> = {
  pending: "bg-[#F1F5F9] text-[#475569]",
  in_progress: "bg-[#FEF3C7] text-[#92400E]",
  delivered: "bg-[#D1FAE5] text-[#065F46]",
  cancelled: "bg-[#FEE2E2] text-[#991B1B]",
};

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>{statusLabel(status)}</span>;
}

// Still to pay is amber; settled or in credit is green.
const balanceCls = (b: number) => (b > 0 ? "text-[#B45309]" : "text-[#047857]");
const todayLabel = (b: number) => (b > 0 ? "Balance due today" : b < 0 ? "In credit today" : "Balance today");

const card = "bg-white rounded-2xl shadow-premium border border-[#F1F5F9]";
const btn = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC]";

export default function ResellerStatement() {
  const { data, isPaused, isError, refetch, isFetching } = trpc.reseller.statement.useQuery();
  const s = data?.linked ? data : null;
  // Only for the printed letterhead (their GSTIN); the statement works without it.
  const { data: me } = trpc.reseller.me.useQuery(undefined, { enabled: !!s, retry: false });
  const [tab, setTab] = useState<Tab>("statement");

  const empty = !!s && !s.orders.length && !s.payments.length && !s.statement.length;

  const exportCsv = () => {
    if (!s) return;
    downloadCsv(`digitalcarda-statement-${todayIso()}.csv`, [
      ["Date", "Entry", "Details", "You owe (₹)", "You paid (₹)", "Balance (₹)"],
      ...s.statement.map((r) => [
        fmtDate(r.date), r.label, r.sub,
        r.debit ? r.debit.toFixed(2) : "", r.credit ? r.credit.toFixed(2) : "", r.balance.toFixed(2),
      ]),
    ]);
  };

  // Print / Save as PDF is always the statement — switch to it before the
  // browser takes its snapshot of the page.
  const print = () => {
    flushSync(() => setTab("statement"));
    window.print();
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block print:hidden"><TopBar title="Account statement" subtitle="Cards you've ordered from DigitalCarda and what you've paid" /></div>
      <div className="dc-print-statement p-4 sm:p-6 space-y-4 max-w-6xl mx-auto print:max-w-none print:p-0">
        {/* No answer yet — still loading, or waiting for the connection to come
            back (the request is paused offline, not failed). Only a real
            answer of "not linked" says the statement isn't set up. */}
        {!data && !isError ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading your statement">
            {isPaused && (
              <p role="status" className="flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] font-medium text-[#92400E]">
                <WifiOff size={15} className="shrink-0" /> You're offline. Your statement will load when you're back online.
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`${card} p-3.5 ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-[#F1F5F9]" />
                  <div className="mt-3 h-6 w-24 animate-pulse rounded bg-[#F1F5F9]" />
                  <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[#F1F5F9]" />
                </div>
              ))}
            </div>
            <div className={`${card} space-y-3 p-4`}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-[#F1F5F9]" />)}
            </div>
          </div>
        ) : isError ? (
          <div className={`${card} px-6 py-12 text-center`} role="alert">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309]"><AlertTriangle size={22} /></span>
            <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">We couldn't load your statement.</p>
            <p className="mt-1 text-sm text-[#64748B]">Check your connection and try again.</p>
            <button type="button" onClick={() => refetch()} disabled={isFetching}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:opacity-60">
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Try again
            </button>
          </div>
        ) : !s ? (
          <div className={`${card} px-6 py-12 text-center`}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D1FAE5] text-[#047857]"><FileText size={22} /></span>
            <p className="mx-auto mt-3 max-w-md text-[15px] font-semibold text-[#0F172A]">Your account statement isn't set up yet.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#64748B]">Ask the DigitalCarda team to link it to your login.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:bg-[#1FB855]">
                <MessageCircle size={16} /> WhatsApp us
              </a>
              <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Please link my account statement")}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">
                <Mail size={16} /> Email us
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* On paper: a letterhead instead of the app around it. */}
            <div className="hidden print:block">
              <div className="flex items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-3">
                <div>
                  <p className="text-[20px] font-extrabold text-[#0F172A]">{BRAND_NAME}</p>
                  <p className="text-[12px] text-[#475569]">Account statement</p>
                </div>
                <div className="text-right text-[12px] text-[#475569]">
                  <p>Statement date <b className="text-[#0F172A]">{fmtDate(new Date())}</b></p>
                  <p>{todayLabel(s.totals.balance)} <b className="text-[#0F172A]">{s.totals.balance === 0 ? "All settled" : rupees(Math.abs(s.totals.balance))}</b></p>
                </div>
              </div>
              <div className="mt-3 text-[12px] text-[#475569]">
                <p className="text-[15px] font-bold text-[#0F172A]">{me?.fullName || s.account.name}</p>
                {(me?.companyName || s.account.company) && <p>{me?.companyName || s.account.company}</p>}
                {me?.gstin && <p>GSTIN {me.gstin}</p>}
                <p>Your commission {s.account.commissionRate}%</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="min-w-0">
                <p className="mb-2 text-[13px] text-[#64748B] md:hidden">Cards you've ordered from DigitalCarda and what you've paid</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1 text-[12px] font-semibold text-[#065F46]">
                  <Percent size={13} /> Your commission {s.account.commissionRate}%
                </span>
              </div>
              {!empty && (
                <div className="flex gap-2">
                  <button type="button" onClick={exportCsv} className={btn}><Download size={14} /> Download CSV</button>
                  <button type="button" onClick={print} className={btn}><Printer size={14} /> Print / Save as PDF</button>
                </div>
              )}
            </div>

            {empty ? (
              <div className={`${card} px-6 py-12 text-center`}>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#64748B]"><FileText size={22} /></span>
                <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">No card orders or payments yet.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-[#64748B]">When you order cards from the DigitalCarda team, each order and each payment you make shows up here with what's left to pay.</p>
              </div>
            ) : (
              <>
                <Tiles totals={s.totals} openingBalance={s.account.openingBalance} />

                <div className={`${card} overflow-hidden print:overflow-visible print:border-0 print:shadow-none`}>
                  <div role="tablist" aria-label="Statement" className="px-4 pt-4 sm:px-5 border-b border-[#F1F5F9] flex gap-5 print:hidden">
                    {([["statement", "Statement"], ["orders", `Orders (${s.orders.length})`], ["payments", `Payments (${s.payments.length})`]] as const).map(([k, label]) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                        className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === k ? "border-[#10B981] text-[#0F172A]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {tab === "statement" && <StatementTab rows={s.statement} balance={s.totals.balance} />}
                  {tab === "orders" && <OrdersTab orders={s.orders} />}
                  {tab === "payments" && <PaymentsTab payments={s.payments} orders={s.orders} />}
                </div>
                <p className="text-center text-[11.5px] text-[#94A3B8] print:text-left">
                  Something doesn't look right? <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#047857] hover:underline print:hidden">WhatsApp the DigitalCarda team</a><span className="hidden print:inline">Write to {CONTACT.email}</span>.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}

function Tiles({ totals, openingBalance }: { totals: Data["totals"]; openingBalance: number }) {
  const tiles = [
    { label: "Order value", value: rupees(totals.orderValue), sub: `${plural(totals.cards, "card", "cards")} · ${plural(totals.orders, "order", "orders")}`, icon: ShoppingBag, color: "bg-[#DBEAFE] text-[#1E40AF]" },
    { label: "Your commission", value: rupees(totals.commission), sub: "Taken off what you pay", icon: Percent, color: "bg-[#EDE9FE] text-[#5B21B6]" },
    {
      label: "Payable to DigitalCarda", value: rupees(totals.payable), icon: ReceiptText, color: "bg-[#FEF3C7] text-[#92400E]",
      sub: openingBalance > 0 ? `Includes ${rupees(openingBalance)} from before` : openingBalance < 0 ? `After ${rupees(-openingBalance)} credit from before` : "Order value minus your commission",
    },
    { label: "You've paid", value: rupees(totals.paid), sub: totals.lastPaymentAt ? `Last paid ${fmtDate(totals.lastPaymentAt)}` : "No payments yet", icon: CheckCircle2, color: "bg-[#D1FAE5] text-[#065F46]" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className={`${card} p-3.5 min-w-0 print:shadow-none`}>
          <span className={`w-8 h-8 rounded-lg ${t.color} flex items-center justify-center`}><t.icon size={16} /></span>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-2.5 leading-none tabular-nums truncate">{t.value}</p>
          <p className="text-[11px] text-[#64748B] mt-1">{t.label}</p>
          <p className="text-[10.5px] text-[#94A3B8] mt-0.5">{t.sub}</p>
        </div>
      ))}
      <div className={`col-span-2 lg:col-span-1 print:col-span-1 rounded-2xl p-3.5 min-w-0 border ${totals.balance > 0 ? "bg-[#FFFBEB] border-[#FDE68A]" : "bg-[#ECFDF5] border-[#A7F3D0]"}`}>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${totals.balance > 0 ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#D1FAE5] text-[#047857]"}`}><Scale size={16} /></span>
        <p className={`text-xl sm:text-2xl font-bold mt-2.5 leading-none tabular-nums ${balanceCls(totals.balance)}`}>{balanceText(totals.balance)}</p>
        <p className="text-[11px] text-[#64748B] mt-1">Balance due</p>
        <p className="text-[10.5px] text-[#94A3B8] mt-0.5">{totals.balance > 0 ? "Still to pay" : totals.balance < 0 ? "You've paid more than you owe" : "Nothing left to pay"}</p>
      </div>
    </div>
  );
}

const th = "text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3";

function StatementTab({ rows, balance }: { rows: Data["statement"]; balance: number }) {
  if (!rows.length) return <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">Nothing to show yet — your orders so far were cancelled.</p>;
  return (
    <>
      {/* Wide screens and paper: a statement table. */}
      <div className="hidden md:block print:block overflow-x-auto print:overflow-visible">
        <table className="w-full">
          <thead><tr className="bg-[#F8FAFC]">
            {["Date", "Entry", "You owe", "You paid", "Balance"].map((h, i) => (
              <th key={h} className={`${th} ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap align-top">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-medium text-[#0F172A]">{r.label}</p>
                  {r.sub && <p className="text-[12px] text-[#64748B]">{r.sub}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-right tabular-nums text-[#0F172A] whitespace-nowrap align-top">{r.debit ? rupees(r.debit) : ""}</td>
                <td className="px-4 py-3 text-sm text-right tabular-nums text-[#047857] whitespace-nowrap align-top">{r.credit ? rupees(r.credit) : ""}</td>
                <td className={`px-4 py-3 text-sm text-right tabular-nums font-semibold whitespace-nowrap align-top ${balanceCls(r.balance)}`}>{rupees(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t-2 border-[#E2E8F0]">
            <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{todayLabel(balance)}</td>
            <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${balanceCls(balance)}`}>{balance === 0 ? "All settled" : rupees(Math.abs(balance))}</td>
          </tr></tfoot>
        </table>
      </div>

      {/* Phones: one entry per row, stacked. */}
      <ul className="md:hidden print:hidden divide-y divide-[#F1F5F9]">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0F172A] break-words">{r.label}</p>
              {r.sub && <p className="text-[12px] text-[#64748B] break-words">{r.sub}</p>}
              <p className="mt-0.5 text-[11.5px] text-[#94A3B8]">{fmtDate(r.date)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-semibold tabular-nums ${r.credit ? "text-[#047857]" : "text-[#0F172A]"}`}>{r.credit ? rupees(r.credit) : rupees(r.debit)}</p>
              <p className="text-[10.5px] text-[#94A3B8]">{r.credit ? (r.kind === "opening" ? "in your favour" : "you paid") : "you owe"}</p>
              <p className={`mt-1 text-[11.5px] tabular-nums ${balanceCls(r.balance)}`}>Balance {rupees(r.balance)}</p>
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-[#F8FAFC] px-4 py-3">
          <span className="text-sm font-semibold text-[#0F172A]">{todayLabel(balance)}</span>
          <span className={`text-sm font-bold tabular-nums ${balanceCls(balance)}`}>{balance === 0 ? "All settled" : rupees(Math.abs(balance))}</span>
        </li>
      </ul>
    </>
  );
}

function OrdersTab({ orders }: { orders: Data["orders"] }) {
  if (!orders.length) return <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">No card orders yet.</p>;
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-[#F8FAFC]">
            {["Date", "Order", "Status", "Cards", "Price", "Your commission", "Payable"].map((h, i) => (
              <th key={h} className={`${th} ${i >= 3 ? "text-right" : "text-left"} whitespace-nowrap`}>{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {orders.map((o) => {
              const off = o.status === "cancelled";
              return (
                <tr key={o.id} className={off ? "opacity-60" : ""}>
                  <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap align-top">{fmtDate(o.orderDate)}</td>
                  <td className="px-4 py-3 align-top max-w-[320px]">
                    <p className="text-sm font-medium text-[#0F172A] break-words">{o.title}</p>
                    {o.plan && <p className="text-[12px] text-[#64748B]">{o.plan}</p>}
                    {o.customerNames && <p className="mt-1 whitespace-pre-line break-words text-[12px] text-[#475569]">{o.customerNames}</p>}
                  </td>
                  <td className="px-4 py-3 align-top"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums text-[#334155] align-top">{o.quantity.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums text-[#334155] whitespace-nowrap align-top">{rupees(o.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums text-[#5B21B6] whitespace-nowrap align-top">{off ? "—" : rupees(o.commissionAmount)}<span className="block text-[11px] text-[#94A3B8]">{o.commissionRate}%</span></td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-[#0F172A] whitespace-nowrap align-top">{off ? <span className="font-normal text-[#94A3B8]">Not charged</span> : rupees(o.netAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-[#F1F5F9]">
        {orders.map((o) => {
          const off = o.status === "cancelled";
          return (
            <li key={o.id} className={`px-4 py-3 ${off ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-medium text-[#0F172A] break-words">{o.title}</p>
                <StatusPill status={o.status} />
              </div>
              <p className="text-[12px] text-[#64748B]">{fmtDate(o.orderDate)}{o.plan ? ` · ${o.plan}` : ""}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
                <div className="min-w-0"><dt className="text-[10.5px] text-[#94A3B8]">Cards</dt><dd className="text-[12.5px] font-semibold tabular-nums text-[#334155] truncate">{o.quantity} × {rupees(o.unitPrice)}</dd></div>
                <div className="min-w-0"><dt className="text-[10.5px] text-[#94A3B8]">Your commission</dt><dd className="text-[12.5px] font-semibold tabular-nums text-[#5B21B6] truncate">{off ? "—" : `${rupees(o.commissionAmount)} · ${o.commissionRate}%`}</dd></div>
                <div className="min-w-0 text-right"><dt className="text-[10.5px] text-[#94A3B8]">Payable</dt><dd className="text-[12.5px] font-bold tabular-nums text-[#0F172A] truncate">{off ? "Not charged" : rupees(o.netAmount)}</dd></div>
              </dl>
              {o.customerNames && <p className="mt-2 whitespace-pre-line break-words text-[12px] text-[#475569]">{o.customerNames}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PaymentsTab({ payments, orders }: { payments: Data["payments"]; orders: Data["orders"] }) {
  if (!payments.length) return <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">No payments recorded yet.</p>;
  const orderTitle = (id: number | null) => (id ? orders.find((o) => o.id === id)?.title ?? null : null);
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-[#F8FAFC]">
            {["Date", "Amount", "Paid by", "Reference", "For"].map((h, i) => (
              <th key={h} className={`${th} ${i === 1 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">{fmtDate(p.paidOn)}</td>
                <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-[#047857] whitespace-nowrap">{rupees(p.amount)}</td>
                <td className="px-4 py-3 text-sm text-[#334155]">{methodLabel(p.method)}</td>
                <td className="px-4 py-3 text-sm text-[#64748B] break-all">{p.reference || "—"}</td>
                <td className="px-4 py-3 text-sm text-[#64748B]">{orderTitle(p.orderId) ? `for ${orderTitle(p.orderId)}` : "On your account"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-[#F1F5F9]">
        {payments.map((p) => (
          <li key={p.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold tabular-nums text-[#047857]">{rupees(p.amount)}</p>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">{methodLabel(p.method)}</span>
            </div>
            <p className="text-[12px] text-[#64748B] break-words">
              {fmtDate(p.paidOn)}{p.reference ? ` · ${p.reference}` : ""}{orderTitle(p.orderId) ? ` · for ${orderTitle(p.orderId)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
