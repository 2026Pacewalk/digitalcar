import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Store, ArrowLeft, CheckCircle2, Loader2, TrendingUp, Users, Wallet } from "lucide-react";

export default function BecomeReseller() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", companyName: "", message: "" });
  const [done, setDone] = useState(false);
  const apply = trpc.reseller.apply.useMutation({ onSuccess: () => setDone(true) });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const perks = [
    { icon: Wallet, title: "Earn commissions", text: "Get paid for every customer you bring on a paid plan." },
    { icon: Users, title: "Manage clients", text: "Onboard and manage your own customers from one dashboard." },
    { icon: TrendingUp, title: "Grow your agency", text: "White-label options and tools to scale your business." },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left brand / perks */}
      <div className="lg:w-[46%] bg-gradient-to-br from-[#14243E] to-[#0F172A] text-white p-8 lg:p-12 flex flex-col justify-center">
        <div className="text-2xl font-bold mb-8">Digital<span className="text-[#F7B31C]">Carda</span></div>
        <h1 className="text-3xl font-extrabold leading-tight">Become a reseller partner</h1>
        <p className="text-[#93a4bd] mt-3 max-w-md">Join the DigitalCarda partner program — sell digital cards, manage your own clients, and earn recurring commissions.</p>
        <div className="mt-8 space-y-4 max-w-md">
          {perks.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><p.icon size={18} className="text-[#F7B31C]" /></span>
              <div><p className="font-semibold text-sm">{p.title}</p><p className="text-xs text-[#93a4bd]">{p.text}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] mb-6"><ArrowLeft size={16} /> Home</Link>

          {done ? (
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="text-emerald-500" size={28} /></div>
              <h2 className="text-lg font-bold text-[#0F172A]">Application received 🤝</h2>
              <p className="text-sm text-[#64748B] mt-2">Thanks, {form.fullName || "there"}! Our team will review your application and email you at <strong>{form.email}</strong> once it's approved — usually within 1–2 business days.</p>
              <Link to="/login" className="inline-block mt-6 text-sm font-semibold text-[#0F172A] hover:text-[#F7B31C]">Back to sign in</Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1"><Store size={18} className="text-[#F7B31C]" /><h2 className="text-lg font-bold text-[#0F172A]">Apply to become a reseller</h2></div>
              <p className="text-sm text-[#64748B] mb-5">Tell us a bit about you. We'll review and get you set up.</p>
              <form onSubmit={(e) => { e.preventDefault(); if (form.fullName.trim().length >= 2 && form.email.includes("@")) apply.mutate({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, companyName: form.companyName.trim() || undefined, message: form.message.trim() || undefined }); }} className="space-y-3.5">
                {([["Full name *", "fullName", "text"], ["Email *", "email", "email"], ["Phone", "phone", "text"], ["Company / agency", "companyName", "text"]] as const).map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">{label}</label>
                    <input type={type} required={label.includes("*")} value={form[key]} onChange={(e) => set(key, e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1.5">Why do you want to partner with us?</label>
                  <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={3}
                    className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all resize-none" placeholder="Your business, audience, or how you plan to sell…" />
                </div>
                <button type="submit" disabled={apply.isPending} className="w-full h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-gold disabled:opacity-50 transition-all">
                  {apply.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit application"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
