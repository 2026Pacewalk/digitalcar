import DashboardLayout from "@/components/layout/DashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  User, Camera, Save, Lock, Shield, Eye, EyeOff, Smartphone, Mail,
  Building2, Briefcase, MapPin, Globe, Phone, Calendar, Package, CheckCircle2, AlertCircle, Clock, Monitor, Chrome
} from "lucide-react";

interface LoginActivity {
  id: number; device: string; browser: string; ip: string; location: string; date: string; status: string;
}

const LOGIN_ACTIVITY: LoginActivity[] = [
  { id: 1, device: "Windows 11", browser: "Chrome 120", ip: "103.21.45.78", location: "Mumbai, India", date: "2026-05-08 14:32", status: "current" },
  { id: 2, device: "iPhone 15 Pro", browser: "Safari 17", ip: "103.21.45.90", location: "Mumbai, India", date: "2026-05-07 09:15", status: "success" },
  { id: 3, device: "Android 14", browser: "Chrome Mobile", ip: "49.36.112.4", location: "Delhi, India", date: "2026-05-05 18:45", status: "success" },
  { id: 4, device: "macOS Sonoma", browser: "Safari 17", ip: "103.21.45.12", location: "Pune, India", date: "2026-04-28 11:20", status: "success" },
];

const CATEGORIES = ["Digital Marketing", "Healthcare", "Real Estate", "Consulting", "Restaurant", "Retail", "Education", "Freelancer", "Technology", "Other"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Other"];

export default function CustomerProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Profile form
  const [profile, setProfile] = useState({
    fullName: user?.fullName || "John Smith",
    username: "johnsmith2024",
    email: user?.email || "john@example.com",
    mobile: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    businessName: "Smith Digital Solutions",
    designation: "Founder & CEO",
    category: "Digital Marketing",
    city: "Mumbai",
    address: "Shop 12, Tech Park, Andheri West",
    website: "www.smithdigital.com",
    bio: "Helping businesses grow their digital presence since 2018.",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const completionPercent = useMemo(() => {
    let filled = 0;
    const fields = [profile.fullName, profile.username, profile.email, profile.mobile, profile.whatsapp, profile.businessName, profile.designation, profile.category, profile.city, profile.address, profile.website];
    fields.forEach((f) => { if (f && f.trim()) filled++; });
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleProfileSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success("Profile updated successfully!"); }, 600);
  };

  const handlePasswordSave = () => {
    if (!passwordForm.oldPassword) { toast.error("Please enter your old password"); return; }
    if (!passwordForm.newPassword) { toast.error("Please enter a new password"); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" }); toast.success("Password changed!"); }, 600);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result as string); toast.success("Photo uploaded!"); };
    reader.readAsDataURL(file);
  };

  const sendOtp = () => { setOtpSent(true); toast.success("OTP sent to your mobile!"); };
  const verifyOtp = () => { if (otpCode === "1234") { toast.success("Mobile verified!"); setOtpSent(false); } else { toast.error("Invalid OTP"); } };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "activity", label: "Login Activity", icon: Clock },
  ];

  return (
    <DashboardLayout>
      <TopBar title="My Profile" subtitle="Manage your profile and account settings" />
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
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

          {/* Content */}
          <div className="flex-1 space-y-6">

            {/* ─── Profile Summary Card ─── */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">{profile.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center cursor-pointer hover:bg-[#1E293B] transition-colors border-2 border-white">
                    <Camera size={12} className="text-white" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-[#0F172A]">{profile.fullName}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{profile.email} &middot; {profile.businessName}</p>
                  <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start">
                    <span className="badge-green text-[10px]">Active</span>
                    <span className="badge-gold text-[10px]">Starter Plan</span>
                  </div>
                </div>
                {/* Completion Ring */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#F7B31C" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${completionPercent * 1.51} 151`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#0F172A]">{completionPercent}%</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">Complete</p>
                </div>
              </div>
            </div>

            {/* ─── PROFILE TAB ─── */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><User size={16} className="text-[#F7B31C]" /> Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Username * <span className="text-[#94A3B8] font-normal">(Cannot be changed)</span></label><input value={profile.username} disabled className="input-premium w-full bg-[#F8FAFC] cursor-not-allowed opacity-60" /></div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email * <span className="text-[#94A3B8] font-normal">(Requires verification)</span></label>
                    <div className="flex gap-2"><input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="input-premium w-full" type="email" /><button onClick={() => toast.success("Verification email sent!")} className="h-10 px-3 text-[10px] font-semibold gradient-gold text-[#0F172A] rounded-xl shrink-0">Verify</button></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5 flex items-center gap-1"><Smartphone size={12} /> Mobile Number *</label>
                    <div className="flex gap-2">
                      <input value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} className="input-premium w-full" />
                      <button onClick={sendOtp} className="h-10 px-3 text-[10px] font-semibold gradient-gold text-[#0F172A] rounded-xl shrink-0">{otpSent ? "Resend" : "Verify"}</button>
                    </div>
                    {otpSent && (
                      <div className="flex gap-2 mt-2">
                        <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter OTP" className="input-premium w-full text-sm" maxLength={6} />
                        <button onClick={verifyOtp} className="h-10 px-4 text-xs font-semibold bg-[#0F172A] text-white rounded-xl shrink-0">Verify</button>
                      </div>
                    )}
                  </div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5 flex items-center gap-1"><Phone size={12} /> WhatsApp Number</label><input value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} className="input-premium w-full" /></div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Bio</label><textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={1} className="input-premium w-full resize-none" /></div>
                </div>

                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><Building2 size={16} className="text-[#F7B31C]" /> Business Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Name *</label><input value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Designation *</label><input value={profile.designation} onChange={(e) => setProfile({ ...profile, designation: e.target.value })} className="input-premium w-full" /></div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Business Category</label>
                      <select value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })} className="input-premium w-full">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">City</label>
                      <select value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="input-premium w-full">{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-[#0F172A] mb-1.5 flex items-center gap-1"><MapPin size={12} /> Address</label><input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="input-premium w-full" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-[#0F172A] mb-1.5 flex items-center gap-1"><Globe size={12} /> Website</label><input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} className="input-premium w-full" placeholder="www.yourbusiness.com" /></div>
                  </div>
                </div>

                {/* Subscription Summary */}
                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><Package size={16} className="text-[#F7B31C]" /> Subscription Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#F8FAFC] rounded-xl p-3"><p className="text-[10px] text-[#94A3B8]">Current Plan</p><p className="text-sm font-semibold text-[#0F172A] mt-0.5">Starter</p></div>
                    <div className="bg-[#F8FAFC] rounded-xl p-3"><p className="text-[10px] text-[#94A3B8]">Status</p><p className="text-sm font-semibold text-emerald-600 mt-0.5">Active</p></div>
                    <div className="bg-[#F8FAFC] rounded-xl p-3"><p className="text-[10px] text-[#94A3B8]">Started</p><p className="text-sm font-semibold text-[#0F172A] mt-0.5">Jan 15, 2026</p></div>
                    <div className="bg-[#F8FAFC] rounded-xl p-3"><p className="text-[10px] text-[#94A3B8]">Expires</p><p className="text-sm font-semibold text-[#0F172A] mt-0.5">Jan 15, 2027</p></div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={handleProfileSave} disabled={saving} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all flex items-center gap-2 disabled:opacity-50">
                    <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── SECURITY TAB ─── */}
            {activeTab === "security" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Shield size={16} className="text-[#F7B31C]" /> Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Current Password *</label>
                    <div className="relative"><input type={showOldPass ? "text" : "password"} value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Enter current password" /><button onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">New Password *</label>
                    <div className="relative"><input type={showNewPass ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Min 8 characters" /><button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Confirm New Password *</label>
                    <div className="relative"><input type={showConfirmPass ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-premium w-full pr-10" placeholder="Re-enter new password" /><button onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                  </div>
                  <button onClick={handlePasswordSave} disabled={saving} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all flex items-center gap-2 disabled:opacity-50">
                    <Lock size={16} /> {saving ? "Updating..." : "Update Password"}
                  </button>
                </div>

                <div className="border-t border-[#F1F5F9] pt-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><Shield size={16} className="text-[#F7B31C]" /> Security Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Two-Factor Authentication</p><p className="text-xs text-[#94A3B8]">Add extra security layer</p></div>
                      <input type="checkbox" className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Login Notifications</p><p className="text-xs text-[#94A3B8]">Get notified on new device login</p></div>
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Profile Update Alerts</p><p className="text-xs text-[#94A3B8]">Email alert on profile changes</p></div>
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── ACTIVITY TAB ─── */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-4"><Clock size={16} className="text-[#F7B31C]" /> Login Activity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-[#F8FAFC]">
                      {["Device", "Browser", "IP Address", "Location", "Date & Time", "Status"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {LOGIN_ACTIVITY.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Monitor size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.device}</span></div></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Chrome size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.browser}</span></div></td>
                          <td className="px-4 py-3 text-xs text-[#64748B] font-mono">{a.ip}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><MapPin size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.location}</span></div></td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{a.date}</td>
                          <td className="px-4 py-3">
                            {a.status === "current" ? (
                              <span className="badge-green text-[10px] flex items-center gap-1"><CheckCircle2 size={10} /> Current</span>
                            ) : (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-[#F8FAFC] text-[#64748B]">Success</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-3">Showing last 30 days of login activity</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
