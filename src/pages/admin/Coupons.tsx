import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { trpc } from "@/providers/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, Plus, TicketPercent, Trash2, X } from "lucide-react";

type Cycle = "monthly" | "yearly" | "triennial";
const CYCLES: { id: Cycle; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "triennial", label: "3-Year" },
];

const inr = (n: unknown) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const toLocalInput = (d: unknown) => {
  if (!d) return "";
  const t = new Date(String(d));
  if (isNaN(t.getTime())) return "";
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const day = (d: unknown) => (d ? new Date(String(d)).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

type Form = {
  id?: number; code: string; description: string; discountType: "percent" | "flat"; discountValue: string;
  maxDiscount: string; minAmount: string; validFrom: string; validUntil: string; usageLimit: string;
  perUserLimit: string; planIds: number[]; cycles: Cycle[]; active: boolean;
};
const EMPTY: Form = {
  code: "", description: "", discountType: "percent", discountValue: "", maxDiscount: "", minAmount: "",
  validFrom: "", validUntil: "", usageLimit: "", perUserLimit: "1", planIds: [], cycles: [], active: true,
};

type Row = {
  id: number; code: string; description: string | null; discountType: "percent" | "flat"; discountValue: string;
  maxDiscount: string | null; minAmount: string | null; validFrom: Date | null; validUntil: Date | null;
  usageLimit: number | null; perUserLimit: number; planIds: string | null; cycles: string | null; active: boolean;
  uses: number; pendingUses: number; revenue: number; discounted: number;
};

function statusOf(c: Row) {
  if (!c.active) return { label: "Off", cls: "bg-slate-100 text-slate-600" };
  const now = Date.now();
  if (c.validFrom && new Date(c.validFrom).getTime() > now) return { label: "Scheduled", cls: "bg-blue-50 text-blue-700" };
  if (c.validUntil && new Date(c.validUntil).getTime() < now) return { label: "Expired", cls: "bg-red-50 text-red-600" };
  if (c.usageLimit && c.uses + c.pendingUses >= c.usageLimit) return { label: "Used up", cls: "bg-amber-50 text-amber-700" };
  return { label: "Live", cls: "bg-emerald-50 text-emerald-700" };
}

const discountLabel = (c: { discountType: string; discountValue: string | number; maxDiscount: string | number | null }) =>
  c.discountType === "percent"
    ? `${Number(c.discountValue)}% off${c.maxDiscount ? ` · up to ${inr(c.maxDiscount)}` : ""}`
    : `${inr(c.discountValue)} off`;

const input = "h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30";

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#475569]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

export default function AdminCoupons() {
  const { data, isLoading, refetch } = trpc.coupon.list.useQuery();
  const save = trpc.coupon.save.useMutation();
  const setActive = trpc.coupon.setActive.useMutation();
  const remove = trpc.coupon.remove.useMutation();
  const [form, setForm] = useState<Form | null>(null);

  const coupons = (data?.coupons ?? []) as unknown as Row[];
  const plans = data?.plans ?? [];
  const planName = (id: number) => plans.find((p) => p.id === id)?.name ?? `#${id}`;

  const stats = useMemo(() => ({
    live: coupons.filter((c) => statusOf(c).label === "Live").length,
    uses: coupons.reduce((n, c) => n + c.uses, 0),
    revenue: coupons.reduce((n, c) => n + c.revenue, 0),
    discounted: coupons.reduce((n, c) => n + c.discounted, 0),
  }), [coupons]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (c: Row) => setForm({
    id: c.id, code: c.code, description: c.description ?? "", discountType: c.discountType,
    discountValue: String(Number(c.discountValue)), maxDiscount: c.maxDiscount ? String(Number(c.maxDiscount)) : "",
    minAmount: c.minAmount ? String(Number(c.minAmount)) : "", validFrom: toLocalInput(c.validFrom), validUntil: toLocalInput(c.validUntil),
    usageLimit: c.usageLimit ? String(c.usageLimit) : "", perUserLimit: String(c.perUserLimit ?? 1),
    planIds: String(c.planIds || "").split(",").filter(Boolean).map(Number),
    cycles: String(c.cycles || "").split(",").filter(Boolean) as Cycle[], active: !!c.active,
  });

  const errMsg = (e: unknown) => {
    const m = e instanceof Error ? e.message : "";
    return m && !m.trim().startsWith("[") ? m : "Please check the coupon details.";
  };

  const submit = async () => {
    if (!form) return;
    const value = Number(form.discountValue);
    if (!form.code.trim()) return toast.error("Add a coupon code");
    if (!(value > 0)) return toast.error("Add the discount amount");
    const num = (v: string) => (v.trim() ? Number(v) : null);
    try {
      await save.mutateAsync({
        id: form.id, code: form.code, description: form.description || undefined,
        discountType: form.discountType, discountValue: value,
        maxDiscount: num(form.maxDiscount), minAmount: num(form.minAmount),
        validFrom: form.validFrom ? new Date(form.validFrom) : null,
        validUntil: form.validUntil ? new Date(form.validUntil) : null,
        usageLimit: num(form.usageLimit), perUserLimit: Number(form.perUserLimit || 0),
        planIds: form.planIds, cycles: form.cycles, active: form.active,
      });
      toast.success(form.id ? "Coupon updated" : "Coupon created");
      setForm(null);
      await refetch();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const toggle = async (c: Row) => {
    try { await setActive.mutateAsync({ id: c.id, active: !c.active }); await refetch(); }
    catch { toast.error("Could not update the coupon"); }
  };

  const del = async (c: Row) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    try {
      const r = await remove.mutateAsync({ id: c.id });
      toast.success(r.deleted ? "Coupon deleted" : "This coupon has been used, so it was switched off instead of deleted");
      await refetch();
    } catch { toast.error("Could not delete the coupon"); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-[#F7B31C]"><TicketPercent size={20} /></span>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Coupons</h1>
              <p className="text-[13px] text-[#64748B]">Discounts on plan upgrades — never on add-ons, NFC products or domains</p>
            </div>
          </div>
          <button type="button" onClick={() => setForm({ ...EMPTY })}
            className="gradient-gold inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-bold text-[#0F172A] hover:shadow-gold">
            <Plus size={16} /> New coupon
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Live coupons", value: stats.live },
            { label: "Paid uses", value: stats.uses },
            { label: "Revenue with coupons", value: inr(stats.revenue) },
            { label: "Discount given", value: inr(stats.discounted) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium">
              <p className="text-[12px] text-[#64748B]">{s.label}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0F172A]">{s.value}</p>
            </div>
          ))}
        </div>

        {form && (
          <section className="rounded-2xl border border-[#FDE68A] bg-white p-5 shadow-premium">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0F172A]">{form.id ? `Edit ${form.code}` : "New coupon"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><X size={18} /></button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Labeled label="Code" hint="Customers type this at checkout, e.g. DIWALI25">
                <input className={`${input} font-mono font-bold uppercase tracking-wider`} value={form.code} maxLength={40}
                  onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} />
              </Labeled>
              <Labeled label="Description" hint="For your team and the offer popup">
                <input className={input} value={form.description} maxLength={255} onChange={(e) => set("description", e.target.value)} placeholder="Diwali 2026 festive offer" />
              </Labeled>
              <Labeled label="Discount">
                <div className="flex gap-2">
                  <div className="inline-flex shrink-0 rounded-xl bg-[#F1F5F9] p-1">
                    {(["percent", "flat"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => set("discountType", t)} aria-pressed={form.discountType === t}
                        className={`h-8 rounded-lg px-3 text-[12.5px] font-bold ${form.discountType === t ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}>
                        {t === "percent" ? "%" : "₹"}
                      </button>
                    ))}
                  </div>
                  <input className={input} inputMode="decimal" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder={form.discountType === "percent" ? "25" : "200"} />
                </div>
              </Labeled>
              {form.discountType === "percent" && (
                <Labeled label="Maximum discount (₹)" hint="Optional cap, e.g. up to ₹500">
                  <input className={input} inputMode="numeric" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value.replace(/\D/g, ""))} />
                </Labeled>
              )}
              <Labeled label="Minimum purchase (₹)" hint="Optional">
                <input className={input} inputMode="numeric" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value.replace(/\D/g, ""))} />
              </Labeled>
              <Labeled label="Valid from" hint="Leave empty to start now">
                <input type="datetime-local" className={input} value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
              </Labeled>
              <Labeled label="Valid until" hint="Leave empty for no end date">
                <input type="datetime-local" className={input} value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
              </Labeled>
              <Labeled label="Total uses allowed" hint="Leave empty for unlimited">
                <input className={input} inputMode="numeric" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value.replace(/\D/g, ""))} />
              </Labeled>
              <Labeled label="Uses per customer" hint="0 means no per-customer limit">
                <input className={input} inputMode="numeric" value={form.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value.replace(/\D/g, ""))} />
              </Labeled>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11.5px] font-semibold text-[#475569]">Plans <span className="font-normal text-[#94A3B8]">— none ticked means every plan</span></p>
                <div className="flex flex-wrap gap-2">
                  {plans.map((p) => {
                    const on = form.planIds.includes(p.id);
                    return (
                      <button key={p.id} type="button" aria-pressed={on}
                        onClick={() => set("planIds", on ? form.planIds.filter((x) => x !== p.id) : [...form.planIds, p.id])}
                        className={`h-9 rounded-xl px-3 text-[13px] font-semibold ring-1 ${on ? "bg-[#0F172A] text-white ring-[#0F172A]" : "bg-white text-[#475569] ring-[#E2E8F0]"}`}>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11.5px] font-semibold text-[#475569]">Billing terms <span className="font-normal text-[#94A3B8]">— none ticked means all</span></p>
                <div className="flex flex-wrap gap-2">
                  {CYCLES.map((c) => {
                    const on = form.cycles.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on}
                        onClick={() => set("cycles", on ? form.cycles.filter((x) => x !== c.id) : [...form.cycles, c.id])}
                        className={`h-9 rounded-xl px-3 text-[13px] font-semibold ring-1 ${on ? "bg-[#0F172A] text-white ring-[#0F172A]" : "bg-white text-[#475569] ring-[#E2E8F0]"}`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#334155]">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#F7B31C]" />
                Active
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl bg-[#F1F5F9] px-4 text-[13px] font-semibold text-[#334155]">Cancel</button>
                <button type="button" onClick={submit} disabled={save.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-[13px] font-bold text-white disabled:opacity-60">
                  {save.isPending && <Loader2 size={15} className="animate-spin" />} {form.id ? "Save changes" : "Create coupon"}
                </button>
              </div>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-[#F1F5F9] bg-white p-12 text-center shadow-premium">
            <TicketPercent size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm font-semibold text-[#0F172A]">No coupons yet</p>
            <p className="mt-1 text-[13px] text-[#64748B]">Create one for your next festival sale, then feature it in an offer popup.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {coupons.map((c) => {
              const st = statusOf(c);
              const planIds = String(c.planIds || "").split(",").filter(Boolean).map(Number);
              const cycles = String(c.cycles || "").split(",").filter(Boolean);
              return (
                <li key={c.id} className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border-2 border-dashed border-[#CBD5E1] px-2.5 py-0.5 font-mono text-[15px] font-extrabold tracking-wider text-[#0F172A]">{c.code}</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(c.code).then(() => toast.success("Code copied"))} aria-label={`Copy ${c.code}`}
                          className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><Copy size={14} /></button>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="mt-1.5 text-[14px] font-bold text-[#0F172A]">{discountLabel(c)}</p>
                      {c.description && <p className="text-[12.5px] text-[#64748B]">{c.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => toggle(c)} className={`h-9 rounded-xl px-3 text-[12.5px] font-semibold ring-1 ${c.active ? "bg-white text-[#475569] ring-[#E2E8F0]" : "bg-[#0F172A] text-white ring-[#0F172A]"}`}>
                        {c.active ? "Switch off" : "Switch on"}
                      </button>
                      <button type="button" onClick={() => edit(c)} aria-label={`Edit ${c.code}`} className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"><Pencil size={15} /></button>
                      <button type="button" onClick={() => del(c)} aria-label={`Delete ${c.code}`} className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-4">
                    <div><dt className="text-[#94A3B8]">Valid</dt><dd className="font-medium text-[#334155]">{c.validFrom ? day(c.validFrom) : "Now"} → {c.validUntil ? day(c.validUntil) : "No end"}</dd></div>
                    <div><dt className="text-[#94A3B8]">Used</dt><dd className="font-medium text-[#334155]">{c.uses}{c.pendingUses ? ` (+${c.pendingUses} awaiting payment)` : ""}{c.usageLimit ? ` of ${c.usageLimit}` : ""} · {c.perUserLimit ? `${c.perUserLimit} per customer` : "no per-customer limit"}</dd></div>
                    <div><dt className="text-[#94A3B8]">Applies to</dt><dd className="font-medium text-[#334155]">{planIds.length ? planIds.map(planName).join(", ") : "All plans"} · {cycles.length ? cycles.map((x) => CYCLES.find((y) => y.id === x)?.label ?? x).join(", ") : "all terms"}{c.minAmount ? ` · min ${inr(c.minAmount)}` : ""}</dd></div>
                    <div><dt className="text-[#94A3B8]">Revenue / discount</dt><dd className="font-medium text-[#334155]">{inr(c.revenue)} / {inr(c.discounted)}</dd></div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
