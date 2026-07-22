import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { LayoutGrid, Check, Eye, Save, Palette, Search } from "lucide-react";
import { toast } from "sonner";
import ModuleShell, { Panel } from "@/components/customer/ModuleShell";
import { useCustomer } from "@/hooks/useCustomer";
import { buildCardThumb, TEMPLATE_COUNT } from "@/card-template/buildCard";

const SWATCHES = ["#F7B31C", "#14243E", "#3B82F6", "#A21CAF", "#06B6D4", "#EF4444", "#0F172A", "#EAB308", "#16A34A", "#DB2777"];

export default function CustomerTemplates() {
  const { data, update } = useCustomer();
  const [sel, setSel] = useState<number>(Number(data.theme) || 1);
  const [color, setColor] = useState<string>(String(data.color || "#F7B31C"));
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  // Seed from the customer record once it loads
  useEffect(() => {
    setSel(Number(data.theme) || 1);
    setColor(String(data.color || "#F7B31C"));
  }, [data.theme, data.color]);

  // Real thumbnails: the user's own card data rendered in each of the 31 templates
  const thumbs = useMemo(() => {
    const pc = { ...data, color };
    return Array.from({ length: TEMPLATE_COUNT }, (_, i) => buildCardThumb(pc, i + 1));
  }, [data, color]);

  const pick = (n: number) => { setSel(n); setDirty(true); };
  const pickColor = (c: string) => { setColor(c); setDirty(true); };
  const save = () => { update({ theme: String(sel), color }); setDirty(false); toast.success(`Template ${sel} applied to your card`); };

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

      {/* ── Colour ── */}
      <Panel title="Card colour" subtitle="Sets the accent colour across your chosen template">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5">
            <input type="color" value={color} onChange={(e) => pickColor(e.target.value)} className="w-8 h-8 rounded-lg border border-[#E2E8F0] cursor-pointer bg-transparent" />
            <input value={color} onChange={(e) => pickColor(e.target.value)} className="w-24 h-8 bg-transparent text-sm font-mono outline-none" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {SWATCHES.map((c) => (
              <button key={c} onClick={() => pickColor(c)} aria-label={c}
                className={`w-9 h-9 rounded-lg ring-2 transition-all ${color.toLowerCase() === c.toLowerCase() ? "ring-[#0F172A] scale-110" : "ring-transparent hover:scale-105"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
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
