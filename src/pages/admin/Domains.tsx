import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, CheckCircle2, Plus, Trash2, ShieldCheck, Copy, Check, AlertTriangle, ExternalLink, Power } from "lucide-react";

type DnsRec = { type: string; host: string; value: string };
type Domain = {
  id: number; domain: string; userId: number; cardId: number;
  status: "pending" | "active" | "disabled"; addedByRole: string;
  verifiedAt: string | null; createdAt: string | null;
  email: string | null; name: string | null;
  dns: { mode: "cloudflare" | "manual"; records: DnsRec[]; sslStatus: string | null; active: boolean };
};

const STATUS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  disabled: "bg-red-50 text-red-700",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-semibold w-14 shrink-0">{label}</span>
      <code className="flex-1 min-w-0 truncate text-[12px] bg-[#F8FAFC] rounded-lg px-2.5 py-1.5 text-[#0F172A] font-mono">{value}</code>
      <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] shrink-0">{copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}</button>
    </div>
  );
}

export default function AdminDomains() {
  const utils = trpc.useUtils();
  const { data: domains = [], isLoading, refetch } = trpc.domain.list.useQuery();
  const assign = trpc.domain.assign.useMutation();
  const verify = trpc.domain.verify.useMutation();
  const setStatus = trpc.domain.setStatus.useMutation();
  const remove = trpc.domain.remove.useMutation();

  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [cardId, setCardId] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);

  const add = async () => {
    if (!email.trim() || !domain.trim()) { toast.error("Enter the customer's email and the domain"); return; }
    try {
      await assign.mutateAsync({ email: email.trim(), domain: domain.trim(), cardId });
      toast.success("Domain added — share the DNS records below with the customer.");
      setEmail(""); setDomain(""); setCardId(1);
      await refetch();
    } catch (e) { toast.error((e as { message?: string })?.message || "Could not add the domain."); }
  };

  const doVerify = async (d: Domain) => {
    setBusy(d.id);
    try {
      const r = await verify.mutateAsync({ id: d.id });
      if (r.ok) { toast.success(`${d.domain} verified & active`); await refetch(); }
      else toast.warning(r.message || "DNS not found yet.");
    } catch { toast.error("Verification failed"); } finally { setBusy(null); }
  };

  const toggle = async (d: Domain) => {
    setBusy(d.id);
    try {
      await setStatus.mutateAsync({ id: d.id, status: d.status === "active" ? "disabled" : "active" });
      await refetch();
    } catch { toast.error("Could not update status"); } finally { setBusy(null); }
  };

  const del = async (d: Domain) => {
    if (!confirm(`Remove ${d.domain}? The card stays live at its normal URL.`)) return;
    setBusy(d.id);
    try { await remove.mutateAsync({ id: d.id }); toast.success("Domain removed"); await utils.domain.list.invalidate(); }
    catch { toast.error("Could not remove"); } finally { setBusy(null); }
  };

  const list = domains as unknown as Domain[];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Custom Domains" subtitle="Serve any customer's card on their own branded domain" /></div>
      <div className="p-6 space-y-6 max-w-4xl">

        {/* How it works */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-800 leading-relaxed">
            <p className="font-semibold">How a custom domain goes live</p>
            <p className="mt-1 text-amber-700">1) Add the domain for a customer below. 2) They add the two DNS records shown. 3) Click <b>Verify</b> — once the TXT record is found the domain flips to <b>active</b> and HTTPS is issued automatically (Caddy on-demand TLS). Nothing about the card or its normal URL changes.</p>
          </div>
        </div>

        {/* Add domain */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
          <div className="flex items-center gap-2 mb-3"><Plus size={16} className="text-[#F7B31C]" /><h3 className="text-sm font-semibold text-[#0F172A]">Add a custom domain for a customer</h3></div>
          <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Customer email" className="h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C]" />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="card.theirbusiness.com" className="h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C] font-mono" />
            <input type="number" min={1} value={cardId} onChange={(e) => setCardId(Number(e.target.value) || 1)} title="Card # (1 = primary)" className="h-11 w-20 rounded-xl border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]" />
            <button onClick={add} disabled={assign.isPending} className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">{assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add</button>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2">Tip: find a customer's card # on the Customers page (1 = their primary card).</p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Loading domains…</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Globe size={24} className="text-[#94A3B8]" /></div>
            <p className="text-sm font-semibold text-[#0F172A]">No custom domains yet</p>
            <p className="text-[13px] text-[#94A3B8] mt-1">Add one above to serve a customer's card on their own domain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0F172A] hover:text-[#F7B31C] inline-flex items-center gap-1">{d.domain} <ExternalLink size={12} /></a>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[d.status]}`}>{d.status.toUpperCase()}</span>
                    </div>
                    <p className="text-[12px] text-[#64748B] mt-0.5">{d.name || "—"} · {d.email || `user #${d.userId}`} · card #{d.cardId}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.status !== "active" && (
                      <button onClick={() => doVerify(d)} disabled={busy === d.id} className="h-9 px-3 rounded-lg gradient-gold text-[#0F172A] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60">{busy === d.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />} Verify</button>
                    )}
                    <button onClick={() => toggle(d)} disabled={busy === d.id} title={d.status === "active" ? "Disable" : "Force activate"} className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[#334155] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8FAFC]"><Power size={13} /> {d.status === "active" ? "Disable" : "Activate"}</button>
                    <button onClick={() => del(d)} disabled={busy === d.id} className="h-9 w-9 rounded-lg border border-[#E2E8F0] text-red-500 inline-flex items-center justify-center hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>

                {d.status === "active" ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 size={14} /> Live — serving the card over HTTPS on this domain.</p>
                ) : (
                  <div className="mt-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-[#334155] flex items-center gap-1.5">DNS records for the customer to add
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.dns.mode === "cloudflare" ? "bg-[#FFF0D6] text-[#B45309]" : "bg-[#E2E8F0] text-[#475569]"}`}>{d.dns.mode === "cloudflare" ? "CLOUDFLARE SSL" : "MANUAL"}</span>
                      {d.dns.sslStatus && <span className="text-[10px] text-[#94A3B8]">· SSL: {d.dns.sslStatus}</span>}
                    </p>
                    {d.dns.records.map((r, i) => <CopyField key={i} label={r.type} value={`${r.host}  →  ${r.value}`} />)}
                    <p className="text-[10px] text-[#94A3B8]">{d.dns.mode === "cloudflare" ? "Cloudflare issues & renews the SSL automatically once these records resolve." : "Apex domains that can't use CNAME: point an A record to the server IP instead."}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
