import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Bell, CheckCheck, Trash2, Search, Inbox, AlertCircle, RotateCw, ExternalLink, Circle, CircleDot, X, Loader2, Settings2,
} from "lucide-react";
import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useSessionRole } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { DAY_GROUP_LABEL, dayGroup, exactTime, timeAgo } from "@contracts/notifications";
import {
  linkFor, lookFor, scopeForRole, useNotifActions, useNotifFeed, useNotifSummary, type FeedItem, type Filter,
} from "@/lib/notificationsUi";

/* Everything a person has been told, with the filters the bell can't fit:
   /dashboard/notifications (customers), /reseller/notifications (resellers),
   /admin/notifications (the team — each admin sees the modules they may open). */

const PREFS: { key: "enquiries" | "followUps" | "plan" | "rewards" | "tips"; label: string; hint: string }[] = [
  { key: "enquiries", label: "New enquiries", hint: "When someone sends an enquiry from your card" },
  { key: "followUps", label: "Follow-up reminders", hint: "Leads you planned to follow up today" },
  { key: "plan", label: "Plan and trial reminders", hint: "Before your trial or plan ends, and plan changes" },
  { key: "rewards", label: "Referral rewards and payouts", hint: "Rewards credited and payouts sent" },
  { key: "tips", label: "Tips and product news", hint: "Getting more from your card, and what's new" },
];

export default function Notifications() {
  const role = useSessionRole();
  const scope = scopeForRole(role);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const f = params.get("f") || "all";
  const [search, setSearch] = useState(params.get("q") || "");
  const [q, setQ] = useState(search);
  const [confirmClear, setConfirmClear] = useState(false);

  // Search as you type, without a request per keystroke.
  useEffect(() => { const t = window.setTimeout(() => setQ(search.trim()), 300); return () => window.clearTimeout(t); }, [search]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setF = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === "all") next.delete("f"); else next.set("f", key);
    setParams(next, { replace: true });
    setConfirmClear(false);
  };

  const summary = useNotifSummary(scope);
  const filter: Filter = { q, ...(f === "unread" ? { unreadOnly: true } : f === "action" ? { needsAction: true } : f === "all" ? {} : { category: f }) };
  const feed = useNotifFeed(scope, filter, { limit: 20 });
  const act = useNotifActions(scope);

  const categories = summary.data?.categories ?? [];
  const chipCategory = categories.some((c) => c.key === f) ? f : null;
  const scopeLabel = chipCategory ? categories.find((c) => c.key === chipCategory)?.label : null;

  const groups = useMemo(() => {
    const out: { key: ReturnType<typeof dayGroup>; items: FeedItem[] }[] = [];
    for (const i of feed.items) {
      const g = dayGroup(i.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === g) last.items.push(i); else out.push({ key: g, items: [i] });
    }
    return out;
  }, [feed.items]);

  const dismiss = async (i: FeedItem) => {
    try {
      await act.dismiss([i.id]);
      toast("Notification dismissed", { action: { label: "Undo", onClick: () => void act.restore([i.id]) } });
    } catch { toast.error("Couldn't dismiss it. Try again."); }
  };
  const clearAll = async () => {
    setConfirmClear(false);
    try {
      const ids = await act.clearAll(chipCategory);
      if (!ids.length) { toast("Nothing to clear"); return; }
      toast(`Cleared ${ids.length} notification${ids.length === 1 ? "" : "s"}`, { action: { label: "Undo", onClick: () => void act.restore(ids) } });
    } catch { toast.error("Couldn't clear them. Try again."); }
  };
  const markAll = async () => {
    try { await act.markAllRead(chipCategory); toast.success(scopeLabel ? `${scopeLabel}: all marked read` : "All marked read"); }
    catch { toast.error("Couldn't mark them read. Try again."); }
  };
  const open = (i: FeedItem) => {
    if (!i.isRead) void act.markRead([i.id]).catch(() => {});
    navigate(linkFor(role, i.link));
  };

  const chips = [
    { key: "all", label: "All", n: summary.data?.total ?? 0, tone: "" },
    { key: "unread", label: "Unread", n: summary.data?.unread ?? 0, tone: "" },
    ...(scope === "team" ? [{ key: "action", label: "Needs action", n: summary.data?.needsAction ?? 0, tone: "red" }] : []),
    ...categories.map((c) => ({ key: c.key, label: c.label, n: c.unread, tone: "" })),
  ];

  const emptyText = q ? `Nothing matches “${q}”.`
    : f === "unread" ? "No unread notifications."
    : f === "action" ? "Nothing needs the team's attention right now."
    : scopeLabel ? `No ${scopeLabel.toLowerCase()} notifications.` : "You're all caught up.";

  return (
    <ResponsiveDashboardLayout title="Notifications" subtitle={scope === "team" ? "What the team needs to know" : "Everything that happened on your account"}>
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {/* Summary + actions */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-[#F7B31C]"><Bell size={19} /></span>
            <div>
              <p className="text-[15px] font-bold text-[#0F172A]">
                {summary.isLoading ? "Loading…" : `${summary.data?.unread ?? 0} unread`}
                {scope === "team" && !!summary.data?.needsAction && <span className="ml-2 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-bold text-[#B91C1C]">{summary.data.needsAction} need action</span>}
              </p>
              <p className="text-[12px] text-[#64748B]">{summary.data?.total ?? 0} in your list{scopeLabel ? ` · showing ${scopeLabel}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void markAll()} disabled={act.busy || !(summary.data?.unread)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-45">
              <CheckCheck size={14} /> Mark {scopeLabel ? scopeLabel.toLowerCase() : "all"} read
            </button>
            <button type="button" onClick={() => (confirmClear ? void clearAll() : setConfirmClear(true))} onBlur={() => setConfirmClear(false)}
              disabled={act.busy || !(summary.data?.total)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-semibold disabled:opacity-45 ${confirmClear ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]"}`}>
              <Trash2 size={14} /> {confirmClear ? `Yes, clear ${scopeLabel ? scopeLabel.toLowerCase() : "all"}` : `Clear ${scopeLabel ? scopeLabel.toLowerCase() : "all"}`}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0" role="tablist" aria-label="Filter notifications">
            {chips.map((c) => (
              <button key={c.key} type="button" role="tab" aria-selected={f === c.key} onClick={() => setF(c.key)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${f === c.key ? "bg-[#0F172A] text-white" : "bg-white text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"}`}>
                {c.label}
                {c.n > 0 && <span className={`rounded-full px-1.5 text-[10.5px] font-bold ${f === c.key ? "bg-white/20" : c.tone === "red" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#F1F5F9] text-[#0F172A]"}`}>{c.n}</span>}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder="Search notifications…" aria-label="Search notifications"
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-8 text-[13px] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94A3B8] hover:text-[#0F172A]"><X size={13} /></button>}
          </div>
        </div>

        {/* The list */}
        <div className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-premium">
          {feed.isError ? (
            <div className="px-6 py-14 text-center">
              <AlertCircle size={26} className="mx-auto mb-2 text-[#F87171]" />
              <p className="text-sm text-[#475569]">Couldn't load your notifications.</p>
              <button type="button" onClick={() => void feed.refetch()} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#B45309]"><RotateCw size={13} /> Try again</button>
            </div>
          ) : feed.isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3].map((k) => <div key={k} className="h-16 animate-pulse rounded-xl bg-[#F8FAFC]" />)}</div>
          ) : feed.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Inbox size={30} className="mx-auto mb-2 text-[#CBD5E1]" />
              <p className="text-sm text-[#64748B]">{emptyText}</p>
            </div>
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.key} aria-label={DAY_GROUP_LABEL[g.key]}>
                  <h2 className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{DAY_GROUP_LABEL[g.key]}</h2>
                  <ul>
                    {g.items.map((i) => {
                      const { Icon, bg, fg } = lookFor(scope, i.type);
                      const cat = categories.find((c) => c.key === i.category)?.label;
                      return (
                        <li key={i.id} className={`flex items-start gap-3 border-b border-[#F8FAFC] px-4 py-3.5 last:border-0 ${i.isRead ? "" : "bg-[#FFFDF5]"}`}>
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}><Icon size={16} style={{ color: fg }} /></span>
                          <button type="button" onClick={() => open(i)} className="min-w-0 flex-1 text-left">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[13.5px] ${i.isRead ? "font-semibold text-[#334155]" : "font-bold text-[#0F172A]"}`}>{i.title}</span>
                              {!i.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#F7B31C]" aria-label="Unread" />}
                            </span>
                            {i.message && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#64748B]">{i.message}</span>}
                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#94A3B8]">
                              <span title={exactTime(i.createdAt)}>{timeAgo(i.createdAt)}</span>
                              {cat && <span className="rounded-full bg-[#F1F5F9] px-2 py-px font-semibold text-[#64748B]">{cat}</span>}
                              {i.needsAction && <span className="rounded-full bg-[#FEE2E2] px-2 py-px font-bold text-[#B91C1C]">Needs action</span>}
                              {scope === "team" && i.severity === "action" && !i.needsAction && <span className="rounded-full bg-[#DCFCE7] px-2 py-px font-bold text-[#15803D]">Handled</span>}
                            </span>
                          </button>
                          <span className="flex shrink-0 items-center gap-0.5">
                            <button type="button" onClick={() => open(i)} title="Open" aria-label="Open"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]"><ExternalLink size={14} /></button>
                            <button type="button" onClick={() => void (i.isRead ? act.markUnread([i.id]) : act.markRead([i.id]))}
                              title={i.isRead ? "Mark as unread" : "Mark as read"} aria-label={i.isRead ? "Mark as unread" : "Mark as read"}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]">
                              {i.isRead ? <CircleDot size={14} /> : <Circle size={14} />}
                            </button>
                            <button type="button" onClick={() => void dismiss(i)} title="Dismiss" aria-label="Dismiss"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"><X size={14} /></button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {feed.hasMore && (
                <div className="border-t border-[#F1F5F9] p-3 text-center">
                  <button type="button" onClick={() => void feed.loadMore()} disabled={feed.loadingMore}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-4 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">
                    {feed.loadingMore ? <Loader2 size={14} className="animate-spin" /> : null} Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {scope === "user" && role !== "reseller" ? <Preferences /> : null}
        {scope === "team" && role === "super_admin" && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
            <Settings2 size={13} /> Everything here is always kept. Which events are also emailed, and to whom, is set in
            <Link to="/admin/settings?tab=alerts" className="font-semibold text-[#B45309] hover:underline">Settings → Alerts</Link>.
          </p>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}

/* Email and phone alerts, per kind. The list above always keeps everything. */
function Preferences() {
  const utils = trpc.useUtils();
  const prefs = trpc.notification.prefs.useQuery();
  const save = trpc.notification.setPrefs.useMutation({
    onSuccess: (data) => utils.notification.prefs.setData(undefined, data),
  });
  return (
    <section className="rounded-2xl border border-[#F1F5F9] bg-white p-4 shadow-premium sm:p-5" aria-labelledby="notif-prefs">
      <h2 id="notif-prefs" className="text-[14px] font-bold text-[#0F172A]">Email and phone alerts</h2>
      <p className="mt-0.5 text-[12.5px] text-[#64748B]">Choose what we email you about and send to the DigitalCarda app. This list always keeps everything, and account, security and payment messages are always sent.</p>
      <ul className="mt-3 divide-y divide-[#F1F5F9]">
        {PREFS.map((p) => {
          const on = prefs.data ? prefs.data[p.key] : true;
          return (
            <li key={p.key} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-[13px] font-semibold text-[#0F172A]">{p.label}</span>
                <span className="block text-[12px] text-[#94A3B8]">{p.hint}</span>
              </span>
              <button type="button" role="switch" aria-checked={on} aria-label={p.label} disabled={!prefs.data || save.isPending}
                onClick={() => save.mutate({ [p.key]: !on }, { onSuccess: () => toast.success(`${p.label}: ${on ? "off" : "on"}`), onError: () => toast.error("Couldn't save that. Try again.") })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-[#16A34A]" : "bg-[#CBD5E1]"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
