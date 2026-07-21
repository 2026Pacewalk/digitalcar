import { useState } from "react";
import { Palette, Check } from "lucide-react";
import type { TemplateColors } from "@/data/templates";

interface ColorPickerProps {
  colors: TemplateColors;
  onChange: (colors: Partial<TemplateColors>) => void;
}

const presets = [
  { name: "Gold Navy", primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" },
  { name: "Royal Gold", primary: "#D4AF37", secondary: "#0a0a0a", accent: "#F7B31C" },
  { name: "Minimal", primary: "#F7B31C", secondary: "#0F172A", accent: "#0F172A" },
  { name: "Teal", primary: "#14B8A6", secondary: "#0F172A", accent: "#F7B31C" },
  { name: "Rose", primary: "#EC4899", secondary: "#0F172A", accent: "#F43F5E" },
  { name: "Ocean", primary: "#3B82F6", secondary: "#0F172A", accent: "#14B8A6" },
  { name: "Emerald", primary: "#10B981", secondary: "#0F172A", accent: "#34D399" },
  { name: "Coral", primary: "#F97316", secondary: "#0F172A", accent: "#FB923C" },
];

export default function ColorPicker({ colors, onChange }: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState<"picker" | "presets">("presets");

  const isActivePreset = (p: typeof presets[0]) =>
    colors.primary === p.primary && colors.secondary === p.secondary && colors.accent === p.accent;

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
      <div className="flex border-b border-[#F1F5F9]">
        {(["presets", "picker"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold transition-all capitalize ${
              activeTab === tab
                ? "text-[#F7B31C] border-b-2 border-[#F7B31C] bg-[#FEF3C7]/30"
                : "text-[#94A3B8] hover:text-[#64748B]"
            }`}
          >
            {tab === "presets" ? "Preset Swatches" : "Custom Colors"}
          </button>
        ))}
      </div>

      {activeTab === "presets" ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => onChange({ primary: p.primary, secondary: p.secondary, accent: p.accent })}
                className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isActivePreset(p)
                    ? "border-[#F7B31C] bg-[#FEF3C7]/20 shadow-md"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ background: p.primary }} />
                  <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ background: p.secondary }} />
                  <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ background: p.accent }} />
                </div>
                <span className="text-xs font-medium text-[#0F172A]">{p.name}</span>
                {isActivePreset(p) && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#F7B31C] flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {[
            { key: "primary" as const, label: "Primary Color", desc: "Headers, buttons, accents" },
            { key: "secondary" as const, label: "Secondary Color", desc: "Backgrounds, text" },
            { key: "accent" as const, label: "Accent Color", desc: "CTAs, highlights" },
          ].map(({ key, label, desc }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
                  <p className="text-[10px] text-[#94A3B8]">{desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className="w-8 h-8 rounded-lg border-2 border-[#E2E8F0] cursor-pointer overflow-hidden"
                  />
                  <span className="text-[10px] font-mono text-[#64748B] uppercase">{colors[key]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
