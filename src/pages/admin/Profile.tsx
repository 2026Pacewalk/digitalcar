import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User, Camera, Save, Lock, Shield, Eye, EyeOff, Clock, Monitor, Chrome, CheckCircle2, ShieldCheck, ShieldAlert
} from "lucide-react";

const LOGIN_ACTIVITY = [
  { id: 1, device: "Windows 11", browser: "Chrome 120", ip: "103.21.45.78", location: "Mumbai, India", date: "2026-05-08 14:32", status: "current" },
  { id: 2, device: "iPhone 15 Pro", browser: "Safari 17", ip: "103.21.45.90", location: "Mumbai, India", date: "2026-05-07 09:15", status: "success" },
  { id: 3, device: "MacBook Pro M3", browser: "Chrome 119", ip: "103.21.45.12", location: "Delhi, India", date: "2026-05-06 20:10", status: "success" },
  { id: 4, device: "Ubuntu 22.04", browser: "Firefox 121", ip: "49.36.112.4", location: "Bangalore, India", date: "2026-04-30 08:45", status: "success" },
  { id: 5, device: "Windows 10", browser: "Edge 118", ip: "182.72.45.33", location: "Chennai, India", date: "2026-04-25 15:20", status: "blocked" },
];

export default function AdminProfile() {
  const { user, refetch } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "Super Admin",
    email: user?.email || "",
    mobile: "",
  });

  // Source of truth is the database, not localStorage (which never stores the
  // phone) — otherwise a saved mobile number looks empty again on reload.
  const me = trpc.auth.me.useQuery();
  useEffect(() => {
    if (me.data) {
      setProfile({
        fullName: me.data.fullName || "Super Admin",
        email: me.data.email || "",
        mobile: me.data.phone || "",
      });
    }
  }, [me.data]);

  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: (res) => {
      // Keep the locally-stored session in sync so the UI reflects the change.
      try {
        const raw = localStorage.getItem("digitalcarda_user");
        if (raw) {
          const u = JSON.parse(raw);
          localStorage.setItem("digitalcarda_user", JSON.stringify({ ...u, fullName: res.fullName, email: res.email }));
        }
      } catch {}
      me.refetch();
      refetch();
      toast.success("Profile saved!");
    },
    onError: (e) => toast.error(e.message || "Could not save profile"),
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated!");
    },
    onError: (e) => toast.error(e.message || "Could not update password"),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result as string); toast.success("Photo updated!"); };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "activity", label: "Login Activity", icon: Clock },
  ];

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="My Profile" subtitle="Super Admin profile and security settings" /></div>
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
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F7B31C] to-[#D97706] flex items-center justify-center">
                    {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-2xl font-bold">{profile.fullName.charAt(0)}</span>}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center cursor-pointer border-2 border-white">
                    <Camera size={12} className="text-white" /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-[#0F172A]">{profile.fullName}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{profile.email}</p>
                  <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start">
                    <span className="badge-green text-[10px] flex items-center gap-1"><ShieldCheck size={10} /> Super Admin</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] font-medium">Full Access</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-6">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><User size={16} className="text-[#F7B31C]" /> Admin Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Full Name *</label><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="input-premium w-full" /></div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Email <span className="text-[#94A3B8] font-normal">(sign-in address)</span></label>
                    <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="input-premium w-full" type="email" placeholder="you@example.com" />
                  </div>
                  <div><label className="block text-xs font-medium text-[#0F172A] mb-1.5">Mobile Number</label><input value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} className="input-premium w-full" placeholder="+91 …" /></div>
                </div>
                <p className="text-[11px] text-[#94A3B8] -mt-2">Changing the email changes the address you sign in with. It must not already belong to another account.</p>
                <div className="flex justify-end">
                  <button onClick={() => {
                    const name = profile.fullName.trim();
                    const email = profile.email.trim().toLowerCase();
                    if (name.length < 2) { toast.error("Full name is required"); return; }
                    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error("Enter a valid email"); return; }
                    const emailChanged = email !== (me.data?.email || "").toLowerCase();
                    if (emailChanged && !window.confirm(`Change your sign-in email to ${email}? You'll use this to log in from now on.`)) return;
                    updateProfile.mutate({ fullName: name, phone: profile.mobile.trim(), email });
                  }} disabled={updateProfile.isPending} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {updateProfile.isPending ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2"><Lock size={16} className="text-[#F7B31C]" /> Change Password</h3>
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
                    <button onClick={() => { if (!passwordForm.oldPassword) { toast.error("Enter your current password"); return; } if (passwordForm.newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; } if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords do not match"); return; } changePassword.mutate({ currentPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword }); }} disabled={changePassword.isPending} className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Lock size={16} /> {changePassword.isPending ? "Updating..." : "Update Password"}</button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3"><Shield size={16} className="text-[#F7B31C]" /> Login Security Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Two-Factor Authentication</p><p className="text-xs text-[#94A3B8]">Require OTP on every login</p></div>
                      <input type="checkbox" className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Login Notifications</p><p className="text-xs text-[#94A3B8]">Alert on new device login</p></div>
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">IP Restriction</p><p className="text-xs text-[#94A3B8]">Allow login only from India IPs</p></div>
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] cursor-pointer">
                      <div><p className="text-sm font-medium text-[#0F172A]">Session Timeout</p><p className="text-xs text-[#94A3B8]">Auto-logout after 30 min inactive</p></div>
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0] w-5 h-5 accent-[#F7B31C]" />
                    </label>
                  </div>
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
                      {["Device", "Browser", "IP Address", "Location", "Date & Time", "Status"].map((h) => (<th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase px-4 py-3">{h}</th>))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {LOGIN_ACTIVITY.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Monitor size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.device}</span></div></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><Chrome size={14} className="text-[#64748B]" /><span className="text-xs text-[#0F172A]">{a.browser}</span></div></td>
                          <td className="px-4 py-3 text-xs text-[#64748B] font-mono">{a.ip}</td>
                          <td className="px-4 py-3 text-xs text-[#0F172A]">{a.location}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{a.date}</td>
                          <td className="px-4 py-3">
                            {a.status === "current" ? <span className="badge-green text-[10px] flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Current</span> :
                             a.status === "blocked" ? <span className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-500 font-medium flex items-center gap-1 w-fit"><ShieldAlert size={10} /> Blocked</span> :
                             <span className="text-[10px] px-2 py-1 rounded-full bg-[#F8FAFC] text-[#64748B]">Success</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-3">Showing last 30 days of login activity. Suspicious logins are highlighted in red.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
