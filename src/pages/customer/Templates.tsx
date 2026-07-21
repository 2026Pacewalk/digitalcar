import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { TEMPLATES, renderTemplate } from "@/data/templates";
import type { TemplateColors, CardData } from "@/data/templates";
import ColorPicker from "@/components/template/ColorPicker";
import TemplatePreviewModal from "@/components/template/TemplatePreviewModal";
import { toast } from "sonner";
import {
  Search, Eye, Check, Lock, Sparkles, Filter,
  Palette, Phone, Mail, Globe, MapPin, MessageCircle,
} from "lucide-react";

const categories = ["All", "Classic", "Professional", "Minimal", "Corporate", "Modern", "Creative", "Premium"];

const demoCardData: CardData = {
  businessName: "Business Name",
  ownerName: "Owner Name",
  designation: "Your Designation",
  phone: "+91 98765 43210",
  whatsapp: "+919876543210",
  email: "contact@business.com",
  website: "www.business.com",
  address: "123 Business Street, City, India",
  socialLinks: [
    { platform: "facebook", url: "#" },
    { platform: "instagram", url: "#" },
    { platform: "youtube", url: "#" },
    { platform: "twitter", url: "#" },
  ],
};

/* ─── Mini Template Card (live HTML render) ─── */
function MiniTemplateCard({
  templateId, colors, data,
  isSelected, isPremium, hasAccess,
  onSelect, onPreview,
}: {
  templateId: number; colors: TemplateColors; data: CardData;
  isSelected: boolean; isPremium: boolean; hasAccess: boolean;
  onSelect: () => void; onPreview: () => void;
}) {
  const html = useMemo(() => renderTemplate(templateId, data, colors), [templateId, colors, data]);

  return (
    <div className={`bg-white rounded-2xl shadow-premium border-2 overflow-hidden transition-all duration-300 group ${
      isSelected ? "border-[#F7B31C] shadow-gold scale-[1.02]" : "border-[#F1F5F9] hover:border-[#CBD5E1] hover:shadow-lg"
    }`}>
      {/* Preview Area — scaled down */}
      <div className="relative bg-[#F8FAFC] p-3 flex justify-center">
        <div
          className="w-[180px] h-[280px] rounded-[16px] overflow-hidden shadow-md bg-white scale-[0.85] origin-top"
          style={{ transform: "scale(0.85)", transformOrigin: "top center", height: "330px", marginBottom: "-50px" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2 z-10">
          <button
            onClick={onPreview}
            className="h-9 px-4 bg-white text-[#0F172A] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform"
          >
            <Eye size={14} /> View
          </button>
        </div>

        {/* Premium badge */}
        {isPremium && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#0F172A]/80 backdrop-blur-sm px-2 py-1 rounded-lg">
            <Lock size={10} className="text-[#F7B31C]" />
            <span className="text-[9px] font-semibold text-[#F7B31C]">Premium</span>
          </div>
        )}

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-500 px-2 py-1 rounded-lg">
            <Check size={10} className="text-white" />
            <span className="text-[9px] font-semibold text-white">Selected</span>
          </div>
        )}

        {/* Views */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
          <Eye size={10} className="text-[#64748B]" />
          <span className="text-[9px] font-medium text-[#64748B]">{[2847, 1923, 3412, 1567, 2134, 3890, 1245, 2678, 1987, 3245][templateId % 10]}</span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#0F172A]">{TEMPLATES.find((t) => t.id === templateId)?.name}</h3>
        </div>
        <div className="flex items-center justify-between">
          {/* Color dots */}
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.primary }} />
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.secondary }} />
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.accent }} />
          </div>
          {/* Category tag */}
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B] font-medium capitalize">
            {TEMPLATES.find((t) => t.id === templateId)?.category}
          </span>
        </div>

        {/* Select button */}
        <button
          onClick={onSelect}
          disabled={isPremium && !hasAccess}
          className={`w-full mt-2.5 h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            isSelected
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : isPremium && !hasAccess
                ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed"
                : "gradient-gold text-[#0F172A] hover:shadow-gold active:scale-[0.98]"
          }`}
        >
          {isSelected ? <><Check size={12} /> Selected</> : isPremium && !hasAccess ? <><Lock size={12} /> Upgrade to Use</> : <><Check size={12} /> Select</>}
        </button>
      </div>
    </div>
  );
}

export default function CustomerTemplates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [colors, setColors] = useState<TemplateColors>({ primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" });
  const [selectedId, setSelectedId] = useState<number>(1);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Simulate customer has free plan (no premium access)
  const hasPremiumAccess = false;

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || t.category === category;
    return matchesSearch && matchesCategory && t.isActive;
  });

  const handleSelect = (id: number) => {
    const tmpl = TEMPLATES.find((t) => t.id === id);
    if (tmpl?.isPremium && !hasPremiumAccess) {
      toast.error("Upgrade to use this premium template");
      return;
    }
    setSelectedId(id);
    toast.success("Template selected! Save to apply changes.");
  };

  const handlePreview = (id: number) => {
    setPreviewId(id);
    setIsPreviewOpen(true);
  };

  const handleSave = () => {
    localStorage.setItem("digitalcarda_template_id", String(selectedId));
    localStorage.setItem("digitalcarda_template_colors", JSON.stringify(colors));
    toast.success("Template and colors saved successfully!");
  };

  return (
    <DashboardLayout>
      <TopBar title="Select Theme" subtitle="Choose a template design for your digital card" />

      <div className="p-6 space-y-6">
        {/* Top Bar — Search + Category + Save */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text" placeholder="Search templates..."
                value={search} onChange={(e) => { setSearch(e.target.value); }}
                className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === cat ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >{cat}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] flex items-center gap-2 shrink-0">
            <Check size={16} /> Save Selection
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar — Color Picker + Current Selection */}
          <div className="lg:col-span-1 space-y-4">
            <ColorPicker colors={colors} onChange={setColors} />

            {/* Current Selection Card */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
              <p className="text-xs font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-[#F7B31C]" /> Current Selection
              </p>
              {(() => {
                const tmpl = TEMPLATES.find((t) => t.id === selectedId);
                if (!tmpl) return null;
                return (
                  <div>
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-[#F8FAFC] mb-2">
                      <div dangerouslySetInnerHTML={{ __html: renderTemplate(selectedId, demoCardData, colors) }} />
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A]">{tmpl.name}</p>
                    <p className="text-[10px] text-[#94A3B8] capitalize">{tmpl.category} &middot; {tmpl.layoutType}</p>
                  </div>
                );
              })()}
            </div>

            {/* Live Data Preview */}
            <div className="bg-[#0F172A] rounded-2xl shadow-premium border border-[#1E293B] p-4">
              <p className="text-[10px] font-semibold text-[#F7B31C] uppercase tracking-wider mb-3">Live Preview Data</p>
              {[
                { icon: Phone, label: "Phone", value: demoCardData.phone },
                { icon: MessageCircle, label: "WhatsApp", value: demoCardData.whatsapp },
                { icon: Mail, label: "Email", value: demoCardData.email },
                { icon: Globe, label: "Website", value: demoCardData.website },
                { icon: MapPin, label: "Address", value: demoCardData.address },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 py-1.5 border-b border-[#1E293B] last:border-0">
                  <item.icon size={12} className="text-[#64748B] shrink-0" />
                  <span className="text-[10px] text-[#94A3B8] w-16 shrink-0">{item.label}</span>
                  <span className="text-[10px] text-[#CBD5E1] truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          <div className="lg:col-span-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
                <Palette size={32} className="text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-sm text-[#94A3B8]">No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <MiniTemplateCard
                    key={t.id}
                    templateId={t.id}
                    colors={colors}
                    data={demoCardData}
                    isSelected={selectedId === t.id}
                    isPremium={t.isPremium}
                    hasAccess={hasPremiumAccess || !t.isPremium}
                    onSelect={() => handleSelect(t.id)}
                    onPreview={() => handlePreview(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        templateId={previewId}
        colors={colors}
        cardData={demoCardData}
        selectedId={selectedId}
        onClose={() => setIsPreviewOpen(false)}
        onSelect={handleSelect}
      />
    </DashboardLayout>
  );
}
