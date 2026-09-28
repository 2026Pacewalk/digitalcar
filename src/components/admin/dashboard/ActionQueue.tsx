/* What needs doing right now — red (money or people waiting on us) first,
   then amber (soon), then blue (keep an eye on), biggest pile first within
   each. A row opens its page only when the viewer may open it; the server
   already left out modules they can't see at all. */
import { useMemo } from "react";
import {
  Boxes, CalendarClock, Check, ChevronRight, CircleAlert, CircleCheck, Globe, HandCoins, Hourglass,
  ListChecks, MailWarning, Printer, Receipt, Store, Timer, Truck, UserX,
} from "lucide-react";
import type { ActionItem, ActionKey } from "@contracts/admin-dashboard";
import { MaybeLink, Panel, Pill, SplitBar, type IconType } from "./bits";
import { FOCUS, ago, inr, nf, useNow } from "./format";

const ICON: Record<ActionKey, IconType> = {
  payments_to_verify: Receipt,
  nfc_to_print: Printer,
  nfc_to_ship: Truck,
  nfc_awaiting_payment: Hourglass,
  bulk_new: Boxes,
  payouts_pending: HandCoins,
  reseller_applications: Store,
  deletions_due: UserX,
  domains_pending: Globe,
  emails_failed: MailWarning,
  plans_expiring: CalendarClock,
  trials_ending: Timer,
};

const TONE = {
  red: { rail: "#DC2626", bg: "#FEE2E2", fg: "#B91C1C", word: "urgent" },
  amber: { rail: "#D97706", bg: "#FEF3C7", fg: "#B45309", word: "soon" },
  blue: { rail: "#2563EB", bg: "#DBEAFE", fg: "#1D4ED8", word: "to watch" },
} as const;
const RANK = { red: 0, amber: 1, blue: 2 } as const;

export function ActionQueue({ actions, canOpen, wide, className = "" }: {
  actions: ActionItem[];
  canOpen: (path: string) => boolean;
  /** Full width (no revenue hero beside it): lay the rows out in columns. */
  wide?: boolean;
  className?: string;
}) {
  const now = useNow(60_000);
  const open = useMemo(
    () => actions.filter((a) => a.count > 0).sort((a, b) => RANK[a.tone] - RANK[b.tone] || b.count - a.count),
    [actions],
  );
  const clear = actions.filter((a) => a.count <= 0);
  const tally = (["red", "amber", "blue"] as const)
    .map((tone) => ({ tone, n: open.filter((a) => a.tone === tone).reduce((s, a) => s + a.count, 0) }))
    .filter((t) => t.n > 0);
  const waiting = tally.reduce((s, t) => s + t.n, 0);

  return (
    <Panel
      title="Needs action"
      sub={open.length ? `${nf(waiting)} thing${waiting === 1 ? "" : "s"} waiting on the team` : "Nothing waiting on the team"}
      icon={ListChecks}
      tint={open.length ? { bg: "#FFE4E6", fg: "#E11D48" } : { bg: "#DCFCE7", fg: "#16A34A" }}
      className={`flex flex-col ${className}`}
    >
      {open.length > 0 ? (
        <>
          {/* Severity at a glance */}
          <div className="mb-3">
            <SplitBar className="h-1.5" parts={tally.map((t) => ({ key: t.tone, value: t.n, color: TONE[t.tone].rail }))} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tally.map((t) => (
                <Pill key={t.tone} tone={t.tone}>
                  <span className="tabular-nums">{nf(t.n)}</span> {TONE[t.tone].word}
                </Pill>
              ))}
            </div>
          </div>

          <ul className={wide ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2" : "space-y-2"}>
            {open.map((a) => {
              const t = TONE[a.tone];
              const Icon = ICON[a.key] ?? CircleAlert;
              const allowed = canOpen(a.link);
              const oldest = a.oldestAt ? ago(a.oldestAt, now) : "";
              return (
                <li key={a.key}>
                  <MaybeLink
                    to={a.link}
                    allowed={allowed}
                    label={`${a.label}: ${nf(a.count)}${a.amount ? `, ${inr(a.amount)}` : ""} — ${t.word}${oldest ? `, oldest ${oldest}` : ""}`}
                    className={`group relative flex items-center gap-3 rounded-xl border border-[#F1F5F9] bg-white pl-4 pr-3 py-2.5 ${allowed ? "dc-press transition-colors hover:border-[#E2E8F0] hover:bg-[#F8FAFC]" : ""}`}
                  >
                    <span aria-hidden="true" className="absolute left-1.5 top-3 bottom-3 w-[3px] rounded-full" style={{ background: t.rail }} />
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[#0F172A] leading-snug">{a.label}</span>
                      <span className="block text-[11.5px] text-[#64748B] leading-snug line-clamp-2">{a.hint}</span>
                      {(a.amount || oldest) && (
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[#94A3B8] tabular-nums">
                          {a.amount ? <span className="font-semibold text-[#334155]">{inr(a.amount)}</span> : null}
                          {oldest && <span>oldest {oldest}</span>}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 min-w-[30px] h-7 px-2 rounded-full text-[13px] font-extrabold tabular-nums flex items-center justify-center" style={{ background: t.bg, color: t.fg }}>
                      {nf(a.count)}
                    </span>
                    <span className="sr-only">{t.word}</span>
                    {allowed && <ChevronRight size={16} aria-hidden="true" className="shrink-0 -ml-1 text-[#CBD5E1] transition-transform group-hover:translate-x-0.5 group-hover:text-[#64748B]" />}
                  </MaybeLink>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        /* All clear: say so, then show what was checked — an empty panel
           doesn't tell the owner whether anything was looked at. */
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 rounded-xl border border-[#DCFCE7] bg-gradient-to-r from-[#F0FDF4] to-white px-3.5 py-3">
            <span className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0"><CircleCheck size={20} /></span>
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-bold text-[#0F172A]">All clear</span>
              <span className="block text-[11.5px] text-[#64748B]">No payments to verify, orders to ship or requests to answer.</span>
            </span>
          </div>
          <p className="mt-4 mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#94A3B8]">What was checked</p>
          <ul className={wide ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6" : ""}>
            {clear.map((a) => {
              const Icon = ICON[a.key] ?? CircleAlert;
              return (
                <li key={a.key} className="flex items-center gap-2.5 py-2 border-b border-[#F8FAFC] last:border-0">
                  <Icon size={15} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#334155]">{a.label}</span>
                  <Check size={14} className="shrink-0 text-[#16A34A]" aria-hidden="true" />
                  <span className="sr-only">none waiting</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {open.length > 0 && clear.length > 0 && (
        // With only a few things waiting there's room, so the rest shows open.
        <details className="group mt-1 pt-3" open={open.length <= 3}>
          <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center gap-1.5 rounded text-[11.5px] text-[#64748B] hover:text-[#0F172A] ${FOCUS}`}>
            <CircleCheck size={13} className="shrink-0 text-[#16A34A]" aria-hidden="true" />
            <span className="truncate">
              Also checked: {clear.slice(0, 2).map((a) => a.label).join(", ")}{clear.length > 2 ? ` +${clear.length - 2} more` : ""}
            </span>
            <ChevronRight size={13} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {clear.map((a) => (
              <li key={a.key}><Pill tone="slate"><Check size={11} aria-hidden="true" /> {a.label}</Pill></li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}
