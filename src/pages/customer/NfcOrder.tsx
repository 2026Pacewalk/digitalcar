/*
 * /dashboard/nfc — order a printed NFC PVC card or NFC standee.
 *
 * The preview is built from the customer's own card (name, role, company, logo
 * and a QR of their live card link), so they see what will be printed before
 * paying. Prices come from src/lib/nfcProducts.ts, and the server charges from
 * the same table — the amount shown here is only a display.
 */
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle, Check, CheckCircle2, Loader2, MapPin, Minus, Nfc, PackageCheck, Plus, Printer,
  ScanLine, ShieldCheck, Sparkles, Truck, X,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useCustomer } from "@/hooks/useCustomer";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { NFC_DELIVERY, NFC_MAX_QTY, NFC_PRODUCTS, type NfcProductId } from "@/lib/nfcProducts";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const qrFor = (url: string, size = 240) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(url)}`;

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const field = "h-11 w-full rounded-xl border bg-white px-3.5 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-shadow focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/30";

/* Working days (Monday–Saturday) from today, for a delivery window people can plan around. */
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}
const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Field({ label, error, required, children, wide }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11.5px] font-semibold text-[#475569]">{label}{required && <span className="text-[#DC2626]"> *</span>}</span>
      {children}
      {error && <span className="mt-1 block text-[11.5px] font-medium text-[#DC2626]">{error}</span>}
    </label>
  );
}

function CardPreview({ name, title, company, logo, cardUrl }: { name: string; title: string; company: string; logo: string; cardUrl: string | null }) {
  const initial = (company || name || "D").trim().charAt(0).toUpperCase();
  return (
    <div className="grid w-full max-w-[380px] grid-cols-2 gap-3">
      <figure>
        <div className="relative aspect-[1.586] overflow-hidden rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1120] p-3 text-white shadow-lg ring-1 ring-black/10">
          <span aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#F7B31C]/25 blur-2xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              {logo
                ? <img src={logo} alt="" className="h-6 max-w-[65%] rounded bg-white/95 object-contain p-0.5" />
                : <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F7B31C] text-[12px] font-bold text-[#0F172A]">{initial}</span>}
              <Nfc size={16} className="shrink-0 text-[#F7B31C]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold leading-tight">{name || "Your name"}</p>
              {title && <p className="truncate text-[9px] text-white/70">{title}</p>}
              {company && <p className="truncate text-[9px] font-semibold text-[#F7B31C]">{company}</p>}
            </div>
          </div>
        </div>
        <figcaption className="mt-1 text-center text-[10px] font-medium text-[#94A3B8]">Front</figcaption>
      </figure>
      <figure>
        <div className="flex aspect-[1.586] items-center gap-2.5 overflow-hidden rounded-xl bg-white p-3 shadow-lg ring-1 ring-[#E2E8F0]">
          {cardUrl
            ? <img src={qrFor(cardUrl, 160)} alt="" className="h-[72%] rounded" style={{ aspectRatio: "1" }} />
            : <span className="flex h-[72%] items-center justify-center rounded bg-[#F1F5F9]" style={{ aspectRatio: "1" }}><ScanLine size={16} className="text-[#94A3B8]" /></span>}
          <div className="min-w-0 text-[#0F172A]">
            <p className="text-[10px] font-bold leading-tight">Tap or scan</p>
            <p className="text-[8.5px] leading-snug text-[#64748B]">to save my contact</p>
            <p className="mt-1 truncate text-[8px] font-semibold text-[#B45309]">{cardUrl ? cardUrl.replace(/^https?:\/\//, "") : "digitalcarda.in/you"}</p>
            <p className="mt-1 text-[7px] font-bold tracking-wide text-[#94A3B8]">Powered by <span className="text-[#0F172A]">Digital<span className="text-[#D97706]">Carda</span></span></p>
          </div>
        </div>
        <figcaption className="mt-1 text-center text-[10px] font-medium text-[#94A3B8]">Back</figcaption>
      </figure>
    </div>
  );
}

function StandeePreview({ name, company, cardUrl }: { name: string; company: string; cardUrl: string | null }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-[150px] overflow-hidden rounded-b-md rounded-t-[22px] bg-white shadow-xl ring-1 ring-[#E2E8F0]">
        <div className="bg-gradient-to-br from-[#F7B31C] to-[#D97706] px-3 pb-5 pt-3 text-center">
          <p className="truncate text-[12px] font-extrabold text-[#0F172A]">{company || name || "Your business"}</p>
          <p className="text-[8px] font-semibold text-[#0F172A]/70">Tap or scan to connect</p>
        </div>
        <div className="-mt-3 px-3 pb-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2 py-0.5 text-[8px] font-bold tracking-wider text-[#F7B31C]"><Nfc size={9} /> TAP · SCAN</span>
          <div className="mx-auto mt-2 w-fit rounded-lg bg-white p-1.5 ring-1 ring-[#E2E8F0]">
            {cardUrl ? <img src={qrFor(cardUrl, 180)} alt="" className="h-20 w-20" /> : <span className="flex h-20 w-20 items-center justify-center bg-[#F1F5F9]"><ScanLine size={18} className="text-[#94A3B8]" /></span>}
          </div>
          <p className="mt-1.5 text-[8px] text-[#64748B]">Save contact · Review · Pay</p>
          <p className="mt-1 border-t border-[#F1F5F9] pt-1 text-[7.5px] font-bold tracking-wide text-[#94A3B8]">Powered by <span className="text-[#0F172A]">Digital<span className="text-[#D97706]">Carda</span></span></p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-0.5 h-2 w-[176px] rounded-full bg-[#0F172A]/80" />
    </div>
  );
}

const STEPS = [
  { id: "paid", label: "Confirmed" },
  { id: "in_production", label: "Printing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
] as const;

export default function CustomerNfcOrder() {
  const { data: card } = useCustomer();
  const { data, isLoading, refetch } = trpc.nfc.mine.useQuery(undefined, { retry: false });
  const checkout = trpc.nfc.checkout.useMutation();
  const verify = trpc.nfc.verify.useMutation();

  // Quantity per product; 0 means it isn't in this order. Card and standee can
  // be bought together — one payment, one delivery.
  const [qtys, setQtys] = useState<Record<NfcProductId, number>>({ nfc_card: 1, nfc_standee: 0 });
  // Print details start from the card and only diverge where the customer edits them.
  const [printEdits, setPrintEdits] = useState<Partial<Record<"name" | "title" | "company" | "phone", string>>>({});
  const [shipEdits, setShipEdits] = useState<Partial<Record<"name" | "phone" | "line1" | "line2" | "city" | "state" | "pincode", string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  const c = card as Record<string, unknown>;
  const s = (v: unknown) => String(v ?? "").trim();
  const printVal = {
    name: printEdits.name ?? s(c.name),
    title: printEdits.title ?? s(c.designation),
    company: printEdits.company ?? s(c.company_name),
    phone: printEdits.phone ?? s(c.mobile1),
  };
  const shipVal = {
    name: shipEdits.name ?? s(c.name),
    phone: shipEdits.phone ?? s(c.mobile1),
    line1: shipEdits.line1 ?? "",
    line2: shipEdits.line2 ?? "",
    city: shipEdits.city ?? "",
    state: shipEdits.state ?? "",
    pincode: shipEdits.pincode ?? "",
  };
  const logo = /^https:\/\//i.test(s(c.logo)) ? s(c.logo) : "";
  const cardUrl = data?.cardUrl ?? null;
  const lines = NFC_PRODUCTS.filter((p) => qtys[p.id] > 0).map((p) => ({ product: p, qty: qtys[p.id] }));
  const both = lines.length === NFC_PRODUCTS.length;
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const setQty = (id: NfcProductId, q: number) => setQtys((m) => ({ ...m, [id]: Math.min(NFC_MAX_QTY, Math.max(0, q)) }));
  // Tapping a product adds or removes it — but an order always keeps at least one.
  const toggleProduct = (id: NfcProductId) => {
    if (qtys[id] > 0) {
      if (lines.length > 1) setQty(id, 0);
    } else setQty(id, 1);
  };
  const addBoth = () => setQtys((m) => Object.fromEntries(NFC_PRODUCTS.map((p) => [p.id, Math.max(1, m[p.id])])) as Record<NfcProductId, number>);
  const itemLabel = lines.map((l) => `${l.qty} × ${l.product.name}`).join(" + ");

  const window = useMemo(() => {
    const today = new Date();
    return `${shortDate(addWorkingDays(today, NFC_DELIVERY.minDays))} – ${shortDate(addWorkingDays(today, NFC_DELIVERY.maxDays))}`;
  }, []);

  const setPrint = (k: keyof typeof printVal) => (e: React.ChangeEvent<HTMLInputElement>) => setPrintEdits((p) => ({ ...p, [k]: e.target.value }));
  const setShip = (k: keyof typeof shipVal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShipEdits((p) => ({ ...p, [k]: e.target.value }));
    setErrors((er) => { const n = { ...er }; delete n[`ship.${k}`]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!printVal.name) e["print.name"] = "Add the name to print";
    if (shipVal.name.length < 2) e["ship.name"] = "Add the recipient's name";
    if (!/^(\+?91)?[6-9]\d{9}$/.test(shipVal.phone.replace(/[\s-]/g, ""))) e["ship.phone"] = "Enter a 10-digit Indian mobile number";
    if (shipVal.line1.trim().length < 5) e["ship.line1"] = "Add house or flat number, street and area";
    if (shipVal.city.trim().length < 2) e["ship.city"] = "Add the city";
    if (!shipVal.state) e["ship.state"] = "Choose the state";
    if (!/^[1-9]\d{5}$/.test(shipVal.pincode.trim())) e["ship.pincode"] = "Enter a 6-digit PIN code";
    return e;
  };

  const friendly = (err: unknown) => {
    const m = err instanceof Error ? err.message : "";
    return m && !m.trim().startsWith("[") ? m : "Please check your details and try again.";
  };

  const placeOrder = async () => {
    if (!cardUrl) { toast.error("Publish your card first — the NFC chip and QR code open your card link."); return; }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Please fix the highlighted details."); return; }

    setPaying(true);
    try {
      const r = await checkout.mutateAsync({
        items: lines.map((l) => ({ product: l.product.id, quantity: l.qty })),
        print: { ...printVal, logoUrl: logo || undefined },
        shipping: { ...shipVal, phone: shipVal.phone.replace(/[\s-]/g, "") },
      });
      if ("manual" in r) {
        toast.success(`Order #${r.orderIds.join(" + #")} received — our team will contact you to arrange payment.`);
        setPaying(false);
        await refetch();
        return;
      }
      const rzp = await openRazorpayCheckout({
        key: r.keyId,
        amount: r.amount,
        currency: r.currency,
        order_id: r.razorpayOrderId,
        name: "DigitalCarda",
        description: itemLabel,
        prefill: r.prefill,
        theme: { color: "#F7B31C" },
        handler: async (resp) => {
          try {
            await verify.mutateAsync({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            toast.success("Payment received — your order is confirmed. Details are on their way to your email.");
            setQtys({ nfc_card: 1, nfc_standee: 0 });
            await refetch();
          } catch (err) {
            toast.error(`${friendly(err)} Payment ID: ${resp.razorpay_payment_id}`);
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", (resp) => toast.error(resp.error?.description || "The payment didn't go through. Please try again."));
    } catch (err) {
      toast.error(friendly(err));
      setPaying(false);
    }
  };

  const orders = data?.orders ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="NFC Card & Standee" subtitle="Printed NFC products that open your digital card with a tap" /></div>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">

        {/* Intro */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0B1120] p-5 text-white sm:p-6">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#F7B31C]/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#F7B31C]"><Nfc size={13} /> Take your card offline</p>
              <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">Tap a phone. Your card opens.</h2>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[#94A3B8]">
                Printed NFC products linked to your DigitalCarda link — update your card any time and they keep working, nothing to reprint.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/10"><Truck size={14} className="text-[#4ADE80]" /> Free pan-India delivery</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/10"><PackageCheck size={14} className="text-[#F7B31C]" /> {NFC_DELIVERY.label}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/10"><ShieldCheck size={14} className="text-[#38BDF8]" /> Secure payment</span>
            </div>
          </div>
        </div>

        {!isLoading && !cardUrl && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#B45309]" />
            <p className="text-[13px] text-[#92400E]">
              Your card isn't published yet. The NFC chip and QR code open your card link, so{" "}
              <Link to="/dashboard/build" className="font-semibold underline">publish your card</Link> before ordering.
            </p>
          </div>
        )}

        {/* 1 · Product */}
        <section aria-labelledby="nfc-choose">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 id="nfc-choose" className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#64748B]">1 · Choose your products</h3>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">Pick one, or add both to get them in a single order.</p>
            </div>
            {both ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 text-[12.5px] font-semibold text-[#047857] ring-1 ring-[#A7F3D0]">
                <CheckCircle2 size={14} /> Both in one order · one payment, one delivery
              </span>
            ) : (
              <button type="button" onClick={addBoth}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F172A] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]">
                <Sparkles size={14} className="text-[#F7B31C]" /> Get both · {inr(NFC_PRODUCTS.reduce((sum, p) => sum + p.price * Math.max(1, qtys[p.id]), 0))}
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {NFC_PRODUCTS.map((p) => {
              const on = qtys[p.id] > 0;
              return (
                <button key={p.id} type="button" onClick={() => toggleProduct(p.id)} aria-pressed={on}
                  className={`relative flex flex-col overflow-hidden rounded-2xl bg-white text-left transition-all ${on ? "shadow-premium ring-2 ring-[#F7B31C]" : "ring-1 ring-[#E2E8F0] hover:shadow-premium hover:ring-[#F7B31C]/60"}`}>
                  <span className={`absolute right-3 top-3 z-10 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${on ? "bg-[#F7B31C] text-[#0F172A]" : "bg-white text-[#475569] ring-1 ring-[#E2E8F0]"}`}>
                    {on ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}
                  </span>
                  <span className="flex h-[190px] items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#FFF7E6] px-5">
                    {p.id === "nfc_card"
                      ? <CardPreview name={printVal.name} title={printVal.title} company={printVal.company} logo={logo} cardUrl={cardUrl} />
                      : <StandeePreview name={printVal.name} company={printVal.company} cardUrl={cardUrl} />}
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-[15px] font-bold text-[#0F172A]">{p.name}</span>
                        <span className="block text-[12px] font-medium text-[#B45309]">{p.print}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xl font-extrabold text-[#0F172A]">{inr(p.price)}</span>
                        <span className="block text-[11px] text-[#64748B]">per {p.unit}</span>
                      </span>
                    </span>
                    <span className="mt-2 block text-[13px] leading-relaxed text-[#64748B]">{p.tagline}</span>
                    <span className="mt-3 block space-y-1.5">
                      {p.points.map((pt) => (
                        <span key={pt} className="flex gap-2 text-[12.5px] leading-snug text-[#334155]"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500" /> {pt}</span>
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2 + 3 · Details | Summary */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium" aria-labelledby="nfc-print">
              <h3 id="nfc-print" className="flex items-center gap-2 text-[15px] font-bold text-[#0F172A]"><Printer size={16} className="text-[#B45309]" /> 2 · What we print</h3>
              <p className="mt-1 text-[12.5px] text-[#64748B]">Filled in from your card — change anything that should read differently on the {lines.map((l) => l.product.short.toLowerCase()).join(" and ")}. Your logo and QR code come from your card.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" required error={errors["print.name"]}>
                  <input className={`${field} ${errors["print.name"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={printVal.name} onChange={setPrint("name")} maxLength={120} />
                </Field>
                <Field label="Job title">
                  <input className={`${field} border-[#E2E8F0]`} value={printVal.title} onChange={setPrint("title")} maxLength={120} />
                </Field>
                <Field label="Company">
                  <input className={`${field} border-[#E2E8F0]`} value={printVal.company} onChange={setPrint("company")} maxLength={160} />
                </Field>
                <Field label="Phone to print">
                  <input className={`${field} border-[#E2E8F0]`} value={printVal.phone} onChange={setPrint("phone")} maxLength={40} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium" aria-labelledby="nfc-ship">
              <h3 id="nfc-ship" className="flex items-center gap-2 text-[15px] font-bold text-[#0F172A]"><MapPin size={16} className="text-[#B45309]" /> 3 · Delivery address</h3>
              <p className="mt-1 text-[12.5px] text-[#64748B]">Free delivery anywhere in India. Our courier will call this number if they need to.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Recipient name" required error={errors["ship.name"]}>
                  <input className={`${field} ${errors["ship.name"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.name} onChange={setShip("name")} autoComplete="name" />
                </Field>
                <Field label="Mobile number" required error={errors["ship.phone"]}>
                  <input className={`${field} ${errors["ship.phone"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.phone} onChange={setShip("phone")} inputMode="tel" autoComplete="tel" placeholder="98765 43210" />
                </Field>
                <Field label="House / flat, street and area" required error={errors["ship.line1"]} wide>
                  <input className={`${field} ${errors["ship.line1"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.line1} onChange={setShip("line1")} autoComplete="address-line1" />
                </Field>
                <Field label="Landmark (optional)" wide>
                  <input className={`${field} border-[#E2E8F0]`} value={shipVal.line2} onChange={setShip("line2")} autoComplete="address-line2" />
                </Field>
                <Field label="City" required error={errors["ship.city"]}>
                  <input className={`${field} ${errors["ship.city"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.city} onChange={setShip("city")} autoComplete="address-level2" />
                </Field>
                <Field label="PIN code" required error={errors["ship.pincode"]}>
                  <input className={`${field} ${errors["ship.pincode"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.pincode} onChange={setShip("pincode")} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
                </Field>
                <Field label="State" required error={errors["ship.state"]} wide>
                  <select className={`${field} ${errors["ship.state"] ? "border-[#FCA5A5]" : "border-[#E2E8F0]"}`} value={shipVal.state} onChange={setShip("state")} autoComplete="address-level1">
                    <option value="">Choose a state</option>
                    {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </Field>
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="space-y-3 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Order summary</p>
              <ul className="mt-3 space-y-3">
                {lines.map((l) => (
                  <li key={l.product.id} className="rounded-xl border border-[#EEF2F6] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-[#0F172A]">{l.product.name}</p>
                        <p className="text-[11.5px] text-[#64748B]">{l.product.print} · {inr(l.product.price)} per {l.product.unit}</p>
                      </div>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => setQty(l.product.id, 0)} aria-label={`Remove ${l.product.name}`}
                          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]"><X size={15} /></button>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl ring-1 ring-[#E2E8F0]">
                        <button type="button" onClick={() => setQty(l.product.id, l.qty - 1)} disabled={l.qty <= 1} aria-label={`One fewer ${l.product.short}`}
                          className="flex h-9 w-9 items-center justify-center text-[#334155] disabled:opacity-40"><Minus size={15} /></button>
                        <input value={l.qty} onChange={(e) => setQty(l.product.id, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
                          inputMode="numeric" aria-label={`${l.product.short} quantity`} className="h-9 w-12 border-x border-[#E2E8F0] text-center text-[14px] font-bold tabular-nums text-[#0F172A] outline-none" />
                        <button type="button" onClick={() => setQty(l.product.id, l.qty + 1)} disabled={l.qty >= NFC_MAX_QTY} aria-label={`One more ${l.product.short}`}
                          className="flex h-9 w-9 items-center justify-center text-[#334155] disabled:opacity-40"><Plus size={15} /></button>
                      </div>
                      <span className="text-[14px] font-bold tabular-nums text-[#0F172A]">{inr(l.product.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {!both && (
                <button type="button" onClick={addBoth} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] py-2.5 text-[12.5px] font-semibold text-[#475569] hover:border-[#F7B31C] hover:text-[#0F172A]">
                  <Plus size={14} /> Add {NFC_PRODUCTS.find((p) => qtys[p.id] === 0)?.name} to this order
                </button>
              )}

              <dl className="mt-4 space-y-2 border-t border-[#F1F5F9] pt-4 text-[13px]">
                {lines.map((l) => (
                  <div key={l.product.id} className="flex justify-between"><dt className="text-[#64748B]">{l.qty} × {l.product.short}</dt><dd className="font-semibold tabular-nums text-[#0F172A]">{inr(l.product.price * l.qty)}</dd></div>
                ))}
                <div className="flex justify-between"><dt className="text-[#64748B]">Delivery</dt><dd className="font-semibold text-[#16A34A]">Free</dd></div>
                <div className="flex justify-between border-t border-[#F1F5F9] pt-2 text-[15px]"><dt className="font-bold text-[#0F172A]">Total</dt><dd className="font-extrabold tabular-nums text-[#0F172A]">{inr(total)}</dd></div>
              </dl>

              <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#F0FDF4] px-3 py-2 text-[12px] font-medium text-[#166534]">
                <Truck size={14} className="shrink-0" /> Arrives {window} ({NFC_DELIVERY.label})
              </p>

              <button type="button" onClick={placeOrder} disabled={paying || isLoading || !cardUrl}
                className="gradient-gold mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#0F172A] transition-all hover:shadow-gold disabled:opacity-60">
                {paying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {data && !data.onlinePay ? `Place order · ${inr(total)}` : `Pay ${inr(total)} & place order`}
              </button>
              <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
                {data && !data.onlinePay ? "Our team will contact you to arrange payment." : "Secure payment by Razorpay · UPI, cards, net banking"}
              </p>
            </div>
          </aside>
        </div>

        {/* Orders */}
        {orders.length > 0 && (
          <section aria-labelledby="nfc-orders" className="rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-premium">
            <h3 id="nfc-orders" className="text-[15px] font-bold text-[#0F172A]">Your orders</h3>
            <ul className="mt-4 space-y-3">
              {orders.map((o) => {
                const p = NFC_PRODUCTS.find((x) => x.id === o.product);
                const stepIndex = STEPS.findIndex((st) => st.id === o.status);
                const mates = o.razorpayOrderId ? orders.filter((x) => x.id !== o.id && x.razorpayOrderId === o.razorpayOrderId) : [];
                return (
                  <li key={o.id} className="rounded-xl border border-[#EEF2F6] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-bold text-[#0F172A]">{o.quantity} × {p?.name ?? o.product}</p>
                        <p className="text-[12px] text-[#64748B]">
                          Order #{o.id} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {inr(Number(o.amount))}
                          {mates.length > 0 && <> · Ordered together with #{mates.map((m) => m.id).join(", #")}</>}
                        </p>
                      </div>
                      {o.status === "pending_payment" && <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-bold text-[#92400E]">Awaiting payment</span>}
                      {o.status === "cancelled" && <span className="rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-bold text-[#B91C1C]">Cancelled</span>}
                    </div>
                    {stepIndex >= 0 && (
                      <ol className="mt-3 grid grid-cols-4 gap-1.5">
                        {STEPS.map((st, i) => {
                          const done = i <= stepIndex;
                          return (
                            <li key={st.id} className="flex flex-col gap-1">
                              <span className={`h-1.5 rounded-full ${done ? "bg-[#F7B31C]" : "bg-[#E2E8F0]"}`} />
                              <span className={`flex items-center gap-1 text-[11px] font-semibold ${done ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                                {done && <CheckCircle2 size={12} className="text-[#16A34A]" />} {st.label}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    <p className="mt-2 text-[12px] text-[#64748B]">
                      Shipping to {o.shipName}, {o.shipCity}, {o.shipState} {o.shipPincode}
                      {o.tracking ? <> · Tracking: <span className="font-semibold text-[#0F172A]">{o.tracking}</span></> : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
