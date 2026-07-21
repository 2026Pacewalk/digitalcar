import { X, Check, Eye } from "lucide-react";
import { TEMPLATES, renderTemplate } from "@/data/templates";
import type { TemplateColors, CardData } from "@/data/templates";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  templateId: number | null;
  colors: TemplateColors;
  cardData?: CardData;
  selectedId: number;
  onClose: () => void;
  onSelect: (id: number) => void;
}

export default function TemplatePreviewModal({
  isOpen, templateId, colors, cardData, selectedId, onClose, onSelect,
}: TemplatePreviewModalProps) {
  if (!isOpen || !templateId) return null;

  const tmpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tmpl) return null;

  const html = renderTemplate(templateId, cardData || {}, colors);
  const isSelected = selectedId === templateId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col lg:flex-row gap-6 max-w-4xl w-full max-h-[90vh]">
        {/* Phone Preview */}
        <div className="flex-shrink-0 flex justify-center">
          <div className="relative w-[320px] bg-white rounded-[32px] shadow-2xl overflow-hidden border-4 border-[#E2E8F0]" style={{ maxHeight: "680px" }}>
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#E2E8F0] rounded-b-xl z-20" />
            {/* Scrollable content */}
            <div
              className="pt-6 overflow-y-auto scrollbar-none"
              style={{ maxHeight: "672px" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-base font-semibold text-[#0F172A]">{tmpl.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B] font-medium capitalize">{tmpl.category}</span>
                {tmpl.isPremium && <span className="badge-gold text-[10px]">Premium</span>}
                {isSelected && <span className="badge-green text-[10px]">Selected</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"><X size={18} /></button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Color Palette */}
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Color Palette</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full border border-[#E2E8F0]" style={{ background: colors.primary }} /><span className="text-[10px] text-[#64748B]">Primary</span></div>
                <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full border border-[#E2E8F0]" style={{ background: colors.secondary }} /><span className="text-[10px] text-[#64748B]">Secondary</span></div>
                <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full border border-[#E2E8F0]" style={{ background: colors.accent }} /><span className="text-[10px] text-[#64748B]">Accent</span></div>
              </div>
            </div>

            {/* Template Info */}
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-[#F1F5F9]"><span className="text-xs text-[#94A3B8]">Layout Type</span><span className="text-xs font-medium text-[#0F172A] capitalize">{tmpl.layoutType}</span></div>
              <div className="flex justify-between py-2 border-b border-[#F1F5F9]"><span className="text-xs text-[#94A3B8]">Category</span><span className="text-xs font-medium text-[#0F172A] capitalize">{tmpl.category}</span></div>
              <div className="flex justify-between py-2"><span className="text-xs text-[#94A3B8]">Status</span><span className={`text-xs font-medium ${tmpl.isPremium ? "text-[#F7B31C]" : "text-emerald-600"}`}>{tmpl.isPremium ? "Premium" : "Free"}</span></div>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This template will apply to your public digital card. Your business details, services, gallery, and other content will remain unchanged.
            </p>
          </div>

          <div className="p-5 border-t border-[#F1F5F9] flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC]">Close</button>
            <button
              onClick={() => { onSelect(templateId); onClose(); }}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                isSelected
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "gradient-gold text-[#0F172A] hover:shadow-gold"
              }`}
            >
              {isSelected ? <><Check size={14} /> Selected</> : <><Check size={14} /> Select Template</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
