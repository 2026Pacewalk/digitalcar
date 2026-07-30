import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState } from "react";
import { Save, Globe, Mail, Palette, Shield, Bell, CreditCard, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  // Email / SMTP status + test tool.
  const { data: smtp, isLoading: smtpLoading } = trpc.settings.smtpStatus.useQuery();
  const [testTo, setTestTo] = useState("");
  const sendTest = trpc.settings.sendTestEmail.useMutation({
    onSuccess: (r) => r.ok ? toast.success(`Test email sent to ${r.to} 🎉`) : toast.error(r.error || "Send failed"),
    onError: (e) => toast.error(e.message),
  });

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "email", label: "Email", icon: Mail },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "payment", label: "Payment", icon: CreditCard },
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success("Settings saved successfully"); }, 600);
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Settings" subtitle="Platform configuration" /></div>
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
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
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">General Settings</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Configure basic platform settings</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Platform Name</label>
                    <input defaultValue="DigitalCarda" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Support Email</label>
                    <input defaultValue="support@digitalcarda.in" className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Default Language</label>
                    <select className="input-premium w-full"><option>English</option><option>Spanish</option><option>French</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Timezone</label>
                    <select className="input-premium w-full"><option>UTC</option><option>EST</option><option>PST</option></select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Platform Description</label>
                  <textarea rows={3} defaultValue="Create stunning digital business cards in minutes." className="input-premium w-full resize-none" />
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Appearance</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Customize the look and feel</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-2">Primary Color</label>
                    <div className="flex gap-3">
                      {["#F7B31C", "#3B82F6", "#14B8A6", "#8B5CF6", "#EF4444"].map((c) => (
                        <button key={c} className="w-10 h-10 rounded-xl border-2 border-white shadow-md transition-transform hover:scale-110" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Custom Logo URL</label>
                    <input placeholder="https://..." className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Favicon URL</label>
                    <input placeholder="https://..." className="input-premium w-full" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Email Delivery</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">SMTP is configured in the server's <code className="text-[#475569]">.env</code> file (never stored here). Check status and send a test below.</p>
                </div>

                {/* Status card */}
                <div className={`rounded-2xl border p-5 ${smtp?.configured ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
                  {smtpLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[#64748B]"><Loader2 size={16} className="animate-spin" /> Checking…</div>
                  ) : smtp?.configured ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-[#16A34A] shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#166534]">SMTP is configured — emails will send.</p>
                        <p className="text-[#15803D] mt-0.5 text-xs">Host: <b>{smtp.host}</b> · From: <b>{smtp.from}</b> · Lead alerts → <b>{smtp.notifyTo}</b></p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <XCircle size={20} className="text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#991B1B]">SMTP is not configured — automated emails are skipped.</p>
                        <p className="text-[#B91C1C] mt-1 text-xs">Add <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> (and optional <code>SMTP_PORT</code>, <code>MAIL_FROM</code>) to the server <code>.env</code>, then restart the app.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test email */}
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Send a test email to</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={smtp?.notifyTo || "you@example.com"} className="input-premium w-full sm:max-w-xs" />
                    <button
                      onClick={() => sendTest.mutate({ to: testTo.trim() || undefined })}
                      disabled={sendTest.isPending}
                      className="h-11 px-5 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-gold transition-all disabled:opacity-60 shrink-0">
                      {sendTest.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send test email</>}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-2">Leave blank to send to the lead-alert address. Check spam if it doesn't arrive.</p>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Security</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Security and access settings</p>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC]">
                    <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0]" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Two-Factor Authentication</p>
                      <p className="text-xs text-[#94A3B8]">Require 2FA for admin accounts</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC]">
                    <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0]" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Force HTTPS</p>
                      <p className="text-xs text-[#94A3B8]">Redirect all traffic to HTTPS</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Notifications</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Configure notification preferences</p>
                </div>
                <div className="space-y-3">
                  {["New user registration", "New lead captured", "Payment received", "Support ticket created", "Card published"].map((item) => (
                    <label key={item} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0]" />
                      <span className="text-sm text-[#0F172A]">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Payment Settings</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Configure payment gateways</p>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC]">
                    <input type="checkbox" defaultChecked className="rounded border-[#E2E8F0]" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Stripe</p>
                      <p className="text-xs text-[#94A3B8]">Accept credit card payments</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-[#F8FAFC]">
                    <input type="checkbox" className="rounded border-[#E2E8F0]" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">PayPal</p>
                      <p className="text-xs text-[#94A3B8]">Accept PayPal payments</p>
                    </div>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Stripe Secret Key</label>
                    <input type="password" placeholder="sk_live_..." className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] mb-1.5">Stripe Publishable Key</label>
                    <input placeholder="pk_live_..." className="input-premium w-full" />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-[#F1F5F9] flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 h-11 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
