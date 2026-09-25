/*
 * Admin → Resellers: the one reseller module. Every reseller is one row here —
 * their login (if they have one) with the customers and commission it brings in
 * online, and their offline book: the card orders they place with you and the
 * cash / UPI / bank / cheque payments they make, with a running balance.
 *
 * The list is a table like Customers, with a ⋮ menu per reseller: sign in as
 * them, share their sign-in details, deactivate, and the ledger actions.
 * Clicking a reseller opens their statement (?r=<id>, so Back works).
 * Applications from the public form are a tab. Amounts are calculated on the
 * server (reseller-ledger-router).
 */
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ResellerApplicationsPanel from "@/components/admin/ResellerApplicationsPanel";
import { ActionMenu, AdminModal, type ActionItem } from "@/components/admin/RowActions";
import { readableError } from "@/lib/errors";
import { generateStrongPassword } from "@/lib/password";
import { useSessionRole } from "@/hooks/useAuth";
import { setSession, okToReplaceMainSession } from "@/lib/session";
import { whatsappLink } from "@/lib/shareTemplates";
import { toast } from "sonner";
import {
  ArrowLeft, Ban, BookOpenCheck, ChevronLeft, ChevronRight, Copy, Download, Eye, IndianRupee, KeyRound, Link2, Loader2,
  LogIn, Mail, Pencil, Plus, Printer, RotateCcw, Search, Send, Store, Trash2, UserCheck, Users, Wallet, X,
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
const ago = (d: unknown) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(String(d)).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : dayStr(d);
};

const SIGN_IN_URL = "https://digitalcarda.in/resellers-login";
/* One CSV cell. Names and businesses come from partners themselves, so a value
   starting with = + - @ (or a tab/CR) is prefixed with ' — otherwise Excel would
   run it as a formula (e.g. a HYPERLINK that leaks other partners' details). */
const csvCell = (v: unknown) => {
  const t = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t) ? `'${t}` : t;
  return `"${safe.replace(/"/g, '""')}"`;
};
const WHITE_LABEL_PRICE = "Rs. 50,000 (US$499)"; // keep in step with /resellers and /become-reseller
const SUPPORT_WHATSAPP = "+91 95177 22444";

const input = "h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30";
const toolSelect = "h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] font-medium text-[#334155] outline-none focus:border-[#F7B31C]";

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

/* Where a reseller stands, from their ledger row and their login. */
const STATUS = {
  active: { label: "Active", cls: "bg-[#DCFCE7] text-[#166534]", dot: "bg-[#22C55E]" },
  invited: { label: "Invited", cls: "bg-[#FEF3C7] text-[#92400E]", dot: "bg-[#F59E0B]" },
  no_login: { label: "No login", cls: "bg-[#F1F5F9] text-[#475569]", dot: "bg-[#94A3B8]" },
  deactivated: { label: "Deactivated", cls: "bg-[#FEE2E2] text-[#991B1B]", dot: "bg-[#EF4444]" },
} as const;
type StatusKey = keyof typeof STATUS;

const AVATARS = [
  "from-[#F59E0B] to-[#D97706]", "from-[#3B82F6] to-[#2563EB]", "from-[#10B981] to-[#059669]",
  "from-[#8B5CF6] to-[#7C3AED]", "from-[#EC4899] to-[#DB2777]", "from-[#14B8A6] to-[#0D9488]",
];
const avatarGrad = (seed: string) => AVATARS[[...(seed || "?")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATARS.length];
const initials = (name: string) => (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function Labeled({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11.5px] font-semibold text-[#475569]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

function StatusPill({ s }: { s: StatusKey }) {
  const st = STATUS[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" /> {st.label}
    </span>
  );
}

type AccountForm = { id?: number; name: string; company: string; phone: string; email: string; resellerUserId: number | null; commissionRate: string; openingBalance: string; notes: string; active: boolean };
type OrderForm = { id?: number; orderDate: string; title: string; plan: string; quantity: string; unitPrice: string; commissionRate: string; customerNames: string; status: OrderStatus; notes: string };
type PaymentForm = { amount: string; method: Method; reference: string; paidOn: string; orderId: number | null; note: string };
type ShareKind = "signin" | "start";

export default function AdminResellerAccounts() {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const { data: overview, isLoading } = trpc.resellerLedger.overview.useQuery();
  // ?tab=applications (old /admin/reseller-applications links land here) and
  // ?r=<id> for one reseller's statement.
  const [params, setParams] = useSearchParams();
  const view = params.get("tab") === "applications" ? "applications" : "resellers";
  const setView = (v: "resellers" | "applications") => setParams(v === "applications" ? { tab: "applications" } : {}, { replace: true });
  const openId = Number(params.get("r")) || null;
  const openAccount = (id: number) => { setParams({ r: String(id) }); setOrderForm(null); setPaymentForm(null); setTab("statement"); window.scrollTo({ top: 0 }); };
  const closeAccount = () => setParams({});

  // Login as, and choosing a partner's password, are the super admin's alone
  // (the server enforces it); staff aren't offered them.
  const isSuper = useSessionRole() === "super_admin";
  const grantLogin = trpc.reseller.grantLogin.useMutation();
  const loginAs = trpc.reseller.loginAs.useMutation();
  const setActive = trpc.reseller.setActive.useMutation();
  const sendLoginEmail = trpc.reseller.sendLoginEmail.useMutation();
  const passwordLink = trpc.reseller.passwordLink.useMutation();
  const setPasswordMut = trpc.reseller.setPassword.useMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [sort, setSort] = useState<"recent" | "name" | "customers" | "outstanding">("recent");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [accountForm, setAccountForm] = useState<AccountForm | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [tab, setTab] = useState<"statement" | "orders" | "payments">("statement");

  type Row = NonNullable<typeof overview>["accounts"][number];
  const [shareFor, setShareFor] = useState<Row | null>(null);
  const [shareKind, setShareKind] = useState<ShareKind>("signin");
  const [shareLink, setShareLink] = useState("");
  const [sharePwdOn, setSharePwdOn] = useState(false);
  const [sharePwd, setSharePwd] = useState("");
  const [sharePwdSet, setSharePwdSet] = useState(""); // the value actually saved on their account
  const [shareDraft, setShareDraft] = useState<string | null>(null);
  const [confirmActive, setConfirmActive] = useState<{ row: Row; active: boolean } | null>(null);

  const accounts = useMemo(() => overview?.accounts ?? [], [overview]);
  const statusOf = (a: Row): StatusKey => {
    if (!a.active || (a.login && a.login.status !== "active")) return "deactivated";
    if (!a.login) return "no_login";
    return a.login.lastLoginAt ? "active" : "invited";
  };

  const detail = trpc.resellerLedger.account.useQuery({ id: openId ?? 0 }, { enabled: !!openId });
  const saveAccount = trpc.resellerLedger.saveAccount.useMutation();
  const saveOrder = trpc.resellerLedger.saveOrder.useMutation();
  const setOrderStatus = trpc.resellerLedger.setOrderStatus.useMutation();
  const deleteOrder = trpc.resellerLedger.deleteOrder.useMutation();
  const addPayment = trpc.resellerLedger.addPayment.useMutation();
  const deletePayment = trpc.resellerLedger.deletePayment.useMutation();

  const refresh = async () => {
    await Promise.all([utils.resellerLedger.overview.invalidate(), utils.resellerLedger.account.invalidate()]);
  };

  const stats = useMemo(() => {
    const by = { active: 0, invited: 0, no_login: 0, deactivated: 0 } as Record<StatusKey, number>;
    let customers = 0, earned = 0, outstanding = 0, received = 0, cards = 0;
    for (const a of accounts) {
      by[statusOf(a)]++;
      customers += a.login?.customers ?? 0;
      earned += a.login?.commissionEarned ?? 0;
      outstanding += a.totals.outstanding;
      received += a.totals.received;
      cards += a.totals.cards;
    }
    return { by, customers, earned, outstanding, received, cards };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = accounts.filter((a) =>
      (statusFilter === "all" || statusOf(a) === statusFilter) &&
      (!q || `${a.name} ${a.company ?? ""} ${a.phone ?? ""} ${a.email ?? ""} ${a.login?.email ?? ""}`.toLowerCase().includes(q)));
    const by = {
      recent: (x: Row, y: Row) => new Date(String(y.createdAt)).getTime() - new Date(String(x.createdAt)).getTime(),
      name: (x: Row, y: Row) => x.name.localeCompare(y.name),
      customers: (x: Row, y: Row) => (y.login?.customers ?? 0) - (x.login?.customers ?? 0),
      outstanding: (x: Row, y: Row) => y.totals.outstanding - x.totals.outstanding,
    }[sort];
    return [...list].sort(by);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, search, statusFilter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const d = detail.data;
  const account = d?.account;
  const openRow = accounts.find((a) => a.id === openId) ?? null;

  // Statement: opening balance, then orders (+) and payments (−) oldest first.
  const statement = useMemo(() => {
    if (!d) return [];
    const out: { date: Date; kind: "opening" | "order" | "payment"; label: string; sub: string; debit: number; credit: number; balance: number }[] = [];
    const events = [
      ...d.orders.filter((o) => o.status !== "cancelled").map((o) => ({ date: new Date(o.orderDate), kind: "order" as const, label: o.title, sub: `${o.quantity} × ${inr2(o.unitPrice)} = ${inr2(o.grossAmount)} − ${o.commissionRate}% commission ${inr2(o.commissionAmount)}`, debit: o.netAmount, credit: 0 })),
      ...d.payments.map((p) => ({ date: new Date(p.paidOn), kind: "payment" as const, label: `Payment · ${METHODS.find((m) => m.id === p.method)?.label ?? p.method}`, sub: [p.reference, p.note].filter(Boolean).join(" · "), debit: 0, credit: p.amount })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    let balance = d.account.openingBalance;
    if (balance) out.push({ date: new Date(d.account.createdAt), kind: "opening", label: "Opening balance", sub: "Owed before this record started", debit: balance > 0 ? balance : 0, credit: balance < 0 ? -balance : 0, balance });
    for (const e of events) {
      balance += e.debit - e.credit;
      out.push({ ...e, balance });
    }
    return out;
  }, [d]);

  const openAccountForm = (a?: { id: number; name: string; company: string | null; phone: string | null; email: string | null; resellerUserId: number | null; commissionRate: number; openingBalance: number; notes: string | null; active: boolean }) => setAccountForm(a ? {
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
        openingBalance: Number(accountForm.openingBalance || 0), notes: accountForm.notes || undefined,
        // The form has no Active switch (Deactivate/Reactivate do that), so send the
        // status as it is NOW — the copy taken when the form opened may be stale.
        active: accountForm.id ? (accounts.find((x) => x.id === accountForm.id)?.active ?? accountForm.active) : true,
      });
      toast.success(accountForm.id ? "Reseller updated" : "Reseller account created");
      setAccountForm(null);
      if (!accountForm.id && r.id) openAccount(r.id);
      await refresh();
    } catch (e) { toast.error(readableError(e, "Could not save the reseller")); }
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
    } catch (e) { toast.error(readableError(e, "Could not create the login")); }
  };

  /* Open the partner portal as this reseller, in this tab. The admin's own
     session stays in its own slot; "Back to admin" in the portal returns here. */
  const onLoginAs = async (a: Row) => {
    if (!okToReplaceMainSession(a.login?.email || a.email || "")) return;
    try {
      const r = await loginAs.mutateAsync({ accountId: a.id });
      setSession(r.token, r.user, "main");
      toast.success(`Signed in as ${r.user.fullName}`);
      navigate("/reseller");
    } catch (e) { toast.error(readableError(e, "Could not sign in as this reseller")); }
  };

  const onSetActive = async () => {
    if (!confirmActive) return;
    const { row, active } = confirmActive;
    try {
      await setActive.mutateAsync({ accountId: row.id, active });
      toast.success(active ? `${row.name} is active again` : `${row.name} is deactivated`);
      setConfirmActive(null);
      await refresh();
    } catch (e) { toast.error(readableError(e, "Could not change the reseller's status")); }
  };

  const copy = (text: string, done: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(done)).catch(() => toast.error("Copy failed"));
  };

  /* ── Share with reseller ── */
  const openShare = (a: Row) => {
    setShareFor(a); setShareKind("signin"); setShareLink(""); setShareDraft(null);
    setSharePwdOn(false); setSharePwd(""); setSharePwdSet("");
  };
  const shareMessage = (a: Row, kind: ShareKind, link: string, pwd: string) => {
    const first = (a.name || "").trim().split(/\s+/)[0] || "there";
    const email = a.login?.email || a.email || "";
    const rate = `${a.commissionRate}%`;
    if (kind === "start") {
      return [
        `Hi ${first},`, "",
        "Here's how to get going as a DigitalCarda partner:", "",
        `1. Sign in at ${SIGN_IN_URL}`,
        "2. Tap *Add customer* and enter your client's name and email — they're linked to you from day one.",
        `3. When they buy a plan, your ${rate} commission lands in your wallet, customer by customer.`,
        "4. Request a payout to your bank or UPI from *Earnings & Payouts* whenever you like.", "",
        `Selling under your own brand? Ask us about white-label — your own domain, logo and colours — ${WHITE_LABEL_PRICE} one-time.`, "",
        `Need help? WhatsApp us on ${SUPPORT_WHATSAPP}.`,
        "— Team DigitalCarda",
      ].join("\n");
    }
    return [
      `Hi ${first},`, "",
      "Your DigitalCarda partner account is ready.", "",
      "*SIGN IN*", email, SIGN_IN_URL, "",
      ...(pwd
        ? ["*PASSWORD*", pwd, "Please change it after you sign in: *My Profile → Change password*.", ""]
        : link
          ? ["*SET YOUR PASSWORD* (the link works once, for 60 minutes)", link, ""]
          : a.login && !a.login.lastLoginAt ? ["First time? Use *Forgot password* on the sign-in page to set your password.", ""] : []),
      `Your commission: ${rate} on every plan your customers buy.`, "",
      "From your partner dashboard you can add customers, see the commission each one earns you, and request payouts to your bank or UPI.", "",
      `Need help? WhatsApp us on ${SUPPORT_WHATSAPP}.`,
      "— Team DigitalCarda",
    ].join("\n");
  };
  // The password goes into the message only once it is really set on their
  // account — a value typed here but not saved would hand over a dead password.
  const sharedPwd = sharePwdOn && sharePwd && sharePwd === sharePwdSet ? sharePwdSet : "";
  const shareText = shareFor ? (shareDraft ?? shareMessage(shareFor, shareKind, shareLink, sharedPwd)) : "";

  /* A partner password guards their payouts, so a generated one is fully random
     (12 characters, every class) — not a guessable word-plus-number pattern. */
  const makePassword = () => generateStrongPassword(12);
  // Share windows are reused: a reply that arrives after the admin moved on to
  // another partner must not land in that partner's message.
  const shareForRef = useRef<Row | null>(null);
  shareForRef.current = shareFor;
  const stillSharing = (id: number) => shareForRef.current?.id === id;
  const onSetPassword = async () => {
    if (!shareFor) return;
    const forId = shareFor.id;
    const pwd = sharePwd.trim() && sharePwd !== sharePwdSet ? sharePwd.trim() : makePassword();
    try {
      await setPasswordMut.mutateAsync({ accountId: forId, password: pwd });
      if (!stillSharing(forId)) return;
      setSharePwd(pwd); setSharePwdSet(pwd); setSharePwdOn(true); setShareLink(""); setShareDraft(null);
      toast.success("New password set — it's in the message below.");
    } catch (e) { toast.error(readableError(e, "Could not set a new password")); }
  };
  const toggleShareLink = async (on: boolean) => {
    if (!shareFor) return;
    setShareDraft(null);
    if (!on) { setShareLink(""); return; }
    setSharePwdOn(false);
    const forId = shareFor.id;
    try {
      const r = await passwordLink.mutateAsync({ accountId: forId });
      if (stillSharing(forId)) setShareLink(r.link);
    } catch (e) { toast.error(readableError(e, "Could not make a set-password link")); }
  };
  const onShareEmail = async () => {
    if (!shareFor) return;
    const forId = shareFor.id;
    try {
      const r = await sendLoginEmail.mutateAsync({ accountId: forId });
      if (r.ok) { toast.success(`Sign-in details emailed to ${r.sentTo}`); if (stillSharing(forId)) setShareFor(null); }
      else toast.error(r.error || "The email could not be sent.");
    } catch (e) { toast.error(readableError(e, "Could not send the email")); }
  };

  const actionItems = (a: Row): ActionItem[] => {
    const st = statusOf(a);
    const live = !!a.login && st !== "deactivated";
    return [
      { icon: <Eye size={15} className="text-[#B45309]" />, label: "View statement", onClick: () => openAccount(a.id) },
      { icon: <LogIn size={15} className="text-[#0F172A]" />, label: "Login as Reseller", onClick: () => onLoginAs(a), hidden: !live || !isSuper },
      { icon: <Send size={15} className="text-[#0EA5E9]" />, label: "Share with Reseller", onClick: () => openShare(a), hidden: !live },
      { icon: <KeyRound size={15} className="text-[#15803D]" />, label: "Give them a login", onClick: () => onGrantLogin(a), hidden: !!a.login || !a.active },
      { icon: <Pencil size={15} className="text-[#7C3AED]" />, label: "Edit details & commission", onClick: () => openAccountForm(a) },
      { icon: <Plus size={15} className="text-[#0F172A]" />, label: "Add card order", onClick: () => { openAccount(a.id); setOrderForm({ orderDate: todayInput(), title: "", plan: "", quantity: "1", unitPrice: "", commissionRate: "", customerNames: "", status: "pending", notes: "" }); } },
      { icon: <IndianRupee size={15} className="text-[#15803D]" />, label: "Record payment", onClick: () => { openAccount(a.id); setPaymentForm({ amount: a.totals.outstanding > 0 ? String(Math.round(a.totals.outstanding)) : "", method: "upi", reference: "", paidOn: todayInput(), orderId: null, note: "" }); } },
      { icon: <Link2 size={15} className="text-[#2563EB]" />, label: "Copy partner sign-in link", onClick: () => copy(SIGN_IN_URL, "Partner sign-in link copied") },
      st === "deactivated"
        ? { icon: <RotateCcw size={15} className="text-[#15803D]" />, label: "Reactivate", onClick: () => setConfirmActive({ row: a, active: true }) }
        : { icon: <Ban size={15} className="text-[#DC2626]" />, label: "Deactivate", onClick: () => setConfirmActive({ row: a, active: false }), danger: true },
    ];
  };

  const exportListCsv = () => {
    const esc = csvCell;
    const head = ["Name", "Business", "Email", "Phone", "Status", "Commission %", "Customers", "Commission earned online (₹)", "In wallet (₹)", "Cards ordered", "Received (₹)", "Outstanding (₹)", "Added", "Last sign-in"];
    const lines = [head.map(esc).join(",")];
    for (const a of rows) {
      lines.push([
        a.name, a.company, a.login?.email || a.email, a.phone, STATUS[statusOf(a)].label, a.commissionRate,
        a.login?.customers ?? "", a.login ? a.login.commissionEarned.toFixed(2) : "", a.login ? a.login.walletBalance.toFixed(2) : "",
        a.totals.cards, a.totals.received.toFixed(2), a.totals.outstanding.toFixed(2), dayStr(a.createdAt), a.login?.lastLoginAt ? dayStr(a.login.lastLoginAt) : "",
      ].map(esc).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resellers-${todayInput()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
    } catch (e) { toast.error(readableError(e, "Could not save the order")); }
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
    } catch (e) { toast.error(readableError(e, "Could not record the payment")); }
  };

  const exportCsv = () => {
    if (!account) return;
    const esc = csvCell;
    const lines = [["Date", "Entry", "Details", "Due (₹)", "Received (₹)", "Balance (₹)"].map(esc).join(",")];
    for (const r of statement) lines.push([dayStr(r.date), r.label, r.sub, r.debit ? r.debit.toFixed(2) : "", r.credit ? r.credit.toFixed(2) : "", r.balance.toFixed(2)].map(esc).join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${account.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Resellers", value: accounts.length.toLocaleString("en-IN"), sub: `${stats.by.active} active · ${stats.by.invited} invited · ${stats.by.deactivated} deactivated`, icon: Store, tint: "#F7B31C", bg: "#FEF3C7", filter: "all" as const },
    { label: "Active partners", value: stats.by.active.toLocaleString("en-IN"), sub: "Signed in at least once", icon: UserCheck, tint: "#22C55E", bg: "#DCFCE7", filter: "active" as const },
    { label: "Customers brought in", value: stats.customers.toLocaleString("en-IN"), sub: `${inr(stats.earned)} commission earned online`, icon: Users, tint: "#3B82F6", bg: "#DBEAFE", filter: null },
    { label: "Outstanding from resellers", value: inr(stats.outstanding), sub: `${inr(stats.received)} received · ${stats.cards} cards ordered`, icon: Wallet, tint: stats.outstanding > 0 ? "#EF4444" : "#8B5CF6", bg: stats.outstanding > 0 ? "#FEE2E2" : "#EDE9FE", filter: null },
  ];

  const accountFormSection = accountForm && (
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
            {accountForm.resellerUserId && !(overview?.resellerUsers ?? []).some((u) => u.id === accountForm.resellerUserId) && (
              <option value={accountForm.resellerUserId}>Current login (#{accountForm.resellerUserId})</option>
            )}
            {(overview?.resellerUsers ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}{u.companyName ? ` · ${u.companyName}` : ""} ({u.email})</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Notes" wide><input className={input} value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} /></Labeled>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#F1F5F9] pt-4">
        <button type="button" onClick={() => setAccountForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
        <button type="button" onClick={submitAccount} disabled={saveAccount.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-[13px] font-bold text-white disabled:opacity-60">
          {saveAccount.isPending && <Loader2 size={15} className="animate-spin" />} Save
        </button>
      </div>
    </section>
  );

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

        {view === "applications" ? <ResellerApplicationsPanel /> : !openId ? (
          <>
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((s) => {
                const on = s.filter !== null && statusFilter === s.filter;
                const Tag = s.filter ? "button" : "div";
                return (
                  <Tag key={s.label} {...(s.filter ? { type: "button" as const, onClick: () => { setStatusFilter(s.filter!); setPage(1); } } : {})}
                    className={`relative flex items-center gap-3.5 overflow-hidden rounded-2xl border bg-white p-4 pl-5 text-left shadow-premium ${s.filter ? "transition-all hover:-translate-y-0.5 hover:shadow-premium-lg" : ""} ${on ? "border-[#F7B31C] ring-2 ring-[#F7B31C]/30" : "border-[#F1F5F9]"}`}>
                    <span className="absolute bottom-0 left-0 top-0 w-1.5 rounded-r" style={{ background: s.tint }} />
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.tint }} /></span>
                    <span className="min-w-0">
                      <span className="block text-2xl font-extrabold leading-none tabular-nums text-[#0F172A]">{isLoading ? "—" : s.value}</span>
                      <span className="mt-1.5 block text-xs text-[#64748B]">{s.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#94A3B8]">{isLoading ? "" : s.sub}</span>
                    </span>
                  </Tag>
                );
              })}
            </div>

            {accountFormSection}

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 text-[13px] text-[#64748B]">Show
                <select aria-label="Rows per page" className={toolSelect} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <select aria-label="Status" className={toolSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited — not signed in yet</option>
                <option value="no_login">No login</option>
                <option value="deactivated">Deactivated</option>
              </select>
              <select aria-label="Sort" className={toolSelect} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="recent">Recent first</option>
                <option value="name">Name A–Z</option>
                <option value="customers">Most customers</option>
                <option value="outstanding">Most outstanding</option>
              </select>
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs sm:ml-auto">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, business, email, phone" aria-label="Search resellers"
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#F7B31C]" />
              </div>
              <button type="button" onClick={exportListCsv} disabled={!rows.length}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">
                <Download size={15} /> Export CSV
              </button>
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                      {["Reseller", "Contact", "Sign-in", "Commission", "Customers", "Earned online", "Owes you", ""].map((h, i) => (
                        <th key={i} className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] ${i >= 3 && i <= 6 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3.5"><div className="h-9 animate-pulse rounded-lg bg-[#F1F5F9]" /></td></tr>)
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-16 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F5F9]"><Store size={22} className="text-[#94A3B8]" /></span>
                        <p className="text-sm font-medium text-[#0F172A]">{accounts.length ? "No resellers match" : "No resellers yet"}</p>
                        <p className="mt-0.5 text-xs text-[#94A3B8]">{accounts.length ? "Try a different search or status." : "Add a reseller, or approve an application."}</p>
                      </td></tr>
                    ) : pageRows.map((a) => {
                      const st = statusOf(a);
                      return (
                        <tr key={a.id} className={`transition-colors hover:bg-[#FAFBFC] ${st === "deactivated" ? "opacity-70" : ""}`}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => openAccount(a.id)} title="Open statement" className="group flex items-center gap-3 text-left">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(a.name)} shadow-sm ring-2 ring-white`}>
                                <span className="text-[11px] font-bold text-white">{initials(a.name)}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="block max-w-[190px] truncate text-[13px] font-semibold text-[#0F172A] transition-colors group-hover:text-[#B45309]">{a.name}</span>
                                <span className="block max-w-[190px] truncate text-[11px] text-[#94A3B8]">{a.company ? `${a.company} · ` : ""}#{a.id} · since {dayStr(a.createdAt)}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {a.login?.email || a.email
                              ? <a href={`mailto:${a.login?.email || a.email}`} className="block max-w-[200px] truncate text-[12px] text-[#475569] hover:text-[#B45309]">{a.login?.email || a.email}</a>
                              : <span className="text-[12px] text-[#CBD5E1]">No email</span>}
                            <p className="mt-0.5 text-[11px] text-[#94A3B8]">{a.phone || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill s={st} />
                            <p className="mt-1 text-[11px] text-[#94A3B8]">
                              {st === "no_login" ? "Can't sign in yet" : st === "deactivated" ? "Can't sign in" : a.login?.lastLoginAt ? `Last seen ${ago(a.login.lastLoginAt)}` : a.login ? "Hasn't signed in yet" : "Ledger only"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#0F172A]">{a.commissionRate}%</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {a.login ? (
                              <button type="button" title="See their customers" onClick={(e) => { e.stopPropagation(); navigate(`/admin/customers?reseller=${a.login!.userId}`); }}
                                className="text-[13px] font-semibold text-[#0F766E] underline decoration-[#99F6E4] underline-offset-2 hover:decoration-[#0F766E]">{a.login.customers.toLocaleString("en-IN")}</button>
                            ) : <span className="text-[13px] font-semibold text-[#0F172A]">—</span>}
                            <p className="text-[11px] text-[#94A3B8]">{a.totals.cards} cards ordered</p>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="text-[13px] font-semibold text-[#0F172A]">{a.login ? inr2(a.login.commissionEarned) : "—"}</span>
                            {a.login && <p className="text-[11px] text-[#94A3B8]">{inr2(a.login.walletBalance)} in wallet</p>}
                          </td>
                          <td className={`px-4 py-3 text-right text-[13px] font-bold tabular-nums ${a.totals.outstanding > 0 ? "text-[#B45309]" : "text-[#15803D]"}`}>{inr(a.totals.outstanding)}</td>
                          <td className="px-4 py-3 text-right"><ActionMenu items={actionItems(a)} label={`Actions for ${a.name}`} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Phone cards ── */}
            <div className="space-y-3 md:hidden">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
              ) : pageRows.length === 0 ? (
                <p className="rounded-2xl border border-[#F1F5F9] bg-white p-10 text-center text-sm text-[#64748B]">{accounts.length ? "No resellers match." : "No resellers yet."}</p>
              ) : pageRows.map((a) => {
                const st = statusOf(a);
                return (
                  <div key={a.id} className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => openAccount(a.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(a.name)}`}><span className="text-[12px] font-bold text-white">{initials(a.name)}</span></span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-[#0F172A]">{a.name}</span>
                          <span className="block truncate text-[12px] text-[#64748B]">{a.login?.email || a.email || a.phone || "No contact details"}</span>
                        </span>
                      </button>
                      <ActionMenu items={actionItems(a)} label={`Actions for ${a.name}`} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusPill s={st} />
                      <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">{a.commissionRate}%</span>
                      {a.login && <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">{a.login.customers} customers</span>}
                      <span className={`ml-auto text-[13px] font-bold tabular-nums ${a.totals.outstanding > 0 ? "text-[#B45309]" : "text-[#15803D]"}`}>{inr(a.totals.outstanding)} owed</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {rows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#64748B]">
                <span>Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} of {rows.length}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <span className="px-2 tabular-nums">{safePage} / {pages}</span>
                  <button type="button" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── One reseller: statement, orders, payments ── */
          <section className="min-w-0 space-y-4">
            <button type="button" onClick={closeAccount} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A]">
              <ArrowLeft size={15} /> All resellers
            </button>

            {accountFormSection}

            {detail.isError ? (
              <div className="rounded-2xl border border-[#F1F5F9] bg-white py-16 text-center text-sm text-[#64748B] shadow-premium">That reseller couldn't be found. <button type="button" onClick={closeAccount} className="font-semibold text-[#B45309]">Back to the list</button></div>
            ) : !account ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#F1F5F9] bg-white py-16 text-sm text-[#64748B] shadow-premium"><Loader2 size={16} className="animate-spin" /> Loading account…</div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(account.name)}`}><span className="text-[13px] font-bold text-white">{initials(account.name)}</span></span>
                      <div>
                        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-[#0F172A]">{account.name} {openRow && <StatusPill s={statusOf(openRow)} />}</h2>
                        <p className="text-[13px] text-[#64748B]">{[account.company, account.phone, account.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                        <p className="mt-1 text-[12.5px] text-[#475569]">Commission <b>{account.commissionRate}%</b></p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => openAccountForm(account)} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Pencil size={14} /> Edit</button>
                      <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Download size={14} /> CSV</button>
                      <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Printer size={14} /> Print</button>
                      <button type="button" onClick={() => { setPaymentForm(null); setOrderForm({ orderDate: todayInput(), title: "", plan: "", quantity: "1", unitPrice: "", commissionRate: "", customerNames: "", status: "pending", notes: "" }); }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 text-[12.5px] font-bold text-white"><Plus size={14} /> Order</button>
                      <button type="button" onClick={() => { setOrderForm(null); setPaymentForm({ amount: d && d.totals.outstanding > 0 ? String(Math.round(d.totals.outstanding)) : "", method: "upi", reference: "", paidOn: todayInput(), orderId: null, note: "" }); }}
                        className="gradient-gold inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold text-[#0F172A]"><IndianRupee size={14} /> Record payment</button>
                      {openRow && <ActionMenu items={actionItems(openRow).filter((it) => it.label !== "View statement")} label={`More actions for ${account.name}`} />}
                    </div>
                  </div>

                  {d && (
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {[
                        { l: "Order value", v: inr(d.totals.gross) },
                        { l: "Their commission", v: inr(d.totals.commission) },
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
                    const login = openRow?.login;
                    if (!login) {
                      return (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
                          <p className="text-[12.5px] text-[#475569]">
                            <b className="text-[#0F172A]">No login yet.</b> {account.name} can't sign in, add customers or see their commission until they have one.
                          </p>
                          {account.active && (
                            <button type="button" onClick={() => onGrantLogin({ id: account.id, name: account.name, email: account.email })} disabled={grantLogin.isPending}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 text-[12.5px] font-bold text-white disabled:opacity-60">
                              {grantLogin.isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Give them a login
                            </button>
                          )}
                        </div>
                      );
                    }
                    const off = login.status !== "active";
                    return (
                      <div className={`mt-4 rounded-xl px-4 py-3 ${off ? "bg-[#FEF2F2]" : "bg-[#F0FDF4]"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] ${off ? "text-[#991B1B]" : "text-[#166534]"}`}>
                            {off ? <Ban size={14} /> : <UserCheck size={14} />} <b>{off ? `Deactivated — ${login.email} can't sign in` : `Signs in as ${login.email}`}</b>
                            {!off && <span className="text-[#15803D]/70">· {login.lastLoginAt ? `last seen ${ago(login.lastLoginAt)}` : "hasn't signed in yet"}</span>}
                          </p>
                          {!off && openRow && isSuper && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => onLoginAs(openRow)} disabled={loginAs.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[12px] font-semibold text-[#0F172A] ring-1 ring-[#BBF7D0] hover:bg-[#F0FDF4] disabled:opacity-60"><LogIn size={13} /> Login as reseller</button>
                              <button type="button" onClick={() => openShare(openRow)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[12px] font-semibold text-[#0F172A] ring-1 ring-[#BBF7D0] hover:bg-[#F0FDF4]"><Send size={13} /> Share</button>
                            </div>
                          )}
                        </div>
                        <dl className="mt-2 grid grid-cols-3 gap-3">
                          {[
                            { l: "Customers", v: login.customers.toLocaleString("en-IN"), to: `/admin/customers?reseller=${login.userId}` },
                            { l: "Commission earned online", v: inr2(login.commissionEarned) },
                            { l: "In their wallet", v: inr2(login.walletBalance) },
                          ].map((x) => (
                            <div key={x.l}>
                              <dt className={`text-[11px] ${off ? "text-[#991B1B]/70" : "text-[#15803D]/80"}`}>{x.l}</dt>
                              <dd className={`text-[15px] font-extrabold tabular-nums ${off ? "text-[#7F1D1D]" : "text-[#14532D]"}`}>
                                {x.to ? <button type="button" onClick={() => navigate(x.to!)} title="See their customers" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">{x.v}</button> : x.v}
                              </dd>
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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"><Pencil size={13} /></button>
                                <button type="button" aria-label="Delete order" onClick={async () => { if (!confirm("Delete this order? Payments stay on the account.")) return; try { await deleteOrder.mutateAsync({ id: o.id }); await refresh(); } catch { toast.error("Could not delete"); } }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#DC2626] ring-1 ring-[#FECACA] hover:bg-[#FEF2F2]"><Trash2 size={13} /></button>
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#DC2626] ring-1 ring-[#FECACA] hover:bg-[#FEF2F2]"><Trash2 size={13} /></button>
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
        )}
      </div>

      {/* ── Share with reseller ── */}
      {shareFor && (
        <AdminModal wide onClose={() => setShareFor(null)} icon={<Send size={20} className="text-[#0EA5E9]" />} iconBg="bg-[#E0F2FE]" title="Share with Reseller"
          subtitle={`${shareFor.name} · ${shareFor.login?.email || shareFor.email || "no email"}`}>
          <div className="grid grid-cols-2 gap-2">
            {([["signin", "Sign-in details"], ["start", "Getting started"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={shareKind === k} onClick={() => { setShareKind(k); setShareDraft(null); }}
                className={`h-10 rounded-xl border text-[13px] font-semibold transition-colors ${shareKind === k ? "border-[#F7B31C] bg-[#FFFBEB] text-[#92400E]" : "border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"}`}>{label}</button>
            ))}
          </div>

          {shareKind === "signin" && !isSuper && (
            <p className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5 text-[11.5px] leading-snug text-[#64748B]">Only the super admin can set a partner's password or make a set-password link. Email sends them a fresh set-password link.</p>
          )}
          {shareKind === "signin" && isSuper && (
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#F7B31C]" checked={sharePwdOn}
                    onChange={(e) => { setSharePwdOn(e.target.checked); setShareDraft(null); if (e.target.checked) setShareLink(""); }} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[#0F172A]">Include the password in the message</span>
                    <span className="block text-[11px] leading-snug text-[#64748B]">Off by default. Sending a password over email or WhatsApp is not secure — prefer telling them to use “Forgot password”. The message always asks them to change it after signing in.</span>
                  </span>
                </label>
                {sharePwdOn && (
                  <>
                    <input value={sharePwd} onChange={(e) => { setSharePwd(e.target.value); setShareDraft(null); }} placeholder="Password to share" aria-label="Password to share"
                      autoComplete="off" spellCheck={false}
                      className="mt-2.5 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 font-mono text-sm outline-none focus:border-[#F7B31C]" />
                    {sharePwdSet && sharePwd === sharePwdSet ? (
                      <p className="mt-1.5 text-[11px] font-semibold leading-snug text-emerald-600">✓ Set on {shareFor.name}&apos;s account just now — share it as it is. We&apos;ve emailed them that their password was changed.</p>
                    ) : sharePwd.trim() ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-[#B45309]">Not saved yet — this password only goes into the message once you set it on their account.</p>
                    ) : (
                      <p className="mt-1.5 text-[11px] leading-snug text-[#B45309]">This account has no readable password saved — it&apos;s stored encrypted (one-way), so nobody can read the original back. Set a new one below to share.</p>
                    )}
                    <button type="button" onClick={onSetPassword} disabled={setPasswordMut.isPending}
                      className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#F7B31C] bg-[#FEF3C7]/60 text-[12.5px] font-bold text-[#92400E] hover:bg-[#FEF3C7] disabled:opacity-60">
                      {setPasswordMut.isPending ? <><Loader2 size={13} className="animate-spin" /> Setting…</>
                        : sharePwd.trim() && sharePwd !== sharePwdSet ? "Set this password on their account"
                        : sharePwdSet ? "Generate a different password" : "Generate & set a new password"}
                    </button>
                  </>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#F7B31C]" checked={!!shareLink} disabled={passwordLink.isPending} onChange={(e) => toggleShareLink(e.target.checked)} />
                <span>
                  <span className="block text-[13px] font-semibold text-[#0F172A]">
                    Or include a set-password link instead {passwordLink.isPending && <Loader2 size={12} className="ml-1 inline animate-spin" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[#64748B]">
                    {shareFor.login && !shareFor.login.lastLoginAt ? "They haven't signed in yet — a link lets them choose their own password. " : ""}
                    Safer than a password: it works once, for 60 minutes. Only send it to the reseller.
                  </span>
                </span>
              </label>
            </div>
          )}

          <p className="mb-1.5 mt-4 text-[12px] font-semibold text-[#334155]">Message preview</p>
          <textarea value={shareText} onChange={(e) => setShareDraft(e.target.value)} rows={10}
            className="w-full resize-y rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-[#0F172A] outline-none focus:border-[#F7B31C]" />

          <div className={`mt-3 grid gap-2 ${shareKind === "signin" ? "grid-cols-3" : "grid-cols-2"}`}>
            <button type="button" onClick={() => copy(shareText, "Message copied")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"><Copy size={15} /> Copy</button>
            <a href={shareFor.phone ? whatsappLink(shareFor.phone, shareText) : undefined} target="_blank" rel="noopener noreferrer"
              aria-disabled={!shareFor.phone} onClick={(e) => { if (!shareFor.phone) { e.preventDefault(); toast.error("Add their phone number first (Edit)"); } }}
              className={`inline-flex h-11 items-center justify-center rounded-xl text-[13px] font-bold text-white ${shareFor.phone ? "bg-[#25D366] hover:bg-[#1FB855]" : "cursor-not-allowed bg-[#86EFAC]"}`}>WhatsApp</a>
            {shareKind === "signin" && (
              <button type="button" onClick={onShareEmail} disabled={sendLoginEmail.isPending}
                className="gradient-gold inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold text-[#0F172A] disabled:opacity-60">
                {sendLoginEmail.isPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Email
              </button>
            )}
          </div>
          <p className="mt-2.5 text-center text-[11px] leading-snug text-[#94A3B8]">
            {shareKind === "signin"
              ? "Email sends DigitalCarda's branded sign-in email, with its own fresh set-password link. WhatsApp opens with the message above ready to send."
              : "WhatsApp opens with the message above ready to send."}
          </p>
        </AdminModal>
      )}

      {/* ── Deactivate / reactivate ── */}
      {confirmActive && (
        <AdminModal onClose={() => setConfirmActive(null)}
          icon={confirmActive.active ? <RotateCcw size={20} className="text-[#15803D]" /> : <Ban size={20} className="text-[#DC2626]" />}
          iconBg={confirmActive.active ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}
          title={confirmActive.active ? `Reactivate ${confirmActive.row.name}?` : `Deactivate ${confirmActive.row.name}?`}>
          <ul className="space-y-2 text-[13px] leading-snug text-[#475569]">
            {confirmActive.active ? (
              <>
                <li>• {confirmActive.row.login ? "They can sign in again straight away, with their existing password." : "They show as active in your list again."}</li>
                <li>• Their customers, commission and ledger are exactly as they were.</li>
              </>
            ) : confirmActive.row.login ? (
              <>
                <li>• They can't sign in, and a session already open stops working on its next click.</li>
                <li>• Their customers keep their accounts and cards.</li>
                <li>• Commission on their customers' payments still builds up in their wallet — they just can't see it or ask for a payout.</li>
                <li>• Their orders and payments stay on the ledger. You can reactivate them any time.</li>
              </>
            ) : (
              <>
                <li>• {confirmActive.row.name} has no login, so this only marks them inactive in your list.</li>
                <li>• Their orders and payments stay on the ledger. You can reactivate them any time.</li>
              </>
            )}
          </ul>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirmActive(null)} className="h-11 flex-1 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="button" onClick={onSetActive} disabled={setActive.isPending}
              className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 ${confirmActive.active ? "bg-[#15803D] hover:bg-[#166534]" : "bg-[#DC2626] hover:bg-[#B91C1C]"}`}>
              {setActive.isPending && <Loader2 size={15} className="animate-spin" />} {confirmActive.active ? "Reactivate" : "Deactivate"}
            </button>
          </div>
        </AdminModal>
      )}
    </ResponsiveDashboardLayout>
  );
}
