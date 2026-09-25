import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { readableError } from "@/lib/errors";
import { passwordProblems } from "@/lib/password";
import { Building2, Wallet, Lock, Loader2, Percent, CalendarDays, Mail } from "lucide-react";

/* A reseller's own profile. Everything here is theirs, read from and saved to
   the server — the page they had before showed made-up details and saved
   nothing. The payout details pre-fill the withdrawal form on Earnings. */

type Form = {
  fullName: string; phone: string; companyName: string; whatsapp: string; address: string; gstin: string;
  payoutMethod: "bank" | "upi" | null; payoutUpi: string; payoutAccountName: string; payoutAccountNumber: string; payoutIfsc: string;
};
const EMPTY: Form = {
  fullName: "", phone: "", companyName: "", whatsapp: "", address: "", gstin: "",
  payoutMethod: null, payoutUpi: "", payoutAccountName: "", payoutAccountNumber: "", payoutIfsc: "",
};

const input = "h-10 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:bg-white transition-colors";
const fmtDate = (d: unknown) => {
  const dt = d ? new Date(d as string) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#0F172A] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#94A3B8] mt-1">{hint}</span>}
    </label>
  );
}

export default function ResellerProfile() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.reseller.me.useQuery();
  const save = trpc.reseller.saveProfile.useMutation();
  const changePassword = trpc.auth.changePassword.useMutation();

  const [form, setForm] = useState<Form>(EMPTY);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  // Load once the server answers; after that the form is the user's.
  useEffect(() => {
    if (!me) return;
    setForm({
      fullName: me.fullName, phone: me.phone, companyName: me.companyName, whatsapp: me.whatsapp,
      address: me.address, gstin: me.gstin, payoutMethod: me.payoutMethod,
      payoutUpi: me.payoutUpi, payoutAccountName: me.payoutAccountName,
      payoutAccountNumber: me.payoutAccountNumber, payoutIfsc: me.payoutIfsc,
    });
  }, [me]);

  // "Change password" in the header menus links to #password. Go there once the
  // page is on screen — also when the profile was already open or its data was
  // cached (the layout shows a spinner first, so wait a frame for the section).
  const { hash, key } = useLocation();
  useEffect(() => {
    if (isLoading || hash !== "#password") return;
    let tries = 0;
    const go = () => {
      const el = document.getElementById("password");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (tries++ < 20) setTimeout(go, 100);
    };
    go();
  }, [isLoading, hash, key]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (form.fullName.trim().length < 2) return toast.error("Enter your full name");
    if (form.companyName.trim().length < 2) return toast.error("Enter your business name");
    // The server's own rules (api/reseller-router.ts profileInput), said here in words.
    if (form.gstin.trim() && !/^[0-9A-Z]{15}$/i.test(form.gstin.trim())) return toast.error("A GSTIN is 15 letters and numbers");
    if (form.payoutAccountNumber.trim() && !/^[0-9]{6,20}$/.test(form.payoutAccountNumber.trim())) return toast.error("Account numbers are 6–20 digits");
    if (form.payoutIfsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.payoutIfsc.trim())) return toast.error("An IFSC looks like HDFC0001234");
    try {
      await save.mutateAsync(form);
      await utils.reseller.me.invalidate();
      toast.success("Profile saved");
    } catch (e) {
      toast.error(readableError(e, "Could not save your profile"));
    }
  };

  const onPassword = async () => {
    if (!pw.current) return toast.error("Enter your current password");
    if (pw.next !== pw.confirm) return toast.error("The new passwords don't match");
    const missing = passwordProblems(pw.next);
    if (missing.length) return toast.error(`Your new password needs ${missing.join(", ")}`);
    try {
      await changePassword.mutateAsync({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (e) {
      toast.error(readableError(e, "Could not change your password"));
    }
  };

  if (isLoading) {
    return (
      <ResponsiveDashboardLayout>
        <div className="flex items-center justify-center py-24 text-[#94A3B8]"><Loader2 className="animate-spin" size={22} /></div>
      </ResponsiveDashboardLayout>
    );
  }

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="My profile" subtitle="Your business details and where we pay your commission" /></div>
      <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Who they are, as the platform sees them */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shrink-0">
            <span className="text-[#0F172A] text-xl font-bold">{(me?.fullName || "R").charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#0F172A] truncate">{me?.fullName}</p>
            <p className="text-sm text-[#64748B] truncate">{me?.companyName}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 text-[#334155]"><Mail size={13} /> {me?.email}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1.5 font-semibold text-[#92400E]"><Percent size={13} /> {me?.commissionRate}% commission</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 text-[#334155]"><CalendarDays size={13} /> Partner since {fmtDate(me?.memberSince)}</span>
          </div>
        </div>

        {/* Business details */}
        <section className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-4"><Building2 size={16} className="text-[#F7B31C]" /> Business details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input className={input} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Business name"><input className={input} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
            <Field label="Phone"><input className={input} inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="WhatsApp"><input className={input} inputMode="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Address"><input className={input} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            </div>
            <Field label="GSTIN" hint="Optional — 15 letters and numbers"><input className={`${input} uppercase`} value={form.gstin} onChange={(e) => set("gstin", e.target.value)} /></Field>
          </div>
        </section>

        {/* Payout details */}
        <section className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-1"><Wallet size={16} className="text-[#F7B31C]" /> Where we pay your commission</h2>
          <p className="text-xs text-[#64748B] mb-4">Saved here so you don't retype it every time you withdraw. You can still change it on each request.</p>
          <div role="radiogroup" aria-label="Payout method" className="inline-flex rounded-xl bg-[#F1F5F9] p-1 mb-4">
            {(["upi", "bank"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={form.payoutMethod === m} onClick={() => set("payoutMethod", m)}
                className={`h-8 px-4 rounded-lg text-xs font-semibold transition-colors ${form.payoutMethod === m ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}>
                {m === "upi" ? "UPI" : "Bank transfer"}
              </button>
            ))}
          </div>
          {form.payoutMethod === "upi" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="UPI ID" hint="e.g. yourname@okhdfcbank"><input className={input} value={form.payoutUpi} onChange={(e) => set("payoutUpi", e.target.value)} /></Field>
            </div>
          )}
          {form.payoutMethod === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account holder name"><input className={input} value={form.payoutAccountName} onChange={(e) => set("payoutAccountName", e.target.value)} /></Field>
              <Field label="Account number"><input className={input} inputMode="numeric" value={form.payoutAccountNumber} onChange={(e) => set("payoutAccountNumber", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="IFSC" hint="e.g. HDFC0001234"><input className={`${input} uppercase`} value={form.payoutIfsc} onChange={(e) => set("payoutIfsc", e.target.value)} /></Field>
            </div>
          )}
          {!form.payoutMethod && <p className="text-xs text-[#94A3B8]">Choose UPI or bank transfer.</p>}
        </section>

        <div className="flex justify-end">
          <button onClick={onSave} disabled={save.isPending}
            className="h-11 px-8 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {save.isPending && <Loader2 size={15} className="animate-spin" />} Save profile
          </button>
        </div>

        {/* Password — the real one, checked against the current password on the server */}
        <section id="password" className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-5 sm:p-6 scroll-mt-20">
          <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-4"><Lock size={16} className="text-[#F7B31C]" /> Change password</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password"><input type="password" autoComplete="current-password" className={input} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" hint="8+ characters, with a capital, a number and a symbol"><input type="password" autoComplete="new-password" className={input} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Confirm new password"><input type="password" autoComplete="new-password" className={input} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={onPassword} disabled={changePassword.isPending}
              className="h-10 px-6 rounded-xl bg-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
              {changePassword.isPending && <Loader2 size={15} className="animate-spin" />} Change password
            </button>
          </div>
        </section>
      </div>
    </ResponsiveDashboardLayout>
  );
}
