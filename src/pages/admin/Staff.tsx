import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  UserPlus, UserCog, ShieldCheck, KeyRound, PauseCircle, PlayCircle, Trash2, History, X, Copy, Check,
  Loader2, Users, LogIn,
} from "lucide-react";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { STAFF_MODULES, type StaffLevel, type StaffModule, type StaffPermissions } from "@contracts/staff";

/* Staff & Access — add team members to the admin portal and choose, module by
   module, whether each one can't see it, can look (View) or can change things
   (Edit). The server enforces this on every request; everything they change is
   in the Activity Log. */

type Level = StaffLevel | "none";

const LEVELS: { key: Level; label: string }[] = [
  { key: "none", label: "No access" },
  { key: "view", label: "View" },
  { key: "manage", label: "Edit" },
];

// Starting points for common roles; every box can still be changed.
const PRESETS: { label: string; perms: StaffPermissions; impersonate: boolean }[] = [
  { label: "Customer support", perms: { customers: "manage", leads: "manage", orders: "view", domains: "view", system: "view" }, impersonate: true },
  { label: "Sales", perms: { overview: "view", customers: "view", leads: "manage", marketing: "manage", catalog: "view" }, impersonate: false },
  { label: "Accounts", perms: { overview: "view", payments: "manage", referrals: "manage", orders: "manage", resellers: "view", customers: "view" }, impersonate: false },
  { label: "View everything", perms: Object.fromEntries(STAFF_MODULES.map((m) => [m.key, "view"])) as StaffPermissions, impersonate: false },
];

type StaffRow = {
  id: number; email: string; fullName: string; phone: string | null; status: string;
  lastLoginAt: string | Date | null; lastActiveAt: string | Date | null; actions30d: number;
  jobTitle: string | null; permissions: StaffPermissions; canImpersonate: boolean;
};

function when(v: string | Date | null) {
  if (!v) return "never";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "never";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

const levelChip: Record<StaffLevel, string> = {
  manage: "bg-[#EEF2FF] text-[#3730A3]",
  view: "bg-[#F1F5F9] text-[#475569]",
};

export default function AdminStaff() {
  const utils = trpc.useUtils();
  const { data: staff, isLoading } = trpc.staff.list.useQuery();
  const setStatus = trpc.staff.setStatus.useMutation();
  const resetPassword = trpc.staff.resetPassword.useMutation();
  const remove = trpc.staff.remove.useMutation();

  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string; heading: string } | null>(null);

  const rows = (staff ?? []) as StaffRow[];
  const refresh = () => utils.staff.list.invalidate();

  const toggleStatus = async (r: StaffRow) => {
    const next = r.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !confirm(`Suspend ${r.fullName}? They're signed out and can't sign in until you reactivate them.`)) return;
    try {
      await setStatus.mutateAsync({ id: r.id, status: next });
      toast.success(next === "suspended" ? `${r.fullName} is suspended` : `${r.fullName} can sign in again`);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const doReset = async (r: StaffRow) => {
    if (!confirm(`Create a new password for ${r.fullName}? Their current password stops working.`)) return;
    try {
      const res = await resetPassword.mutateAsync({ id: r.id });
      setSecret({ email: r.email, password: res.password, heading: `New password for ${r.fullName}` });
    } catch (e) { toast.error((e as Error).message); }
  };

  const doRemove = async (r: StaffRow) => {
    if (!confirm(`Remove ${r.fullName} from the admin portal? Their account is deleted; what they did stays in the Activity Log.`)) return;
    try {
      await remove.mutateAsync({ id: r.id });
      toast.success(`${r.fullName} removed`);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Staff & Access" subtitle="Give each team member only the modules they need" /></div>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-[#475569] max-w-2xl">
            Staff sign in at the admin portal with their own email and password. They only see the modules you tick below,
            and everything they change is recorded in the <Link to="/admin/activity" className="font-semibold text-[#4338CA] underline">Activity Log</Link>.
          </p>
          <button onClick={() => setEditing("new")}
            className="h-11 px-5 rounded-xl bg-[#4338CA] text-white text-sm font-bold flex items-center justify-center gap-2 shrink-0 hover:bg-[#3730A3]">
            <UserPlus size={16} /> Add staff member
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-[#64748B] gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Loading your team…</div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
            <Users size={32} className="mx-auto text-[#C7D2FE]" />
            <p className="text-[15px] font-bold text-[#0F172A] mt-3">No staff yet</p>
            <p className="text-[13px] text-[#64748B] mt-1 max-w-md mx-auto">Add a team member, pick what they can open, and share the password with them. You can change their access any time.</p>
            <button onClick={() => setEditing("new")} className="mt-5 h-10 px-5 rounded-xl bg-[#4338CA] text-white text-sm font-bold inline-flex items-center gap-2"><UserPlus size={15} /> Add staff member</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const granted = STAFF_MODULES.filter((m) => r.permissions[m.key]);
              const suspended = r.status !== "active";
              return (
                <div key={r.id} className={`bg-white rounded-2xl shadow-premium border p-4 sm:p-5 ${suspended ? "border-[#FDE68A] bg-[#FFFDF5]" : "border-[#F1F5F9]"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex items-start gap-3 min-w-0 lg:w-[300px] shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4338CA] text-white flex items-center justify-center font-bold shrink-0">
                        {(r.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-bold text-[#0F172A] truncate">{r.fullName}</p>
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${suspended ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DCFCE7] text-[#166534]"}`}>{suspended ? "Suspended" : "Active"}</span>
                        </div>
                        <p className="text-[12.5px] text-[#64748B] truncate">{r.jobTitle ? `${r.jobTitle} · ` : ""}{r.email}</p>
                        <p className="text-[11.5px] text-[#94A3B8] mt-1">Signed in {when(r.lastLoginAt)} · {r.actions30d.toLocaleString("en-IN")} actions in 30 days</p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1.5">Can open</p>
                      {granted.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {granted.map((m) => (
                            <span key={m.key} className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg ${levelChip[r.permissions[m.key] as StaffLevel]}`}>
                              {m.label} · {r.permissions[m.key] === "manage" ? "Edit" : "View"}
                            </span>
                          ))}
                          {r.canImpersonate && <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] inline-flex items-center gap-1"><LogIn size={12} /> Log in as customers</span>}
                        </div>
                      ) : <p className="text-[12.5px] text-[#B45309]">Nothing yet — they can sign in but won't see any module.</p>}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end lg:w-[220px] shrink-0">
                      <button onClick={() => setEditing(r)} className="h-9 px-3 rounded-xl bg-[#EEF2FF] text-[#3730A3] text-[12.5px] font-bold inline-flex items-center gap-1.5"><UserCog size={14} /> Edit access</button>
                      <Link to={`/admin/activity?actor=${r.id}`} className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-[#334155] text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8FAFC]"><History size={14} /> Activity</Link>
                      <button onClick={() => doReset(r)} title="Create a new password" className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] inline-flex items-center justify-center hover:bg-[#F8FAFC]"><KeyRound size={15} /></button>
                      <button onClick={() => toggleStatus(r)} title={suspended ? "Reactivate" : "Suspend"} className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#334155] inline-flex items-center justify-center hover:bg-[#F8FAFC]">{suspended ? <PlayCircle size={15} /> : <PauseCircle size={15} />}</button>
                      <button onClick={() => doRemove(r)} title="Remove" className="h-9 w-9 rounded-xl border border-[#FECACA] text-[#B91C1C] inline-flex items-center justify-center hover:bg-[#FEF2F2]"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex gap-3">
          <ShieldCheck size={18} className="text-[#4338CA] shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-[#475569] leading-relaxed">
            Only you can add staff, change access and read the Activity Log. Staff can never edit your account or another staff
            member's, set anyone's role, or see pages outside their access — the server refuses it even if they try the address directly.
          </p>
        </div>
      </div>

      {editing && (
        <StaffEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(created) => { setEditing(null); refresh(); if (created) setSecret(created); }}
        />
      )}
      {secret && <PasswordCard {...secret} onClose={() => setSecret(null)} />}
    </ResponsiveDashboardLayout>
  );
}

function StaffEditor({ row, onClose, onSaved }: {
  row: StaffRow | null;
  onClose: () => void;
  onSaved: (created: { email: string; password: string; heading: string } | null) => void;
}) {
  const create = trpc.staff.create.useMutation();
  const update = trpc.staff.update.useMutation();
  const [fullName, setFullName] = useState(row?.fullName ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(row?.jobTitle ?? "");
  const [perms, setPerms] = useState<StaffPermissions>(row?.permissions ?? {});
  const [impersonate, setImpersonate] = useState(row?.canImpersonate ?? false);
  const [ownPassword, setOwnPassword] = useState("");
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setLevel = (key: StaffModule, level: Level) => setPerms((p) => {
    const next = { ...p };
    if (level === "none") delete next[key]; else next[key] = level;
    return next;
  });
  const grantedCount = useMemo(() => Object.keys(perms).length, [perms]);
  const canImpersonate = !!perms.customers;

  const save = async () => {
    if (fullName.trim().length < 2) { toast.error("Enter their name."); return; }
    if (!row && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email address."); return; }
    if (ownPassword && ownPassword.length < 8) { toast.error("The password needs at least 8 characters."); return; }
    try {
      if (row) {
        await update.mutateAsync({ id: row.id, fullName: fullName.trim(), phone: phone.trim(), jobTitle: jobTitle.trim(), permissions: perms, canImpersonate: canImpersonate && impersonate });
        toast.success(`Access saved for ${fullName.trim()}`);
        onSaved(null);
      } else {
        const res = await create.mutateAsync({
          fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, jobTitle: jobTitle.trim() || undefined,
          password: ownPassword || undefined, permissions: perms, canImpersonate: canImpersonate && impersonate,
        });
        toast.success(`${fullName.trim()} added`);
        onSaved(res.password ? { email: res.email, password: res.password, heading: `${fullName.trim()} can now sign in` } : null);
      }
    } catch (e) { toast.error((e as Error).message); }
  };

  const input = "w-full h-11 rounded-xl border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15";

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="staff-editor-title">
      <div className="absolute inset-0 bg-[#020617]/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-3xl max-h-[92dvh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-[#F1F5F9]">
          <div>
            <h2 id="staff-editor-title" className="text-[17px] font-bold text-[#0F172A]">{row ? `Edit ${row.fullName}` : "Add staff member"}</h2>
            <p className="text-[12.5px] text-[#64748B]">{grantedCount ? `${grantedCount} of ${STAFF_MODULES.length} modules granted` : "Choose what they can open"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center justify-center"><X size={17} /></button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-[12px] font-semibold text-[#475569]">Full name</span>
              <input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} placeholder="e.g. Priya Sharma" /></label>
            <label className="block"><span className="text-[12px] font-semibold text-[#475569]">Email (their sign-in)</span>
              <input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!row}
                className={`${input} disabled:bg-[#F8FAFC] disabled:text-[#64748B]`} placeholder="priya@yourcompany.com" /></label>
            <label className="block"><span className="text-[12px] font-semibold text-[#475569]">Job title <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <input id="staff-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={input} placeholder="e.g. Customer support" /></label>
            <label className="block"><span className="text-[12px] font-semibold text-[#475569]">Phone <span className="font-normal text-[#94A3B8]">(optional)</span></span>
              <input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="+91 …" /></label>
            {!row && (
              <label className="block sm:col-span-2"><span className="text-[12px] font-semibold text-[#475569]">Password <span className="font-normal text-[#94A3B8]">(leave empty and we'll create one, shown once)</span></span>
                <input id="staff-password" type="text" autoComplete="new-password" value={ownPassword} onChange={(e) => setOwnPassword(e.target.value)} className={input} placeholder="At least 8 characters" /></label>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-[13px] font-bold text-[#0F172A]">What they can open</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => { setPerms(p.perms); setImpersonate(p.impersonate); }}
                    className="h-8 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#334155] hover:border-[#6366F1] hover:text-[#3730A3]">{p.label}</button>
                ))}
                <button type="button" onClick={() => { setPerms({}); setImpersonate(false); }}
                  className="h-8 px-3 rounded-lg text-[12px] font-semibold text-[#94A3B8] hover:text-[#B91C1C]">Clear</button>
              </div>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
              {STAFF_MODULES.map((m) => {
                const cur: Level = perms[m.key] ?? "none";
                return (
                  <div key={m.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#0F172A]">{m.label}</p>
                      <p className="text-[12px] text-[#64748B]">{m.hint}</p>
                    </div>
                    <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 shrink-0" role="radiogroup" aria-label={`${m.label} access`}>
                      {LEVELS.map((l) => (
                        <button key={l.key} type="button" role="radio" aria-checked={cur === l.key} onClick={() => setLevel(m.key, l.key)}
                          className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-colors ${cur === l.key
                            ? l.key === "none" ? "bg-white text-[#475569] shadow-sm" : l.key === "view" ? "bg-white text-[#0F172A] shadow-sm" : "bg-[#4338CA] text-white shadow-sm"
                            : "text-[#64748B] hover:text-[#0F172A]"}`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <label className={`flex items-start gap-3 rounded-2xl border p-4 ${canImpersonate ? "border-[#FDE68A] bg-[#FFFBEB] cursor-pointer" : "border-[#E2E8F0] bg-[#F8FAFC] opacity-70"}`}>
            <input id="staff-impersonate" type="checkbox" className="mt-1 h-4 w-4 accent-[#4338CA]" disabled={!canImpersonate}
              checked={canImpersonate && impersonate} onChange={(e) => setImpersonate(e.target.checked)} />
            <span>
              <span className="block text-[13.5px] font-semibold text-[#0F172A]">Can log in as a customer</span>
              <span className="block text-[12px] text-[#64748B]">
                {canImpersonate ? "Opens a customer's own dashboard to help them — every time is recorded in the Activity Log." : "Give Customers access first."}
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-[#F1F5F9] pb-[max(16px,env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="h-11 px-4 rounded-xl text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]">Cancel</button>
          <button onClick={save} disabled={busy} className="h-11 px-5 rounded-xl bg-[#4338CA] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60">
            {busy && <Loader2 size={15} className="animate-spin" />} {row ? "Save access" : "Add staff member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard({ email, password, heading, onClose }: { email: string; password: string; heading: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  // The admin portal's sign-in page (same address the super admin uses).
  const loginUrl = `${window.location.origin}/${import.meta.env.VITE_ADMIN_LOGIN_SLUG || "control-signin"}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Admin portal: ${loginUrl}\nEmail: ${email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Copy failed — select the text instead."); }
  };
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#020617]/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <h2 className="text-[17px] font-bold text-[#0F172A]">{heading}</h2>
        <p className="text-[12.5px] text-[#64748B] mt-1">This password is shown only once. Share it privately — they can change it from their profile.</p>
        <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2 text-[13px]">
          <div><span className="text-[#94A3B8]">Admin portal</span><div className="font-semibold text-[#0F172A] break-all">{loginUrl}</div></div>
          <div><span className="text-[#94A3B8]">Email</span><div className="font-semibold text-[#0F172A] break-all">{email}</div></div>
          <div><span className="text-[#94A3B8]">Password</span><div className="font-mono font-bold text-[15px] text-[#0F172A] select-all">{password}</div></div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={copy} className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] inline-flex items-center gap-2">
            {copied ? <Check size={15} className="text-[#16A34A]" /> : <Copy size={15} />} {copied ? "Copied" : "Copy all"}
          </button>
          <button onClick={onClose} className="h-10 px-5 rounded-xl bg-[#4338CA] text-white text-sm font-bold">Done</button>
        </div>
      </div>
    </div>
  );
}
