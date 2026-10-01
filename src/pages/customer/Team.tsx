import { useMemo, useState } from "react";
import { Users, Trash2, Eye, EyeOff, Crown, ArrowRight, AtSign, Search, RefreshCw, Check } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AutoSaveBadge, fieldCls, LimitBar, Panel, SectionToggle, Tip } from "@/components/customer/ModuleShell";
import { accountPackageId, packageLimit } from "@/hooks/useCustomer";
import { useCardAutosave } from "@/hooks/useCardAutosave";
import { trpc } from "@/providers/trpc";

/* A team member is always a real DigitalCarda profile, added by its @handle.
   The picture follows the same order everywhere: the person's own display
   picture first, their business logo second, and failing both the first letter
   of the business name. `logo` is kept apart from `photo` so the card can fit a
   logo inside the circle instead of cropping it like a portrait. */
export type TeamMember = {
  id: number; slug: string; name: string; company: string; role: string;
  photo: string; logo: string; link: string; show: boolean;
};

export function readTeam(raw: unknown): TeamMember[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(arr) ? (arr as TeamMember[]).filter((m) => m && typeof m === "object") : [];
  } catch { return []; }
}

const handleOf = (v: string) =>
  v.trim().toLowerCase().replace(/^@+/, "").replace(/^https?:\/\/[^/]+\//, "").replace(/[^a-z0-9_-]/g, "");

export default function Team() {
  const { val, set, status } = useCardAutosave();
  const limit = packageLimit(accountPackageId(), "team");
  const locked = limit <= 0;                       // Gold / Trial: Platinum feature
  const members = useMemo(() => readTeam(val("team")), [val]);

  const [handle, setHandle] = useState("");
  const [lookup, setLookup] = useState("");        // the handle we're actually searching for
  const found = trpc.publish.profileBySlug.useQuery({ slug: lookup }, { enabled: !locked && lookup.length > 1, retry: false });
  const mineQuery = trpc.publish.myProfiles.useQuery(undefined, { enabled: !locked });
  // The card being edited is not its own team member.
  const thisSlug = (val("slug") || val("username") || "").toLowerCase();
  const myProfiles = (mineQuery.data || []).filter((p) => p.slug.toLowerCase() !== thisSlug);
  const utils = trpc.useUtils();

  const save = (next: TeamMember[]) => set("team", JSON.stringify(next));
  const patch = (id: number, p: Partial<TeamMember>) => save(members.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const remove = (id: number) => { save(members.filter((m) => m.id !== id)); toast.success("Member removed"); };

  type Profile = { slug: string; name: string; company?: string; designation?: string; photo?: string; logo?: string };
  const addProfile = (p: Profile) => {
    if (members.length >= limit) { toast.error(`Your plan allows ${limit} team members.`); return; }
    if (members.some((m) => m.slug === p.slug)) { toast.error(`@${p.slug} is already on your card.`); return; }
    save([...members, {
      id: Date.now(), slug: p.slug, name: p.name || p.slug, company: p.company || "",
      role: p.designation || p.company || "",
      photo: p.photo || "", logo: p.logo || "", link: p.slug, show: true,
    }]);
    setHandle(""); setLookup("");
    toast.success(`${p.name || p.slug} added`);
  };

  /* Pull the member's name, photo and title again — their profile may have moved on. */
  const refresh = async (m: TeamMember) => {
    try {
      const p = await utils.publish.profileBySlug.fetch({ slug: m.slug });
      if (!p) { toast.error(`@${m.slug} no longer exists.`); return; }
      patch(m.id, { name: p.name || m.name, company: p.company || m.company, photo: p.photo || "", logo: p.logo || "", role: m.role || p.designation || "" });
      toast.success("Details refreshed");
    } catch { toast.error("Could not reach that profile — try again."); }
  };

  const shown = members.filter((m) => m.show).length;
  const already = (slug: string) => members.some((m) => m.slug === slug);

  if (locked) {
    return (
      <div className="space-y-4">
        <Panel title="Our Team" subtitle="Show the other profiles in your account on this card" icon={Users}>
          <div className="rounded-2xl border border-[#F7B31C]/40 bg-gradient-to-br from-[#FFFBEB] to-white p-5 sm:p-7 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F7B31C]">
              <Crown size={12} /> Platinum feature
            </span>
            <h2 className="mt-3 text-[20px] sm:text-[22px] font-extrabold text-[#0F172A]">Put your whole team on one card</h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#475569]">
              Platinum gives you up to 3 cards in one login — one for you and one for each colleague.
              Add them here by their <span className="font-semibold">@handle</span> and they appear on your card,
              so a customer taps the right person and lands on their card.
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

      {/* ── Add by @handle ───────────────────────────────────────────── */}
      <Panel title="Add a team member" subtitle="Only DigitalCarda profiles — type their @handle" icon={AtSign}>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><AtSign size={15} /></span>
            <input className={`${fieldCls} pl-8`} value={handle} placeholder="their-handle  (digitalcarda.in/their-handle)"
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setLookup(handleOf(handle)); }} />
          </div>
          <button onClick={() => setLookup(handleOf(handle))} disabled={handleOf(handle).length < 2}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#111827] text-[13.5px] font-bold text-white hover:bg-[#1F2937] disabled:opacity-40 transition-colors">
            <Search size={15} /> Find
          </button>
        </div>

        {lookup.length > 1 && (
          <div className="mt-3">
            {found.isLoading && <p className="text-[13px] text-[#64748B]">Looking up @{lookup}…</p>}
            {!found.isLoading && !found.data && (
              <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[13px] text-[#B91C1C]">
                No DigitalCarda profile at <span className="font-semibold">@{lookup}</span>. Check the handle — it is the last part of their card link.
              </p>
            )}
            {found.data && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3">
                <Avatar photo={found.data.photo} logo={found.data.logo} name={found.data.company || found.data.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-[#0F172A]">{found.data.name}</p>
                  <p className="truncate text-[12.5px] text-[#64748B]">
                    {found.data.designation || found.data.company || "DigitalCarda profile"} · @{found.data.slug}
                  </p>
                </div>
                <button onClick={() => addProfile(found.data!)} disabled={already(found.data.slug)}
                  className="h-9 shrink-0 rounded-xl bg-[#F7B31C] px-4 text-[13px] font-bold text-[#0F172A] hover:bg-[#E6A317] disabled:opacity-40 transition-colors">
                  {already(found.data.slug) ? "Added" : "Add"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* The other cards in this login — Platinum's multi-card plan. */}
        {!!myProfiles.length && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Profiles in your account</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {myProfiles.map((p) => (
                <button key={p.slug} onClick={() => addProfile(p)} disabled={already(p.slug)}
                  className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-2.5 text-left hover:border-[#F7B31C] disabled:opacity-50 disabled:hover:border-[#E2E8F0] transition-colors">
                  <Avatar photo={p.photo} logo={p.logo} name={p.company || p.name} small />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-[#0F172A]">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-[#64748B]">@{p.slug}</span>
                  </span>
                  <span className="shrink-0 text-[#94A3B8]">{already(p.slug) ? <Check size={16} /> : <span className="text-[12.5px] font-bold text-[#B45309]">Add</span>}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* ── The list on this card ────────────────────────────────────── */}
      <Panel title="On your card" subtitle={`${shown} of ${members.length} showing`} icon={Users}>
        <LimitBar used={members.length} limit={limit} unit="members" />

        {!members.length && (
          <p className="mt-3 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center text-[13.5px] text-[#64748B]">
            No one here yet. Add a colleague by their @handle above.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {members.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Avatar photo={m.photo} logo={m.logo} name={m.company || m.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-[#0F172A]">{m.name}</p>
                  <a href={`/${m.slug}`} target="_blank" rel="noopener" className="text-[12.5px] font-semibold text-[#B45309] hover:underline">@{m.slug}</a>
                  <input className={`${fieldCls} mt-2`} value={m.role} placeholder="Role on this card — e.g. Sales Manager"
                    onChange={(e) => patch(m.id, { role: e.target.value })} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-3">
                <button onClick={() => patch(m.id, { show: !m.show })}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-bold transition-colors ${m.show ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]" : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"}`}>
                  {m.show ? <Eye size={14} /> : <EyeOff size={14} />} {m.show ? "Showing on card" : "Hidden"}
                </button>
                <button onClick={() => refresh(m)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-[#334155] hover:border-[#F7B31C] transition-colors">
                  <RefreshCw size={13} /> Refresh details
                </button>
                <button onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}
                  className="ml-auto h-8 w-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:text-red-600 hover:border-red-200 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Tip>A member's photo and name come from their own DigitalCarda card, and tapping them on your card opens it.</Tip>
      </Panel>
    </div>
  );
}

/* Their display picture, else their logo (fitted on white, never cropped), else
   the first letter of the business name. */
function Avatar({ photo, logo, name, small }: { photo?: string; logo?: string; name: string; small?: boolean }) {
  const size = small ? "w-10 h-10 text-[15px]" : "w-14 h-14 text-[19px]";
  const src = photo || logo;
  return (
    <span className={`${size} shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold text-white ${src && !photo ? "bg-white ring-1 ring-[#E2E8F0]" : "bg-[#F7B31C]"}`}>
      {src
        ? <img src={src} alt="" className={`w-full h-full ${photo ? "object-cover" : "object-contain p-1.5"}`} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        : (name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
