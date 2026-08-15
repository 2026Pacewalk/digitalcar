/* Shared UI + helpers for the Payment Orders module, reused by the admin,
   reseller, and customer views so all three stay visually and behaviourally
   consistent. Admin gets verify/reject actions (canManage); reseller/customer
   are read-only. */
import { useMemo, useState } from "react";
import {
  Clock, CheckCircle2, XCircle, CreditCard, Landmark, QrCode, X, Check,
  Search, Download, IndianRupee, Receipt, Zap,
} from "lucide-react";

export type PaymentOrderRow = {
  id: number;
  userId: number;
  planName: string | null;
  billingCycle: string;
  amount: number;
  method: "upi" | "bank";
  gateway: "manual" | "razorpay";
  reference: string;
  status: "pending" | "verified" | "rejected";
  adminNote: string | null;
  createdAt: string | Date;
  verifiedAt: string | Date | null;
  user: { name: string; email: string; phone?: string | null } | null;
};

export const inr = (v: unknown) =>
  "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt = (s: string | Date | null | undefined) => {
  if (!s) return "—";
  const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function StatusBadge({ status }: { status: PaymentOrderRow["status"] }) {
  const map = {
    pending: { cls: "bg-amber-50 text-amber-600", Icon: Clock, label: "Pending" },
    verified: { cls: "bg-emerald-50 text-emerald-600", Icon: CheckCircle2, label: "Verified" },
    rejected: { cls: "bg-red-50 text-red-500", Icon: XCircle, label: "Rejected" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${map.cls}`}>
      <map.Icon size={12} /> {map.label}
    </span>
  );
}

export function GatewayBadge({ gateway }: { gateway: PaymentOrderRow["gateway"] }) {
  return gateway === "razorpay" ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0F172A] text-white"><Zap size={10} className="text-[#F7B31C]" /> Razorpay</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">Manual</span>
  );
}

export type OrderFilters = { q: string; status: string; gateway: string; from: string; to: string };
export const emptyFilters: OrderFilters = { q: "", status: "all", gateway: "all", from: "", to: "" };

export function filterOrders(list: PaymentOrderRow[], f: OrderFilters): PaymentOrderRow[] {
  const q = f.q.trim().toLowerCase();
  const fromT = f.from ? new Date(f.from + "T00:00:00").getTime() : -Infinity;
  const toT = f.to ? new Date(f.to + "T23:59:59").getTime() : Infinity;
  return list.filter((o) => {
    if (f.status !== "all" && o.status !== f.status) return false;
    if (f.gateway !== "all" && o.gateway !== f.gateway) return false;
    const t = new Date(typeof o.createdAt === "string" ? o.createdAt.replace(" ", "T") : o.createdAt).getTime();
    if (t < fromT || t > toT) return false;
    if (q) {
      const hay = `${o.user?.name ?? ""} ${o.user?.email ?? ""} ${o.user?.phone ?? ""} ${o.reference} ${o.planName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Turn the (filtered) list into a CSV and trigger a client-side download. */
export function downloadOrdersCsv(list: PaymentOrderRow[], filename = "payment-orders.csv") {
  const head = ["ID", "Date", "Customer", "Email", "Phone", "Plan", "Cycle", "Amount", "Gateway", "Method", "Reference", "Status", "Verified At", "Note"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map((o) => [
    o.id, fmt(o.createdAt), o.user?.name ?? "", o.user?.email ?? "", o.user?.phone ?? "",
    o.planName ?? "", o.billingCycle, o.amount, o.gateway, o.method, o.reference, o.status, fmt(o.verifiedAt), o.adminNote ?? "",
  ].map(esc).join(","));
  const csv = [head.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** Summary cards row. Stats come pre-computed (admin: server; reseller/customer: client). */
export function SummaryCards({ stats }: {
  stats: { revenue: number; monthRevenue?: number; pending: number; verified: number; rejected?: number; razorpayRevenue?: number; manualRevenue?: number };
}) {
  const cards = [
    { label: "Total collected", value: inr(stats.revenue), icon: IndianRupee, bg: "#DCFCE7", fg: "#16A34A" },
    ...(stats.monthRevenue !== undefined ? [{ label: "This month", value: inr(stats.monthRevenue), icon: Receipt, bg: "#E0E7FF", fg: "#4F46E5" }] : []),
    { label: "Pending", value: String(stats.pending), icon: Clock, bg: "#FEF3C7", fg: "#D97706" },
    { label: "Verified", value: String(stats.verified), icon: CheckCircle2, bg: "#DCFCE7", fg: "#16A34A" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((s) => (
        <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={19} style={{ color: s.fg }} /></div>
          <div className="min-w-0"><p className="text-lg font-bold text-[#0F172A] leading-none truncate">{s.value}</p><p className="text-[11px] text-[#64748B] mt-1">{s.label}</p></div>
        </div>
      ))}
    </div>
  );
}

/** Filter toolbar + CSV export button. */
export function FilterBar({ filters, setFilters, onExport, count }: {
  filters: OrderFilters; setFilters: (f: OrderFilters) => void; onExport: () => void; count: number;
}) {
  const sel = "h-10 rounded-xl bg-white border border-[#E2E8F0] px-2.5 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]";
  return (
    <div className="bg-white rounded-2xl p-3 shadow-premium border border-[#F1F5F9] flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search name, email, reference, plan…"
          className="h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] pl-9 pr-3 text-sm outline-none focus:border-[#F7B31C]" />
      </div>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={sel}>
        <option value="all">All status</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option>
      </select>
      <select value={filters.gateway} onChange={(e) => setFilters({ ...filters, gateway: e.target.value })} className={sel}>
        <option value="all">All gateways</option><option value="razorpay">Razorpay</option><option value="manual">Manual</option>
      </select>
      <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={sel} title="From date" />
      <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={sel} title="To date" />
      <button onClick={onExport} disabled={!count} className="h-10 px-3 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] disabled:opacity-50">
        <Download size={15} /> CSV
      </button>
    </div>
  );
}

/** The orders table. `hideCustomer` (customer's own view) swaps the customer
    column for the payment reference, since the buyer is always themselves. */
export function OrdersTable({ list, onRow, hideCustomer }: { list: PaymentOrderRow[]; onRow: (o: PaymentOrderRow) => void; hideCustomer?: boolean }) {
  if (!list.length) {
    return (
      <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
        <IndianRupee size={26} className="mx-auto text-[#CBD5E1] mb-2" />
        <p className="text-sm font-semibold text-[#0F172A]">No orders match</p>
        <p className="text-xs text-[#94A3B8] mt-1">Try clearing the filters, or wait for new payments.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#94A3B8] border-b border-[#F1F5F9]">
              <th className="px-4 py-3 font-semibold">{hideCustomer ? "Reference" : "Customer"}</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Gateway</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} onClick={() => onRow(o)} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] cursor-pointer">
                {hideCustomer ? (
                  <td className="px-4 py-3"><p className="font-mono text-[12px] text-[#475569] truncate max-w-[180px]">{o.reference}</p></td>
                ) : (
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0F172A] truncate max-w-[180px]">{o.user?.name || "—"}</p>
                    <p className="text-[11px] text-[#94A3B8] truncate max-w-[180px]">{o.user?.email}</p>
                  </td>
                )}
                <td className="px-4 py-3 text-[#475569]">{o.planName || "—"}<span className="text-[#94A3B8]"> · {o.billingCycle}</span></td>
                <td className="px-4 py-3 font-bold text-[#0F172A] whitespace-nowrap">{inr(o.amount)}</td>
                <td className="px-4 py-3"><GatewayBadge gateway={o.gateway} /></td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{fmt(o.createdAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Slide-over detail drawer. Admin passes canManage + handlers to verify/reject. */
export function OrderDrawer({ order, canManage, busy, onVerify, onReject, onClose }: {
  order: PaymentOrderRow;
  canManage?: boolean;
  busy?: boolean;
  onVerify?: (id: number) => void;
  onReject?: (id: number, note?: string) => void;
  onClose: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-[12px] text-[#94A3B8] shrink-0">{label}</span>
      <span className={`text-[13px] font-semibold text-[#0F172A] text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-[#0F172A]">{inr(order.amount)}</p>
              <GatewayBadge gateway={order.gateway} />
            </div>
            <p className="text-[12px] text-[#94A3B8]">Order #{order.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="inline-flex items-center gap-1 text-[12px] text-[#64748B]">
              {order.method === "bank" ? <Landmark size={13} /> : order.gateway === "razorpay" ? <CreditCard size={13} /> : <QrCode size={13} />}
              {order.gateway === "razorpay" ? "Card / UPI / Netbanking" : order.method === "bank" ? "Bank transfer" : "UPI / QR"}
            </span>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] px-3.5">
            <Row label="Customer" value={order.user?.name || "—"} />
            <Row label="Email" value={order.user?.email || "—"} />
            {order.user?.phone && <Row label="Phone" value={order.user.phone} />}
            <Row label="Plan" value={`${order.planName || "—"} · ${order.billingCycle}`} />
            <Row label={order.gateway === "razorpay" ? "Payment ID" : "Reference (UTR)"} value={order.reference} mono />
            <Row label="Created" value={fmt(order.createdAt)} />
            {order.verifiedAt && <Row label="Verified" value={fmt(order.verifiedAt)} />}
            {order.adminNote && <Row label="Note" value={<span className="text-red-500">{order.adminNote}</span>} />}
          </div>

          {order.gateway === "razorpay" && order.status === "verified" && (
            <p className="text-[12px] text-emerald-600 bg-emerald-50 rounded-xl p-3">Auto-verified by Razorpay signature — the plan is already active.</p>
          )}
        </div>

        {canManage && order.status === "pending" && (
          <div className="border-t border-[#F1F5F9] p-4 space-y-2">
            {rejecting ? (
              <>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)"
                  className="h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]" />
                <div className="flex gap-2">
                  <button onClick={() => onReject?.(order.id, note || undefined)} disabled={busy} className="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-red-600 disabled:opacity-50"><X size={16} /> Confirm reject</button>
                  <button onClick={() => setRejecting(false)} className="h-11 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] font-semibold">Cancel</button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onVerify?.(order.id)} disabled={busy} className="flex-1 h-11 rounded-xl bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-600 disabled:opacity-50"><Check size={16} /> Verify & activate</button>
                <button onClick={() => setRejecting(true)} disabled={busy} className="h-11 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] font-semibold flex items-center gap-1.5 hover:bg-[#F8FAFC]"><X size={16} /> Reject</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Compute summary stats client-side from a list (reseller/customer views). */
export function computeStats(list: PaymentOrderRow[]) {
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

/** Small hook: manage filters + derived filtered list + selection in one place. */
export function useOrderTable(list: PaymentOrderRow[] | undefined) {
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
  const [selected, setSelected] = useState<PaymentOrderRow | null>(null);
  const filtered = useMemo(() => filterOrders(list || [], filters), [list, filters]);
  return { filters, setFilters, filtered, selected, setSelected };
}
