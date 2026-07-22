import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { LayoutGrid, Check, Eye, Save, Palette, Search, Pipette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";

const SWATCHES = ["#F7B31C", "#14243E", "#3B82F6", "#A21CAF", "#06B6D4", "#EF4444", "#0F172A", "#EAB308", "#16A34A", "#DB2777"];
const SECONDARY_SWATCHES = ["#0F172A", "#1E293B", "#0f2b2e", "#3f1d2e", "#1e1b4b", "#422006", "#0c4a6e", "#14532d", "#3b0764", "#414141"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* Reusable colour control: big live swatch + "any colour" wheel + hex + presets */
function ColorRow({
  label, hint, value, placeholder, swatches, allowClear, onChange, ring = "#0F172A",
}: {
  label: string; hint: string; value: string; placeholder?: string; swatches: string[];
  allowClear?: boolean; onChange: (v: string) => void; ring?: string;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const current = value || placeholder || "#0F172A";
  const commitHex = (v: string) => {
    let h = v.trim(); if (h && !h.startsWith("#")) h = "#" + h;
    setHex(h);
    if (h === "" && allowClear) onChange("");
    else if (HEX_RE.test(h)) onChange(h.toLowerCase());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-[#64748B]">{label} <span className="font-normal text-[#94A3B8]">· {hint}</span></p>
        {allowClear && value && <button onClick={() => onChange("")} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F7B31C] hover:text-[#D97706]"><RotateCcw size={11} /> Default</button>}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Live current swatch → opens the OS colour picker */}
        <button type="button" onClick={() => nativeRef.current?.click()} title="Choose any colour"
          className="relative w-11 h-11 rounded-xl border-2 border-white shadow-premium ring-1 ring-[#E2E8F0] overflow-hidden shrink-0 active:scale-95 transition-transform"
          style={{ background: current }}>
          <input ref={nativeRef} type="color" value={value || "#0F172A"} onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer" tabIndex={-1} />
        </button>

        {/* "Any colour" wheel button */}
        <button type="button" onClick={() => nativeRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors shrink-0">
          <span className="w-5 h-5 rounded-full shrink-0" style={{ background: "conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444)" }} />
          <span className="text-xs font-semibold text-[#334155]"><Pipette size={12} className="inline -mt-0.5 mr-0.5" />Any colour</span>
        </button>

        {/* Hex input */}
        <div className="flex items-center h-11 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
          <span className="text-[#94A3B8] text-sm">#</span>
          <input value={hex.replace(/^#/, "")} onChange={(e) => commitHex(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
            placeholder={placeholder ? placeholder.replace(/^#/, "") : "hex"} className="w-16 h-full bg-transparent text-sm font-mono outline-none placeholder:text-[#CBD5E1]" />
        </div>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap mt-2.5">
        {swatches.map((c) => (
          <button key={c} onClick={() => onChange(c)} aria-label={c}
            className={`w-8 h-8 rounded-lg ring-2 transition-all ${value.toLowerCase() === c.toLowerCase() ? "scale-110" : "ring-transparent hover:scale-105"}`}
            style={{ background: c, ...(value.toLowerCase() === c.toLowerCase() ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ring}` } : {}) }} />
        ))}
      </div>
    </div>
  );
}

export default function CustomerTemplates() {
  const { data, update } = useCustomer();
  const [sel, setSel] = useState<number>(Number(data.theme) || 1);
  const [color, setColor] = useState<string>(String(data.color || "#F7B31C"));
  const [secondary, setSecondary] = useState<string>(String(data.color2 || ""));
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  // Seed from the customer record once it loads
  useEffect(() => {
    setSel(Number(data.theme) || 1);
    setColor(String(data.color || "#F7B31C"));
    setSecondary(String(data.color2 || ""));
  }, [data.theme, data.color, data.color2]);

  // Real thumbnails: the user's own card data rendered in each of the 31 templates
  const thumbs = useMemo(() => {
    const pc = { ...data, color, color2: secondary };
    return Array.from({ length: TEMPLATE_COUNT }, (_, i) => buildCardThumb(pc, i + 1));
  }, [data, color, secondary]);

  const pick = (n: number) => { setSel(n); setDirty(true); };
  const pickColor = (c: string) => { setColor(c); setDirty(true); };
  const pickSecondary = (c: string) => { setSecondary(c); setDirty(true); };
  const save = () => { update({ theme: String(sel), color, color2: secondary }); setDirty(false); toast.success(`Template ${sel} applied to your card`); };

  const list = Array.from({ length: TEMPLATE_COUNT }, (_, i) => i + 1)
    .filter((n) => !query || `template ${n}`.includes(query.toLowerCase().trim()) || String(n) === query.trim());

  return (
    <ModuleShell title="Templates" subtitle={`Choose from ${TEMPLATE_COUNT} one-page card designs — previewed with your own details`} icon={LayoutGrid}
      actions={
        <button onClick={save} disabled={!dirty}
          className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50">
          <Save size={16} /> {dirty ? "Apply" : "Applied"}
        </button>
      }>

      {/* ── Colours ── */}
      <Panel title="Colour combination" subtitle="Choose any colour — primary accent + secondary (dark sections)">
        <div className="space-y-5">
          <ColorRow label="Primary" hint="buttons, highlights & icons" value={color}
            swatches={SWATCHES} onChange={pickColor} ring="#0F172A" />
          <div className="h-px bg-[#F1F5F9]" />
          <ColorRow label="Secondary" hint="dark section backgrounds" value={secondary} placeholder="#0F172A"
            swatches={SECONDARY_SWATCHES} allowClear onChange={pickSecondary} ring="#F7B31C" />
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-4">Tip: tap the colour circle or “Any colour” to open the full colour picker. Leave secondary on Default to keep each template's original dark shade.</p>
      </Panel>

      {/* ── Gallery ── */}
      <Panel title="All templates" subtitle={`${TEMPLATE_COUNT} designs — tap one to select, then Apply`}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find #" className="h-9 w-24 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] pl-7 pr-2 text-xs outline-none focus:border-[#F7B31C]" />
            </div>
            <Link to="/dashboard/view" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#14243E] hover:bg-[#F8FAFC]"><Eye size={13} /> Preview</Link>
          </div>
        }>
        {list.length === 0 ? (
          <div className="text-center py-10"><Palette size={26} className="mx-auto text-[#CBD5E1] mb-2" /><p className="text-xs text-[#94A3B8]">No template #{query}</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((n) => {
              const selected = sel === n;
              return (
                <button key={n} onClick={() => pick(n)}
                  className={`relative rounded-2xl border-2 overflow-hidden bg-white transition-all group ${selected ? "border-[#F7B31C] shadow-gold ring-2 ring-[#F7B31C]/20" : "border-[#F1F5F9] hover:border-[#F7B31C]/50 hover:-translate-y-0.5 hover:shadow-premium"}`}>
                  {selected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F7B31C] flex items-center justify-center z-10 shadow"><Check size={13} className="text-[#0F172A]" /></span>}
                  <div className="relative w-full overflow-hidden bg-[#F8FAFC] pointer-events-none" style={{ aspectRatio: "3 / 4.4" }}>
                    <iframe title={`Template ${n}`} srcDoc={thumbs[n - 1]} scrolling="no" tabIndex={-1} loading="lazy"
                      style={{ width: "375px", height: "560px", border: 0, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }} />
                  </div>
                  <p className={`text-[11px] font-semibold py-2 text-center transition-colors ${selected ? "text-[#B45309] bg-[#FEF3C7]" : "text-[#334155] group-hover:text-[#0F172A]"}`}>
                    {selected ? "✓ Selected" : `Template ${n}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </ModuleShell>
  );
}
