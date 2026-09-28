/* The thesis of the page: how much money came in. This month's total counts
   up in gold on first load; the 12-month chart stacks every stream (plans,
   NFC, add-ons, domains, reseller payments) and a tap on a stream's chip shows
   that stream alone. Money going back out to partners sits underneath, so the
   owner sees gross and net together. */
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, BarChart3, IndianRupee } from "lucide-react";
import { REVENUE_STREAMS, type RevenueSection, type RevenueStream } from "@contracts/admin-dashboard";
import { ChartEmpty, DeltaChip, ViewLink } from "./bits";
import { FOCUS, MONTHS_LONG, inr, inrShort, istParts, nf, toMs, useCountUp } from "./format";

const STREAM = new Map(REVENUE_STREAMS.map((s) => [s.key, s]));

/** "2026-09" → "September 2026". */
const monthLong = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m ? `${MONTHS_LONG[m - 1]} ${y}` : ym;
};

/* One stacked segment. Only the top visible segment of a month gets the
   rounded cap, and every other segment gives up 2px at its top, so neighbours
   read apart by the gap rather than by an outline. */
type SegProps = { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: { top?: RevenueStream | null } };
function segment(key: RevenueStream) {
  return (raw: unknown) => {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = raw as SegProps;
    if (!(height > 0) || !(width > 0)) return <g />;
    const isTop = payload?.top === key;
    const h = isTop ? height : Math.max(1, height - 2);
    const top = y + (height - h);
    const r = isTop ? Math.min(4, width / 2, h) : 0;
    const d = r > 0
      ? `M${x},${top + h} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + width - r},${top} Q${x + width},${top} ${x + width},${top + r} L${x + width},${top + h} Z`
      : `M${x},${top} h${width} v${h} h${-width} Z`;
    return <path d={d} fill={fill} />;
  };
}

type TipEntry = { dataKey?: string | number; value?: number | string; payload?: { ym?: string; total?: number } };
function RevenueTip({ active, payload }: { active?: boolean; payload?: TipEntry[] }) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].reverse().filter((p) => Number(p.value) > 0);
  const ym = payload[0]?.payload?.ym ?? "";
  const sum = rows.reduce((s, p) => s + Number(p.value || 0), 0);
  return (
    <div className="rounded-xl bg-[#020617] text-white px-3 py-2.5 shadow-xl ring-1 ring-white/10 text-[12px] min-w-[190px]">
      <p className="font-semibold mb-1.5">{monthLong(ym)}</p>
      {rows.length === 0 && <p className="text-[#94A3B8]">No payments</p>}
      {rows.map((p) => {
        const s = STREAM.get(p.dataKey as RevenueStream);
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-1.5 py-px">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s?.color }} aria-hidden="true" />
            <span className="text-[#CBD5E1]">{s?.label ?? String(p.dataKey)}</span>
            <b className="ml-auto pl-3 tabular-nums">{inr(p.value)}</b>
          </p>
        );
      })}
      {rows.length > 1 && (
        <p className="flex items-center justify-between border-t border-white/10 mt-1.5 pt-1.5 font-semibold">
          <span>Total</span><span className="tabular-nums text-[#FCD34D]">{inr(sum)}</span>
        </p>
      )}
    </div>
  );
}

export function RevenueHero({ revenue, generatedAt, canOpen, animate }: {
  revenue: RevenueSection;
  generatedAt: string;
  canOpen: (path: string) => boolean;
  animate: boolean;
}) {
  const [focus, setFocus] = useState<RevenueStream | null>(null);
  const shown = useCountUp(revenue.thisMonth, animate);

  // Month names come from the server's own month list, so they follow IST.
  const thisYm = revenue.months[revenue.months.length - 1]?.ym ?? "";
  const monthIdx = Number(thisYm.split("-")[1]) - 1;
  const monthName = MONTHS_LONG[monthIdx] ?? "This month";
  const prevName = monthIdx >= 0 ? MONTHS_LONG[(monthIdx + 11) % 12] : "last month";
  // "Same days" of a shorter last month stop at its last day: on 31 Oct the
  // server compares all of September, so the caption reads 1–30, not 1–31.
  const at = toMs(generatedAt);
  const ist = at != null ? istParts(at) : null;
  const day = ist ? Math.min(ist.day, new Date(Date.UTC(ist.year, ist.month - 1, 0)).getUTCDate()) : null;

  const byKey = useMemo(() => new Map(revenue.byStream.map((s) => [s.key, s])), [revenue.byStream]);
  const visible = useMemo(() => (focus ? [focus] : REVENUE_STREAMS.map((s) => s.key)), [focus]);
  const data = useMemo(() => revenue.months.map((m) => ({
    ...m,
    top: [...visible].reverse().find((k) => Number(m[k]) > 0) ?? null,
  })), [revenue.months, visible]);

  const anyRevenue = revenue.months.some((m) => Number(m.total) > 0);
  const anyVisible = data.some((m) => m.top);
  const best = revenue.months.reduce<(typeof revenue.months)[number] | null>((b, m) => (!b || m.total > b.total ? m : b), null);

  const caption = revenue.thisMonth <= 0 && revenue.sameDaysLastMonth <= 0
    ? "No payments yet this month"
    : `vs ${inr(revenue.sameDaysLastMonth)} in the same days of ${prevName}${day ? ` (1–${day})` : ""}`;

  const stats = [
    { label: "Today", value: inr(revenue.today) },
    { label: "Last 7 days", value: inr(revenue.last7) },
    { label: "All time", value: inr(revenue.allTime) },
    { label: "Net this month", value: inr(revenue.net.thisMonth), sub: "after commission & rewards" },
    { label: "Avg order", value: inr(revenue.avgOrder), sub: `${nf(revenue.paidOrders)} paid order${revenue.paidOrders === 1 ? "" : "s"}` },
  ];
  const out = revenue.moneyOut;
  const outs = [
    { label: "Reseller commission", value: out.resellerCommission },
    { label: "Referral rewards", value: out.referralRewards },
    { label: "Payouts sent", value: out.payoutsPaid },
    { label: "Owed now", value: out.owedNow, warn: out.owedNow > 0 },
  ];

  return (
    <section aria-labelledby="dash-revenue" className="relative overflow-hidden rounded-2xl gradient-navy text-white shadow-premium-lg h-full">
      {/* Texture + two soft glows: gold behind the headline, a faint teal to balance it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(247,179,28,0.20), transparent)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(20,184,166,0.08), transparent)" }} />

      <div className="relative h-full p-4 sm:p-6 lg:p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dash-revenue" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FCD34D]">
            <span className="w-6 h-6 rounded-lg bg-[#F7B31C]/15 flex items-center justify-center"><IndianRupee size={13} aria-hidden="true" /></span>
            Revenue · {monthName}
          </h2>
          <ViewLink to="/admin/payment-orders" show={canOpen("/admin/payment-orders")} dark>Payment orders</ViewLink>
        </div>

        {/* The headline */}
        <div>
          <p className="font-display font-extrabold leading-none tracking-tight tabular-nums text-[42px] sm:text-[56px] text-gradient-gold" aria-hidden="true">
            {inr(shown)}
          </p>
          <p className="sr-only">Revenue this month so far: {inr(revenue.thisMonth)}.</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <DeltaChip dark now={revenue.thisMonth} pct={revenue.growthPct} context={`vs the same days of ${prevName}`} />
            <span className="text-[12px] text-[#CBD5E1] tabular-nums">{caption}</span>
            {revenue.lastMonth > 0 && (
              <span className="inline-flex items-center gap-2.5 text-[12px] text-[#94A3B8] tabular-nums">
                <span aria-hidden="true" className="hidden sm:inline-block w-px h-3 bg-white/20" />{prevName} closed at {inr(revenue.lastMonth)}
              </span>
            )}
          </div>
        </div>

        {/* Quick figures — hairline-divided, one glance */}
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-px rounded-xl overflow-hidden bg-white/[0.07] ring-1 ring-white/[0.07]">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#0F172A]/70 px-3 py-2.5 last:col-span-2 sm:last:col-span-1 min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] truncate">{s.label}</dt>
              <dd className="mt-1 text-[15px] sm:text-base font-bold tabular-nums text-white truncate">{s.value}</dd>
              {s.sub && <dd className="text-[10.5px] leading-tight text-[#94A3B8]">{s.sub}</dd>}
            </div>
          ))}
        </dl>

        {/* 12 months, stacked by stream. On wide screens the chart takes up any
            height the Needs action list adds to the row. */}
        <div className="flex flex-col lg:flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[12px] font-semibold text-[#E2E8F0]">Last 12 months</p>
            {focus && (
              <button type="button" onClick={() => setFocus(null)} className={`text-[11px] font-semibold text-[#FCD34D] hover:underline rounded ${FOCUS} focus-visible:ring-offset-[#0F172A]`}>
                Show all streams
              </button>
            )}
          </div>
          {!anyRevenue || !anyVisible ? (
            <ChartEmpty
              dark
              icon={BarChart3}
              className="h-[190px] sm:h-[220px] lg:h-auto lg:flex-1 lg:min-h-[220px]"
              title={!anyRevenue ? "No revenue in the last 12 months yet" : `No ${(focus && STREAM.get(focus)?.label) || "payments"} in the last 12 months`}
              hint={!anyRevenue ? "Plan payments, NFC orders, add-ons and reseller payments will stack up here." : "Pick another stream, or show them all."}
            />
          ) : (
            <>
              <div className="h-[200px] sm:h-[230px] lg:h-auto lg:flex-1 lg:min-h-[230px] -ml-2" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} interval="preserveStartEnd" minTickGap={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={inrShort} width={48} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<RevenueTip />} />
                    {visible.map((k) => (
                      <Bar key={k} dataKey={k} stackId="rev" fill={STREAM.get(k)?.color} maxBarSize={24} shape={segment(k)} isAnimationActive={animate} animationDuration={700} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="sr-only">
                Revenue by month for the last 12 months{focus ? `, ${STREAM.get(focus)?.label} only` : ""}.
                {best && best.total > 0 ? ` Best month: ${monthLong(best.ym)} with ${inr(best.total)}.` : ""} This month so far: {inr(revenue.thisMonth)}.
              </p>
            </>
          )}
        </div>

        {/* Streams — the legend, and a filter */}
        <div>
          <p className="sr-only">Choose a stream to show only it in the chart; choose it again to show all.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REVENUE_STREAMS.map((s) => {
              const st = byKey.get(s.key);
              const on = focus === s.key;
              const dim = (focus && !on) || !st?.allTime;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={on}
                  title={s.hint}
                  onClick={() => setFocus(on ? null : s.key)}
                  className={`dc-press text-left rounded-xl px-3 py-2.5 ring-1 transition-colors min-w-0 ${on ? "bg-white/[0.12] ring-white/30" : "bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.07]"} ${dim ? "opacity-55" : ""} ${FOCUS} focus-visible:ring-offset-[#0F172A]`}
                >
                  <span className="flex items-start gap-1.5 text-[11px] font-medium leading-tight text-[#CBD5E1] min-w-0">
                    <span className="w-2 h-2 mt-[3px] rounded-full shrink-0" style={{ background: s.color }} aria-hidden="true" />
                    <span>{s.label}</span>
                  </span>
                  <span className="block mt-1 text-[14px] font-bold tabular-nums text-white truncate">{inr(st?.thisMonth ?? 0)}</span>
                  <span className="block text-[10.5px] text-[#94A3B8] tabular-nums truncate">{inr(st?.allTime ?? 0)} all time</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Money going back out */}
        <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.07] p-3 sm:p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              <ArrowUpRight size={13} aria-hidden="true" /> Money out · all time
            </p>
            <p className="text-[11px] text-[#94A3B8] tabular-nums">{inr(out.thisMonth)} this month</p>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5">
            {outs.map((o) => (
              <div key={o.label} className="min-w-0">
                <dt className="text-[11px] text-[#94A3B8] truncate">{o.label}</dt>
                <dd className={`text-[14px] font-bold tabular-nums truncate ${o.warn ? "text-[#FCD34D]" : "text-white"}`}>
                  {inr(o.value)}{o.warn && <span className="ml-1.5 align-middle text-[10px] font-semibold rounded-full px-1.5 py-px bg-[#F59E0B]/20 text-[#FCD34D]">to pay</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {revenue.undatedDomainSales > 0 && (
          <p className="text-[11px] text-[#94A3B8] -mt-2">
            All time includes {nf(revenue.undatedDomainSales)} custom-domain add-on{revenue.undatedDomainSales === 1 ? "" : "s"} sold before sale dates were kept, so {revenue.undatedDomainSales === 1 ? "it isn't" : "they aren't"} in any month.
          </p>
        )}
      </div>
    </section>
  );
}
