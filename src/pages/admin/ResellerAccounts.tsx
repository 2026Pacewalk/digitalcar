/*
 * Admin → Resellers: the one reseller module. Every reseller is one row here —
 * their login (if they have one) with the customers and commission it brings in
 * online, and their offline book: the card orders they place with you and the
 * cash / UPI / bank / cheque payments they make, with a running balance.
 * Applications from the public form are a tab. Amounts are calculated on the
 * server (reseller-ledger-router).
 */
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import ResellerApplicationsPanel from "@/components/admin/ResellerApplicationsPanel";
import { toast } from "sonner";
import {
  BookOpenCheck, Download, IndianRupee, KeyRound, Loader2, Pencil, Plus, Printer, Search, Trash2, UserCheck, Wallet, X,
} from "lucide-react";

const inr = (n: number) => (n < 0 ? "−₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");
const inr2 = (n: number) => "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dayStr = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const toDateInput = (d: unknown) => {
  const t = new Date(String(d || ""));
  return isNaN(t.getTime()) ? todayInput() : new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
// A calendar date the admin picked, pinned to midday India time so it never shifts a day.
const fromDateInput = (v: string) => new Date(`${v}T12:00:00+05:30`);

const input = "h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30";

const ORDER_STATUS = [
  { id: "pending", label: "Pending", cls: "bg-slate-100 text-slate-700" },
  { id: "in_progress", label: "In progress", cls: "bg-amber-50 text-amber-700" },
  { id: "delivered", label: "Delivered", cls: "bg-emerald-50 text-emerald-700" },
  { id: "cancelled", label: "Cancelled", cls: "bg-red-50 text-red-600" },
] as const;
type OrderStatus = (typeof ORDER_STATUS)[number]["id"];

const METHODS = [
  { id: "cash", label: "Cash" }, { id: "upi", label: "UPI" }, { id: "bank", label: "Bank transfer" },
  { id: "cheque", label: "Cheque" }, { id: "other", label: "Other" },
] as const;
type Method = (typeof METHODS)[number]["id"];

function Labeled({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11.5px] font-semibold text-[#475569]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

type AccountForm = { id?: number; name: string; company: string; phone: string; email: string; resellerUserId: number | null; commissionRate: string; openingBalance: string; notes: string; active: boolean };
type OrderForm = { id?: number; orderDate: string; title: string; plan: string; quantity: string; unitPrice: string; commissionRate: string; customerNames: string; status: OrderStatus; notes: string };
type PaymentForm = { amount: string; method: Method; reference: string; paidOn: string; orderId: number | null; note: string };

const errMsg = (e: unknown, fallback: string) => {
  const m = e instanceof Error ? e.message : "";
  return m && !m.trim().startsWith("[") ? m : fallback;
};

export default function AdminResellerAccounts() {
  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.resellerLedger.overview.useQuery();
  // Old /admin/reseller-applications links arrive here with ?tab=applications.
  const [params, setParams] = useSearchParams();
  const view = params.get("tab") === "applications" ? "applications" : "resellers";
  const setView = (v: "resellers" | "applications") => setParams(v === "applications" ? { tab: "applications" } : {}, { replace: true });
  const grantLogin = trpc.reseller.grantLogin.useMutation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [accountForm, setAccountForm] = useState<AccountForm | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [tab, setTab] = useState<"statement" | "orders" | "payments">("statement");

  const accounts = overview?.accounts ?? [];
  useEffect(() => {
    if (selectedId === null && accounts.length) setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  const detail = trpc.resellerLedger.account.useQuery({ id: selectedId ?? 0 }, { enabled: !!selectedId });
  const saveAccount = trpc.resellerLedger.saveAccount.useMutation();
  const saveOrder = trpc.resellerLedger.saveOrder.useMutation();
  const setOrderStatus = trpc.resellerLedger.setOrderStatus.useMutation();
  const deleteOrder = trpc.resellerLedger.deleteOrder.useMutation();
  const addPayment = trpc.resellerLedger.addPayment.useMutation();
  const deletePayment = trpc.resellerLedger.deletePayment.useMutation();

  const refresh = async () => {
    await Promise.all([utils.resellerLedger.overview.invalidate(), utils.resellerLedger.account.invalidate()]);
  };

  const totals = useMemo(() => accounts.reduce((t, a) => ({
    outstanding: t.outstanding + a.totals.outstanding,
    received: t.received + a.totals.received,
    commission: t.commission + a.totals.commission,
    cards: t.cards + a.totals.cards,
  }), { outstanding: 0, received: 0, commission: 0, cards: 0 }), [accounts]);

  const shownAccounts = accounts.filter((a) =>
    `${a.name} ${a.company ?? ""} ${a.phone ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  const d = detail.data;
  const account = d?.account;

  // Statement: opening balance, then orders (+) and payments (−) oldest first.
  const statement = useMemo(() => {
    if (!d) return [];
    const rows: { date: Date; kind: "opening" | "order" | "payment"; label: string; sub: string; debit: number; credit: number; balance: number }[] = [];
    const events = [
      ...d.orders.filter((o) => o.status !== "cancelled").map((o) => ({ date: new Date(o.orderDate), kind: "order" as const, label: o.title, sub: `${o.quantity} × ${inr2(o.unitPrice)} = ${inr2(o.grossAmount)} − ${o.commissionRate}% commission ${inr2(o.commissionAmount)}`, debit: o.netAmount, credit: 0 })),
      ...d.payments.map((p) => ({ date: new Date(p.paidOn), kind: "payment" as const, label: `Payment · ${METHODS.find((m) => m.id === p.method)?.label ?? p.method}`, sub: [p.reference, p.note].filter(Boolean).join(" · "), debit: 0, credit: p.amount })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    let balance = d.account.openingBalance;
    if (balance) rows.push({ date: new Date(d.account.createdAt), kind: "opening", label: "Opening balance", sub: "Owed before this record started", debit: balance > 0 ? balance : 0, credit: balance < 0 ? -balance : 0, balance });
    for (const e of events) {
      balance += e.debit - e.credit;
      rows.push({ ...e, balance });
    }
    return rows;
  }, [d]);

  const openAccountForm = (a?: NonNullable<typeof account>) => setAccountForm(a ? {
    id: a.id, name: a.name, company: a.company ?? "", phone: a.phone ?? "", email: a.email ?? "", resellerUserId: a.resellerUserId,
    commissionRate: String(a.commissionRate), openingBalance: String(a.openingBalance || ""), notes: a.notes ?? "", active: a.active,
  } : { name: "", company: "", phone: "", email: "", resellerUserId: null, commissionRate: "20", openingBalance: "", notes: "", active: true });

  const submitAccount = async () => {
    if (!accountForm) return;
    if (accountForm.name.trim().length < 2) return toast.error("Add the reseller's name");
    const rate = Number(accountForm.commissionRate);
    if (!(rate >= 0 && rate <= 100)) return toast.error("Commission must be between 0 and 100%");
    try {
      const r = await saveAccount.mutateAsync({
        id: accountForm.id, name: accountForm.name, company: accountForm.company || undefined, phone: accountForm.phone || undefined,
        email: accountForm.email || undefined, resellerUserId: accountForm.resellerUserId, commissionRate: rate,
        openingBalance: Number(accountForm.openingBalance || 0), notes: accountForm.notes || undefined, active: accountForm.active,
      });
      toast.success(accountForm.id ? "Reseller updated" : "Reseller account created");
      setAccountForm(null);
      setSelectedId(r.id ?? null);
      await refresh();
    } catch (e) { toast.error(errMsg(e, "Could not save the reseller")); }
  };

  // Turn an offline partner into someone who can sign in. They get an email
  // with a link to set their own password; we never choose one for them.
  const onGrantLogin = async (a: { id: number; name: string; email: string | null }) => {
    let email = a.email?.trim() || "";
    if (!email) {
      email = (window.prompt(`${a.name} has no email address yet. Enter the one they'll sign in with:`) || "").trim();
      if (!email) return;
    }
    if (!window.confirm(`Create a reseller login for ${a.name} and email a set-password link to ${email}?`)) return;
    try {
      const r = await grantLogin.mutateAsync({ accountId: a.id, email });
      toast.success(r.isNew ? `Login created — ${a.name} has been emailed a link to set their password` : `${a.name}'s existing account is now a reseller login`);
      await refresh();
    } catch (e) { toast.error(errMsg(e, "Could not create the login")); }
  };

  const orderPreview = orderForm && account ? (() => {
    const qty = Number(orderForm.quantity) || 0;
    const price = Number(orderForm.unitPrice) || 0;
    const rate = orderForm.commissionRate.trim() ? Number(orderForm.commissionRate) : account.commissionRate;
    const gross = qty * price;
    const commission = (gross * rate) / 100;
    return { gross, rate, commission, due: gross - commission };
  })() : null;

  const submitOrder = async () => {
    if (!orderForm || !account) return;
    if (orderForm.title.trim().length < 2) return toast.error("Describe the order");
    if (!(Number(orderForm.quantity) >= 1)) return toast.error("Add how many cards");
    try {
      await saveOrder.mutateAsync({
        id: orderForm.id, accountId: account.id, orderDate: fromDateInput(orderForm.orderDate), title: orderForm.title,
        plan: orderForm.plan || undefined, quantity: Number(orderForm.quantity), unitPrice: Number(orderForm.unitPrice || 0),
        commissionRate: orderForm.commissionRate.trim() ? Number(orderForm.commissionRate) : null,
        customerNames: orderForm.customerNames || undefined, status: orderForm.status, notes: orderForm.notes || undefined,
      });
      toast.success(orderForm.id ? "Order updated" : "Order added");
      setOrderForm(null);
      await refresh();
    } catch (e) { toast.error(errMsg(e, "Could not save the order")); }
  };

  const submitPayment = async () => {
    if (!paymentForm || !account) return;
    if (!(Number(paymentForm.amount) > 0)) return toast.error("Add the amount received");
    try {
      await addPayment.mutateAsync({
        accountId: account.id, orderId: paymentForm.orderId, amount: Number(paymentForm.amount), method: paymentForm.method,
        reference: paymentForm.reference || undefined, paidOn: fromDateInput(paymentForm.paidOn), note: paymentForm.note || undefined,
      });
      toast.success(`${inr2(Number(paymentForm.amount))} recorded`);
      setPaymentForm(null);
      await refresh();
    } catch (e) { toast.error(errMsg(e, "Could not record the payment")); }
  };

  const exportCsv = () => {
    if (!account) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Date", "Entry", "Details", "Due (₹)", "Received (₹)", "Balance (₹)"].map(esc).join(",")];
    for (const r of statement) lines.push([dayStr(r.date), r.label, r.sub, r.debit ? r.debit.toFixed(2) : "", r.credit ? r.credit.toFixed(2) : "", r.balance.toFixed(2)].map(esc).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${account.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-[#F7B31C]"><BookOpenCheck size={20} /></span>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Resellers</h1>
              <p className="text-[13px] text-[#64748B]">Every partner — their login and online commission, the card orders they place with you, and what they owe</p>
            </div>
          </div>
          {view === "resellers" && (
            <button type="button" onClick={() => openAccountForm()}
              className="gradient-gold inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-bold text-[#0F172A] hover:shadow-gold">
              <Plus size={16} /> Add reseller
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Resellers" className="flex gap-5 border-b border-[#E2E8F0]">
          {([["resellers", `Resellers (${accounts.length})`], ["applications", "Applications"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-[13.5px] font-semibold transition-colors ${view === k ? "border-[#F7B31C] text-[#0F172A]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
              {label}
              {k === "applications" && (overview?.pendingApplications ?? 0) > 0 && (
                <span className="rounded-full bg-[#F7B31C] px-1.5 text-[10.5px] font-bold text-[#0F172A]">{overview?.pendingApplications}</span>
              )}
            </button>
          ))}
        </div>

        {view === "applications" ? <ResellerApplicationsPanel /> : <>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Outstanding from resellers", value: inr(totals.outstanding), tone: totals.outstanding > 0 ? "text-[#B45309]" : "text-[#0F172A]" },
            { label: "Received so far", value: inr(totals.received), tone: "text-[#15803D]" },
            { label: "Commission earned by resellers", value: inr(totals.commission), tone: "text-[#0F172A]" },
            { label: "Cards ordered", value: totals.cards.toLocaleString("en-IN"), tone: "text-[#0F172A]" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
              <p className="text-[12px] text-[#64748B]">{s.label}</p>
              <p className={`mt-1 text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {accountForm && (
          <section className="rounded-2xl border border-[#FDE68A] bg-white p-5 shadow-premium">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0F172A]">{accountForm.id ? `Edit ${accountForm.name}` : "Add reseller"}</h2>
              <button type="button" onClick={() => setAccountForm(null)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Labeled label="Name"><input className={input} value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></Labeled>
              <Labeled label="Business"><input className={input} value={accountForm.company} onChange={(e) => setAccountForm({ ...accountForm, company: e.target.value })} /></Labeled>
              <Labeled label="Phone"><input className={input} value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} /></Labeled>
              <Labeled label="Email"><input className={input} value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} /></Labeled>
              <Labeled label="Commission %" hint="Their share of each order's value">
                <input className={input} inputMode="decimal" value={accountForm.commissionRate} onChange={(e) => setAccountForm({ ...accountForm, commissionRate: e.target.value.replace(/[^\d.]/g, "") })} />
              </Labeled>
              <Labeled label="Opening balance (₹)" hint="What they already owed before this record">
                <input className={input} inputMode="decimal" value={accountForm.openingBalance} onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value.replace(/[^\d.-]/g, "") })} />
              </Labeled>
              <Labeled label="Linked reseller login" hint="Optional — also updates their online commission rate" wide>
                <select className={input} value={accountForm.resellerUserId ?? ""} onChange={(e) => setAccountForm({ ...accountForm, resellerUserId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Not linked</option>
                  {(overview?.resellerUsers ?? []).map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}{u.companyName ? ` · ${u.companyName}` : ""} ({u.email})</option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Notes" wide><input className={input} value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} /></Labeled>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
              <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#334155]">
                <input type="checkbox" checked={accountForm.active} onChange={(e) => setAccountForm({ ...accountForm, active: e.target.checked })} className="h-4 w-4 accent-[#F7B31C]" /> Active
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAccountForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
                <button type="button" onClick={submitAccount} disabled={saveAccount.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                  {saveAccount.isPending && <Loader2 size={15} className="animate-spin" />} Save
                </button>
              </div>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-12 text-center shadow-premium">
            <Wallet size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm font-semibold text-[#0F172A]">No reseller accounts yet</p>
            <p className="mt-1 text-[13px] text-[#64748B]">Add a reseller to start recording their card orders and payments.</p>
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Accounts */}
            <aside className="rounded-2xl border border-[#F1F5F9] bg-white p-3 shadow-premium">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resellers" aria-label="Search resellers"
                  className="h-9 w-full rounded-xl border border-[#E2E8F0] pl-9 pr-3 text-[13px] outline-none focus:border-[#F7B31C]" />
              </div>
              <ul className="mt-2 max-h-[560px] space-y-1 overflow-y-auto">
                {shownAccounts.map((a) => {
                  const on = a.id === selectedId;
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => { setSelectedId(a.id); setOrderForm(null); setPaymentForm(null); }} aria-pressed={on}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-[#0F172A] text-white" : "hover:bg-[#F8FAFC]"}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${on ? "bg-[#F7B31C] text-[#0F172A]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{a.name.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold">{a.name}{!a.active && <span className="ml-1 text-[11px] font-normal opacity-60">(inactive)</span>}</span>
                          <span className={`flex items-center gap-1 text-[11.5px] ${on ? "text-white/70" : "text-[#64748B]"}`}>
                            {a.login ? <UserCheck size={12} className={on ? "text-[#86EFAC]" : "text-[#16A34A]"} aria-label="Has a login" /> : null}
                            {a.commissionRate}% · {a.totals.cards} cards{a.login ? ` · ${a.login.customers} customers` : ""}
                          </span>
                        </span>
                        <span className={`shrink-0 text-[12.5px] font-bold tabular-nums ${a.totals.outstanding > 0 ? (on ? "text-[#FDE68A]" : "text-[#B45309]") : on ? "text-white/80" : "text-[#16A34A]"}`}>{inr(a.totals.outstanding)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Detail */}
            <section className="min-w-0 space-y-4">
              {!account ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#F1F5F9] bg-white py-16 text-sm text-[#64748B] shadow-premium"><Loader2 size={16} className="animate-spin" /> Loading account…</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-[#0F172A]">{account.name}</h2>
                        <p className="text-[13px] text-[#64748B]">{[account.company, account.phone, account.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                        <p className="mt-1 text-[12.5px] text-[#475569]">Commission <b>{account.commissionRate}%</b></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openAccountForm(account)} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Pencil size={14} /> Edit</button>
                        <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Download size={14} /> CSV</button>
                        <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Printer size={14} /> Print</button>
                        <button type="button" onClick={() => { setPaymentForm(null); setOrderForm({ orderDate: todayInput(), title: "", plan: "", quantity: "1", unitPrice: "", commissionRate: "", customerNames: "", status: "pending", notes: "" }); }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 text-[12.5px] font-bold text-white"><Plus size={14} /> Order</button>
                        <button type="button" onClick={() => { setOrderForm(null); setPaymentForm({ amount: d && d.totals.outstanding > 0 ? String(Math.round(d.totals.outstanding)) : "", method: "upi", reference: "", paidOn: todayInput(), orderId: null, note: "" }); }}
                          className="gradient-gold inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold text-[#0F172A]"><IndianRupee size={14} /> Record payment</button>
                      </div>
                    </div>

                    {d && (
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {[
                          { l: "Order value", v: inr(d.totals.gross) },
                          { l: `Their commission`, v: inr(d.totals.commission) },
                          { l: "Due to you", v: inr(d.totals.due + account.openingBalance) },
                          { l: "Received", v: inr(d.totals.received), cls: "text-[#15803D]" },
                          { l: "Outstanding", v: inr(d.totals.outstanding), cls: d.totals.outstanding > 0 ? "text-[#B45309]" : "text-[#15803D]" },
                        ].map((x) => (
                          <div key={x.l} className="rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                            <dt className="text-[11.5px] text-[#64748B]">{x.l}</dt>
                            <dd className={`text-[16px] font-extrabold tabular-nums ${x.cls ?? "text-[#0F172A]"}`}>{x.v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {/* Online side: the login, and what it has brought in. */}
                    {(() => {
                      const row = accounts.find((a) => a.id === account.id);
                      const login = row?.login;
                      if (!login) {
                        return (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
                            <p className="text-[12.5px] text-[#475569]">
                              <b className="text-[#0F172A]">No login yet.</b> {account.name} can't sign in, add customers or see their commission until they have one.
                            </p>
                            <button type="button" onClick={() => onGrantLogin({ id: account.id, name: account.name, email: account.email })} disabled={grantLogin.isPending}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 text-[12.5px] font-bold text-white disabled:opacity-60">
                              {grantLogin.isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Give them a login
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-4 rounded-xl bg-[#F0FDF4] px-4 py-3">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#166534]">
                            <UserCheck size={14} /> <b>Signs in as {login.email}</b>
                            <span className="text-[#15803D]/70">· {login.lastLoginAt ? `last seen ${dayStr(login.lastLoginAt)}` : "hasn't signed in yet"}</span>
                          </p>
                          <dl className="mt-2 grid grid-cols-3 gap-3">
                            {[
                              { l: "Customers", v: login.customers.toLocaleString("en-IN") },
                              { l: "Commission earned online", v: inr2(login.commissionEarned) },
                              { l: "In their wallet", v: inr2(login.walletBalance) },
                            ].map((x) => (
                              <div key={x.l}>
                                <dt className="text-[11px] text-[#15803D]/80">{x.l}</dt>
                                <dd className="text-[15px] font-extrabold tabular-nums text-[#14532D]">{x.v}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })()}
                  </div>

                  {orderForm && orderPreview && (
                    <div className="rounded-2xl border border-[#FDE68A] bg-white p-5 shadow-premium">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-bold text-[#0F172A]">{orderForm.id ? "Edit order" : "New order"}</h3>
                        <button type="button" onClick={() => setOrderForm(null)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Labeled label="Order date"><input type="date" className={input} value={orderForm.orderDate} onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })} /></Labeled>
                        <Labeled label="What they ordered" wide><input className={input} value={orderForm.title} onChange={(e) => setOrderForm({ ...orderForm, title: e.target.value })} placeholder="Gold digital cards for 5 clinics" /></Labeled>
                        <Labeled label="Plan / product"><input className={input} value={orderForm.plan} onChange={(e) => setOrderForm({ ...orderForm, plan: e.target.value })} placeholder="Gold — yearly" /></Labeled>
                        <Labeled label="Cards"><input className={input} inputMode="numeric" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value.replace(/\D/g, "") })} /></Labeled>
                        <Labeled label="Price per card (₹)"><input className={input} inputMode="decimal" value={orderForm.unitPrice} onChange={(e) => setOrderForm({ ...orderForm, unitPrice: e.target.value.replace(/[^\d.]/g, "") })} /></Labeled>
                        <Labeled label="Commission %" hint={`Empty uses their ${account.commissionRate}%`}><input className={input} inputMode="decimal" value={orderForm.commissionRate} onChange={(e) => setOrderForm({ ...orderForm, commissionRate: e.target.value.replace(/[^\d.]/g, "") })} /></Labeled>
                        <Labeled label="Status">
                          <select className={input} value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}>
                            {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </Labeled>
                        <Labeled label="Card holders / customers" hint="Names or card links, one per line" wide>
                          <textarea className={`${input} h-auto py-2`} rows={2} value={orderForm.customerNames} onChange={(e) => setOrderForm({ ...orderForm, customerNames: e.target.value })} />
                        </Labeled>
                        <Labeled label="Notes" wide><input className={input} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} /></Labeled>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] px-4 py-3 text-[13px]">
                        <span>Order value <b>{inr2(orderPreview.gross)}</b></span>
                        <span>Commission {orderPreview.rate}% <b>{inr2(orderPreview.commission)}</b></span>
                        <span>Due to you <b className="text-[#B45309]">{inr2(orderPreview.due)}</b></span>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setOrderForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
                        <button type="button" onClick={submitOrder} disabled={saveOrder.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                          {saveOrder.isPending && <Loader2 size={15} className="animate-spin" />} Save order
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentForm && d && (
                    <div className="rounded-2xl border border-[#BBF7D0] bg-white p-5 shadow-premium">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-bold text-[#0F172A]">Record a payment</h3>
                        <button type="button" onClick={() => setPaymentForm(null)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Labeled label="Amount received (₹)"><input className={input} inputMode="decimal" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value.replace(/[^\d.]/g, "") })} /></Labeled>
                        <Labeled label="Paid by">
                          <select className={input} value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Method })}>
                            {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                          </select>
                        </Labeled>
                        <Labeled label="Date received"><input type="date" className={input} value={paymentForm.paidOn} onChange={(e) => setPaymentForm({ ...paymentForm, paidOn: e.target.value })} /></Labeled>
                        <Labeled label={paymentForm.method === "cash" ? "Receipt no. (optional)" : "UTR / cheque / reference"}>
                          <input className={input} value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                        </Labeled>
                        <Labeled label="Against order (optional)" wide>
                          <select className={input} value={paymentForm.orderId ?? ""} onChange={(e) => setPaymentForm({ ...paymentForm, orderId: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">General payment on account</option>
                            {d.orders.filter((o) => o.status !== "cancelled").map((o) => (
                              <option key={o.id} value={o.id}>{dayStr(o.orderDate)} · {o.title} · due {inr2(o.netAmount)}</option>
                            ))}
                          </select>
                        </Labeled>
                        <Labeled label="Note" wide><input className={input} value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} /></Labeled>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setPaymentForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
                        <button type="button" onClick={submitPayment} disabled={addPayment.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#15803D] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                          {addPayment.isPending && <Loader2 size={15} className="animate-spin" />} Save payment
                        </button>
                      </div>
                    </div>
                  )}

                  {d && (
                    <div className="rounded-2xl border border-[#F1F5F9] bg-white shadow-premium">
                      <div className="flex gap-1 border-b border-[#F1F5F9] p-2">
                        {([["statement", "Statement"], ["orders", `Orders (${d.orders.length})`], ["payments", `Payments (${d.payments.length})`]] as const).map(([id, label]) => (
                          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
                            className={`h-9 rounded-xl px-3.5 text-[13px] font-semibold ${tab === id ? "bg-[#0F172A] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>{label}</button>
                        ))}
                      </div>

                      {tab === "statement" && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[680px] text-[13px]">
                            <thead>
                              <tr className="bg-[#F8FAFC] text-left text-[11px] uppercase tracking-wider text-[#64748B]">
                                <th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Entry</th>
                                <th className="px-4 py-2.5 text-right">Due</th><th className="px-4 py-2.5 text-right">Received</th><th className="px-4 py-2.5 text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F1F5F9]">
                              {statement.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">No orders or payments yet</td></tr>
                              ) : statement.map((r, i) => (
                                <tr key={i}>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-[#64748B]">{dayStr(r.date)}</td>
                                  <td className="px-4 py-2.5"><p className="font-semibold text-[#0F172A]">{r.label}</p>{r.sub && <p className="text-[12px] text-[#64748B]">{r.sub}</p>}</td>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#0F172A]">{r.debit ? inr2(r.debit) : ""}</td>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#15803D]">{r.credit ? inr2(r.credit) : ""}</td>
                                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums ${r.balance > 0 ? "text-[#B45309]" : "text-[#15803D]"}`}>{inr2(r.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {tab === "orders" && (
                        <ul className="divide-y divide-[#F1F5F9]">
                          {d.orders.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-[#94A3B8]">No orders yet</li>}
                          {d.orders.map((o) => {
                            const st = ORDER_STATUS.find((s) => s.id === o.status) ?? ORDER_STATUS[0];
                            return (
                              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-semibold text-[#0F172A]">{o.title}</p>
                                  <p className="text-[12.5px] text-[#64748B]">{dayStr(o.orderDate)}{o.plan ? ` · ${o.plan}` : ""} · {o.quantity} × {inr2(o.unitPrice)} = {inr2(o.grossAmount)} · {o.commissionRate}% commission {inr2(o.commissionAmount)} · <b className="text-[#0F172A]">due {inr2(o.netAmount)}</b></p>
                                  {o.customerNames && <p className="mt-1 whitespace-pre-line text-[12px] text-[#475569]">{o.customerNames}</p>}
                                  {o.notes && <p className="mt-0.5 text-[12px] italic text-[#94A3B8]">{o.notes}</p>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <select value={o.status} aria-label="Order status" onChange={async (e) => { try { await setOrderStatus.mutateAsync({ id: o.id, status: e.target.value as OrderStatus }); await refresh(); } catch { toast.error("Could not update the status"); } }}
                                    className={`h-8 rounded-lg border-0 px-2 text-[12px] font-bold ${st.cls}`}>
                                    {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                                  <button type="button" aria-label="Edit order" onClick={() => { setPaymentForm(null); setOrderForm({ id: o.id, orderDate: toDateInput(o.orderDate), title: o.title, plan: o.plan ?? "", quantity: String(o.quantity), unitPrice: String(o.unitPrice), commissionRate: String(o.commissionRate), customerNames: o.customerNames ?? "", status: o.status, notes: o.notes ?? "" }); }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"><Pencil size={13} /></button>
                                  <button type="button" aria-label="Delete order" onClick={async () => { if (!confirm("Delete this order? Payments stay on the account.")) return; try { await deleteOrder.mutateAsync({ id: o.id }); await refresh(); } catch { toast.error("Could not delete"); } }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={13} /></button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {tab === "payments" && (
                        <ul className="divide-y divide-[#F1F5F9]">
                          {d.payments.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-[#94A3B8]">No payments recorded yet</li>}
                          {d.payments.map((p) => {
                            const order = d.orders.find((o) => o.id === p.orderId);
                            return (
                              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-bold tabular-nums text-[#15803D]">{inr2(p.amount)} <span className="ml-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">{METHODS.find((m) => m.id === p.method)?.label}</span></p>
                                  <p className="text-[12.5px] text-[#64748B]">{dayStr(p.paidOn)}{p.reference ? ` · ${p.reference}` : ""}{order ? ` · for "${order.title}"` : ""}{p.note ? ` · ${p.note}` : ""}</p>
                                </div>
                                <button type="button" aria-label="Delete payment" onClick={async () => { if (!confirm(`Delete this ${inr2(p.amount)} payment?`)) return; try { await deletePayment.mutateAsync({ id: p.id }); await refresh(); } catch { toast.error("Could not delete"); } }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={13} /></button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
        </>}
      </div>
    </ResponsiveDashboardLayout>
  );
}
