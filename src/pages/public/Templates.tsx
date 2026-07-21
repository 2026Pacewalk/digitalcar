import { useState, useMemo } from "react";
import { Link } from "react-router";
import { TEMPLATES, renderTemplate } from "@/data/templates";
import type { TemplateColors, CardData } from "@/data/templates";
import TemplatePreviewModal from "@/components/template/TemplatePreviewModal";
import {
  Search, Eye, Check, Lock, ArrowRight, Filter, Palette,
} from "lucide-react";

const categories = ["All", "Classic", "Professional", "Minimal", "Corporate", "Modern", "Creative", "Premium"];

const demoCardData: CardData = {
  businessName: "Apex Digital Solutions",
  ownerName: "Raj Sharma",
  designation: "Founder & CEO",
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  email: "raj@apexdigital.in",
  website: "www.apexdigital.in",
  address: "12B, Sector 18, Gurgaon, Haryana 122001",
  socialLinks: [
    { platform: "facebook", url: "#" },
    { platform: "instagram", url: "#" },
    { platform: "youtube", url: "#" },
    { platform: "linkedin", url: "#" },
  ],
};

/* ─── Mini Template Card (live HTML render) ─── */
function MiniTemplateCard({
  templateId, colors, data,
  isPremium,
  onPreview,
}: {
  templateId: number; colors: TemplateColors; data: CardData;
  isPremium: boolean;
  onPreview: () => void;
}) {
  const html = useMemo(() => renderTemplate(templateId, data, colors), [templateId, colors, data]);
  const tmpl = TEMPLATES.find((t) => t.id === templateId);

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden card-hover group">
      {/* Preview Area — scaled down live render */}
      <div className="relative bg-[#F8FAFC] p-3 flex justify-center overflow-hidden">
        <div
          className="w-[180px] rounded-[16px] overflow-hidden shadow-md bg-white"
          style={{ transform: "scale(0.85)", transformOrigin: "top center", height: "330px", marginBottom: "-50px" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Hover overlay with Preview button */}
        <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2 z-10">
          <button
            onClick={onPreview}
            className="h-10 px-5 bg-white text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
          >
            <Eye size={16} /> Preview
          </button>
        </div>

        {/* Premium badge */}
        {isPremium && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#0F172A]/80 backdrop-blur-sm px-2 py-1 rounded-lg">
            <Lock size={10} className="text-[#F7B31C]" />
            <span className="text-[9px] font-semibold text-[#F7B31C]">Premium</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#0F172A]">{tmpl?.name}</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B] font-medium capitalize">
            {tmpl?.category}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {/* Color dots */}
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.primary }} />
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.secondary }} />
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: colors.accent }} />
          </div>
          <span className="text-[10px] text-[#94A3B8] capitalize">{tmpl?.layoutType} layout</span>
        </div>
      </div>
    </div>
  );
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [colors] = useState<TemplateColors>({ primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" });
  const [selectedId, setSelectedId] = useState<number>(1);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || t.category === category;
    return matchesSearch && matchesCategory && t.isActive;
  });

  const handlePreview = (id: number) => {
    setPreviewId(id);
    setIsPreviewOpen(true);
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Templates</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Choose from Beautiful Ready-to-Use Templates</h1>
          <p className="mt-4 text-base text-[#64748B]">
            Select a professional card design, customize colors, upload your logo, add business details, and publish instantly.
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === cat ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F9] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <Palette size={32} className="text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm text-[#94A3B8]">No templates found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((t) => (
              <MiniTemplateCard
                key={t.id}
                templateId={t.id}
                colors={t.colors}
                data={demoCardData}
                isPremium={t.isPremium}
                onPreview={() => handlePreview(t.id)}
              />
            ))}
          </div>
        )}

        {/* AI Generator CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Can&apos;t Find the Perfect Template?</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-lg mx-auto">Use our AI Card Generator to create a custom card tailored to your business and industry.</p>
          <Link to="/ai-card-generator" className="btn-gold h-12 px-8 inline-flex items-center justify-center gap-2">
            Try AI Card Generator <ArrowRight size={16} />
          </Link>
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
    </div>
  );
}
