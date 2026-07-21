import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { TEMPLATES, renderTemplate } from "@/data/templates";
import type { TemplateColors, CardData } from "@/data/templates";
import { useState } from "react";
import { toast } from "sonner";
import {
  Search, Plus, Pencil, Eye, Check, Lock, Unlock,
  Trash2, X, Palette, EyeIcon, ChevronLeft, ChevronRight,
  Save, ToggleLeft, ToggleRight,
} from "lucide-react";

const categories = ["All", "Classic", "Professional", "Minimal", "Corporate", "Modern", "Creative", "Premium"];

const demoCardData: CardData = {
  businessName: "Demo Business",
  ownerName: "Demo Owner",
  designation: "Demo Designation",
  phone: "+91 98765 43210",
  whatsapp: "+919876543210",
  email: "demo@business.com",
  website: "www.demo.com",
  address: "Demo Address, City",
};

export default function AdminTemplates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const limit = 6;

  // Template edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", isPremium: false, isActive: true, sortOrder: 0 });
  const [previewId, setPreviewId] = useState<number | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || t.category === category;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openEdit = (id: number) => {
    const tmpl = TEMPLATES.find((t) => t.id === id);
    if (!tmpl) return;
    setEditForm({ name: tmpl.name, category: tmpl.category, isPremium: tmpl.isPremium, isActive: tmpl.isActive, sortOrder: tmpl.sortOrder });
    setEditId(id);
  };

  const handleSaveEdit = () => {
    const idx = TEMPLATES.findIndex((t) => t.id === editId);
    if (idx >= 0) {
      TEMPLATES[idx] = { ...TEMPLATES[idx], ...editForm };
      toast.success("Template updated!");
    }
    setEditId(null);
  };

  const toggleActive = (id: number) => {
    const idx = TEMPLATES.findIndex((t) => t.id === id);
    if (idx >= 0) {
      TEMPLATES[idx].isActive = !TEMPLATES[idx].isActive;
      toast.success(TEMPLATES[idx].isActive ? "Template activated" : "Template deactivated");
    }
  };

  const togglePremium = (id: number) => {
    const idx = TEMPLATES.findIndex((t) => t.id === id);
    if (idx >= 0) {
      TEMPLATES[idx].isPremium = !TEMPLATES[idx].isPremium;
      toast.success(TEMPLATES[idx].isPremium ? "Marked as Premium" : "Marked as Free");
    }
  };

  return (
    <DashboardLayout>
      <TopBar title="Template Manager" subtitle="Manage card templates" />
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text" placeholder="Search templates..."
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 shadow-premium transition-all placeholder:text-[#94A3B8]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat ? "bg-[#0F172A] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all flex items-center gap-2">
              <Plus size={16} /> Add Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Templates", value: TEMPLATES.length, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Active", value: TEMPLATES.filter((t) => t.isActive).length, color: "bg-[#D1FAE5] text-[#065F46]" },
            { label: "Premium", value: TEMPLATES.filter((t) => t.isPremium).length, color: "bg-[#FCE7F3] text-[#9D174D]" },
            { label: "Free", value: TEMPLATES.filter((t) => !t.isPremium).length, color: "bg-[#DBEAFE] text-[#1E40AF]" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-premium border border-[#F1F5F9]">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}><Palette size={18} /></div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((tmpl) => {
            const html = renderTemplate(tmpl.id, demoCardData);
            return (
              <div key={tmpl.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
                <div className="relative bg-[#F8FAFC] p-3 flex justify-center">
                  <div
                    className="w-[160px] rounded-[14px] overflow-hidden shadow-md bg-white"
                    style={{ transform: "scale(0.8)", transformOrigin: "top center", height: "280px", marginBottom: "-56px" }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {tmpl.isPremium ? (
                      <span className="badge-gold text-[9px] flex items-center gap-1"><Lock size={8} /> Premium</span>
                    ) : (
                      <span className="badge-green text-[9px] flex items-center gap-1"><Unlock size={8} /> Free</span>
                    )}
                    {!tmpl.isActive && <span className="badge-gray bg-gray-100 text-gray-600 text-[9px]">Inactive</span>}
                  </div>
                </div>
                <div className="p-4 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A]">{tmpl.name}</h3>
                      <p className="text-[10px] text-[#94A3B8] capitalize">{tmpl.category} &middot; {tmpl.layoutType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-[#E2E8F0]" style={{ background: tmpl.colors.primary }} />
                      <div className="w-4 h-4 rounded-full border border-[#E2E8F0]" style={{ background: tmpl.colors.secondary }} />
                      <div className="w-4 h-4 rounded-full border border-[#E2E8F0]" style={{ background: tmpl.colors.accent }} />
                    </div>
                    <span className="text-[10px] text-[#94A3B8]">ID: {tmpl.id}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPreviewId(tmpl.id)} className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><EyeIcon size={14} /></button>
                    <button onClick={() => openEdit(tmpl.id)} className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => toggleActive(tmpl.id)} className={`p-2 rounded-lg transition-colors ${tmpl.isActive ? "bg-[#D1FAE5] text-emerald-600" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                      {tmpl.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => togglePremium(tmpl.id)} className={`p-2 rounded-lg transition-colors ${tmpl.isPremium ? "bg-[#FCE7F3] text-[#EC4899]" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                      {tmpl.isPremium ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#94A3B8]">Page {page} of {totalPages} ({filtered.length} templates)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">{TEMPLATES.find((t) => t.id === previewId)?.name}</h3>
              <button onClick={() => setPreviewId(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9]"><X size={16} className="text-[#64748B]" /></button>
            </div>
            <div className="flex justify-center">
              <div className="w-[280px] bg-white rounded-[24px] shadow-lg overflow-hidden border-4 border-[#E2E8F0]">
                <div dangerouslySetInnerHTML={{ __html: renderTemplate(previewId, demoCardData) }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
              <h3 className="text-base font-semibold text-[#0F172A]">Edit Template</h3>
              <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-[#F1F5F9]"><X size={18} className="text-[#64748B]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Template Name</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-premium w-full" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Category</label>
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input-premium w-full">
                    {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Sort Order</label><input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} className="input-premium w-full" /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.isPremium} onChange={(e) => setEditForm({ ...editForm, isPremium: e.target.checked })} /> <span className="text-xs text-[#0F172A]">Premium</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} /> <span className="text-xs text-[#0F172A]">Active</span></label>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#F1F5F9]">
              <button onClick={() => setEditId(null)} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 h-10 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><Save size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
