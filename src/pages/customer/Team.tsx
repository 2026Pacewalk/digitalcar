import { useMemo, useState } from "react";
import { Users, Trash2, Plus, Eye, EyeOff, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AutoSaveBadge, fieldCls, ImagePick, LimitBar, Panel, SectionToggle, Tip } from "@/components/customer/ModuleShell";
import { accountPackageId, packageLimit } from "@/hooks/useCustomer";
import { useCardAutosave } from "@/hooks/useCardAutosave";

/* A colleague shown on the card. `show` is the owner's per-member switch: the
   member stays in the list but drops off the card when it is off. */
export type TeamMember = {
  id: number; name: string; role: string; photo: string;
  phone: string; email: string; link: string; show: boolean;
};

const blank = (): TeamMember =>
  ({ id: Date.now(), name: "", role: "", photo: "", phone: "", email: "", link: "", show: true });

/* The list rides on the card record as JSON, so it publishes, hydrates and
   previews through the same path as every other card field. */
export function readTeam(raw: unknown): TeamMember[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(arr) ? (arr as TeamMember[]).filter((m) => m && typeof m === "object") : [];
  } catch { return []; }
}

export default function Team() {
  const { val, set, status } = useCardAutosave();
  const limit = packageLimit(accountPackageId(), "team");
  const locked = limit <= 0;                     // Gold / Trial: Platinum feature
  const members = useMemo(() => readTeam(val("team")), [val]);
  const [open, setOpen] = useState<number | null>(null);

  const save = (next: TeamMember[]) => set("team", JSON.stringify(next));
  const patch = (id: number, p: Partial<TeamMember>) => save(members.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const add = () => {
    if (members.length >= limit) { toast.error(`Your plan allows ${limit} team members.`); return; }
    const m = blank();
    save([...members, m]);
    setOpen(m.id);
  };
  const remove = (id: number) => { save(members.filter((m) => m.id !== id)); toast.success("Member removed"); };
  const shown = members.filter((m) => m.show && m.name.trim()).length;

  if (locked) {
    return (
      <div className="space-y-4">
        <Panel title="Our Team" subtitle="Show your colleagues on your card" icon={Users}>
          <div className="rounded-2xl border border-[#F7B31C]/40 bg-gradient-to-br from-[#FFFBEB] to-white p-5 sm:p-7 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F7B31C]">
              <Crown size={12} /> Platinum feature
            </span>
            <h2 className="mt-3 text-[20px] sm:text-[22px] font-extrabold text-[#0F172A]">Put your whole team on one card</h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#475569]">
              Add your colleagues with their photo and role, and choose who appears on this card.
              Anyone who scans it can reach the right person in one tap — no more forwarding numbers.
            </p>
            <Link to="/dashboard/subscription"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-[14px] font-bold text-white hover:bg-[#1F2937] transition-colors">
              See Platinum <ArrowRight size={16} />
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-end gap-2"><AutoSaveBadge status={status} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionToggle flag="team_on" label="Team section" def={0} />
        <label className="rounded-2xl border border-[#E2E8F0] bg-white px-3.5 py-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Section heading</span>
          <input className={`${fieldCls} mt-1.5`} value={val("team_title") || ""} placeholder="Our Team"
            onChange={(e) => set("team_title", e.target.value)} />
        </label>
      </div>

      <Panel title="Team members" subtitle={`${shown} of ${members.length} showing on your card`} icon={Users}
        right={<button onClick={add} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#111827] text-[13px] font-bold text-white hover:bg-[#1F2937] transition-colors"><Plus size={15} /> Add member</button>}>
        <LimitBar used={members.length} limit={limit} unit="members" />

        {!members.length && (
          <p className="mt-3 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center text-[13.5px] text-[#64748B]">
            No one here yet. Add your first colleague — photo, name and role is all it takes.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {members.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <ImagePick value={m.photo} onChange={(url) => patch(m.id, { photo: url })} className="w-16 h-16 rounded-full" label="Photo" removable what="photo" />
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input className={fieldCls} value={m.name} placeholder="Full name" onChange={(e) => patch(m.id, { name: e.target.value })} />
                  <input className={fieldCls} value={m.role} placeholder="Role — e.g. Sales Manager" onChange={(e) => patch(m.id, { role: e.target.value })} />
                  {open === m.id && (
                    <>
                      <input className={fieldCls} value={m.phone} placeholder="Mobile (optional)" onChange={(e) => patch(m.id, { phone: e.target.value })} />
                      <input className={fieldCls} value={m.email} placeholder="Email (optional)" onChange={(e) => patch(m.id, { email: e.target.value })} />
                      <input className={`${fieldCls} sm:col-span-2`} value={m.link} placeholder="Their own card — digitalcarda.in/their-name (optional)"
                        onChange={(e) => patch(m.id, { link: e.target.value })} />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-3">
                <button onClick={() => patch(m.id, { show: !m.show })}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-bold transition-colors ${m.show ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]" : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"}`}>
                  {m.show ? <Eye size={14} /> : <EyeOff size={14} />} {m.show ? "Showing on card" : "Hidden"}
                </button>
                <button onClick={() => setOpen(open === m.id ? null : m.id)}
                  className="h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-[#334155] hover:border-[#F7B31C] transition-colors">
                  {open === m.id ? "Hide contact details" : "Contact details"}
                </button>
                <button onClick={() => remove(m.id)} aria-label={`Remove ${m.name || "member"}`}
                  className="ml-auto h-8 w-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:text-red-600 hover:border-red-200 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Tip>Tap a member on the live card and it opens their own card, or calls them — whichever you fill in here.</Tip>
      </Panel>
    </div>
  );
}
