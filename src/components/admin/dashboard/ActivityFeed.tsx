/* What just happened: the team feed (payments, orders, applications …) and
   the newest sign-ups, side by side. Rows open their page only for viewers
   who may open it. */
import type { ReactNode } from "react";
import { Bell, UserPlus } from "lucide-react";
import type { ActivityItem, SignupRow } from "@contracts/admin-dashboard";
import { linkFor, lookFor } from "@/lib/notificationsUi";
import { MaybeLink, Panel, Pill, ViewLink } from "./bits";
import { ago, initials, toMs, useNow } from "./format";

const ROLE: Record<string, { label: string; tone: "gold" | "emerald" | "indigo" | "rose" }> = {
  customer: { label: "Customer", tone: "gold" },
  reseller: { label: "Reseller", tone: "emerald" },
  staff: { label: "Staff", tone: "indigo" },
  super_admin: { label: "Admin", tone: "rose" },
};
const planTone = (plan: string) => (/trial/i.test(plan) ? "blue" : /platinum/i.test(plan) ? "slate" : /gold/i.test(plan) ? "gold" : "indigo");
const iso = (v: string) => {
  const t = toMs(v);
  return t == null ? undefined : new Date(t).toISOString();
};

export function ActivityFeed({ items, role, canOpen, now }: {
  items: ActivityItem[];
  role: string;
  canOpen: (path: string) => boolean;
  now: number;
}) {
  return (
    <Panel
      title="Team activity"
      sub="The latest across the modules you can see"
      icon={Bell}
      tint={{ bg: "#FFE4E6", fg: "#E11D48" }}
      action={<ViewLink to="/admin/notifications" show={canOpen("/admin/notifications")}>All</ViewLink>}
    >
      {items.length ? (
        <ol className="relative">
          {/* the timeline spine */}
          <span aria-hidden="true" className="absolute left-[23px] top-4 bottom-4 w-px bg-[#F1F5F9]" />
          {items.map((it) => {
            const look = lookFor("team", it.type);
            const href = it.link ? linkFor(role, it.link) : null;
            return (
              <li key={it.id} className="relative">
                <MaybeLink
                  to={href}
                  allowed={!!href && canOpen(href)}
                  className={`group flex items-start gap-3 rounded-xl px-2 py-2.5 ${href && canOpen(href) ? "transition-colors hover:bg-[#F8FAFC]" : ""}`}
                >
                  <span className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-4 ring-white" style={{ background: look.bg, color: look.fg }}>
                    <look.Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#0F172A] truncate">{it.title}</span>
                    {it.message && <span className="block text-[11.5px] text-[#64748B] truncate">{it.message}</span>}
                  </span>
                  <time dateTime={iso(it.createdAt)} className="shrink-0 pt-0.5 text-[11px] text-[#94A3B8] tabular-nums whitespace-nowrap">{ago(it.createdAt, now)}</time>
                </MaybeLink>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[13px] text-[#94A3B8] py-8 text-center">No team activity yet. Payments, orders and applications will show up here as they happen.</p>
      )}
    </Panel>
  );
}

export function RecentSignups({ rows, canOpen, now }: { rows: SignupRow[]; canOpen: (path: string) => boolean; now: number }) {
  const canCustomers = canOpen("/admin/customers");
  return (
    <Panel
      title="Recent sign-ups"
      sub="Newest accounts first"
      icon={UserPlus}
      tint={{ bg: "#DBEAFE", fg: "#2563EB" }}
      action={<ViewLink to="/admin/customers" show={canCustomers}>All customers</ViewLink>}
    >
      {rows.length ? (
        <ul className="divide-y divide-[#F1F5F9] -my-1">
          {rows.map((u) => {
            const role = ROLE[u.role] ?? { label: u.role.replace(/_/g, " "), tone: "indigo" as const };
            return (
              <li key={u.id}>
                <MaybeLink
                  to={u.role === "customer" ? `/admin/customers?q=${encodeURIComponent(u.email)}` : null}
                  allowed={canCustomers}
                  className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 ${u.role === "customer" && canCustomers ? "transition-colors hover:bg-[#F8FAFC]" : ""}`}
                >
                  <span className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0 text-[12px] font-bold text-[#0F172A]">{initials(u.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#0F172A] truncate">{u.name || "—"}</span>
                    <span className="block text-[11.5px] text-[#64748B] truncate">{u.email}</span>
                    <span className="mt-1 flex flex-wrap gap-1 sm:hidden">
                      <Pill tone={role.tone}>{role.label}</Pill>
                      {u.plan ? <Pill tone={planTone(u.plan)}>{u.plan}</Pill> : <Pill tone="slate">No plan</Pill>}
                    </span>
                  </span>
                  <span className="hidden sm:flex items-center gap-1 shrink-0">
                    <Pill tone={role.tone}>{role.label}</Pill>
                    {u.plan ? <Pill tone={planTone(u.plan)}>{u.plan}</Pill> : <Pill tone="slate">No plan</Pill>}
                  </span>
                  <time dateTime={iso(u.createdAt)} className="shrink-0 w-[68px] text-right text-[11px] text-[#94A3B8] tabular-nums">{ago(u.createdAt, now)}</time>
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-[#94A3B8] py-8 text-center">No sign-ups yet.</p>
      )}
    </Panel>
  );
}

/** The two panels side by side on wide screens; either may be missing, or
    stood in for by a "couldn't load" notice (`failed`). */
export function ActivityAndSignups({ activity, signups, role, canOpen, failed }: {
  activity: ActivityItem[];
  signups: SignupRow[] | null;
  role: string;
  canOpen: (path: string) => boolean;
  failed?: { activity?: ReactNode; signups?: ReactNode };
}) {
  const now = useNow(60_000);
  const right = signups ? <RecentSignups rows={signups} canOpen={canOpen} now={now} /> : failed?.signups ?? null;
  return (
    <div className={`grid grid-cols-1 ${right ? "lg:grid-cols-2" : ""} gap-4 sm:gap-5`}>
      {failed?.activity ?? <ActivityFeed items={activity} role={role} canOpen={canOpen} now={now} />}
      {right}
    </div>
  );
}
