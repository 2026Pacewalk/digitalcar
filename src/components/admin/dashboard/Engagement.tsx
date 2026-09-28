/* How customers' cards are doing across the platform: 30 days of views and
   visitors, the most-viewed cards, and where the traffic comes from. */
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import type { EngagementSection } from "@contracts/admin-dashboard";
import { ChartEmpty, ChartTip, DeltaChip, Key, Panel, RankedBars, type IconType } from "./bits";
import { FOCUS, SOURCE_LABEL, humanise, nf, share } from "./format";

const DEVICE_ICON: Record<string, IconType> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
const C = { views: "#F7B31C", visitors: "#14B8A6" };

/* Card slugs come from public view tracking, so a card URL is opened only when
   it's a path on this site: one leading slash, then neither "/" nor "\" (which
   browsers read as another host) and no tab or newline (which they strip). */
const SAME_SITE_PATH = /^\/[^/\\\t\n\r][^\t\n\r]*$/;
const total = (rows: { count: number }[]) => rows.reduce((s, r) => s + r.count, 0);

export function Engagement({ engagement: en, animate }: { engagement: EngagementSection; animate: boolean }) {
  const metrics = [
    { label: "Views", now: en.views30, before: en.viewsPrev30 },
    { label: "Visitors", now: en.visitors30 },
    { label: "Actions", now: en.actions30, before: en.actionsPrev30, hint: "calls, WhatsApp, saves, shares…" },
    { label: "Leads", now: en.leads30, before: en.leadsPrev30, hint: "enquiries sent from cards" },
  ];
  const peak = en.daily.reduce<(typeof en.daily)[number] | null>((b, d) => (!b || d.views > b.views ? d : b), null);
  const maxViews = Math.max(1, ...en.topCards.map((c) => c.views));

  return (
    <Panel
      title="How cards are performing"
      sub="Last 30 days, across every published card"
      icon={Activity}
      tint={{ bg: "#EDE9FE", fg: "#6D28D9" }}
    >
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-[#F8FAFC] ring-1 ring-[#F1F5F9] px-3 py-2.5 min-w-0" title={m.hint}>
            <dt className="text-[11px] font-medium text-[#64748B]">{m.label}</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[18px] font-bold text-[#0F172A] tabular-nums leading-tight">{nf(m.now)}</span>
              {m.before !== undefined && <DeltaChip now={m.now} before={m.before} context="vs the 30 days before" />}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <Key color={C.views}>Views</Key>
            <Key color={C.visitors}>Visitors</Key>
          </div>
          {en.views30 > 0 ? (
            <>
              <div className="h-[200px] sm:h-[240px] -ml-2" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={en.daily} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.views} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.views} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.visitors} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={C.visitors} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} width={36} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: "#E2E8F0" }} />
                    <Area type="monotone" dataKey="views" name="Views" stroke={C.views} strokeWidth={2.25} fill="url(#dashViews)" isAnimationActive={animate} />
                    <Area type="monotone" dataKey="visitors" name="Visitors" stroke={C.visitors} strokeWidth={2} fill="url(#dashVisitors)" isAnimationActive={animate} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="sr-only">
                {nf(en.views30)} card views from {nf(en.visitors30)} visitors in the last 30 days.
                {peak && peak.views > 0 ? ` The busiest day was ${peak.label} with ${nf(peak.views)} views.` : ""}
              </p>
            </>
          ) : (
            <ChartEmpty icon={Activity} className="h-[200px] sm:h-[240px]" title="No card views in the last 30 days yet" hint="Every open of a published card lands here, day by day." />
          )}
        </div>

        {/* Most-viewed cards */}
        <div className="lg:col-span-5 min-w-0">
          <p className="text-[12px] font-semibold text-[#334155] mb-2">Most-viewed cards</p>
          {en.topCards.length ? (
            <ol className="space-y-1">
              {en.topCards.map((c, i) => {
                const linked = SAME_SITE_PATH.test(c.url);
                const body = (
                  <>
                    <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums ${i === 0 ? "gradient-gold text-[#0F172A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="text-[13px] font-semibold text-[#0F172A] truncate">{c.name || c.slug}</span>
                        {linked && <ExternalLink size={12} aria-hidden="true" className="shrink-0 text-[#CBD5E1] group-hover:text-[#64748B]" />}
                      </span>
                      <span className="mt-1 block h-1 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <span className="block h-full rounded-full bg-[#F7B31C]" style={{ width: `${share(c.views, maxViews)}%` }} />
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[13px] font-bold text-[#0F172A] tabular-nums">{nf(c.views)}</span>
                      <span className="block text-[10.5px] text-[#94A3B8] tabular-nums">{nf(c.actions)} action{c.actions === 1 ? "" : "s"}</span>
                    </span>
                  </>
                );
                return (
                  <li key={c.slug}>
                    {linked ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${c.name || c.slug}: ${nf(c.views)} views, ${nf(c.actions)} actions — opens the card in a new tab`}
                        className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[#F8FAFC] ${FOCUS}`}
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl px-2 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[13px] text-[#94A3B8] py-6 text-center">No card has been viewed in the last 30 days.</p>
          )}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-[#F1F5F9] grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#334155] mb-2.5">Where visitors come from</p>
          <RankedBars
            color="#F7B31C"
            empty="No traffic sources recorded yet."
            total={total(en.sources)}
            rows={en.sources.slice(0, 6).map((s) => ({ key: s.key, label: SOURCE_LABEL[s.key] || humanise(s.key), value: s.count }))}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#334155] mb-2.5">Devices</p>
          <RankedBars
            color="#8B5CF6"
            icons={DEVICE_ICON}
            empty="No device data yet."
            total={total(en.devices)}
            rows={en.devices.slice(0, 4).map((d) => ({ key: d.key, label: humanise(d.key), value: d.count }))}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#334155] mb-2.5">What visitors do</p>
          <RankedBars
            color="#14B8A6"
            empty="No taps on cards yet."
            total={total(en.actionTypes)}
            rows={en.actionTypes.slice(0, 6).map((a) => ({ key: a.key, label: a.label || humanise(a.key), value: a.count }))}
          />
        </div>
      </div>
    </Panel>
  );
}
