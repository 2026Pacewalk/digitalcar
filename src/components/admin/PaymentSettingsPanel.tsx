/* Admin payment configuration — Razorpay keys, USD pricing and manual UPI/bank
   details. Embedded inside Settings → Payment (and reusable anywhere). Each card
   owns its own Save button and talks to its router directly. */
import { useEffect, useId, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/router";
import { toast } from "sonner";
import {
  Save, QrCode, Landmark, Wallet, Zap, ShieldCheck, AlertTriangle, Webhook, Copy, Check,
  Globe2, Loader2, CircleCheck, CircleX, ListChecks,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatMoney, isValidRate, usdFromInr, DEFAULT_RATE, FX_RATE_MIN, FX_RATE_MAX } from "@contracts/money";

const fld = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]";

export default function PaymentSettingsPanel() {
  return (
    <div className="space-y-6">
      <RazorpayKeys />
      <UsdPricing />
      <ManualConfig />
    </div>
  );
}

/* ── Razorpay API keys — set test/live keys from the dashboard ──
   The secret is write-only: the server never returns it, so the field shows a
   masked placeholder when a secret is stored and stays blank unless you change it. */
function RazorpayKeys() {
  const utils = trpc.useUtils();
  const { data: cfg } = trpc.payment.getRazorpayConfig.useQuery();
  const save = trpc.payment.setRazorpayConfig.useMutation();

  const [keyId, setKeyId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mode, setMode] = useState<"test" | "live" | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (cfg) { setKeyId(null); setSecret(""); setWebhookSecret(""); setMode(null); setEnabled(null); } }, [cfg]);
  const copyUrl = () => { if (cfg?.webhookUrl) navigator.clipboard.writeText(cfg.webhookUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }); };

  const curKeyId = keyId ?? cfg?.keyId ?? "";
  const curMode = mode ?? (cfg?.mode as "test" | "live") ?? "test";
  const curEnabled = enabled ?? cfg?.enabled ?? false;
  const liveKeyMismatch = curKeyId.startsWith("rzp_live") && curMode === "test";
  const testKeyMismatch = curKeyId.startsWith("rzp_test") && curMode === "live";

  const onSave = async () => {
    try {
      const res = await save.mutateAsync({
        keyId: curKeyId.trim(),
        keySecret: secret.trim() || undefined,          // blank = keep existing secret
        webhookSecret: webhookSecret.trim() || undefined, // blank = keep existing
        mode: curMode,
        enabled: curEnabled,
      });
      toast.success(res.enabled ? `Razorpay ${res.mode} keys saved — online checkout is ON` : "Razorpay saved (checkout OFF)");
      utils.payment.getRazorpayConfig.invalidate();
      utils.payment.razorpayConfig.invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
  };

  return (
    <div className="rounded-2xl border border-[#F1F5F9] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0"><Zap size={20} className="text-[#F7B31C]" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 flex-wrap">
            Razorpay online checkout
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${curEnabled ? "bg-emerald-50 text-emerald-600" : "bg-[#F1F5F9] text-[#64748B]"}`}>{curEnabled ? "ENABLED" : "DISABLED"}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${curMode === "live" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{curMode.toUpperCase()} MODE</span>
          </p>
          <p className="text-[12px] text-[#64748B]">Card · UPI · Netbanking · Wallets. {cfg?.source === "env" ? "Currently using env keys." : cfg?.source === "dashboard" ? "Keys set from dashboard." : "No keys set yet."}</p>
        </div>
        <button onClick={onSave} disabled={save.isPending} className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] disabled:opacity-50 shrink-0"><Save size={15} /> Save</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Key ID</label>
          <input value={curKeyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_… or rzp_test_…" className={`${fld} font-mono`} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#64748B] mb-1 block flex items-center gap-1"><ShieldCheck size={12} /> Key Secret</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
            placeholder={cfg?.hasSecret ? "•••••••••• (stored — leave blank to keep)" : "Enter key secret"} className={`${fld} font-mono`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#64748B]">Mode</span>
          <div className="inline-flex rounded-lg bg-[#F1F5F9] p-0.5">
            {(["test", "live"] as const).map((mo) => (
              <button key={mo} onClick={() => setMode(mo)} className={`px-3 py-1 rounded-md text-[12px] font-semibold ${curMode === mo ? "bg-white shadow-sm text-[#0F172A]" : "text-[#64748B]"}`}>{mo === "live" ? "Live" : "Test"}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={curEnabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-[#0F172A]" />
          <span className="text-[12px] font-semibold text-[#64748B]">Enable checkout</span>
        </label>
      </div>

      {(liveKeyMismatch || testKeyMismatch) && (
        <p className="mt-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          {liveKeyMismatch ? "You've entered a LIVE key id but Mode is Test — switch Mode to Live to take real payments." : "You've entered a TEST key id but Mode is Live — switch Mode to Test, or paste your live keys."}
        </p>
      )}

      {/* ── Webhook backstop ── */}
      <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
        <p className="text-[12px] font-semibold text-[#0F172A] flex items-center gap-1.5">
          <Webhook size={14} /> Webhook (recommended)
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg?.hasWebhookSecret ? "bg-emerald-50 text-emerald-600" : "bg-[#F1F5F9] text-[#64748B]"}`}>{cfg?.hasWebhookSecret ? "SET" : "NOT SET"}</span>
        </p>
        <p className="text-[11px] text-[#94A3B8] mt-0.5 mb-2">Activates a plan even if the buyer's browser closes right after paying. In Razorpay Dashboard → Settings → Webhooks, add this URL for the <b>payment.captured</b> event, set a secret, and paste the same secret below.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Webhook URL</label>
            <div className="flex gap-2">
              <input readOnly value={cfg?.webhookUrl ?? ""} className={`${fld} font-mono text-[12px]`} />
              <button onClick={copyUrl} className="h-10 px-3 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] shrink-0 flex items-center">{copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}</button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Webhook Secret</label>
            <input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={cfg?.hasWebhookSecret ? "•••••••••• (stored — leave blank to keep)" : "Secret you set in Razorpay"} className={`${fld} font-mono`} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[#94A3B8]">Get keys from Razorpay Dashboard → Settings → API Keys. Secrets are stored securely and never shown again.</p>
    </div>
  );
}

/* ── USD pricing for customers outside India ──
   Off by default: while it's off nothing currency-related shows anywhere and every
   checkout is ₹, exactly as before. A $ price follows its ₹ price (₹ ÷ the rate,
   rounded UP to whole dollars, so $ is never cheaper at your rate) unless you type
   your own. The server re-prices every checkout from what's saved; this table
   previews it with the same formula, including a rate you haven't saved yet. */

type UsdAdmin = inferRouterOutputs<AppRouter>["currency"]["adminGet"];
type UsdKey = UsdAdmin["rows"][number]["key"];

const MAX_USD_PRICE = 100_000; // the server refuses bigger overrides

const errText = (e: unknown, fallback: string) => {
  const m = e instanceof Error ? e.message : "";
  return m && !m.trim().startsWith("[") ? m : fallback; // "[" = a raw zod issue list
};

function UsdPricing() {
  const utils = trpc.useUtils();
  const q = trpc.currency.adminGet.useQuery();
  const save = trpc.currency.adminSet.useMutation();
  const check = trpc.currency.adminCheck.useMutation();
  const data = q.data;
  const ids = { label: useId(), rate: useId() };

  // Drafts: null / missing = what's saved. Only a successful price save clears
  // them, so flipping the switch never throws away unsaved edits.
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const [ovrDraft, setOvrDraft] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ ok: boolean; message: string } | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const savedRate = data?.rate ?? DEFAULT_RATE;
  const rateStr = rateDraft ?? String(savedRate);
  const rateNum = Number(rateStr);
  const rateOk = rateStr.trim() !== "" && isValidRate(rateNum);
  const rate = rateOk ? rateNum : savedRate;

  const savedOverride = (key: UsdKey) => {
    const v = data?.overrides[key];
    return v != null ? String(v) : "";
  };
  // A whole number of dollars (the box only takes digits), $1 or more; empty = computed.
  const overrideOk = (s: string) => s === "" || (Number(s) >= 1 && Number(s) <= MAX_USD_PRICE);

  const table = (data?.rows ?? []).map((r) => {
    const s = ovrDraft[r.key] ?? savedOverride(r.key);
    const ok = overrideOk(s);
    const computed = usdFromInr(r.inr, rate);
    const usd = s !== "" && ok ? Number(s) : computed;
    // The $ price back in ₹ at this rate: what reports, commission and rewards count a $ sale as.
    const inrAtRate = usd * rate;
    return { key: r.key, label: r.label, inr: r.inr, s, ok, computed, usd, inrAtRate, diff: inrAtRate / r.inr - 1 };
  });

  const dirty = (rateDraft !== null && (!rateOk || rateNum !== savedRate))
    || table.some((t) => t.s !== savedOverride(t.key));
  const valid = rateOk && table.every((t) => t.ok);
  const on = !!data?.enabled;
  const rzpOn = !!data?.razorpayEnabled;

  const applyView = (view: UsdAdmin) => {
    utils.currency.adminGet.setData(undefined, view);
    void utils.currency.context.invalidate(); // this browser's own ₹/$ switch and prices
  };

  const onToggle = async () => {
    if (!data) return;
    const next = !on;
    if (next && !confirm("Switch on USD? Visitors outside India will see $ prices and can pay by international card. Razorpay is asked to accept a $1 test order first."
      + (dirty ? "\n\nYour unsaved rate and price changes are not included: $ goes live at the saved prices." : ""))) return;
    setRefusal(null);
    try {
      applyView(await save.mutateAsync({ enabled: next }));
      toast.success(next ? "USD is on: visitors outside India can pay in $" : "USD is off: every checkout is in ₹");
    } catch (e) {
      const m = errText(e, "Could not change the USD setting");
      if (next) { setRefusal(m); setStepsOpen(true); }
      toast.error(m);
    }
  };

  const onSave = async () => {
    if (!data || !valid) return;
    // The saved map is replaced as a whole: keep entries this table doesn't list,
    // and an emptied box goes back to following the ₹ price.
    const overrides: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.overrides)) if (v != null) overrides[k] = v;
    for (const t of table) { if (t.s === "") delete overrides[t.key]; else overrides[t.key] = Number(t.s); }
    try {
      applyView(await save.mutateAsync({ rate: rateNum, overrides }));
      setRateDraft(null); setOvrDraft({});
      toast.success("USD rate and prices saved");
    } catch (e) { toast.error(errText(e, "Could not save the USD prices")); }
  };

  const onCheck = async () => {
    setChecked(null);
    try {
      const r = await check.mutateAsync();
      setChecked(r.ok
        ? { ok: true, message: `Razorpay accepted a $1 test order with your ${r.mode} keys, so USD checkout will work.${r.mode === "test" ? " Live keys can differ: check again after switching to live." : ""}` }
        : { ok: false, message: r.message ?? "Razorpay rejected USD." });
      if (!r.ok) setStepsOpen(true);
    } catch (e) { setChecked({ ok: false, message: errText(e, "Could not reach Razorpay. Try again in a minute.") }); }
  };

  const pct = (v: number) => {
    const r = Math.round(v * 1000) / 10; // one decimal; the sign follows the rounded value, so no "−0%"
    return `${r < 0 ? "−" : "+"}${Math.abs(r)}%`;
  };

  return (
    <div className="rounded-2xl border border-[#F1F5F9] p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#E0E7FF] flex items-center justify-center shrink-0"><Globe2 size={20} className="text-[#4F46E5]" /></div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 flex-wrap">
            USD pricing
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${data?.usdAvailable ? "bg-emerald-50 text-emerald-600" : on ? "bg-amber-50 text-amber-600" : "bg-[#F1F5F9] text-[#64748B]"}`}>
              {data?.usdAvailable ? "ACCEPTING USD" : on ? "ON · RAZORPAY OFF" : "OFF"}
            </span>
          </p>
          <p className="text-[12px] text-[#64748B]">Customers outside India see $ prices and pay by international card. While off, everyone pays in ₹.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {save.isPending && <Loader2 size={15} className="animate-spin text-[#64748B]" aria-hidden="true" />}
          <span id={ids.label} className="text-[12px] font-semibold text-[#334155]">Accept USD</span>
          <button type="button" role="switch" aria-checked={on} aria-labelledby={ids.label} onClick={onToggle}
            disabled={!data || save.isPending || (!on && !rzpOn)}
            title={!on && !rzpOn ? "Turn on Razorpay online checkout first" : undefined}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-[#CBD5E1]"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-[12px] text-[#94A3B8] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading USD settings…</p>
      ) : !data ? (
        <p className="text-[12px] text-red-600">Couldn't load the USD settings{q.error ? `: ${q.error.message}` : "."}</p>
      ) : (
        <>
          {refusal && (
            <div role="alert" className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><b>USD was not switched on.</b> {refusal}</span>
            </div>
          )}
          {!rzpOn && (
            <p className="mb-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Razorpay online checkout is off, so $ can't be charged{on ? " and nobody sees $ prices right now" : ""}. Turn it on in the card above first.</span>
            </p>
          )}

          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="w-40">
              <label htmlFor={ids.rate} className="text-[11px] font-semibold text-[#64748B] mb-1 block">Rate (₹ per $1)</label>
              <input id={ids.rate} inputMode="decimal" value={rateStr} aria-invalid={!rateOk}
                onChange={(e) => setRateDraft(e.target.value.replace(/[^\d.]/g, ""))}
                className={`${fld} font-mono ${rateOk ? "" : "border-red-300"}`} />
            </div>
            <p className={`flex-1 min-w-[200px] pb-1 text-[11px] ${rateOk ? "text-[#94A3B8]" : "text-red-600"}`}>
              {rateOk
                ? `Each $ price is the ₹ price ÷ ${formatMoney(rate, "INR")}, rounded up to whole dollars. Default ₹${DEFAULT_RATE}; allowed ₹${FX_RATE_MIN}–₹${FX_RATE_MAX}.`
                : `Enter a rate between ₹${FX_RATE_MIN} and ₹${FX_RATE_MAX}.`}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[#E2E8F0] overflow-x-auto">
            <table className="w-full min-w-[620px] text-[12.5px]">
              <caption className="sr-only">USD price of each item at the rate above</caption>
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide whitespace-nowrap text-[#94A3B8] bg-[#F8FAFC] border-b border-[#F1F5F9]">
                  <th scope="col" className="px-3 py-2 font-semibold">Item</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">₹ price</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">From ₹ price</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Your price</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">Charged</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-right">In ₹ at your rate</th>
                </tr>
              </thead>
              <tbody>
                {table.map((t) => {
                  // Only a price of your own can come out below the ₹ price (the computed one rounds up).
                  const cheaper = t.diff < -1e-9;
                  return (
                    <tr key={t.key} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-3 py-2 min-w-[11rem] font-medium text-[#334155]">{t.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#475569]">{formatMoney(t.inr, "INR")}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#94A3B8]">{formatMoney(t.computed, "USD")}</td>
                      <td className="px-3 py-1.5">
                        <div className="relative w-24">
                          <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">$</span>
                          <input inputMode="numeric" value={t.s} placeholder={String(t.computed)} aria-invalid={!t.ok}
                            aria-label={`${t.label}: your price in whole dollars. Leave empty to follow the ₹ price.`}
                            onChange={(e) => setOvrDraft((d) => ({ ...d, [t.key]: e.target.value.replace(/\D/g, "") }))}
                            className={`h-8 w-full rounded-lg bg-white border pl-6 pr-2 font-mono text-[12.5px] text-[#0F172A] outline-none focus:border-[#F7B31C] ${t.ok ? "border-[#E2E8F0]" : "border-red-300"}`} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-[#0F172A]">{formatMoney(t.usd, "USD")}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${cheaper ? "text-red-600 font-semibold" : "text-[#64748B]"}`}>
                        {formatMoney(t.inrAtRate, "INR", { decimals: 0 })} <span className="text-[11px]">({pct(t.diff)}{cheaper ? ", cheaper than ₹" : ""})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">
            Your price: whole dollars, $1 or more; leave it empty to follow the ₹ price. "In ₹ at your rate" is what reports, commission and referral rewards count a $ sale as. What reaches your bank depends on the day's exchange rate, less international card fees (up to 3% + GST).
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={onCheck} disabled={check.isPending}
              title="Creates a $1 test order that is never paid"
              className="h-10 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#334155] text-sm font-semibold flex items-center gap-1.5 hover:bg-[#F8FAFC] disabled:opacity-50">
              {check.isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Check with Razorpay
            </button>
            <button type="button" onClick={onSave} disabled={!dirty || !valid || save.isPending}
              className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] disabled:opacity-50">
              <Save size={15} /> Save rate &amp; prices
            </button>
          </div>
          {checked && (
            <p role="status" className={`mt-3 text-[12px] rounded-xl px-3 py-2 flex items-start gap-2 border ${checked.ok ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>
              {checked.ok ? <CircleCheck size={14} className="shrink-0 mt-0.5" /> : <CircleX size={14} className="shrink-0 mt-0.5" />}
              <span>{checked.message}</span>
            </p>
          )}

          <details open={stepsOpen} onToggle={(e) => setStepsOpen(e.currentTarget.open)} className="mt-4 pt-4 border-t border-[#F1F5F9]">
            <summary className="cursor-pointer select-none text-[12px] font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
              <ListChecks size={14} /> What to switch on in Razorpay first
            </summary>
            <ol className="mt-2 ml-5 list-decimal space-y-1.5 text-[12px] text-[#475569]">
              <li>In <b>Live mode</b>: Account &amp; Settings → Payment methods → International payments → <b>International Cards</b> → Activate. Razorpay asks for business and GST details, address proof, and your Terms, Privacy, Refund and <b>Shipping policy</b> pages. Approval usually takes 2–5 working days.</li>
              <li>Account &amp; Settings → <b>International Payment Codes</b>: set the purpose code your CA recommends for software / SaaS exports.</li>
              <li>Optional: International payments → <b>PayPal</b> → Link account. PayPal only shows on $ orders, in Live mode.</li>
              <li>Webhook: nothing to change. The same URL and <b>payment.captured</b> event cover $ payments.</li>
              <li>$ payments reach your bank in ₹ at the bank's rate (T+7 by default). Refunds are made from the Razorpay dashboard.</li>
              <li>Before switching on, update the Terms of Service (it says prices are in ₹) and publish a Shipping policy: plans are delivered online, NFC products ship within India only.</li>
              <li>Then set the rate, review the table, press <b>Check with Razorpay</b> and switch on <b>Accept USD</b>, which checks with Razorpay again first.</li>
            </ol>
            <p className="mt-2 text-[11px] text-[#94A3B8]">Menu names as of September 2026; confirm them in your Razorpay dashboard. NFC products and UPI / bank transfers stay ₹ only, and a member on a running ₹ plan upgrades in ₹ until it ends.</p>
          </details>
        </>
      )}
    </div>
  );
}

/* ── Manual payment (UPI / bank) shown to users at checkout ── */
function ManualConfig() {
  const utils = trpc.useUtils();
  const { data: config } = trpc.payment.getConfig.useQuery();
  const setConfig = trpc.payment.setConfig.useMutation();

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (config) setForm({}); }, [config]);
  const v = (k: string) => (form[k] !== undefined ? form[k] : String((config as Record<string, string> | undefined)?.[k] ?? ""));
  const set = (k: string, val: string) => setForm((f) => ({ ...f, [k]: val }));

  const saveConfig = async () => {
    try {
      await setConfig.mutateAsync({ upiId: v("upiId"), upiName: v("upiName"), upiQr: v("upiQr"), bankName: v("bankName"), bankAccount: v("bankAccount"), bankIfsc: v("bankIfsc"), bankHolder: v("bankHolder"), note: v("note") });
      toast.success("Payment details saved"); utils.payment.getConfig.invalidate(); utils.payment.instructions.invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="rounded-2xl border border-[#F1F5F9] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Wallet size={20} className="text-[#D97706]" /></div>
        <div className="flex-1"><p className="text-sm font-semibold text-[#0F172A]">Manual payment (UPI / bank)</p><p className="text-[12px] text-[#64748B]">Shown to users who pay manually — you verify these under Payment Orders.</p></div>
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
  );
}
