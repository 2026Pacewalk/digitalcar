import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IndianRupee, Clock, CheckCircle2, XCircle, Check, X, Save, QrCode, Landmark, Wallet,
} from "lucide-react";
import { trpc } from "@/providers/trpc";

const inr = (v: unknown) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (s: string | Date | null) => { if (!s) return "—"; const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s); return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

export default function AdminPayments() {
  const utils = trpc.useUtils();
  const { data: orders } = trpc.payment.adminOrders.useQuery();
  const { data: config } = trpc.payment.getConfig.useQuery();
  const verifyMut = trpc.payment.verifyOrder.useMutation();
  const rejectMut = trpc.payment.rejectOrder.useMutation();
  const setConfig = trpc.payment.setConfig.useMutation();

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (config) setForm({}); }, [config]);
  const v = (k: string) => (form[k] !== undefined ? form[k] : String((config as Record<string, string> | undefined)?.[k] ?? ""));
  const set = (k: string, val: string) => setForm((f) => ({ ...f, [k]: val }));

  const list = orders || [];
  const pending = list.filter((o) => o.status === "pending");
  const refresh = () => utils.payment.adminOrders.invalidate();

  const verify = async (id: number) => { try { await verifyMut.mutateAsync({ id }); toast.success("Payment verified — plan activated"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  const reject = async (id: number) => { const note = prompt("Reason for rejection (optional):") ?? undefined; try { await rejectMut.mutateAsync({ id, note: note || undefined }); toast.success("Payment rejected"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  const saveConfig = async () => { try { await setConfig.mutateAsync({ upiId: v("upiId"), upiName: v("upiName"), upiQr: v("upiQr"), bankName: v("bankName"), bankAccount: v("bankAccount"), bankIfsc: v("bankIfsc"), bankHolder: v("bankHolder"), note: v("note") }); toast.success("Payment details saved"); utils.payment.getConfig.invalidate(); utils.payment.instructions.invalidate(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };

  const fld = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]";

  const stats = [
    { label: "Pending", value: pending.length, icon: Clock, bg: "#FEF3C7", fg: "#D97706" },
    { label: "Verified", value: list.filter((o) => o.status === "verified").length, icon: CheckCircle2, bg: "#DCFCE7", fg: "#16A34A" },
    { label: "Rejected", value: list.filter((o) => o.status === "rejected").length, icon: XCircle, bg: "#FEE2E2", fg: "#DC2626" },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Payments" subtitle="Verify manual payments and manage where users pay" /></div>
      <div className="p-4 sm:p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={19} style={{ color: s.fg }} /></div>
              <div><p className="text-xl font-bold text-[#0F172A] leading-none">{s.value}</p><p className="text-[11px] text-[#64748B] mt-1">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Payment details config */}
        <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Wallet size={20} className="text-[#D97706]" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-[#0F172A]">Where users pay</p><p className="text-[12px] text-[#64748B]">These UPI / bank details are shown to users at checkout.</p></div>
            <button onClick={saveConfig} disabled={setConfig.isPending} className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] disabled:opacity-50 shrink-0"><Save size={15} /> Save</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5"><QrCode size={13} /> UPI</p>
              <div className="space-y-2">
                <input value={v("upiId")} onChange={(e) => set("upiId", e.target.value)} placeholder="UPI ID (name@bank)" className={fld} />
                <input value={v("upiName")} onChange={(e) => set("upiName", e.target.value)} placeholder="Payee name" className={fld} />
                <input value={v("upiQr")} onChange={(e) => set("upiQr", e.target.value)} placeholder="QR image URL (optional — auto-generated if blank)" className={fld} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5"><Landmark size={13} /> Bank</p>
              <div className="space-y-2">
                <input value={v("bankHolder")} onChange={(e) => set("bankHolder", e.target.value)} placeholder="Account holder" className={fld} />
                <input value={v("bankAccount")} onChange={(e) => set("bankAccount", e.target.value)} placeholder="Account number" className={fld} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={v("bankIfsc")} onChange={(e) => set("bankIfsc", e.target.value)} placeholder="IFSC" className={fld} />
                  <input value={v("bankName")} onChange={(e) => set("bankName", e.target.value)} placeholder="Bank name" className={fld} />
                </div>
              </div>
            </div>
          </div>
          <textarea value={v("note")} onChange={(e) => set("note", e.target.value)} placeholder="Instructions shown to users (optional)" rows={2} className="mt-3 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#F7B31C]" />
        </div>

        {/* Orders */}
        <div>
          <p className="text-sm font-semibold text-[#0F172A] mb-1">Payment orders</p>
          <p className="text-[12px] text-[#64748B] mb-3">Verify to activate the user's plan, or reject if the reference doesn't match.</p>
          {list.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
              <IndianRupee size={26} className="mx-auto text-[#CBD5E1] mb-2" />
              <p className="text-sm font-semibold text-[#0F172A]">No payments yet</p>
              <p className="text-xs text-[#94A3B8] mt-1">User payment submissions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {list.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-[#0F172A]">{inr(o.amount)}</p>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">{o.method}</span>
                        <span className="text-[12px] text-[#64748B]">{o.planName} · {o.billingCycle}</span>
                      </div>
                      <p className="text-[12px] text-[#0F172A] mt-0.5">{o.user?.name} <span className="text-[#94A3B8]">· {o.user?.email}</span></p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Ref <b className="text-[#334155]">{o.reference}</b> · {fmt(o.createdAt)}</p>
                      {o.adminNote && <p className="text-[11px] text-red-500 mt-0.5">Note: {o.adminNote}</p>}
                    </div>
                    <div className="shrink-0">
                      {o.status === "pending" ? (
                        <div className="flex gap-2">
                          <button onClick={() => verify(o.id)} disabled={verifyMut.isPending} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-600 disabled:opacity-50"><Check size={15} /> Verify</button>
                          <button onClick={() => reject(o.id)} disabled={rejectMut.isPending} className="h-9 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] text-sm font-semibold flex items-center gap-1.5 hover:bg-[#F8FAFC] disabled:opacity-50"><X size={15} /> Reject</button>
                        </div>
                      ) : o.status === "verified" ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={14} /> Verified · {fmt(o.verifiedAt)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-500"><XCircle size={14} /> Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
