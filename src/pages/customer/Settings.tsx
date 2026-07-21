import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import {
  Save, User, Lock, Bell, CreditCard, Camera,
  Palette, Eye, Check, Sparkles,
} from "lucide-react";
import { TEMPLATES, renderTemplate } from "@/data/templates";
import type { TemplateColors, CardData } from "@/data/templates";
import ColorPicker from "@/components/template/ColorPicker";
import TemplatePreviewModal from "@/components/template/TemplatePreviewModal";
import { toast } from "sonner";

const demoCardData: CardData = {
  businessName: "Your Business",
  ownerName: "Your Name",
  designation: "Your Designation",
  phone: "+91 98765 43210",
  whatsapp: "+919876543210",
  email: "you@business.com",
  website: "www.yourbusiness.com",
  address: "Your Business Address",
  socialLinks: [
    { platform: "facebook", url: "#" },
    { platform: "instagram", url: "#" },
  ],
};

export default function CustomerSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // Theme state
  const [themeColors, setThemeColors] = useState<TemplateColors>({ primary: "#F7B31C", secondary: "#0F172A", accent: "#14B8A6" });
  const [selectedTemplateId, setSelectedTemplateId] = useState(1);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "theme", label: "Select Theme", icon: Palette },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success("Settings saved"); }, 600);
  };

  const handleSaveTheme = () => {
    localStorage.setItem("digitalcarda_template_id", String(selectedTemplateId));
    localStorage.setItem("digitalcarda_template_colors", JSON.stringify(themeColors));
    toast.success("Theme saved! Your card will now use the selected template.");
  };

  const handleSelectTemplate = (id: number) => {
    setSelectedTemplateId(id);
    toast.success("Template selected! Click Save Theme to apply.");
  };

  const filteredTemplates = TEMPLATES.filter((t) => t.isActive);

  return (
    <DashboardLayout>
      <TopBar title="Settings" subtitle="Manage your account and theme" />
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <tab.icon size={17} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">

            {/* ─── THEME TAB ─── */}
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                    <Palette size={18} className="text-[#F7B31C]" /> Select Theme
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Choose a template and customize colors for your digital card</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Color Picker */}
                  <div className="xl:col-span-1">
                    <ColorPicker colors={themeColors} onChange={setThemeColors} />

                    {/* Current Selection */}
                    <div className="mt-4 bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
                      <p className="text-xs font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-[#F7B31C]" /> Selected Template
                      </p>
                      {(() => {
                        const tmpl = TEMPLATES.find((t) => t.id === selectedTemplateId);
                        if (!tmpl) return null;
                        return (
                          <div>
                            <div className="w-full h-48 rounded-xl overflow-hidden bg-[#F8FAFC] mb-2 relative">
                              <div dangerouslySetInnerHTML={{ __html: renderTemplate(selectedTemplateId, demoCardData, themeColors) }} />
                            </div>
                            <p className="text-sm font-semibold text-[#0F172A]">{tmpl.name}</p>
                            <p className="text-[10px] text-[#94A3B8] capitalize">{tmpl.category} &middot; {tmpl.layoutType}</p>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      onClick={handleSaveTheme}
                      className="w-full mt-4 h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Save Theme
                    </button>
                  </div>

                  {/* Template Grid */}
                  <div className="xl:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTemplates.map((tmpl) => {
                        const html = renderTemplate(tmpl.id, demoCardData, themeColors);
                        const isSelected = selectedTemplateId === tmpl.id;
                        return (
                          <div
                            key={tmpl.id}
                            className={`bg-white rounded-2xl shadow-premium border-2 overflow-hidden transition-all ${
                              isSelected ? "border-[#F7B31C] shadow-gold" : "border-[#F1F5F9] hover:border-[#CBD5E1]"
                            }`}
                          >
                            <div className="relative bg-[#F8FAFC] p-3 flex justify-center">
                              <div
                                className="w-[160px] h-[220px] rounded-[14px] overflow-hidden shadow-md bg-white"
                                style={{ transform: "scale(0.8)", transformOrigin: "top center", height: "280px", marginBottom: "-60px" }}
                                dangerouslySetInnerHTML={{ __html: html }}
                              />
                              {isSelected && (
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-500 px-2 py-1 rounded-lg">
                                  <Check size={10} className="text-white" />
                                  <span className="text-[9px] font-semibold text-white">Active</span>
                                </div>
                              )}
                              {tmpl.isPremium && (
                                <div className="absolute top-2 right-2 z-10 badge-gold text-[9px]">Premium</div>
                              )}
                            </div>
                            <div className="p-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[#0F172A]">{tmpl.name}</h3>
                                <div className="flex gap-1">
                                  <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: themeColors.primary }} />
                                  <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: themeColors.secondary }} />
                                  <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ background: themeColors.accent }} />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => { setPreviewId(tmpl.id); setIsPreviewOpen(true); }}
                                  className="flex-1 h-7 rounded-lg border border-[#E2E8F0] text-[#64748B] text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-[#F8FAFC]"
                                >
                                  <Eye size={10} /> View
                                </button>
                                <button
                                  onClick={() => handleSelectTemplate(tmpl.id)}
                                  className={`flex-1 h-7 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                                    isSelected ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "gradient-gold text-[#0F172A]"
                                  }`}
                                >
                                  {isSelected ? <><Check size={10} /> Active</> : <><Check size={10} /> Select</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PROFILE TAB ─── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Profile Settings</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Update your personal information</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl gradient-gold flex items-center justify-center relative">
                    <span className="text-[#0F172A] text-2xl font-bold">{(user?.fullName || "U").charAt(0).toUpperCase()}</span>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center border-2 border-white">
                      <Camera size={12} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{user?.fullName || "User"}</p>
                    <p className="text-xs text-[#94A3B8]">{user?.email || ""}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name</label><input defaultValue={user?.fullName || ""} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email</label><input defaultValue={user?.email || ""} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Phone</label><input placeholder="+1 234 567 890" className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Company</label><input placeholder="Your company" className="input-premium w-full" /></div>
                </div>
                <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Bio</label><textarea rows={3} placeholder="Short bio..." className="input-premium w-full resize-none" /></div>
              </div>
            )}

            {/* ─── SECURITY TAB ─── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Security</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Update your password and security settings</p>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Current Password</label><input type="password" className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">New Password</label><input type="password" className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Confirm New Password</label><input type="password" className="input-premium w-full" /></div>
                </div>
                <div className="pt-4 border-t border-[#F1F5F9]">
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                    <input type="checkbox" className="rounded border-[#E2E8F0]" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Two-Factor Authentication</p>
                      <p className="text-xs text-[#94A3B8]">Add an extra layer of security</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ─── NOTIFICATIONS TAB ─── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Notifications</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Choose what notifications you receive</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "New lead captured", desc: "Get notified when someone fills your form", defaultOn: true },
                    { label: "Card viewed", desc: "Daily summary of card views", defaultOn: true },
                    { label: "Subscription updates", desc: "Payment and plan changes", defaultOn: true },
                    { label: "Product updates", desc: "New features and improvements", defaultOn: false },
                    { label: "Marketing emails", desc: "Tips, offers, and promotions", defaultOn: false },
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <input type="checkbox" defaultChecked={item.defaultOn} className="rounded border-[#E2E8F0] shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                        <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ─── BILLING TAB ─── */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Billing</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Manage your payment methods</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-md flex items-center justify-center">
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0F172A]">Visa ending in 4242</p>
                    <p className="text-xs text-[#94A3B8]">Expires 12/25</p>
                  </div>
                  <button className="text-xs text-[#F7B31C] hover:text-[#D97706] font-medium">Edit</button>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#0F172A] mb-3">Billing History</h4>
                  <div className="space-y-2">
                    {[
                      { date: "May 1, 2026", amount: "$19.99", status: "Paid" },
                      { date: "Apr 1, 2026", amount: "$19.99", status: "Paid" },
                      { date: "Mar 1, 2026", amount: "$19.99", status: "Paid" },
                    ].map((inv, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                        <span className="text-sm text-[#64748B]">{inv.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#0F172A]">{inv.amount}</span>
                          <span className="badge-green">{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "theme" && (
              <div className="mt-6 pt-6 border-t border-[#F1F5F9] flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        templateId={previewId}
        colors={themeColors}
        cardData={demoCardData}
        selectedId={selectedTemplateId}
        onClose={() => setIsPreviewOpen(false)}
        onSelect={handleSelectTemplate}
      />
    </DashboardLayout>
  );
}
