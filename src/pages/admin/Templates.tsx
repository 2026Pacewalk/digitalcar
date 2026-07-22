import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Star, Eye, EyeOff, Save, Palette, Crown, LayoutGrid } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";

const SWATCHES = ["#F7B31C", "#14243E", "#3B82F6", "#A21CAF", "#06B6D4", "#EF4444", "#0F172A", "#16A34A", "#DB2777", "#EAB308"];
const SECONDARY_SWATCHES = ["", "#0F172A", "#1E293B", "#0f2b2e", "#3f1d2e", "#1e1b4b", "#422006", "#0c4a6e", "#14532d", "#3b0764"];

export default function AdminTemplates() {
  const utils = trpc.useUtils();
  const { data: config } = trpc.template.siteConfig.useQuery();
  const setConfig = trpc.template.setSiteConfig.useMutation();
  const setActive = trpc.template.setTemplateActive.useMutation();

  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);

  const curDefault = defaultId ?? config?.defaultId ?? 1;
  const curColor = color ?? config?.defaultColor ?? "#F7B31C";
  const curSecondary = secondary ?? config?.defaultSecondary ?? "";
  const disabled = new Set(config?.disabled ?? []);

  const thumbs = useMemo(() => {
    const pc = { ...DEFAULT_CUSTOMER, color: curColor, color2: curSecondary };
    return Array.from({ length: TEMPLATE_COUNT }, (_, i) => buildCardThumb(pc, i + 1));
  }, [curColor, curSecondary]);

  const refresh = () => utils.template.siteConfig.invalidate();
  const saveDefault = async () => {
    try {
      await setConfig.mutateAsync({ defaultId: curDefault, defaultColor: curColor, defaultSecondary: curSecondary });
      toast.success("Default saved — applies to all users without their own choice");
      refresh(); setDefaultId(null); setColor(null); setSecondary(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const toggle = async (id: number) => {
    const active = disabled.has(id); // currently disabled → enabling
    try { await setActive.mutateAsync({ id, active }); refresh(); toast.success(active ? "Template enabled" : "Template hidden from users"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const activeCount = TEMPLATE_COUNT - (config?.disabled?.length ?? 0);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Templates" subtitle="Manage the card designs available to all users" /></div>
      <div className="p-4 sm:p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><LayoutGrid size={20} className="text-[#D97706]" /></div>
            <div><p className="text-xl font-bold text-[#0F172A] leading-none">{TEMPLATE_COUNT}</p><p className="text-[11px] text-[#64748B] mt-1">Total templates</p></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] flex items-center justify-center shrink-0"><Eye size={20} className="text-[#16A34A]" /></div>
            <div><p className="text-xl font-bold text-[#0F172A] leading-none">{activeCount}</p><p className="text-[11px] text-[#64748B] mt-1">Visible to users</p></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0"><Star size={20} className="text-[#7C3AED]" /></div>
            <div><p className="text-xl font-bold text-[#0F172A] leading-none">Template {curDefault}</p><p className="text-[11px] text-[#64748B] mt-1">Global default</p></div>
          </div>
        </div>

        {/* Default colours */}
        <div className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0"><Palette size={20} className="text-[#D97706]" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-[#0F172A]">Default colour combination</p><p className="text-[12px] text-[#64748B]">Applied to users who haven't customised their own colours.</p></div>
            <button onClick={saveDefault} disabled={setConfig.isPending} className="h-10 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#1E293B] transition-colors disabled:opacity-50 shrink-0"><Save size={15} /> Save default</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            <div>
              <p className="text-[11px] font-semibold text-[#64748B] mb-1.5">Primary</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="color" value={curColor} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                {SWATCHES.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-md ring-2 ${curColor.toLowerCase() === c.toLowerCase() ? "ring-[#0F172A]" : "ring-transparent"}`} style={{ background: c }} />)}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#64748B] mb-1.5">Secondary</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="color" value={curSecondary || "#0F172A"} onChange={(e) => setSecondary(e.target.value)} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                {SECONDARY_SWATCHES.map((c) => <button key={c || "def"} onClick={() => setSecondary(c)} className={`w-7 h-7 rounded-md ring-2 flex items-center justify-center text-[8px] font-bold text-[#94A3B8] ${curSecondary.toLowerCase() === c.toLowerCase() ? "ring-[#F7B31C]" : "ring-transparent"}`} style={{ background: c || "#F8FAFC" }}>{c ? "" : "auto"}</button>)}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div>
          <p className="text-sm font-semibold text-[#0F172A] mb-1">All templates</p>
          <p className="text-[12px] text-[#64748B] mb-4">Set the global default (★) or hide a template from users. Changes apply to everyone instantly.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: TEMPLATE_COUNT }, (_, i) => i + 1).map((n) => {
              const isDefault = curDefault === n;
              const isDisabled = disabled.has(n);
              return (
                <div key={n} className={`relative rounded-2xl border-2 overflow-hidden bg-white transition-all ${isDefault ? "border-[#F7B31C] shadow-gold" : isDisabled ? "border-[#F1F5F9] opacity-60" : "border-[#F1F5F9]"}`}>
                  {isDefault && <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F7B31C] text-[#0F172A]"><Crown size={10} /> Default</span>}
                  {isDisabled && !isDefault && <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0F172A] text-white"><EyeOff size={10} /> Hidden</span>}
                  <div className="relative w-full overflow-hidden bg-[#F8FAFC] pointer-events-none" style={{ aspectRatio: "3 / 4.4" }}>
                    <iframe title={`Template ${n}`} srcDoc={thumbs[n - 1]} scrolling="no" tabIndex={-1} loading="lazy"
                      style={{ width: "375px", height: "560px", border: 0, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-[#334155] text-center mb-1.5">Template {n}</p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDefaultId(n)} disabled={isDefault}
                        className={`flex-1 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${isDefault ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#0F172A] text-white hover:bg-[#1E293B]"}`}>
                        <Star size={11} /> {isDefault ? "Default" : "Set default"}
                      </button>
                      <button onClick={() => toggle(n)} title={isDisabled ? "Enable" : "Hide"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDisabled ? "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0]" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                        {isDisabled ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {defaultId !== null && defaultId !== config?.defaultId && (
            <div className="sticky bottom-4 mt-4 flex justify-center">
              <button onClick={saveDefault} className="h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold shadow-gold flex items-center gap-2">
                <Check size={16} /> Save Template {curDefault} as default for all users
              </button>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
