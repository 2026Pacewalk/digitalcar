import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Globe, Loader2, Plus, Trash2, ShieldCheck, Copy, Check, CheckCircle2, Lock, ExternalLink, Sparkles } from "lucide-react";

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

export default function CustomerCustomDomain() {
  const { data, isLoading, refetch } = trpc.domain.mine.useQuery();
  const add = trpc.domain.add.useMutation();
  const verify = trpc.domain.verifyMine.useMutation();
  const remove = trpc.domain.removeMine.useMutation();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

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

  const eligible = data?.eligible;
  const domains = data?.domains ?? [];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Custom Domain" subtitle="Put your card on your own branded domain" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-3xl">

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : !eligible ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4"><Lock size={26} className="text-[#D97706]" /></div>
            <h3 className="text-base font-bold text-[#0F172A]">Custom domains are a premium feature</h3>
            <p className="text-sm text-[#64748B] mt-1.5 max-w-md mx-auto">Serve your card on your own domain like <span className="font-mono text-[#0F172A]">card.yourbusiness.com</span>. Upgrade to a plan that includes custom domains to unlock it.</p>
            <Link to="/dashboard/subscription" className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-xl gradient-gold text-[#0F172A] font-bold text-sm hover:shadow-gold transition-all"><Sparkles size={16} /> Upgrade plan</Link>
          </div>
        ) : (
          <>
            {/* Add */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
              <div className="flex items-center gap-2 mb-1"><Globe size={16} className="text-[#F7B31C]" /><h3 className="text-sm font-semibold text-[#0F172A]">Connect your domain</h3></div>
              <p className="text-[12px] text-[#64748B] mb-3">Enter a domain or subdomain you own. You&apos;ll add two DNS records, then verify — your card serves over HTTPS automatically.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="card.yourbusiness.com" className="flex-1 h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C] font-mono" />
                <button onClick={submit} disabled={add.isPending} className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">{add.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add domain</button>
              </div>
            </div>

            {/* List */}
            {domains.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-8 text-center text-sm text-[#94A3B8]">No domain connected yet.</div>
            ) : domains.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
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
                  <div className="mt-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-[#334155]">Add these DNS records at your domain provider:</p>
                    <CopyRow label="CNAME" value={`${d.dns.cname.host}  →  ${d.dns.cname.value}`} />
                    <CopyRow label="TXT" value={`${d.dns.txt.host}  →  ${d.dns.txt.value}`} />
                    <p className="text-[10px] text-[#94A3B8]">Using a root/apex domain that can&apos;t take a CNAME? Point an A record to your server IP instead. DNS can take a few minutes to update, then click Verify.</p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
