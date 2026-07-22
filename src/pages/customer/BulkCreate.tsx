import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { TEMPLATES } from "@/data/templates";
import { toast } from "sonner";
import {
  Plus, Trash2, FileSpreadsheet, X, Building2, IdCard,
  Rocket, AlertTriangle, ArrowRight, CreditCard, CheckCircle2,
} from "lucide-react";

type Member = { id: string; name: string; designation: string; phone: string; email: string };
let idCounter = 0;
const newMember = (): Member => ({ id: `m-${++idCounter}`, name: "", designation: "", phone: "", email: "" });

export default function BulkCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: cardsData } = trpc.card.list.useQuery();
  const { data: sub } = trpc.subscription.mySubscription.useQuery();

  // All card designs live in the frontend TEMPLATES data (same source the
  // Templates page uses). Group them by category for the picker.
  const activeTemplates = useMemo(() => TEMPLATES.filter((t) => t.isActive), []);
  const templatesByCategory = useMemo(() => {
    const map: Record<string, typeof activeTemplates> = {};
    for (const t of [...activeTemplates].sort((a, b) => a.sortOrder - b.sortOrder)) {
      (map[t.category] ||= []).push(t);
    }
    return map;
  }, [activeTemplates]);

  const used = cardsData?.total ?? 0;
  const maxCards: number = (sub as { package?: { maxCards?: number } } | undefined)?.package?.maxCards ?? 0;
  const remaining = maxCards > 0 ? Math.max(0, maxCards - used) : Infinity;

  const [companyName, setCompanyName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [publish, setPublish] = useState(false);
  const [members, setMembers] = useState<Member[]>([newMember(), newMember(), newMember()]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const filled = members.filter((m) => m.name.trim());
  const overQuota = maxCards > 0 && filled.length > remaining;

  const bulkCreate = trpc.card.bulkCreate.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.count} card${res.count !== 1 ? "s" : ""} created successfully`);
      utils.card.list.invalidate();
      navigate("/dashboard/cards");
    },
    onError: (err) => toast.error(err.message || "Could not create cards"),
  });

  const updateMember = (id: string, key: keyof Member, val: string) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [key]: val } : m)));
  const addMember = () => setMembers((prev) => [...prev, newMember()]);
  const removeMember = (id: string) =>
    setMembers((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));

  const applyPaste = () => {
    const rows = pasteText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name = "", designation = "", phone = "", email = ""] = line.split(",").map((s) => s.trim());
      return { ...newMember(), name, designation, phone, email };
    });
    if (!rows.length) { toast.error("Nothing to import. Add one person per line."); return; }
    setMembers(rows);
    setPasteOpen(false); setPasteText("");
    toast.success(`${rows.length} member${rows.length > 1 ? "s" : ""} imported`);
  };

  const submit = () => {
    const payload = filled.map((m) => ({
      name: m.name.trim(),
      designation: m.designation.trim() || undefined,
      phone: m.phone.trim() || undefined,
      email: m.email.trim() || undefined,
    }));
    if (!payload.length) { toast.error("Add at least one member with a name."); return; }
    if (overQuota) { toast.error("You've exceeded your plan's card limit."); return; }
    bulkCreate.mutate({
      companyName: companyName.trim() || undefined,
      templateId: templateId ? Number(templateId) : undefined,
      publish,
      members: payload,
    });
  };

  const quotaLabel = useMemo(() => {
    if (maxCards <= 0) return "Unlimited on your current plan";
    return `${used} of ${maxCards} used · ${remaining} remaining`;
  }, [used, maxCards, remaining]);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Bulk Create Cards" subtitle="Create digital cards for your whole team at once" /></div>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Quota banner */}
        <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] flex items-center gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-[#F7B31C]" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold text-[#0F172A]">Card allowance</p>
            <p className="text-xs text-[#64748B] mt-0.5">{quotaLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#0F172A]">{filled.length}</p>
            <p className="text-[11px] text-[#94A3B8]">to create now</p>
          </div>
        </div>

        {overQuota && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Over your plan limit</p>
              <p className="text-xs text-red-600 mt-0.5">
                You're trying to create {filled.length} cards but only {remaining} remain on your plan.
                Remove some members or{" "}
                <button onClick={() => navigate("/dashboard/subscription")} className="underline font-medium">upgrade your plan</button>.
              </p>
            </div>
          </div>
        )}

        {/* Company + template */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#0F172A] mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-[#F7B31C]" /> Shared Card Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Company Name</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Appears on every card" className="input-premium w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Template <span className="text-[#94A3B8] font-normal">({activeTemplates.length} designs)</span></label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input-premium w-full">
                <option value="">Default (choose later)</option>
                {Object.entries(templatesByCategory).map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}{t.isPremium ? " ★" : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-4 h-4 accent-[#F7B31C]" />
            <span className="text-sm text-[#334155]">Publish all cards immediately (otherwise saved as drafts)</span>
          </label>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <IdCard size={18} className="text-[#F7B31C]" />
              <h3 className="text-base font-semibold text-[#0F172A]">Team Members</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">{filled.length} ready</span>
            </div>
            <button onClick={() => setPasteOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors">
              <FileSpreadsheet size={14} className="text-[#F7B31C]" /> Bulk paste
            </button>
          </div>

          {pasteOpen && (
            <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#0F172A]">One person per line: <span className="text-[#94A3B8]">Name, Designation, Phone, Email</span></p>
                <button onClick={() => setPasteOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={15} /></button>
              </div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4}
                placeholder={"Rahul Sharma, Sales Manager, +91 98765 43210, rahul@company.com\nPriya Nair, Designer, +91 91234 56789, priya@company.com"}
                className="input-premium w-full resize-none font-mono text-xs" />
              <div className="flex justify-end mt-3">
                <button onClick={applyPaste} className="btn-gold h-9 px-4 inline-flex items-center gap-1.5"><Plus size={14} /> Import list</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 px-1">
              {["Name *", "Designation", "Phone", "Email", ""].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {members.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] gap-3 items-center">
                <input value={m.name} onChange={(e) => updateMember(m.id, "name", e.target.value)} placeholder={`Member ${idx + 1} name`} className="input-premium w-full" />
                <input value={m.designation} onChange={(e) => updateMember(m.id, "designation", e.target.value)} placeholder="Designation" className="input-premium w-full" />
                <input value={m.phone} onChange={(e) => updateMember(m.id, "phone", e.target.value)} placeholder="Phone" className="input-premium w-full" />
                <div className="flex items-center gap-2">
                  <input value={m.email} onChange={(e) => updateMember(m.id, "email", e.target.value)} placeholder="Email" type="email" className="input-premium w-full" />
                  <button onClick={() => removeMember(m.id)} aria-label="Remove member" className="w-9 h-9 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addMember} className="mt-4 w-full h-11 rounded-xl border border-dashed border-[#CBD5E1] text-sm font-semibold text-[#64748B] hover:border-[#F7B31C] hover:text-[#0F172A] hover:bg-[#FEF3C7]/30 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Add another member
          </button>
        </div>

        {/* Submit */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Each member gets a personalized card with a profile + contact block, ready to edit.
          </div>
          <button
            onClick={submit}
            disabled={bulkCreate.isPending || !filled.length || overQuota}
            className="h-12 px-7 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {bulkCreate.isPending ? (
              <><span className="w-4 h-4 border-2 border-[#0F172A]/40 border-t-[#0F172A] rounded-full animate-spin" /> Creating…</>
            ) : (
              <><Rocket size={16} /> Create {filled.length || ""} Card{filled.length !== 1 ? "s" : ""} <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
