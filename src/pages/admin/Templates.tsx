import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Star, Crown, Pencil, Trash2, X, Save, ChevronLeft, ChevronRight,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";
import { DEFAULT_CUSTOMER } from "@/hooks/useCustomer";

const PRIMARY_SW = ["#F7B31C", "#3B82F6", "#16A34A", "#A21CAF", "#EF4444", "#06B6D4", "#F97316", "#EC4899", "#6366F1", "#EAB308"];
const SECONDARY_SW = ["#0F172A", "#0f2b2e", "#052e16", "#3b0764", "#450a0a", "#083344", "#431407", "#500724", "#1e1b4b", "#082f49"];

type Draft = { id?: number; name: string; style: number; primary: string; secondary: string; active: boolean };
const NEW: Draft = { name: "", style: 1, primary: "#F7B31C", secondary: "#0F172A", active: true };

const thumbHtml = (style: number, primary: string, secondary: string) =>
  buildCardThumb({ ...DEFAULT_CUSTOMER, color: primary, color2: secondary }, style);

// Card front is rendered at this design width; the frame scales it to fit its own width.
const THUMB_W = 375;
const THUMB_H = 560;

function Thumb({ style, primary, secondary }: { style: number; primary: string; secondary: string }) {
  const html = useMemo(() => thumbHtml(style, primary, secondary), [style, primary, secondary]);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={`Style ${style}`} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px`, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

export default function AdminTemplates() {
  const utils = trpc.useUtils();
  const { data } = trpc.template.presets.useQuery();
  const savePreset = trpc.template.savePreset.useMutation();
  const deletePreset = trpc.template.deletePreset.useMutation();
  const setDefault = trpc.template.setDefaultPreset.useMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const list = data?.list ?? [];
  const defaultId = data?.defaultId ?? 1;
  const refresh = () => utils.template.presets.invalidate();

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Give the template a name");
    try {
      await savePreset.mutateAsync({ ...draft, name: draft.name.trim() });
      toast.success(draft.id ? "Template updated" : "Template created");
      setDraft(null); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try { await deletePreset.mutateAsync({ id }); refresh(); toast.success("Template deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const makeDefault = async (id: number) => {
    try { await setDefault.mutateAsync({ id }); refresh(); toast.success("Set as global default"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Templates" subtitle="Design prebuilt card templates — each with its own colour combination" /></div>
      <div className="p-4 sm:p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">{list.length} prebuilt templates</p>
            <p className="text-[12px] text-[#64748B]">Each is a distinct design. Users pick from these; the default (★) applies to anyone who hasn't chosen.</p>
          </div>
          <button onClick={() => setDraft({ ...NEW })} className="h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-gold transition-all shrink-0"><Plus size={16} /> New template</button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {list.map((p) => {
            const isDefault = defaultId === p.id;
            return (
              <div key={p.id} className={`relative rounded-2xl border-2 overflow-hidden bg-white transition-all ${isDefault ? "border-[#F7B31C] shadow-gold" : "border-[#F1F5F9]"} ${!p.active ? "opacity-60" : ""}`}>
                {isDefault && <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F7B31C] text-[#0F172A]"><Crown size={10} /> Default</span>}
                {!p.active && <span className="absolute top-2 right-2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0F172A] text-white">Hidden</span>}
                <Thumb style={p.style} primary={p.primary} secondary={p.secondary} />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: p.primary }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: p.secondary }} />
                    <p className="text-[12px] font-bold text-[#0F172A] truncate">{p.name}</p>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mb-2">Layout #{p.style}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setDraft({ ...p })} className="flex-1 h-7 rounded-lg bg-[#F1F5F9] text-[#334155] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#E2E8F0] transition-colors"><Pencil size={11} /> Edit</button>
                    <button onClick={() => makeDefault(p.id)} disabled={isDefault} title="Set default" className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDefault ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#0F172A] text-white hover:bg-[#1E293B]"}`}><Star size={12} /></button>
                    <button onClick={() => remove(p.id)} title="Delete" className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor modal */}
      {draft && <PresetEditor draft={draft} setDraft={setDraft} onSave={save} saving={savePreset.isPending} onClose={() => setDraft(null)} />}
    </ResponsiveDashboardLayout>
  );
}

function PresetEditor({ draft, setDraft, onSave, saving, onClose }: {
  draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; saving: boolean; onClose: () => void;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const cycleStyle = (dir: number) => set({ style: ((draft.style - 1 + dir + TEMPLATE_COUNT) % TEMPLATE_COUNT) + 1 });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-3xl relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9] shrink-0">
          <p className="text-base font-bold text-[#0F172A]">{draft.id ? "Edit template" : "New template"}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
        </div>

        <div className="flex flex-col sm:flex-row overflow-y-auto">
          {/* Live preview */}
          <div className="sm:w-[46%] bg-[#F8FAFC] p-4 flex flex-col items-center gap-3 shrink-0">
            <div className="w-[190px] rounded-xl overflow-hidden shadow-premium border border-[#E2E8F0]">
              <Thumb style={draft.style} primary={draft.primary} secondary={draft.secondary} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => cycleStyle(-1)} className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F1F5F9]"><ChevronLeft size={16} /></button>
              <span className="text-xs font-semibold text-[#334155] w-24 text-center">Layout {draft.style} / {TEMPLATE_COUNT}</span>
              <button onClick={() => cycleStyle(1)} className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F1F5F9]"><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Fields */}
          <div className="flex-1 p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Template name</label>
              <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Midnight Gold" className="h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Layout style</label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: TEMPLATE_COUNT }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => set({ style: n })} className={`w-7 h-7 rounded-md text-[11px] font-bold transition-colors ${draft.style === n ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>{n}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Primary colour</label>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="color" value={draft.primary} onChange={(e) => set({ primary: e.target.value })} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                <input value={draft.primary} onChange={(e) => set({ primary: e.target.value })} className="w-24 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 text-sm font-mono outline-none focus:border-[#F7B31C]" />
                {PRIMARY_SW.map((c) => <button key={c} onClick={() => set({ primary: c })} className={`w-6 h-6 rounded-md ring-2 ${draft.primary.toLowerCase() === c.toLowerCase() ? "ring-[#0F172A]" : "ring-transparent"}`} style={{ background: c }} />)}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Secondary colour <span className="font-normal text-[#94A3B8]">· dark sections</span></label>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="color" value={draft.secondary || "#0F172A"} onChange={(e) => set({ secondary: e.target.value })} className="w-9 h-9 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
                <input value={draft.secondary} onChange={(e) => set({ secondary: e.target.value })} placeholder="default" className="w-24 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 text-sm font-mono outline-none focus:border-[#F7B31C] placeholder:text-[#CBD5E1]" />
                {SECONDARY_SW.map((c) => <button key={c} onClick={() => set({ secondary: c })} className={`w-6 h-6 rounded-md ring-2 ${draft.secondary.toLowerCase() === c.toLowerCase() ? "ring-[#F7B31C]" : "ring-transparent"}`} style={{ background: c }} />)}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} className="rounded accent-[#F7B31C]" />
              <span className="text-xs text-[#334155] font-medium">Visible to users</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[#F1F5F9] shrink-0">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-[#64748B] text-sm font-semibold hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-50">
            <Save size={16} /> {draft.id ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
