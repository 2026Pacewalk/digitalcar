/* Growth mechanics: which plans people are on (this platform vs the old
   site), where visitors drop out on the way to a paid plan, and which card
   designs pull their weight. */
import type { ReactNode } from "react";
import { ArrowDown, Crown, Funnel as FunnelIcon, Palette } from "lucide-react";
import type { CustomerSection, FunnelStage, ProductRow } from "@contracts/admin-dashboard";
import { ChartEmpty, Key, Panel } from "./bits";
import { nf, share } from "./format";

const C = { platform: "#F7B31C", oldSite: "#64748B" };
const COLS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };

function PlanMix({ plans }: { plans: CustomerSection["plans"] }) {
  const rows = plans.map((p) => ({ ...p, total: p.platform + p.oldSite })).filter((p) => p.total > 0).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel title="Plan mix" sub="Active plans — this platform and the old site" icon={Crown} tint={{ bg: "#FEF3C7", fg: "#B45309" }}>
      {rows.length ? (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
            <Key color={C.platform}>This platform</Key>
            <Key color={C.oldSite}>Old site</Key>
          </div>
          <ul className="space-y-3">
            {rows.map((p) => (
              <li key={p.packageId}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#334155] truncate">{p.name}</span>
                  <span className="text-[12.5px] font-bold text-[#0F172A] tabular-nums shrink-0">
                    {nf(p.total)} <span className="text-[10.5px] font-medium text-[#94A3B8]">· {nf(p.platform)} here · {nf(p.oldSite)} old</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[#F1F5F9] overflow-hidden" aria-hidden="true">
                  <div className="h-full flex gap-[2px]" style={{ width: `${share(p.total, max)}%` }}>
                    {p.platform > 0 && <span className="h-full rounded-l-full last:rounded-r-full" style={{ flexGrow: p.platform, flexBasis: 0, minWidth: 3, background: C.platform }} />}
                    {p.oldSite > 0 && <span className="h-full rounded-r-full first:rounded-l-full" style={{ flexGrow: p.oldSite, flexBasis: 0, minWidth: 3, background: C.oldSite }} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ChartEmpty icon={Crown} className="h-[180px]" title="No active plans yet" hint="Gold, Platinum and trial plans will show here, split by where the customer signed up." />
      )}
    </Panel>
  );
}

function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const first = stages[0]?.count ?? 0;
  // The headline rate is to a paid plan; "Upgraded" comes after it.
  const last = stages.find((s) => s.stage === "payment") ?? stages[stages.length - 1];
  const any = stages.some((s) => s.count > 0);
  return (
    <Panel title="Conversion funnel" sub="From a first look at a design to a paid plan" icon={FunnelIcon} tint={{ bg: "#FFE4E6", fg: "#E11D48" }}>
      {any ? (
        <>
          <ol>
            {stages.map((s, i) => {
              const prev = i > 0 ? stages[i - 1].count : 0;
              // These are events, not people, so a step can outnumber the one before it.
              const ratio = i > 0 && prev > 0 ? s.count / prev : null;
              return (
                <li key={s.stage}>
                  {i > 0 && (
                    <div className="flex items-center gap-1.5 py-1 pl-2 text-[10.5px] text-[#64748B] tabular-nums">
                      <ArrowDown size={11} aria-hidden="true" className="text-[#CBD5E1]" />
                      {ratio === null ? "—" : ratio > 1
                        ? <><b className="text-[#334155]">{ratio.toFixed(1)}×</b> the step before</>
                        : <><b className="text-[#334155]">{Math.round(ratio * 100)}%</b> moved on</>}
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[12.5px] font-semibold text-[#334155] truncate">{s.label}</span>
                    <span className="text-[12.5px] font-bold text-[#0F172A] tabular-nums shrink-0">{nf(s.count)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${share(s.count, max)}%`, minWidth: s.count > 0 ? 4 : 0, background: "linear-gradient(90deg,#F7B31C,#D97706)" }} />
                  </div>
                </li>
              );
            })}
          </ol>
          {first > 0 && last && stages.length > 1 && (
            <p className="mt-3 text-[11.5px] text-[#64748B]">
              <b className="text-[#0F172A] tabular-nums">{Math.round((last.count / first) * 1000) / 10}%</b> of “{stages[0].label.toLowerCase()}” end in “{last.label.toLowerCase()}”.
            </p>
          )}
        </>
      ) : (
        <ChartEmpty icon={FunnelIcon} className="h-[180px]" title="No funnel activity yet" hint="Views, demos, free tries, sign-ups and payments will line up here." />
      )}
    </Panel>
  );
}

function Products({ rows }: { rows: ProductRow[] }) {
  const top = [...rows].sort((a, b) => b.views - a.views).slice(0, 6);
  const max = Math.max(1, ...top.map((p) => p.views));
  return (
    <Panel title="Card designs" sub="Which designs pull views, demos and free tries" icon={Palette} tint={{ bg: "#CCFBF1", fg: "#0F766E" }}>
      {top.some((p) => p.views + p.demos + p.tries > 0) ? (
        <ol className="space-y-3">
          {top.map((p) => (
            <li key={p.productId}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#334155] truncate">{p.name}</span>
                <span className="text-[12.5px] font-bold text-[#0F172A] tabular-nums shrink-0">{nf(p.views)} <span className="text-[10.5px] font-medium text-[#94A3B8]">views</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-[#14B8A6]" style={{ width: `${share(p.views, max)}%`, minWidth: p.views > 0 ? 4 : 0 }} />
              </div>
              <p className="mt-1 text-[10.5px] text-[#64748B] tabular-nums">
                {nf(p.demos)} demo{p.demos === 1 ? "" : "s"} · {nf(p.tries)} free tr{p.tries === 1 ? "y" : "ies"}
                {p.views > 0 && <> · <b className="text-[#0F766E]">{Math.round((p.tries / p.views) * 100)}%</b> try it</>}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <ChartEmpty icon={Palette} className="h-[180px]" title="No design views yet" hint="Once people browse card designs, the ones that convert rise to the top." />
      )}
    </Panel>
  );
}

export function PlansAndFunnel({ customers, funnel, products, failed }: {
  customers: CustomerSection | null;
  funnel: FunnelStage[] | null;
  products: ProductRow[] | null;
  /** Stand-ins for a panel that couldn't load this time, shown in its place. */
  failed?: { funnel?: ReactNode; products?: ReactNode };
}) {
  const panels: ReactNode[] = [];
  if (customers) panels.push(<PlanMix key="plans" plans={customers.plans} />);
  if (funnel) panels.push(<Funnel key="funnel" stages={funnel} />);
  else if (failed?.funnel) panels.push(<div key="funnel" className="grid min-w-0">{failed.funnel}</div>);
  if (products) panels.push(<Products key="products" rows={products} />);
  else if (failed?.products) panels.push(<div key="products" className="grid min-w-0">{failed.products}</div>);
  if (!panels.length) return null;
  return <div className={`grid grid-cols-1 ${COLS[panels.length]} gap-4 sm:gap-5`}>{panels}</div>;
}
