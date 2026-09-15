import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Inbox, Loader2, Nfc } from "lucide-react";
import { NFC_DELIVERY, nfcProduct } from "@/lib/nfcProducts";

type Status = "pending_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";

const STATUS: { id: Status; label: string; cls: string }[] = [
  { id: "paid", label: "Paid — to print", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "in_production", label: "Printing", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "shipped", label: "Shipped", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "delivered", label: "Delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "pending_payment", label: "Awaiting payment", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  { id: "cancelled", label: "Cancelled", cls: "bg-red-50 text-red-600 border-red-200" },
];
const statusOf = (s: string) => STATUS.find((x) => x.id === s) ?? STATUS[4];

const inr = (n: unknown) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const fmt = (d: unknown) => {
  const t = new Date(String(d || ""));
  return isNaN(t.getTime()) ? "—" : t.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

type Filter = "open" | Status | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "To fulfil" },
  { id: "paid", label: "Paid" },
  { id: "in_production", label: "Printing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "pending_payment", label: "Awaiting payment" },
  { id: "all", label: "All" },
];

export default function AdminNfcOrders() {
  const { data, isLoading, refetch } = trpc.nfc.list.useQuery();
  const update = trpc.nfc.update.useMutation();
  const [filter, setFilter] = useState<Filter>("open");
  const [tracking, setTracking] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const rows = data ?? [];
  const stats = useMemo(() => {
    const paidLike = rows.filter((r) => ["paid", "in_production", "shipped", "delivered"].includes(r.status));
    return {
      toPrint: rows.filter((r) => r.status === "paid").length,
      printing: rows.filter((r) => r.status === "in_production").length,
      shipped: rows.filter((r) => r.status === "shipped").length,
      revenue: paidLike.reduce((n, r) => n + Number(r.amount || 0), 0),
    };
  }, [rows]);

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "open" ? ["paid", "in_production", "shipped"].includes(r.status) : r.status === filter,
  );

  const save = async (id: number, status: Status, trackingValue?: string) => {
    setSaving(id);
    try {
      await update.mutateAsync({ id, status, ...(trackingValue !== undefined ? { tracking: trackingValue } : {}) });
      toast.success(status === "shipped" ? "Marked shipped — the customer has been emailed" : `Order #${id} updated`);
      await refetch();
    } catch {
      toast.error("Could not update the order");
    } finally {
      setSaving(null);
    }
  };

  const copy = async (textValue: string) => {
    try { await navigator.clipboard.writeText(textValue); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-[#F7B31C]"><Nfc size={20} /></span>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">NFC Orders</h1>
            <p className="text-[13px] text-[#64748B]">Printed NFC cards and standees · promised delivery {NFC_DELIVERY.label}, free</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Paid — to print", value: stats.toPrint },
            { label: "Printing", value: stats.printing },
            { label: "Shipped", value: stats.shipped },
            { label: "Paid revenue", value: inr(stats.revenue) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
              <p className="text-[12px] text-[#64748B]">{s.label}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0F172A]">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`h-9 rounded-xl px-3.5 text-[13px] font-semibold transition-colors ${filter === f.id ? "bg-[#0F172A] text-white" : "bg-white text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading orders…</div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-12 text-center shadow-premium">
            <Inbox size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm text-[#64748B]">No orders here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {shown.map((o) => {
              const p = nfcProduct(o.product);
              const st = statusOf(o.status);
              const address = [o.shipName, o.shipPhone, o.shipLine1, o.shipLine2, `${o.shipCity}, ${o.shipState} ${o.shipPincode}`].filter(Boolean).join("\n");
              const trackingValue = tracking[o.id] ?? o.tracking ?? "";
              return (
                <li key={o.id} className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-[#0F172A]">#{o.id} · {o.quantity} × {p?.name ?? o.product} <span className="font-semibold text-[#64748B]">· {inr(o.amount)}</span></p>
                      <p className="text-[12px] text-[#64748B]">
                        {fmt(o.createdAt)}{o.customer ? ` · ${o.customer.fullName} (${o.customer.email})` : ""}
                        {o.razorpayPaymentId ? ` · Payment ${o.razorpayPaymentId}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      <select value={o.status} disabled={saving === o.id} onChange={(e) => save(o.id, e.target.value as Status)}
                        aria-label={`Status of order ${o.id}`} className="h-9 rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-[13px] font-semibold text-[#0F172A]">
                        {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Print · {p?.print}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#0F172A]">{o.printName}</p>
                      {o.printTitle && <p className="text-[12.5px] text-[#475569]">{o.printTitle}</p>}
                      {o.printCompany && <p className="text-[12.5px] text-[#475569]">{o.printCompany}</p>}
                      {o.printPhone && <p className="text-[12.5px] text-[#475569]">{o.printPhone}</p>}
                      {o.logoUrl
                        ? <a href={o.logoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#B45309] hover:underline">Logo <ExternalLink size={11} /></a>
                        : <p className="mt-1 text-[12px] text-[#94A3B8]">No logo on the card</p>}
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">NFC chip + QR open</p>
                      <a href={o.cardUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-[13px] font-semibold text-[#0F172A] hover:underline">{o.cardUrl} <ExternalLink size={11} /></a>
                      <button type="button" onClick={() => copy(o.cardUrl)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#475569] hover:text-[#0F172A]"><Copy size={12} /> Copy link</button>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Ship to</p>
                      <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-[#334155]">{address}</p>
                      <button type="button" onClick={() => copy(address)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#475569] hover:text-[#0F172A]"><Copy size={12} /> Copy address</button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input value={trackingValue} onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                      placeholder="Courier and tracking number" aria-label={`Tracking for order ${o.id}`}
                      className="h-10 flex-1 rounded-xl border border-[#E2E8F0] px-3 text-[13px] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30" />
                    <button type="button" disabled={saving === o.id} onClick={() => save(o.id, o.status as Status, trackingValue)}
                      className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#E2E8F0]">Save tracking</button>
                    {o.status !== "shipped" && o.status !== "delivered" && (
                      <button type="button" disabled={saving === o.id} onClick={() => save(o.id, "shipped", trackingValue)}
                        className="h-10 rounded-xl bg-[#0F172A] px-4 text-[13px] font-bold text-white hover:bg-[#1E293B]">Mark shipped & email customer</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
