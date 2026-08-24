import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { LayoutGrid, Check, Eye, Save, Palette, Pipette, RotateCcw, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { brandSecondaryFor } from "@/lib/brandColors";
import { buildCardThumb } from "@/card-template/buildCard";
import { trpc } from "@/providers/trpc";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const PRIMARY_SW = ["#F7B31C", "#3B82F6", "#16A34A", "#A21CAF", "#EF4444", "#06B6D4", "#F97316", "#EC4899", "#6366F1", "#0F172A"];
const SECONDARY_SW = ["#0F172A", "#1E293B", "#0f2b2e", "#3f1d2e", "#1e1b4b", "#422006", "#0c4a6e", "#14532d", "#3b0764", "#414141"];

type Preset = { id: number; name: string; style: number; primary: string; secondary: string; active: boolean };

/* Reusable "any colour" control (swatch → OS picker, hex, presets) */
function ColorRow({ label, hint, value, placeholder, swatches, allowClear, onChange }: {
  label: string; hint: string; value: string; placeholder?: string; swatches: string[]; allowClear?: boolean; onChange: (v: string) => void;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const commit = (v: string) => { let h = v.trim(); if (h && !h.startsWith("#")) h = "#" + h; setHex(h); if (h === "" && allowClear) onChange(""); else if (HEX_RE.test(h)) onChange(h.toLowerCase()); };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-[#64748B]">{label} <span className="font-normal text-[#94A3B8]">· {hint}</span></p>
        {allowClear && value && <button onClick={() => onChange("")} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F7B31C]"><RotateCcw size={11} /> Default</button>}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <button type="button" onClick={() => nativeRef.current?.click()} title="Choose any colour"
          className="relative w-11 h-11 rounded-xl border-2 border-white shadow-premium ring-1 ring-[#E2E8F0] overflow-hidden shrink-0" style={{ background: value || placeholder || "#0F172A" }}>
          <input ref={nativeRef} type="color" value={value || "#0F172A"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" tabIndex={-1} />
        </button>
        <button type="button" onClick={() => nativeRef.current?.click()} className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] shrink-0">
          <span className="w-5 h-5 rounded-full" style={{ background: "conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444)" }} />
          <span className="text-xs font-semibold text-[#334155]"><Pipette size={12} className="inline -mt-0.5 mr-0.5" />Any colour</span>
        </button>
        <div className="flex items-center h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
          <span className="text-[#94A3B8] text-sm">#</span>
          <input value={hex.replace(/^#/, "")} onChange={(e) => commit(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))} placeholder={placeholder?.replace(/^#/, "") || "hex"} className="w-16 h-full bg-transparent text-sm font-mono outline-none placeholder:text-[#CBD5E1]" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2.5">
        {swatches.map((c) => <button key={c} onClick={() => onChange(c)} className={`w-8 h-8 rounded-lg ring-2 ${value.toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent hover:scale-105"} transition-all`} style={{ background: c }} />)}
      </div>
    </div>
  );
}

// Card front (375×560) scaled responsively to fill its frame — no empty gap.
const THUMB_W = 375, THUMB_H = 560;
function ThumbFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setScale(el.clientWidth / THUMB_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white pointer-events-none" style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}>
      <iframe title={title} srcDoc={html} scrolling="no" tabIndex={-1} loading="lazy"
        style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px`, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

export default function CustomerTemplates() {
  const { data, update } = useCustomer();
  const { data: presetData } = trpc.template.presets.useQuery();
  const presets = useMemo(() => (presetData?.list ?? []).filter((p) => p.active), [presetData]);
  const defaultId = presetData?.defaultId ?? 1;

  const [selId, setSelId] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [primary, setPrimary] = useState<string>("");
  const [secondary, setSecondary] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  const chose = !!String(data.theme || "");

  // Initial selection: match the user's saved template, else the site default
  useEffect(() => {
    if (!presets.length) return;
    let match: Preset | undefined;
    if (chose) {
      match = presets.find((p) => p.style === Number(data.theme) && p.primary.toLowerCase() === String(data.color || "").toLowerCase());
    }
    const initial = match ?? presets.find((p) => p.id === defaultId) ?? presets[0];
    setSelId((cur) => cur ?? initial.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets.length]);

  // Brand colours learned from the logo (set in the Card Builder). When "brand
  // mode" is on, every template is previewed/applied in these colours so the user
  // can see how each design looks in their own branding.
  const brandColors = useMemo(() => String(data.brand_colors || "").split(",").map((x) => x.trim()).filter(Boolean), [data.brand_colors]);
  const hasBrand = brandColors.length > 0;
  const brandPrimary = brandColors[0] || "";
  const brandSecondary = brandPrimary ? brandSecondaryFor(brandPrimary, brandColors[1]) : "";
  const [params] = useSearchParams();
  const [brandOn, setBrandOn] = useState(false);
  useEffect(() => { if (hasBrand && params.get("brand") === "1") setBrandOn(true); }, [hasBrand, params]);

  const selected = presets.find((p) => p.id === selId) || null;
  // Effective colours = custom override → brand (if on) → the preset's own colours.
  const effPrimary = primary || (brandOn && brandPrimary ? brandPrimary : selected?.primary) || "#F7B31C";
  const effSecondary = customOpen ? secondary : (brandOn && brandSecondary ? brandSecondary : (selected?.secondary || ""));

  // The template currently LIVE on the card (matched by style + colour) — stays
  // marked "Applied" even while the user is previewing a different one.
  const currentId = useMemo(() => {
    const t = Number(data.theme);
    if (!t) return null;
    const col = String(data.color || "").toLowerCase();
    return (presets.find((p) => p.style === t && p.primary.toLowerCase() === col) || presets.find((p) => p.style === t))?.id ?? null;
  }, [presets, data.theme, data.color]);

  // Show each template in its OWN native design in the chooser: clear the card's
  // custom background so the link-bio variants aren't all painted the same (their
  // background IS what distinguishes them). Empty bg_type disables the override.
  // Custom backgrounds still apply to the real card — they're set in the Builder.
  const baseData = useMemo(() => ({ ...data, bg_type: "" }), [data]);

  const thumbs = useMemo(() =>
    presets.map((p) => buildCardThumb({
      ...baseData,
      color: brandOn && brandPrimary ? brandPrimary : p.primary,
      color2: brandOn && brandSecondary ? brandSecondary : p.secondary,
    }, p.style)),
    [presets, baseData, brandOn, brandPrimary, brandSecondary]);

  // Full preview of the SELECTED template (not the applied one) — shown in a modal
  // so the user can see the design before committing.
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewHtml = useMemo(
    () => (selected ? buildCardThumb({ ...baseData, color: effPrimary, color2: effSecondary }, selected.style) : ""),
    [selected, baseData, effPrimary, effSecondary],
  );

  const pick = (id: number) => {
    setSelId(id); setDirty(true);
    const p = presets.find((x) => x.id === id);
    if (p) { setPrimary(""); setSecondary(p.secondary); } // reset custom to preset
  };
  const apply = () => {
    if (!selected) return;
    update({ theme: String(selected.style), color: effPrimary, color2: effSecondary });
    setDirty(false);
    toast.success(`"${selected.name}" applied${brandOn ? " in your brand colours" : ""}`);
  };

  return (
    <ModuleShell title="Templates" subtitle="Pick a ready-made design — each with its own colour combination" icon={LayoutGrid}
      actions={<button onClick={apply} disabled={!dirty || !selected} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50"><Save size={16} /> {dirty ? "Apply" : "Applied"}</button>}>

      {/* Gallery of prebuilt templates — each shown in its OWN colours */}
      <Panel title="Choose a template" subtitle={`${presets.length} ready-made designs, previewed with your details`}
        right={<Link to="/dashboard/view" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#14243E] hover:bg-[#F8FAFC]"><Eye size={13} /> Preview</Link>}>
        {hasBrand && (
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="text-[#B45309] shrink-0" />
              <span className="text-[12px] font-semibold text-[#92400E]">Preview in your brand colours</span>
              <span className="flex items-center gap-1 ml-1">
                {brandColors.map((c) => <span key={c} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} title={c} />)}
              </span>
            </div>
            <div className="inline-flex rounded-lg border border-[#E2E8F0] overflow-hidden text-[11px] font-semibold bg-white">
              {([["default", "Template colours"], ["brand", "My brand colours"]] as const).map(([k, label]) => {
                const active = (k === "brand") === brandOn;
                return <button key={k} type="button" onClick={() => { setBrandOn(k === "brand"); setDirty(true); }} className={`px-3 h-7 transition-colors ${active ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>{label}</button>;
              })}
            </div>
          </div>
        )}
        {presets.length === 0 ? (
          <div className="text-center py-10"><Palette size={26} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-xs text-[#94A3B8]">No templates available yet.</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {presets.map((p, i) => {
              const isSel = selId === p.id;
              const isCurrent = currentId === p.id;
              return (
                <button key={p.id} onClick={() => pick(p.id)}
                  className={`relative rounded-2xl border-2 overflow-hidden bg-white transition-all group ${isSel ? "border-[#F7B31C] shadow-gold ring-2 ring-[#F7B31C]/20" : isCurrent ? "border-emerald-400 ring-2 ring-emerald-400/15" : "border-[#F1F5F9] hover:border-[#F7B31C]/50 hover:-translate-y-0.5 hover:shadow-premium"}`}>
                  {isSel && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F7B31C] flex items-center justify-center z-10 shadow"><Check size={13} className="text-[#0F172A]" /></span>}
                  {isCurrent && <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow"><Check size={9} strokeWidth={3} /> APPLIED</span>}
                  {!isCurrent && defaultId === p.id && <span className="absolute top-2 left-2 z-10 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#0F172A] text-white">DEFAULT</span>}
                  <ThumbFrame html={thumbs[i]} title={p.name} />
                  <div className="px-2 py-2 flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: brandOn && brandPrimary ? brandPrimary : p.primary }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: brandOn && brandSecondary ? brandSecondary : p.secondary }} />
                    <p className={`text-[11px] font-semibold truncate ${isSel ? "text-[#B45309]" : "text-[#334155]"}`}>{p.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Optional colour fine-tune for the selected template only */}
      {selected && (
        <Panel title="Fine-tune colours" subtitle={`Optional — tweak "${selected.name}" to any colour you like`}
          right={<button onClick={() => { setCustomOpen((o) => !o); setDirty(true); if (!customOpen) { setPrimary(selected.primary); setSecondary(selected.secondary); } }} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${customOpen ? "bg-[#0F172A] text-white" : "border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]"}`}><SlidersHorizontal size={13} /> {customOpen ? "On" : "Customise"}</button>}>
          {customOpen ? (
            <div className="space-y-5">
              <ColorRow label="Primary" hint="buttons, highlights & icons" value={primary || selected.primary} swatches={PRIMARY_SW} onChange={(v) => { setPrimary(v); setDirty(true); }} />
              <div className="h-px bg-[#F1F5F9]" />
              <ColorRow label="Secondary" hint="dark section backgrounds" value={secondary} placeholder="#0F172A" swatches={SECONDARY_SW} allowClear onChange={(v) => { setSecondary(v); setDirty(true); }} />
            </div>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">This template uses its own colours. Tap <b>Customise</b> to override them with any colour.</p>
          )}
        </Panel>
      )}

      {/* Sticky Preview + Apply bar — appears the moment a template is selected.
          On mobile it sits ABOVE the bottom tab-bar (h-16 + safe area); on desktop
          (sidebar layout, no bottom nav) it drops to the bottom edge. */}
      {dirty && selected && (
        <div className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none bottom-[calc(4.75rem_+_env(safe-area-inset-bottom))] lg:bottom-4">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur rounded-2xl shadow-premium-lg border border-[#E2E8F0] pl-3.5 pr-2 py-2">
            <span className="hidden sm:flex items-center gap-2 pr-1">
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: effPrimary }} />
              <span className="text-[13px] font-semibold text-[#0F172A] max-w-[130px] truncate">{selected.name}</span>
            </span>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[#E2E8F0] text-[#334155] text-sm font-semibold hover:bg-[#F8FAFC] transition-colors"><Eye size={15} /> Preview</button>
            <button onClick={apply} className="inline-flex items-center gap-1.5 h-10 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold transition-all active:scale-[0.98]"><Check size={15} /> Apply</button>
          </div>
        </div>
      )}

      {/* Full preview modal — see the selected template before applying */}
      {previewOpen && selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-[390px] max-h-[92vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: effPrimary }} />
                <p className="text-sm font-bold text-[#0F172A] truncate">{selected.name}</p>
                <span className="text-[10px] font-semibold text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded-full shrink-0">Preview</span>
              </div>
              <button onClick={() => setPreviewOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] shrink-0"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-[#eef1f6]">
              <iframe title="Template preview" srcDoc={previewHtml} className="w-full block" style={{ height: 720, border: 0 }} />
            </div>
            <div className="p-3 border-t border-[#F1F5F9] flex gap-2 shrink-0">
              <button onClick={() => setPreviewOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-[#334155] text-sm font-semibold hover:bg-[#F8FAFC]">Close</button>
              <button onClick={() => { apply(); setPreviewOpen(false); }} className="flex-1 h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold hover:shadow-gold inline-flex items-center justify-center gap-1.5"><Check size={15} /> Apply this template</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
