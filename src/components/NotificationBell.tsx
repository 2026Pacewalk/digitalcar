import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Inbox, ArrowRight, X, Circle, CircleDot, AlertCircle, RotateCw, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useSessionRole } from "@/hooks/useAuth";
import { timeAgo, exactTime } from "@contracts/notifications";
import {
  lookFor, linkFor, pageFor, scopeForRole, useNotifActions, useNotifFeed, useNotifSummary, useCanOpen, useExpiryNotice, expiryText,
  type FeedItem, type Filter,
} from "@/lib/notificationsUi";

/* The bell in every dashboard's top bar. Customers and resellers see their own
   notifications; the super admin and staff see the team's (filtered to the
   modules each may open). The full list, with search, is on the notifications
   page ("View all"). */

type ChipKey = "all" | "unread" | "action" | string;

export default function NotificationBell() {
  const role = useSessionRole();
  const scope = scopeForRole(role);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chip, setChip] = useState<ChipKey>("all");

  const summary = useNotifSummary(scope);
  const filter: Filter = chip === "unread" ? { unreadOnly: true } : chip === "action" ? { needsAction: true } : chip === "all" ? {} : { category: chip };
  const feed = useNotifFeed(scope, filter, { limit: 8, enabled: open });
  const act = useNotifActions(scope);
  const canOpen = useCanOpen(role);
  const { notice, dismiss: dismissNotice } = useExpiryNotice(summary.data?.expiry);

  const unread = (summary.data?.unread ?? 0) + (notice ? 1 : 0);
  const needsAction = summary.data?.needsAction ?? 0;
  const chips = (summary.data?.categories ?? []).filter((c) => c.total > 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openItem = (i: FeedItem) => {
    if (!i.isRead) void act.markRead([i.id]).catch(() => {});
    const to = linkFor(role, i.link);
    if (!canOpen(to)) { toast("That page isn't part of your access — marked as read."); return; }
    setOpen(false);
    navigate(to);
  };

  const empty = chip === "unread" ? "No unread notifications." : chip === "action" ? "Nothing needs your attention." : "You're all caught up.";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-haspopup="dialog" aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] transition-all hover:bg-[#F1F5F9] hover:text-[#0F172A]">
        <Bell size={18} className={unread > 0 ? "text-[#F7B31C]" : ""} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1">
            <span className="text-[9px] font-bold leading-none text-white">{unread > 99 ? "99+" : unread}</span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Notifications"
            className="fixed inset-x-3 top-16 z-20 overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[24rem]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
              <p className="text-sm font-bold text-[#0F172A]">
                Notifications{unread > 0 && <span className="ml-1.5 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">{unread} new</span>}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => void act.markAllRead(filter.category ?? null)} disabled={!unread || act.busy}
                  title="Mark all read" aria-label="Mark all read"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><CheckCheck size={14} /></button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#F1F5F9]"><X size={14} /></button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-[#F8FAFC] px-3 py-2 no-scrollbar" role="tablist" aria-label="Filter notifications">
              {[
                { key: "all", label: "All", n: 0 },
                { key: "unread", label: "Unread", n: unread },
                ...(scope === "team" ? [{ key: "action", label: "Needs action", n: needsAction }] : []),
                ...chips.map((c) => ({ key: c.key, label: c.label, n: c.unread })),
              ].map((c) => (
                <button key={c.key} type="button" role="tab" aria-selected={chip === c.key} onClick={() => setChip(c.key)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${chip === c.key ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                  {c.label}
                  {c.n > 0 && <span className={`rounded-full px-1 text-[9.5px] font-bold ${chip === c.key ? "bg-white/20" : c.key === "action" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-white text-[#0F172A]"}`}>{c.n}</span>}
                </button>
              ))}
            </div>

            {/* Feed */}
            <div className="max-h-[22rem] overflow-y-auto">
              {notice && (chip === "all" || chip === "unread" || chip === "billing") && (
                <div className="relative flex items-start gap-3 border-b border-[#F8FAFC] bg-[#FFFDF5] px-4 py-3 pr-10">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2]"><CalendarClock size={14} className="text-[#DC2626]" /></span>
                  <button type="button" onClick={() => { setOpen(false); navigate("/dashboard/subscription"); }} className="min-w-0 flex-1 text-left">
                    <span className="block text-xs font-bold text-[#0F172A]">{expiryText(notice).title}</span>
                    <span className="mt-0.5 block text-[11px] text-[#64748B]">{expiryText(notice).message}</span>
                  </button>
                  <button type="button" onClick={dismissNotice} aria-label="Dismiss" className="absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white hover:text-[#DC2626]"><X size={12} /></button>
                </div>
              )}
              {feed.isError ? (
                <div className="px-4 py-8 text-center">
                  <AlertCircle size={22} className="mx-auto mb-2 text-[#F87171]" />
                  <p className="text-xs text-[#64748B]">Couldn't load notifications.</p>
                  <button type="button" onClick={() => void feed.refetch()} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309]"><RotateCw size={11} /> Try again</button>
                </div>
              ) : feed.isLoading ? (
                <div className="space-y-2 p-3">{[0, 1, 2].map((k) => <div key={k} className="h-14 animate-pulse rounded-xl bg-[#F8FAFC]" />)}</div>
              ) : feed.items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox size={24} className="mx-auto mb-2 text-[#CBD5E1]" />
                  <p className="text-xs text-[#94A3B8]">{empty}</p>
                </div>
              ) : feed.items.map((i) => {
                const { Icon, bg, fg } = lookFor(scope, i.type);
                return (
                  <div key={i.id} className={`group relative border-b border-[#F8FAFC] last:border-0 ${i.isRead ? "" : "bg-[#FFFDF5]"}`}>
                    <button type="button" onClick={() => openItem(i)} className="flex w-full items-start gap-3 px-4 py-3 pr-14 text-left transition-colors hover:bg-[#F8FAFC]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: bg }}><Icon size={14} style={{ color: fg }} /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-xs ${i.isRead ? "font-semibold text-[#334155]" : "font-bold text-[#0F172A]"}`}>{i.title}</span>
                        {i.message && <span className="mt-0.5 block line-clamp-2 text-[11px] text-[#64748B]">{i.message}</span>}
                        <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                          <span title={exactTime(i.createdAt)}>{timeAgo(i.createdAt)}</span>
                          {i.needsAction && <span className="rounded-full bg-[#FEE2E2] px-1.5 py-px font-bold text-[#B91C1C]">Needs action</span>}
                        </span>
                      </span>
                    </button>
                    {/* Per-item actions */}
                    <span className="absolute right-2 top-2.5 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <button type="button" onClick={() => void (i.isRead ? act.markUnread([i.id]) : act.markRead([i.id]))}
                        title={i.isRead ? "Mark as unread" : "Mark as read"} aria-label={i.isRead ? "Mark as unread" : "Mark as read"}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white hover:text-[#0F172A]">
                        {i.isRead ? <CircleDot size={12} /> : <Circle size={12} />}
                      </button>
                      <button type="button" onClick={() => void act.dismiss([i.id])} title="Dismiss" aria-label="Dismiss"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white hover:text-[#DC2626]"><X size={12} /></button>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <button type="button" onClick={() => { setOpen(false); navigate(pageFor(role)); }}
              className="flex w-full items-center justify-center gap-1.5 border-t border-[#F1F5F9] px-4 py-2.5 text-[12px] font-semibold text-[#B45309] hover:bg-[#FFFBEB]">
              View all notifications <ArrowRight size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
