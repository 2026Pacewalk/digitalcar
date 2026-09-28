import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import type { ReactNode } from "react";
import type { AdminDashboard as DashboardData } from "@contracts/admin-dashboard";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { DashboardError, DashboardSkeleton, SectionFailed } from "@/components/admin/dashboard/States";
import { RevenueHero } from "@/components/admin/dashboard/RevenueHero";
import { ActionQueue } from "@/components/admin/dashboard/ActionQueue";
import { ResellerRevenue } from "@/components/admin/dashboard/ResellerRevenue";
import { KpiTiles } from "@/components/admin/dashboard/KpiTiles";
import { Engagement } from "@/components/admin/dashboard/Engagement";
import { PlansAndFunnel } from "@/components/admin/dashboard/PlansAndFunnel";
import { ActivityAndSignups } from "@/components/admin/dashboard/ActivityFeed";
import { HealthStrip } from "@/components/admin/dashboard/HealthStrip";
import { useReducedMotion } from "@/components/admin/dashboard/format";

/* The super admin's home: money in (every stream), the reseller channel, what
   needs doing now, growth and card performance — one payload
   (analytics.adminDashboard, contracts/admin-dashboard.ts), refreshed every
   minute. A section the viewer (a staff member) has no access to comes back
   null and is simply left out; the grid closes up around it. A section the
   server couldn't build this time is listed in `failed` and gets a small
   "couldn't load" notice in its place instead. */

type SectionKey = DashboardData["failed"][number];
const SECTION_NAME: Record<SectionKey, string> = {
  revenue: "revenue",
  actions: "what needs action",
  resellers: "the reseller channel",
  customers: "customer numbers",
  engagement: "card performance",
  funnel: "the conversion funnel",
  products: "card designs",
  activity: "team activity",
  recentSignups: "recent sign-ups",
  health: "system health",
};

/* One step of the first-load reveal. Sections mount once, when the data first
   arrives, so the stagger plays once — the minute refresh never replays it. */
function Reveal({ step, still, className = "", children }: { step: number; still: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${still ? "" : "dc-enter"} ${className}`} style={still ? undefined : { animationDelay: `${Math.min(step, 6) * 70}ms` }}>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const q = trpc.analytics.adminDashboard.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: true });
  const data = q.data as DashboardData | undefined;
  const access = useStaffAccess();
  const { user } = useAuth();
  const still = useReducedMotion();
  const canOpen = access.canOpenPath;
  const role = access.isStaff ? "staff" : "super_admin";
  const firstName = (user?.fullName || "").trim().split(/\s+/)[0] || "";

  const refresh = () => { void q.refetch(); };
  const failed = new Set<SectionKey>(data?.failed ?? []);
  const oops = (key: SectionKey) => (failed.has(key)
    ? <SectionFailed what={SECTION_NAME[key]} onRetry={refresh} retrying={q.isFetching} />
    : null);

  const showRevenue = !!data?.revenue || failed.has("revenue");
  const showActions = (!!data && data.actions.length > 0) || failed.has("actions");
  // On a phone the columns stack; when something is waiting, it goes first.
  const waiting = !!data && data.actions.some((a) => a.count > 0);

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Dashboard" subtitle="Money in, what needs doing, and how the business is growing" /></div>
      <div className="px-4 py-4 sm:p-6 max-w-7xl mx-auto w-full">
        <Reveal step={0} still={still}>
          <DashboardHeader
            name={firstName}
            updatedAt={q.dataUpdatedAt}
            fetching={q.isFetching}
            failed={q.isError}
            partial={failed.size > 0}
            onRefresh={refresh}
          />
        </Reveal>

        <div className="mt-4 sm:mt-5">
          {!data ? (
            q.isError ? <DashboardError onRetry={refresh} retrying={q.isFetching} /> : <DashboardSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Each slot keeps its Reveal when a failed section comes back, so
                  the section appears in place without replaying the entrance. */}
              {showRevenue && (
                <Reveal step={1} still={still} className={showActions ? "lg:col-span-8" : "lg:col-span-12"}>
                  {data.revenue
                    ? <RevenueHero revenue={data.revenue} generatedAt={data.generatedAt} canOpen={canOpen} animate={!still} />
                    : oops("revenue")}
                </Reveal>
              )}
              {showActions && (
                <Reveal step={2} still={still} className={`${showRevenue ? "lg:col-span-4" : "lg:col-span-12"} ${waiting ? "order-first lg:order-none" : ""}`}>
                  {/* One check failing mustn't hide the ones that loaded. */}
                  {data.actions.length > 0 ? (
                    <div className="h-full flex flex-col gap-2">
                      {failed.has("actions") && (
                        <p role="status" className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11.5px] text-[#92400E]">Some checks didn't load — they'll be retried on the next refresh.</p>
                      )}
                      <ActionQueue actions={data.actions} canOpen={canOpen} wide={!showRevenue} className="flex-1" />
                    </div>
                  ) : oops("actions")}
                </Reveal>
              )}
              {(data.resellers || failed.has("resellers")) && (
                <Reveal step={3} still={still} className="lg:col-span-12">
                  {data.resellers ? <ResellerRevenue resellers={data.resellers} canOpen={canOpen} animate={!still} /> : oops("resellers")}
                </Reveal>
              )}
              {(data.customers || data.engagement || failed.has("customers")) && (
                <Reveal step={4} still={still} className="lg:col-span-12">
                  <KpiTiles customers={data.customers} engagement={data.engagement} canOpen={canOpen} customersFailed={oops("customers")} />
                </Reveal>
              )}
              {(data.engagement || failed.has("engagement")) && (
                <Reveal step={5} still={still} className="lg:col-span-12">
                  {data.engagement ? <Engagement engagement={data.engagement} animate={!still} /> : oops("engagement")}
                </Reveal>
              )}
              {(data.customers || data.funnel || data.products || failed.has("funnel") || failed.has("products")) && (
                <Reveal step={6} still={still} className="lg:col-span-12">
                  <PlansAndFunnel
                    customers={data.customers}
                    funnel={data.funnel}
                    products={data.products}
                    failed={{ funnel: oops("funnel"), products: oops("products") }}
                  />
                </Reveal>
              )}
              <Reveal step={7} still={still} className="lg:col-span-12">
                <ActivityAndSignups
                  activity={data.activity}
                  signups={data.recentSignups}
                  role={role}
                  canOpen={canOpen}
                  failed={{ activity: oops("activity"), signups: oops("recentSignups") }}
                />
              </Reveal>
              {(data.health || failed.has("health")) && (
                <Reveal step={8} still={still} className="lg:col-span-12">
                  {data.health ? <HealthStrip health={data.health} canOpen={canOpen} /> : oops("health")}
                </Reveal>
              )}
            </div>
          )}
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
