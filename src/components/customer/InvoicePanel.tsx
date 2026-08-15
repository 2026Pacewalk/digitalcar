import { useState } from "react";
import { ReceiptText, Info, Eye, Printer, X, BadgeCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Panel } from "@/components/customer/ModuleShell";
import type { CustomerRecord } from "@/hooks/useCustomer";

/* ── DigitalCarda seller identity shown on every invoice ── */
const SELLER = {
  name: "DigitalCarda",
  tagline: "Smart Digital Business Cards",
  address: "MG Road, Bengaluru, Karnataka 560001, India",
  email: "hello@digitalcarda.in",
  phone: "+91 98765 43210",
  gstin: "29AAACD1234F1Z5",
  website: "digitalcarda.in",
};

type Inv = {
  id: number;
  invoiceNumber: string;
  amount: string;          // taxable value
  taxAmount: string;       // 18% GST component
  totalAmount: string;     // grand total (paid)
  status: string;
  paidAt: string | Date | null;
  createdAt: string | Date;
  gateway: string | null;
  subscription?: { billingCycle?: string; package?: { name?: string } | null } | null;
};

const inr = (v: unknown) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string | Date | null) => {
  if (!s) return "—";
  const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* Printable HTML for the browser's Print / Save-as-PDF dialog */
function invoiceHtml(inv: Inv, buyer: CustomerRecord): string {
  const plan = inv.subscription?.package?.name || "Subscription Plan";
  const cycle = inv.subscription?.billingCycle === "yearly" ? "Yearly" : "Monthly";
  const cgst = (Number(inv.taxAmount) / 2).toFixed(2);
  const esc = (v: unknown) => String(v ?? "").replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${inv.invoiceNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
    body{padding:40px;color:#0F172A;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F7B31C;padding-bottom:18px}
    .brand{font-size:24px;font-weight:800}.brand span{color:#F7B31C}
    .muted{color:#64748B;font-size:11px;line-height:1.6}
    .tag{display:inline-block;background:#DCFCE7;color:#16A34A;font-weight:700;font-size:11px;padding:4px 12px;border-radius:99px;margin-top:6px}
    h2{font-size:15px;margin:22px 0 4px}
    .cols{display:flex;justify-content:space-between;gap:24px;margin-top:18px}
    .col{flex:1}.col b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94A3B8;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-top:22px}
    th{background:#0F172A;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:10px 12px;text-align:left}
    th:last-child,td:last-child{text-align:right}
    td{padding:12px;border-bottom:1px solid #F1F5F9}
    .totals{margin-left:auto;width:280px;margin-top:14px}
    .totals div{display:flex;justify-content:space-between;padding:6px 12px;font-size:13px}
    .grand{background:#FEF3C7;font-weight:800;border-radius:8px;font-size:15px !important;padding:10px 12px !important}
    .foot{margin-top:36px;border-top:1px solid #E2E8F0;padding-top:14px;text-align:center}
  </style></head><body>
    <div class="head">
      <div>
        <p class="brand">Digital<span>Carda</span></p>
        <p class="muted">${SELLER.tagline}<br>${SELLER.address}<br>${SELLER.email} · ${SELLER.phone}<br><b>GSTIN:</b> ${SELLER.gstin}</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:20px;font-weight:800;letter-spacing:.02em">TAX INVOICE</p>
        <p class="muted" style="margin-top:6px"><b>${esc(inv.invoiceNumber)}</b><br>Date: ${fmtDate(inv.paidAt || inv.createdAt)}</p>
        <span class="tag">✓ PAID</span>
      </div>
    </div>
    <div class="cols">
      <div class="col"><b>Billed To</b>
        <p style="font-weight:700">${esc(buyer.company_name || buyer.name)}</p>
        <p class="muted">${esc(buyer.name)}${buyer.address ? `<br>${esc(buyer.address)}` : ""}${buyer.email ? `<br>${esc(buyer.email)}` : ""}${buyer.mobile1 ? `<br>${esc(buyer.mobile1)}` : ""}${buyer.gst ? `<br><b>GSTIN:</b> ${esc(buyer.gst)}` : ""}</p>
      </div>
      <div class="col" style="text-align:right"><b>Payment</b>
        <p class="muted">Method: ${esc((inv.gateway || "online").toUpperCase())}<br>Currency: INR<br>Status: Paid on ${fmtDate(inv.paidAt || inv.createdAt)}</p>
      </div>
    </div>
    <table>
      <tr><th>Description</th><th>Billing</th><th>Amount</th></tr>
      <tr><td><b>${esc(plan)}</b> — DigitalCarda subscription</td><td>${cycle}</td><td>${inr(inv.amount)}</td></tr>
    </table>
    <div class="totals">
      <div><span class="muted">Taxable value</span><span>${inr(inv.amount)}</span></div>
      <div><span class="muted">CGST @ 9%</span><span>${inr(cgst)}</span></div>
      <div><span class="muted">SGST @ 9%</span><span>${inr(cgst)}</span></div>
      <div class="grand"><span>Total (incl. 18% GST)</span><span>${inr(inv.totalAmount)}</span></div>
    </div>
    <div class="foot muted">This is a computer-generated invoice from ${SELLER.website} and does not require a signature.<br>Thank you for choosing DigitalCarda!</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
  </body></html>`;
}

export default function InvoicePanel({ buyer }: { buyer: CustomerRecord }) {
  const { data: invoices } = trpc.subscription.invoices.useQuery(undefined, { retry: false });
  const [view, setView] = useState<Inv | null>(null);
  const list = (invoices as Inv[] | undefined) || [];

  const printInvoice = (inv: Inv) => {
    const w = window.open("", "_blank", "width=820,height=980");
    if (!w) { toast.error("Allow popups to print the invoice"); return; }
    w.document.write(invoiceHtml(inv, buyer));
    w.document.close();
  };

  return (
    <Panel title="My Invoices" subtitle="GST invoices for your plan payments — view or download anytime">
      {list.length === 0 ? (
        <>
          <div className="flex items-start gap-3 rounded-xl bg-[#FEF3C7]/60 border border-[#FDE68A] px-4 py-3 mb-4">
            <Info size={16} className="text-[#B45309] mt-0.5 shrink-0" />
            <p className="text-xs text-[#92400E] leading-relaxed">A GST invoice (18%) is generated automatically the moment you purchase a plan. Once you upgrade, it will appear here to view, print, or save as PDF.</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#F1F5F9] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><ReceiptText size={24} className="text-[#94A3B8]" /></div>
            <p className="text-sm font-medium text-[#0F172A]">No invoices yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">Purchase a plan and your invoice will appear here instantly.</p>
          </div>
        </>
      ) : (
        <div className="space-y-2.5">
          {list.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 bg-white rounded-2xl border border-[#F1F5F9] hover:border-[#F7B31C]/40 hover:shadow-premium transition-all px-4 py-3">
              <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><FileText size={17} className="text-[#D97706]" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-[#0F172A] truncate">{inv.invoiceNumber}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase"><BadgeCheck size={10} /> {inv.status}</span>
                </div>
                <p className="text-[11px] text-[#64748B] truncate">{inv.subscription?.package?.name || "Plan"} · {fmtDate(inv.paidAt || inv.createdAt)} · incl. 18% GST</p>
              </div>
              <p className="text-[14px] font-extrabold text-[#0F172A] tabular-nums shrink-0">{inr(inv.totalAmount)}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setView(inv)} title="View" className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] transition-colors"><Eye size={15} /></button>
                <button onClick={() => printInvoice(inv)} title="Print / PDF" className="w-8 h-8 rounded-lg hover:bg-[#FEF3C7] flex items-center justify-center text-[#D97706] transition-colors"><Printer size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invoice detail modal ── */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setView(null)} />
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Gold header */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#172033] to-[#1E293B] px-5 py-4 relative overflow-hidden shrink-0">
              <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-[#F7B31C]/20 blur-2xl pointer-events-none" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-lg font-extrabold text-white">Digital<span className="text-[#F7B31C]">Carda</span></p>
                  <p className="text-[10px] text-white/50">{SELLER.tagline} · GSTIN {SELLER.gstin}</p>
                </div>
                <button onClick={() => setView(null)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="relative flex items-center justify-between mt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Tax Invoice</p>
                  <p className="text-[14px] font-bold text-white">{view.invoiceNumber}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-300/30 uppercase"><BadgeCheck size={12} /> Paid</span>
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {/* From / To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">From</p>
                  <p className="text-[12px] font-bold text-[#0F172A]">{SELLER.name}</p>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">{SELLER.address}<br />{SELLER.email}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">Billed to</p>
                  <p className="text-[12px] font-bold text-[#0F172A] truncate">{String(buyer.company_name || buyer.name || "—")}</p>
                  <p className="text-[10px] text-[#64748B] leading-relaxed truncate">{String(buyer.name || "")}<br />{String(buyer.email || "")}{buyer.gst ? <><br />GSTIN: {String(buyer.gst)}</> : null}</p>
                </div>
              </div>

              {/* Line item */}
              <div className="mt-4 rounded-xl border border-[#F1F5F9] overflow-hidden">
                <div className="bg-[#0F172A] px-3.5 py-2 flex justify-between text-[9px] font-bold uppercase tracking-wider text-white/70">
                  <span>Description</span><span>Amount</span>
                </div>
                <div className="px-3.5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-[#0F172A]">{view.subscription?.package?.name || "Subscription Plan"}</p>
                    <p className="text-[10px] text-[#94A3B8]">{view.subscription?.billingCycle === "yearly" ? "Yearly" : "Monthly"} · {fmtDate(view.paidAt || view.createdAt)}</p>
                  </div>
                  <p className="text-[13px] font-bold text-[#0F172A] tabular-nums">{inr(view.amount)}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-[#64748B] px-1"><span>Taxable value</span><span className="tabular-nums">{inr(view.amount)}</span></div>
                <div className="flex justify-between text-[11px] text-[#64748B] px-1"><span>CGST @ 9%</span><span className="tabular-nums">{inr(Number(view.taxAmount) / 2)}</span></div>
                <div className="flex justify-between text-[11px] text-[#64748B] px-1"><span>SGST @ 9%</span><span className="tabular-nums">{inr(Number(view.taxAmount) / 2)}</span></div>
                <div className="flex justify-between items-center rounded-xl bg-[#FEF3C7] px-3 py-2.5 mt-2">
                  <span className="text-[12px] font-bold text-[#92400E]">Total (incl. 18% GST)</span>
                  <span className="text-[16px] font-extrabold text-[#0F172A] tabular-nums">{inr(view.totalAmount)}</span>
                </div>
              </div>

              <button onClick={() => printInvoice(view)} className="w-full h-11 mt-4 gradient-gold text-[#0F172A] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98]">
                <Printer size={16} /> Print / Save as PDF
              </button>
              <p className="text-[9px] text-[#94A3B8] text-center mt-2">Computer-generated invoice · no signature required</p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
