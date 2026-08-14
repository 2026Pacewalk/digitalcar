import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Globe, Loader2, Plus, Trash2, ShieldCheck, Copy, Check, CheckCircle2, ExternalLink, Sparkles, ChevronDown, ShoppingCart, Headphones, BadgeCheck } from "lucide-react";

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-semibold w-12 shrink-0">{label}</span>
      <code className="flex-1 min-w-0 truncate text-[12px] bg-white rounded-lg px-2.5 py-1.5 text-[#0F172A] font-mono border border-[#E2E8F0]">{value}</code>
      <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] shrink-0">{copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}</button>
    </div>
  );
}

const inr = (v: number) => "₹" + (Number(v) || 0).toLocaleString("en-IN");

export default function CustomerCustomDomain() {
  const { data, isLoading, refetch } = trpc.domain.mine.useQuery();
  const checkout = trpc.domain.addonCheckout.useMutation();
  const verifyPay = trpc.domain.addonVerify.useMutation();
  const add = trpc.domain.add.useMutation();
  const verify = trpc.domain.verifyMine.useMutation();
  const remove = trpc.domain.removeMine.useMutation();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [showDiy, setShowDiy] = useState(false);

  const eligible = data?.eligible;
  const freeEligible = data?.freeEligible;
  const price = data?.addonPrice ?? 499;
  const domains = data?.domains ?? [];

  // Buy / unlock the add-on.
  const getAddon = async () => {
    setPaying(true);
    try {
      const r = await checkout.mutateAsync();
      if ("granted" in r && r.granted) { toast.success("Custom domain unlocked for your account!"); await refetch(); return; }
      if ("manual" in r && r.manual) {
        toast.info("Online payment isn't set up yet — contact us to arrange it.");
        window.open("/contact", "_blank");
        return;
      }
      if ("orderId" in r) {
        const ok = await loadRazorpay();
        if (!ok) { toast.error("Couldn't load the payment window. Check your connection."); return; }
        const Rzp = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
        const rzp = new Rzp({
          key: r.keyId, order_id: r.orderId, amount: r.amount, currency: r.currency || "INR",
          name: "DigitalCarda", description: "Custom Domain — one-time setup",
          theme: { color: "#F7B31C" },
          handler: async (resp: RzpResponse) => {
            try {
              await verifyPay.mutateAsync({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
              toast.success("Payment received — your custom domain is unlocked!");
              await refetch();
            } catch { toast.error("Payment captured but verification failed — contact support with your payment id."); }
          },
        });
        rzp.open();
      }
    } catch (e) { toast.error((e as { message?: string })?.message || "Could not start checkout."); }
    finally { setPaying(false); }
  };

  const submit = async () => {
    if (!domain.trim()) { toast.error("Enter your domain, e.g. card.yourbusiness.com"); return; }
    try {
      await add.mutateAsync({ domain: domain.trim(), cardId: 1 });
      toast.success("Domain added — now add the DNS records below.");
      setDomain(""); await refetch();
    } catch (e) { toast.error((e as { message?: string })?.message || "Could not add the domain."); }
  };
  const doVerify = async (id: number) => {
    setBusy(id);
    try {
      const r = await verify.mutateAsync({ id });
      if (r.ok) { toast.success("Verified! Your domain is going live."); await refetch(); }
      else toast.warning(r.message || "DNS not found yet — give it a few minutes.");
    } catch { toast.error("Verification failed"); } finally { setBusy(null); }
  };
  const del = async (id: number) => {
    if (!confirm("Remove this domain? Your card stays live at its normal URL.")) return;
    setBusy(id);
    try { await remove.mutateAsync({ id }); toast.success("Domain removed"); await refetch(); }
    catch { toast.error("Could not remove"); } finally { setBusy(null); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Custom Domain" subtitle="Put your card on your own branded domain" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-3xl">

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : !eligible ? (
          /* ── OFFER: not yet unlocked ─────────────────────────────── */
          <>
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shrink-0"><Globe size={22} className="text-[#0F172A]" /></div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Get your card on your own domain</h3>
                  <p className="text-sm text-[#64748B]">Turn <span className="font-mono text-[#94A3B8]">digitalcarda.in/you</span> into <span className="font-mono text-[#0F172A] font-semibold">card.yourbrand.com</span></p>
                </div>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-end gap-3">
                <span className="text-4xl font-extrabold text-[#0F172A]">{inr(price)}</span>
                <span className="text-sm text-[#64748B] mb-1.5">one-time setup fee</span>
              </div>
              <p className="text-[12px] text-[#94A3B8] mt-1">Your domain name is billed separately by a registrar (GoDaddy, Namecheap, etc.) — or use a domain you already own.</p>

              <button onClick={getAddon} disabled={paying}
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl gradient-gold text-[#0F172A] font-bold text-sm hover:shadow-gold transition-all disabled:opacity-60">
                {paying ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} Add Custom Domain
              </button>

              {/* Free for Platinum 3-year */}
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-[#F5F3FF] to-[#FAF5FF] border border-[#E9D5FF] px-4 py-3">
                <BadgeCheck size={18} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#5B21B6]"><span className="font-bold">Free with Platinum (3-Year plan).</span> On the Platinum 3-year plan the setup fee is waived — <Link to="/dashboard/subscription" className="underline font-semibold">see plans</Link>.</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6">
              <h4 className="text-sm font-bold text-[#0F172A] mb-4">How it works</h4>
              <ol className="space-y-4">
                {[
                  { icon: ShoppingCart, t: "Get a domain", d: "Buy one from any registrar (from ~₹800/year), or use a domain you already own. You keep full ownership." },
                  { icon: BadgeCheck, t: `Pay the ${inr(price)} setup`, d: "One-time fee — free on the Platinum 3-year plan. Pay securely online in seconds." },
                  { icon: Headphones, t: "We set it up for you", d: "After payment, our team connects your domain to your card with HTTPS — usually within 24–48 hours. No technical work needed." },
                ].map((s, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><s.icon size={17} className="text-[#D97706]" /></span>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]"><span className="text-[#94A3B8] mr-1.5">{i + 1}.</span>{s.t}</p>
                      <p className="text-[12.5px] text-[#64748B] leading-relaxed mt-0.5">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          /* ── UNLOCKED: paid or free-eligible ─────────────────────── */
          <>
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] p-5 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#065F46]">Custom domain unlocked{freeEligible ? " — free with your Platinum 3-year plan" : ""}.</p>
                <p className="text-[12.5px] text-[#047857] mt-0.5">Have a domain ready? Let our team connect it for you, or set it up yourself below.</p>
              </div>
            </div>

            {/* Managed setup — the easy path */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
              <div className="flex items-center gap-2 mb-1"><Headphones size={16} className="text-[#F7B31C]" /><h3 className="text-sm font-semibold text-[#0F172A]">We&apos;ll set it up for you</h3></div>
              <p className="text-[12.5px] text-[#64748B] mb-3">Send us the domain you bought (or already own) and we&apos;ll connect it to your card with HTTPS — usually within 24–48 hours. Nothing technical to do.</p>
              <a href="/contact" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold transition-all"><Headphones size={15} /> Contact us to set it up</a>
            </div>

            {/* DIY self-serve DNS tool */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
              <button onClick={() => setShowDiy((v) => !v)} className="w-full flex items-center justify-between gap-2 p-5 text-left">
                <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#64748B]" /><span className="text-sm font-semibold text-[#0F172A]">Prefer to set it up yourself?</span></span>
                <ChevronDown size={16} className={`text-[#94A3B8] transition-transform ${showDiy ? "rotate-180" : ""}`} />
              </button>
              {showDiy && (
                <div className="px-5 pb-5 space-y-4 border-t border-[#F1F5F9] pt-4">
                  <div>
                    <p className="text-[12px] text-[#64748B] mb-3">Enter a domain or subdomain you own. You&apos;ll add two DNS records, then verify — your card serves over HTTPS automatically.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="card.yourbusiness.com" className="flex-1 h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C] font-mono" />
                      <button onClick={submit} disabled={add.isPending} className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">{add.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add domain</button>
                    </div>
                  </div>

                  {domains.length === 0 ? (
                    <p className="text-center text-sm text-[#94A3B8] py-2">No domain connected yet.</p>
                  ) : domains.map((d) => (
                    <div key={d.id} className="rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0F172A] hover:text-[#F7B31C] inline-flex items-center gap-1">{d.domain} <ExternalLink size={12} /></a>
                        <div className="flex items-center gap-1.5">
                          {d.status !== "active" && <button onClick={() => doVerify(d.id)} disabled={busy === d.id} className="h-9 px-3 rounded-lg gradient-gold text-[#0F172A] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60">{busy === d.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />} Verify</button>}
                          <button onClick={() => del(d.id)} disabled={busy === d.id} className="h-9 w-9 rounded-lg border border-[#E2E8F0] text-red-500 inline-flex items-center justify-center hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {d.status === "active" ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 size={14} /> Live — your card is served on this domain over HTTPS.</p>
                      ) : (
                        <div className="mt-3 rounded-xl bg-white border border-[#F1F5F9] p-3 space-y-2">
                          <p className="text-[11px] font-semibold text-[#334155]">Add these DNS records at your domain provider:{d.dns.sslStatus ? <span className="ml-1.5 text-[10px] font-normal text-[#94A3B8]">SSL: {d.dns.sslStatus}</span> : null}</p>
                          {d.dns.records.map((r, i) => <CopyRow key={i} label={r.type} value={`${r.host}  →  ${r.value}`} />)}
                          <p className="text-[10px] text-[#94A3B8]">DNS can take a few minutes to update. {d.dns.mode === "cloudflare" ? "SSL is issued automatically once the records resolve — then click Verify." : "Using a root/apex domain that can't take a CNAME? Point an A record to your server IP instead, then click Verify."}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-[#94A3B8]">Need a domain? You can buy one from any registrar and keep full ownership — <Link to="/dashboard/subscription" className="underline"><Sparkles size={11} className="inline" /> compare plans</Link>.</p>
          </>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
