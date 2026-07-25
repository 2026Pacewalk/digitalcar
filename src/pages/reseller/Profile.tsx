import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  User, Camera, Save, Lock, Shield, Eye, EyeOff,
  Building2, MapPin, Clock, Monitor, Chrome, CheckCircle2, CreditCard, Receipt
} from "lucide-react";

const LOGIN_ACTIVITY = [
  { id: 1, device: "Windows 11", browser: "Chrome 120", ip: "103.21.45.78", location: "Mumbai, India", date: "2026-05-08 14:32", status: "current" },
  { id: 2, device: "iPhone 15 Pro", browser: "Safari 17", ip: "103.21.45.90", location: "Mumbai, India", date: "2026-05-07 09:15", status: "success" },
  { id: 3, device: "MacBook Pro", browser: "Chrome 119", ip: "103.21.45.12", location: "Pune, India", date: "2026-05-02 16:30", status: "success" },
];

export default function ResellerProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "Amit Khanna",
    username: "amitkhanna",
    email: user?.email || "amit@dreamhomes.in",
    mobile: "+91 98102 33445",
    whatsapp: "+91 98102 33445",
    companyName: "DreamHomes Realty",
    address: "Suite 301, Skyline Towers, Bandra West",
    city: "Mumbai",
    website: "www.dreamhomes.in",
    bankName: "HDFC Bank",
    accountNumber: "50100345678912",
    ifsc: "HDFC0001234",
    upiId: "amit@okhdfcbank",
    gstNumber: "27AABCU9603R1ZX",
    whiteLabel: true,
    customDomain: "cards.dreamhomes.in",
  });

  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const completionPercent = useMemo(() => {
    let filled = 0;
    const fields = [profile.fullName, profile.email, profile.mobile, profile.whatsapp, profile.companyName, profile.address, profile.city, profile.website, profile.bankName, profile.upiId, profile.gstNumber];
    fields.forEach((f) => { if (f && f.trim()) filled++; });
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result as string); toast.success("Logo uploaded!"); };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "activity", label: "Login Activity", icon: Clock },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="My Profile" subtitle="Reseller profile and settings" /></div>
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-2 space-y-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                  <tab.icon size={17} /> {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center">
                    {avatar ? <img src={avatar} alt="Logo" className="w-full h-full object-cover" /> : <Building2 size={28} className="text-white" />}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center cursor-pointer border-2 border-white">
                    <Camera size={12} className="text-white" /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-[#0F172A]">{profile.fullName}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{profile.companyName} &middot; Reseller</p>
                  <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start">
                    <span className="badge-green text-[10px]">Active</span>
                    <span className="badge-gold text-[10px]">Reseller Plan</span>
                    {profile.whiteLabel && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] font-medium">White Label</span>}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#F7B31C" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${completionPercent * 1.51} 151`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#0F172A]">{completionPercent}%</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">Complete</p>
                </div>
              </div>
            </div>

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><User size={16} className="text-[#F7B31C]" /> Reseller Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Reseller Name *</label><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Username</label><input value={profile.username} disabled className="input-premium w-full bg-[#F8FAFC] cursor-not-allowed opacity-60" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email *</label>
                    <div className="flex gap-2"><input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="input-premium w-full" /><button onClick={() => toast.success("Verification email sent!")} className="h-10 px-3 text-[10px] font-semibold gradient-gold text-[#0F172A] rounded-xl shrink-0">Verify</button></div>
                  </div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Mobile Number *</label><input value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">WhatsApp</label><input value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Company Name *</label><input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} className="input-premium w-full" /></div>
                </div>
                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><MapPin size={16} className="text-[#F7B31C]" /> Contact Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Address</label><input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">City</label><input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="input-premium w-full" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Website</label><input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} className="input-premium w-full" /></div>
                  </div>
                </div>
                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><CreditCard size={16} className="text-[#F7B31C]" /> Bank & Payment Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Bank Name</label><input value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Account Number</label><input value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">IFSC Code</label><input value={profile.ifsc} onChange={(e) => setProfile({ ...profile, ifsc: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">UPI ID</label><input value={profile.upiId} onChange={(e) => setProfile({ ...profile, upiId: e.target.value })} className="input-premium w-full" /></div>
                  </div>
                </div>
                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><Receipt size={16} className="text-[#F7B31C]" /> Business Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">GST Number</label><input value={profile.gstNumber} onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Custom Domain</label><input value={profile.customDomain} onChange={(e) => setProfile({ ...profile, customDomain: e.target.value })} className="input-premium w-full" /></div>
                    <div className="sm:col-span-2"><label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC] cursor-pointer"><input type="checkbox" checked={profile.whiteLabel} onChange={(e) => setProfile({ ...profile, whiteLabel: e.target.checked })} className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" /><div><p className="text-sm font-medium text-[#0F172A]">White Label Branding</p><p className="text-xs text-[#94A3B8]">Enable custom branding for your customers</p></div></label></div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); toast.success("Profile saved!"); }, 600); }} disabled={saving} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Shield size={16} className="text-[#F7B31C]" /> Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Current Password *</label>
                    <div className="relative"><input type={showOldPass ? "text" : "password"} value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Enter current password" /><button onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">New Password *</label>
                    <div className="relative"><input type={showNewPass ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Min 8 characters" /><button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Confirm New Password *</label>
                    <div className="relative"><input type={showConfirmPass ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Re-enter password" /><button onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <button onClick={() => { if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords do not match"); return; } toast.success("Password updated!"); }} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2"><Lock size={16} /> Update Password</button>
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-4"><Clock size={16} className="text-[#F7B31C]" /> Login Activity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-[#F8FAFC]">
                      {["Device", "Browser", "IP", "Location", "Date & Time", "Status"].map((h) => (<th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase px-4 py-3">{h}</th>))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {LOGIN_ACTIVITY.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Monitor size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.device}</span></div></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Chrome size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.browser}</span></div></td>
                          <td className="px-4 py-3 text-xs text-[#64748B] font-mono">{a.ip}</td>
                          <td className="px-4 py-3 text-xs text-[#0F172A]">{a.location}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{a.date}</td>
                          <td className="px-4 py-3">{a.status === "current" ? <span className="badge-green text-[10px] flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Current</span> : <span className="text-[10px] px-2 py-1 rounded-full bg-[#F8FAFC] text-[#64748B]">Success</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
