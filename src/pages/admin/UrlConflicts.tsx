import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Link2, Loader2, CheckCircle2, ExternalLink, ShieldCheck, Search } from "lucide-react";

type Conflict = {
  id: number; userId: number; cardId: number; slug: string;
  publicId: string | null; email: string | null; name: string | null; suggested: string;
};
type LookupAcct = {
  id: number; email: string; name: string; phone: string | null; role: string; status: string;
  slug: string | null; createdAt: string | null; inLegacy: boolean; showsInCustomers: boolean; verdict: string;
};

export default function AdminUrlConflicts() {
  const utils = trpc.useUtils();
  const { data: conflicts = [], isLoading, refetch, isRefetching } = trpc.admin.slugConflicts.useQuery();
  const reslug = trpc.admin.reslugCard.useMutation();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [lookupQ, setLookupQ] = useState("");
  const [lookup, setLookup] = useState<{ found: number; accounts: LookupAcct[] } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const doLookup = async () => {
    const q = lookupQ.trim();
    if (!q) return;
    setLookingUp(true);
    try { setLookup(await utils.admin.lookupAccount.fetch({ query: q })); }
    catch { toast.error("Lookup failed"); }
    finally { setLookingUp(false); }
  };

  const keyOf = (c: Conflict) => `${c.userId}-${c.cardId}`;

  const fix = async (c: Conflict) => {
    const key = keyOf(c);
    const newSlug = (edits[key] ?? c.suggested).trim();
    if (!newSlug) { toast.error("Enter a new URL"); return; }
    setBusy(key);
    try {
      const res = await reslug.mutateAsync({ userId: c.userId, cardId: c.cardId, newSlug });
      toast.success(`Moved to digitalcarda.in/${res.slug} — the original URL is freed.`);
      await refetch();
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Could not update the URL.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Card URL Conflicts" subtitle="New-flow cards sharing a legacy card's public URL" /></div>
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Account lookup — "why isn't this account showing?" */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
          <div className="flex items-center gap-2 mb-1">
            <Search size={16} className="text-[#F7B31C]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Look up an account</h3>
          </div>
          <p className="text-[12px] text-[#64748B] mb-3">Search by email, phone, name or id to see whether it appears in the Customers list — and exactly why.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={lookupQ} onChange={(e) => setLookupQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLookup()}
              placeholder="e.g. itsmetaniya3639@gmail.com  or  7404369034"
              className="flex-1 h-11 rounded-xl border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-[#F7B31C]" />
            <button onClick={doLookup} disabled={lookingUp} className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">
              {lookingUp ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Look up
            </button>
          </div>
          {lookup && (
            <div className="mt-4 space-y-3">
              {lookup.found === 0 ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-[13px] text-red-700">
                  No account found for “{lookupQ}”. It isn't in the users table under that email/phone — double-check the exact value, or it may be a legacy-only card already in the Customers list.
                </div>
              ) : lookup.accounts.map((a) => (
                <div key={a.id} className="rounded-xl border border-[#E2E8F0] p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A]">{a.name} <span className="text-[11px] font-normal text-[#94A3B8]">#{a.id} · {a.role} · {a.status}</span></p>
                      <p className="text-[12px] text-[#64748B] break-all">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                      {a.slug && <p className="text-[11px] text-[#94A3B8]">card: /{a.slug}{a.createdAt ? ` · joined ${a.createdAt}` : ""}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${a.showsInCustomers ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{a.showsInCustomers ? "IN CUSTOMERS" : "HIDDEN"}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-[#334155] bg-[#F8FAFC] rounded-lg px-3 py-2">{a.verdict}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explainer */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Why this happens</p>
            <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
              These are <b>new-flow</b> accounts (not in the customers list) whose card URL matches a <b>legacy</b> card's URL.
              Because a published card takes priority, the new card <b>shadows the original owner's public page</b>.
              Move the new card to a free URL to restore the original — <b>the legacy card is never changed and nothing is deleted.</b>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#64748B] py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Scanning for conflicts…</div>
        ) : conflicts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3"><ShieldCheck size={24} className="text-emerald-500" /></div>
            <p className="text-sm font-semibold text-[#0F172A]">No URL conflicts 🎉</p>
            <p className="text-[13px] text-[#94A3B8] mt-1">No new-flow card is shadowing a legacy card's URL.</p>
            <button onClick={() => refetch()} disabled={isRefetching} className="mt-4 h-9 px-4 rounded-xl border border-[#E2E8F0] text-[#64748B] text-xs font-semibold hover:bg-[#F8FAFC] inline-flex items-center gap-1.5">
              {isRefetching ? <Loader2 size={13} className="animate-spin" /> : null} Re-scan
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-[#64748B]">{conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} found.</p>
            {(conflicts as Conflict[]).map((c) => {
              const key = keyOf(c);
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><Link2 size={16} className="text-red-500" /></span>
                    <div className="min-w-0">
                      <a href={`https://digitalcarda.in/${c.slug}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0F172A] hover:text-[#F7B31C] inline-flex items-center gap-1">
                        digitalcarda.in/{c.slug} <ExternalLink size={12} />
                      </a>
                      <p className="text-[11px] text-red-500 font-medium">Shadowing the legacy owner's page</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-[12px] mb-4">
                    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-semibold">New-flow account (moves)</p>
                      <p className="text-[#0F172A] font-semibold mt-0.5">{c.name || "—"}</p>
                      <p className="text-[#64748B]">{c.email || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">Legacy owner (restored)</p>
                      <p className="text-[#0F172A]">Keeps <b>digitalcarda.in/{c.slug}</b></p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1 rounded-xl border border-[#E2E8F0] px-3 h-11 bg-[#FAFBFC]">
                      <span className="text-[12px] text-[#94A3B8] whitespace-nowrap">digitalcarda.in/</span>
                      <input
                        value={edits[key] ?? c.suggested}
                        onChange={(e) => setEdits((s) => ({ ...s, [key]: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() }))}
                        className="flex-1 bg-transparent outline-none text-[13px] font-mono text-[#0F172A]"
                        placeholder="new-url"
                      />
                    </div>
                    <button
                      onClick={() => fix(c)}
                      disabled={busy === key}
                      className="h-11 px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-60 whitespace-nowrap"
                    >
                      {busy === key ? <><Loader2 size={15} className="animate-spin" /> Moving…</> : <><CheckCircle2 size={15} /> Move new card here</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
