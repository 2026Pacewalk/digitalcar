/* The reseller channel, in emerald: what partners sold (offline card orders
   plus their customers' online plan payments), what of that is DigitalCarda's,
   how much of it has actually been paid, and who the top partners are. */
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReactNode } from "react";
import { BarChart3, CircleCheck, Handshake, UserPlus } from "lucide-react";
import type { ResellerRow, ResellerSection } from "@contracts/admin-dashboard";
import { ChartEmpty, ChartTip, Key, MaybeLink, Pill, ViewLink } from "./bits";
import { initials, inr, inrShort, nf, share } from "./format";

const C = { due: "#A7F3D0", received: "#059669", online: "#0EA5E9" };

/* Balances are shown in whole rupees, so they're judged in whole rupees too —
   a few paise left over by rounding never reads as "₹0 still to collect". */
const wholeRupees = (v: number) => Math.round(v);

function Tile({ label, value, sub, note, lead, warn, settled }: {
  label: string;
  value: number;
  sub?: string;
  /** A quieter second line under `sub`. */
  note?: string;
  lead?: boolean;
  warn?: boolean;
  settled?: boolean;
}) {
  const box = lead
    ? "bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5]/60 ring-[#A7F3D0]"
    : warn ? "bg-[#FFFBEB] ring-[#FDE68A]" : "bg-[#F8FAFC] ring-[#F1F5F9]";
  return (
    <div className={`rounded-xl ring-1 px-3 py-2.5 min-w-0 ${box}`}>
      <p className="text-[11px] font-medium text-[#64748B] leading-tight">{label}</p>
      {settled ? (
        <p className="mt-1 inline-flex items-center gap-1 text-[15px] font-bold text-[#15803D]"><CircleCheck size={15} aria-hidden="true" /> All settled</p>
      ) : (
        <p className={`mt-1 font-bold tabular-nums truncate ${lead ? "text-[19px] sm:text-[21px] text-[#065F46]" : warn ? "text-[16px] text-[#B45309]" : "text-[16px] text-[#0F172A]"}`}>{inr(value)}</p>
      )}
      {sub && <p className="text-[10.5px] leading-tight text-[#64748B]">{sub}</p>}
      {note && <p className="mt-0.5 text-[10.5px] leading-tight text-[#94A3B8] tabular-nums">{note}</p>}
    </div>
  );
}

function PartnerRow({ r, rank, canOpen }: { r: ResellerRow; rank: number; canOpen: boolean }) {
  // Measured against everything billed (opening balance + orders), so the bar,
  // Received and Outstanding always add up.
  const paid = share(r.received, r.payable);
  const bal = wholeRupees(r.outstanding);
  const cells: { label: string; value: ReactNode; cls: string; title?: string }[] = [
    { label: "Ordered", value: inr(r.orderValue), cls: "text-[#0F172A]" },
    { label: "Received", value: inr(r.received), cls: r.received > 0 ? "text-[#065F46]" : "text-[#94A3B8]" },
    // Paid ahead reads "In credit" (stacked, to fit the column), never "Settled".
    bal < 0 ? {
      label: "Outstanding",
      value: <><span className="block text-[10px] font-semibold leading-3">In credit</span>{inr(-bal)}</>,
      cls: "text-[#047857]",
      title: `In credit ${inr(-bal)}`,
    } : {
      label: "Outstanding",
      value: bal > 0 ? inr(bal) : r.payable > 0 || r.dueToUs > 0 ? "Settled" : "—",
      cls: bal > 0 ? "text-[#B45309]" : r.payable > 0 || r.dueToUs > 0 ? "text-[#15803D]" : "text-[#94A3B8]",
    },
    { label: "Customers", value: nf(r.customers), cls: "text-[#0F172A]", title: r.onlineSales > 0 ? `${inr(r.onlineSales)} paid online by their customers` : undefined },
  ];
  const balSaid = bal < 0 ? `in credit ${inr(-bal)}` : bal > 0 ? `outstanding ${inr(bal)}` : r.payable > 0 || r.dueToUs > 0 ? "settled" : "nothing billed yet";
  return (
    <MaybeLink
      to={r.accountId ? `/admin/resellers?r=${r.accountId}` : null}
      allowed={canOpen}
      label={`${r.name}${r.company ? `, ${r.company}` : ""}: ordered ${inr(r.orderValue)}, received ${inr(r.received)}, ${balSaid}, ${nf(r.customers)} customers`}
      className={`grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_repeat(4,minmax(0,6rem))] items-center gap-x-3 gap-y-2 rounded-xl px-2.5 py-2.5 ${canOpen && r.accountId ? "dc-press transition-colors hover:bg-[#F0FDF4]" : ""} ${r.active ? "" : "opacity-70"}`}
    >
      <span className="relative shrink-0">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold ${r.active ? "bg-gradient-to-br from-[#34D399] to-[#059669] text-white" : "bg-[#E2E8F0] text-[#475569]"}`}>
          {initials(r.name)}
        </span>
        <span className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full bg-white ring-1 ring-[#E2E8F0] text-[10px] font-bold text-[#475569] flex items-center justify-center tabular-nums" aria-hidden="true">{rank}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#0F172A] truncate">{r.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1 min-w-0">
          <Pill tone="emerald" className="tabular-nums">{r.rate}%</Pill>
          {!r.hasLogin && <Pill tone="amber">No login</Pill>}
          {!r.active && <Pill tone="slate">Paused</Pill>}
          {r.company && <span className="text-[11.5px] text-[#64748B] truncate max-w-full">{r.company}</span>}
        </span>
        {r.payable > 0 && (
          <span className="mt-1.5 block h-1 w-full max-w-[160px] rounded-full bg-[#FEF3C7] overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-[#10B981]" style={{ width: `${paid}%` }} />
          </span>
        )}
      </span>
      <dl className="col-span-2 grid grid-cols-4 gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2 md:contents">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0 md:text-right" title={c.title}>
            <dt className="text-[10px] text-[#94A3B8] md:sr-only">{c.label}</dt>
            <dd className={`text-[12.5px] font-bold tabular-nums truncate ${c.cls}`}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </MaybeLink>
  );
}

export function ResellerRevenue({ resellers: rs, canOpen, animate }: {
  resellers: ResellerSection;
  canOpen: (path: string) => boolean;
  animate: boolean;
}) {
  const canList = canOpen("/admin/resellers");
  const off = rs.offline;
  // "Received of …": what came in against what came in plus what partners
  // still owe. Built from each partner's own balance, so one partner's credit
  // never hides another's debt (opening balances count, via toCollect).
  const billed = off.received + Math.max(0, off.toCollect);
  const collected = share(off.received, billed);
  const toCollect = Math.max(0, wholeRupees(off.toCollect));
  const credit = Math.max(0, wholeRupees(off.credit));
  const carried = off.opening > 0 ? `incl. ${inr(off.opening)} carried over`
    : off.opening < 0 ? `after ${inr(-off.opening)} credit carried over` : "";
  const anyMonth = rs.months.some((m) => m.dueToUs > 0 || m.received > 0 || m.onlineSales > 0);
  const totals = rs.months.reduce((s, m) => ({ due: s.due + m.dueToUs, rec: s.rec + m.received, online: s.online + m.onlineSales }), { due: 0, rec: 0, online: 0 });

  return (
    <section aria-labelledby="dash-resellers" className="relative overflow-hidden bg-white rounded-2xl border border-[#F1F5F9] shadow-premium min-w-0">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#065F46] via-[#10B981] to-[#6EE7B7]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-24 w-80 h-80 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(16,185,129,0.10), transparent)" }} />

      <div className="relative p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center shrink-0"><Handshake size={18} /></span>
            <div className="min-w-0">
              <h2 id="dash-resellers" className="font-display text-[15px] sm:text-base font-bold text-[#0F172A] leading-tight">Reseller channel</h2>
              <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                {nf(rs.partners)} partner{rs.partners === 1 ? "" : "s"} · {nf(rs.withLogin)} can sign in · {nf(rs.active)} active
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rs.pendingApplications > 0 && (
              <MaybeLink
                to="/admin/resellers?tab=applications"
                allowed={canList}
                className={`inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-2.5 py-1 text-[11.5px] font-semibold text-[#065F46] ${canList ? "hover:bg-[#A7F3D0] transition-colors" : ""}`}
              >
                <UserPlus size={13} aria-hidden="true" />
                <span className="tabular-nums">{nf(rs.pendingApplications)}</span> application{rs.pendingApplications === 1 ? "" : "s"} waiting
              </MaybeLink>
            )}
            <ViewLink to="/admin/resellers" show={canList}>All resellers</ViewLink>
          </div>
        </header>

        {rs.partners === 0 ? (
          <ChartEmpty
            icon={Handshake}
            className="h-[200px]"
            title="No resellers yet"
            hint="When partners sell DigitalCarda cards, what they sold, what they paid and what they still owe shows up here."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              <Tile lead label="Sold through resellers" value={rs.channelSales} sub="card orders + online plans" />
              <Tile label="DigitalCarda's share" value={rs.ourShare} sub="after reseller commission" />
              <Tile label="Received" value={off.received} sub={`of ${inr(billed)} due`} note={carried || undefined} />
              <Tile
                label="Outstanding"
                value={toCollect}
                warn={toCollect > 0}
                settled={toCollect <= 0}
                sub={toCollect > 0 ? "still to collect" : undefined}
                note={credit > 0 ? `${inr(credit)} in credit` : undefined}
              />
              <Tile label="Online sales by their customers" value={rs.online.sales} sub={`${nf(rs.online.customers)} customer${rs.online.customers === 1 ? "" : "s"}`} />
              <Tile label="Commission owed" value={rs.online.owedNow} warn={rs.online.owedNow > 0} sub={`${inr(rs.online.commission)} earned in all`} />
            </div>

            {/* Received vs due */}
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-1.5">
                <span className="text-[12px] font-semibold text-[#334155]">Collected from resellers</span>
                <span className="text-[12px] text-[#64748B] tabular-nums">
                  {billed > 0
                    ? <><b className="text-[#065F46]">{inr(off.received)}</b> of {inr(billed)} · {Math.round(collected)}%</>
                    : off.dueToUs > 0 ? "Covered by credit carried over" : "No card orders booked yet"}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Collected from resellers"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(collected)}
                className={`h-2.5 rounded-full overflow-hidden ${toCollect > 0 ? "bg-[#FEF3C7]" : "bg-[#F1F5F9]"}`}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#059669]" style={{ width: `${collected}%`, minWidth: off.received > 0 ? 6 : 0 }} />
              </div>
              <p className="mt-1.5 text-[11px] text-[#94A3B8] tabular-nums">
                {nf(off.orders)} order{off.orders === 1 ? "" : "s"} · {nf(off.cards)} card{off.cards === 1 ? "" : "s"} · {inr(off.orderValue)} at list price · {inr(off.commission)} reseller margin
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Leaderboard */}
              <div className="lg:col-span-7 min-w-0">
                <div className="hidden md:grid grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,minmax(0,6rem))] gap-x-3 px-2.5 pb-1.5 border-b border-[#F1F5F9] text-[10.5px] font-semibold uppercase tracking-wider text-[#94A3B8]" aria-hidden="true">
                  <span />
                  <span>Top partners</span>
                  <span className="text-right">Ordered</span>
                  <span className="text-right">Received</span>
                  <span className="text-right">Outstanding</span>
                  <span className="text-right">Customers</span>
                </div>
                <p className="md:hidden text-[12px] font-semibold text-[#334155] mb-1">Top partners</p>
                {rs.top.length ? (
                  <ol className="mt-1 space-y-1">
                    {rs.top.map((r, i) => (
                      <li key={r.accountId ?? `u${r.userId ?? i}`}><PartnerRow r={r} rank={i + 1} canOpen={canList} /></li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[13px] text-[#94A3B8] py-6 text-center">No sales through resellers yet.</p>
                )}
              </div>

              {/* 12 months: due vs received vs online */}
              <div className="lg:col-span-5 min-w-0">
                <p className="text-[12px] font-semibold text-[#334155]">Last 12 months</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 mb-2">
                  <Key color={C.due}>Due to us</Key>
                  <Key color={C.received}>Received</Key>
                  <Key color={C.online}>Online sales</Key>
                </div>
                {anyMonth ? (
                  <>
                    <div className="h-[200px] -ml-2" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rs.months} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barGap={2} barCategoryGap="26%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} interval="preserveStartEnd" minTickGap={6} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={inrShort} width={46} allowDecimals={false} />
                          <Tooltip cursor={{ fill: "#F0FDF4" }} content={<ChartTip money />} />
                          <Bar dataKey="dueToUs" name="Due to us" fill={C.due} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={animate} />
                          <Bar dataKey="received" name="Received" fill={C.received} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={animate} />
                          <Line dataKey="onlineSales" name="Online sales" type="monotone" stroke={C.online} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={animate} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="sr-only">
                      Over the last 12 months resellers owed {inr(totals.due)} for card orders, paid {inr(totals.rec)}, and their customers paid {inr(totals.online)} online.
                    </p>
                  </>
                ) : (
                  <ChartEmpty icon={BarChart3} className="h-[200px]" title="No reseller sales in the last 12 months yet" hint="Card orders, payments received and online plan sales will show up here month by month." />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
