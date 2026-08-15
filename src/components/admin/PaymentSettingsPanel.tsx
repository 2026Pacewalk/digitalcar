/* Admin payment configuration — Razorpay keys + manual UPI/bank details.
   Embedded inside Settings → Payment (and reusable anywhere). Each card owns its
   own Save button and talks to the payment router directly. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, QrCode, Landmark, Wallet, Zap, ShieldCheck, AlertTriangle, Webhook, Copy, Check } from "lucide-react";
import { trpc } from "@/providers/trpc";

const fld = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm text-[#0F172A] outline-none focus:border-[#F7B31C]";

export default function PaymentSettingsPanel() {
  return (
    <div className="space-y-6">
      <RazorpayKeys />
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
