/* Four growth tiles under the money: customers, paid plans, published cards
   and card views — each with the one piece of context that makes the number
   mean something (a trend, a split, a conversion). */
import type { ReactNode } from "react";
import { ChevronRight, Crown, Eye, Layers, Users } from "lucide-react";
import type { CustomerSection, EngagementSection } from "@contracts/admin-dashboard";
import { DeltaChip, Key, MaybeLink, Pill, Sparkline, SplitBar, type IconType } from "./bits";
import { nf } from "./format";

const PLAN_COLORS = ["#F7B31C", "#475569", "#8B5CF6", "#14B8A6"];
const planColor = (name: string, i: number) =>
  /gold/i.test(name) ? "#F7B31C" : /platinum/i.test(name) ? "#475569" : PLAN_COLORS[i % PLAN_COLORS.length];

function Tile({ icon: Icon, tint, label, value, to, allowed, children }: {
  icon: IconType;
  tint: { bg: string; fg: string };
  label: string;
  value: string;
  to?: string;
  allowed?: boolean;
  children: ReactNode;
}) {
  const linked = !!to && !!allowed;
  return (
    <MaybeLink
      to={to}
      allowed={!!allowed}
      className={`group flex flex-col h-full min-w-0 bg-white rounded-2xl border border-[#F1F5F9] shadow-premium p-3.5 sm:p-4 ${linked ? "dc-press transition-all hover:-translate-y-0.5 hover:shadow-premium-lg hover:border-[#E2E8F0]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tint.bg, color: tint.fg }}><Icon size={16} /></span>
          <span className="text-[12px] font-semibold text-[#64748B] truncate">{label}</span>
        </span>
        {linked && <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-[#CBD5E1] transition-colors group-hover:text-[#64748B]" />}
      </div>
      <p className="mt-3 font-display text-[26px] sm:text-[30px] font-extrabold text-[#0F172A] leading-none tabular-nums">{value}</p>
      <div className="mt-2 flex-1 flex flex-col gap-2 min-w-0">{children}</div>
    </MaybeLink>
  );
}

export function KpiTiles({ customers: cu, engagement: en, canOpen, customersFailed }: {
  customers: CustomerSection | null;
  engagement: EngagementSection | null;
  canOpen: (path: string) => boolean;
  /** Stands in for the three customer tiles when they couldn't load this time. */
  customersFailed?: ReactNode;
}) {
  const canCustomers = canOpen("/admin/customers");
  const paidPlans = (cu?.plans ?? [])
    .filter((p) => !/trial|free/i.test(p.name))
    .map((p, i) => ({ key: String(p.packageId), name: p.name, value: p.platform + p.oldSite, color: planColor(p.name, i) }))
    .filter((p) => p.value > 0);
  const conv = cu && cu.trialConversion.total > 0 ? Math.round((cu.trialConversion.converted / cu.trialConversion.total) * 100) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {!cu && customersFailed && <div className={`grid col-span-2 ${en ? "lg:col-span-3" : "lg:col-span-4"} min-w-0`}>{customersFailed}</div>}

      {cu && (
        <Tile icon={Users} tint={{ bg: "#DBEAFE", fg: "#2563EB" }} label="Customers" value={nf(cu.total)} to="/admin/customers" allowed={canCustomers}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-semibold text-[#334155] tabular-nums">+{nf(cu.new30)} in 30 days</span>
            <DeltaChip now={cu.new30} before={cu.prev30} context="vs the 30 days before" />
          </div>
          <Sparkline values={cu.signups.map((d) => d.count)} color="#3B82F6" className="h-8" />
          <p className="sr-only">{nf(cu.newToday)} signed up today, {nf(cu.new7)} in the last 7 days.</p>
          <div className="mt-auto">
            <SplitBar parts={[{ key: "p", value: cu.platform, color: "#F7B31C" }, { key: "o", value: cu.oldSite, color: "#64748B" }]} />
            <p className="mt-1 text-[10.5px] text-[#64748B] tabular-nums truncate">{nf(cu.platform)} platform · {nf(cu.oldSite)} old site</p>
          </div>
        </Tile>
      )}

      {cu && (
        <Tile icon={Crown} tint={{ bg: "#FEF3C7", fg: "#B45309" }} label="Paid plans" value={nf(cu.paidActive)} to="/admin/customers" allowed={canCustomers}>
          {paidPlans.length > 0 ? (
            <div>
              <SplitBar className="h-2" parts={paidPlans} />
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                {paidPlans.map((p) => <Key key={p.key} color={p.color}><span className="tabular-nums">{p.name} {nf(p.value)}</span></Key>)}
              </div>
            </div>
          ) : (
            <p className="text-[11.5px] text-[#94A3B8]">No paid plans active yet</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            <Pill tone="blue"><span className="tabular-nums">{nf(cu.trialsActive)}</span> on trial</Pill>
            {conv !== null && <Pill tone="green"><span className="tabular-nums">{conv}%</span> of trials convert</Pill>}
            {cu.expiring7 > 0 && <Pill tone="amber"><span className="tabular-nums">{nf(cu.expiring7)}</span> end this week</Pill>}
          </div>
        </Tile>
      )}

      {cu && (
        <Tile icon={Layers} tint={{ bg: "#CCFBF1", fg: "#0F766E" }} label="Cards published" value={nf(cu.publishedCards)}>
          <span className="text-[11.5px] font-semibold text-[#334155] tabular-nums">+{nf(cu.published30)} in 30 days</span>
          <div className="mt-auto">
            <SplitBar className="h-1.5" parts={[
              { key: "new", value: cu.published30, color: "#14B8A6" },
              { key: "older", value: Math.max(0, cu.publishedCards - cu.published30), color: "#CCFBF1" },
            ]} />
            <p className="mt-1 text-[10.5px] text-[#64748B] tabular-nums">
              {cu.publishedCards > 0 ? `${Math.round((cu.published30 / cu.publishedCards) * 100)}% went live in the last 30 days` : "No cards live yet"}
            </p>
          </div>
        </Tile>
      )}

      {en && (
        <Tile icon={Eye} tint={{ bg: "#EDE9FE", fg: "#6D28D9" }} label="Card views" value={nf(en.views30)}>
          <div className="flex flex-wrap items-center gap-1.5">
            <DeltaChip now={en.views30} before={en.viewsPrev30} context="vs the 30 days before" />
            <span className="text-[11.5px] text-[#64748B] tabular-nums">{nf(en.visitors30)} visitors · 30 days</span>
          </div>
          <Sparkline values={en.daily.map((d) => d.views)} color="#8B5CF6" className="h-8 mt-auto" />
        </Tile>
      )}
    </div>
  );
}
