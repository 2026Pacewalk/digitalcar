import type { ComponentType, CSSProperties } from "react";
import {
  Mail, Clock, Calendar, CalendarPlus, CheckCircle2, XCircle, Banknote, Users, UserPlus, UserMinus,
  Sparkles, Package, Truck, Percent, Wand2, Link2, ShieldAlert, Handshake, TrendingUp, Globe, Trash2,
  Store, Inbox, Bell,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { teamDef, userDef, type NotifIcon, type NotifTone } from "@contracts/notifications";

/* The web side of notifications: how each type looks, where it opens for this
   person, and one hook that reads either feed — a customer's or reseller's own
   (trpc.notification) or the team's (trpc.teamNotification) — with the same
   shape, for the bell and the notifications page. */

export type Scope = "user" | "team";
export const scopeForRole = (role: string): Scope => (role === "super_admin" || role === "staff" ? "team" : "user");

export const pageFor = (role: string) =>
  role === "reseller" ? "/reseller/notifications" : scopeForRole(role) === "team" ? "/admin/notifications" : "/dashboard/notifications";

type Icon = ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
const ICONS: Record<NotifIcon, Icon> = {
  mail: Mail, clock: Clock, calendar: Calendar, calendarPlus: CalendarPlus, check: CheckCircle2, x: XCircle,
  banknote: Banknote, users: Users, userPlus: UserPlus, userMinus: UserMinus, sparkles: Sparkles, package: Package,
  truck: Truck, percent: Percent, wand: Wand2, link: Link2, shield: ShieldAlert, handshake: Handshake,
  trending: TrendingUp, globe: Globe, trash: Trash2, store: Store, inbox: Inbox, bell: Bell,
};
const TONES: Record<NotifTone, { bg: string; fg: string }> = {
  amber: { bg: "#FEF3C7", fg: "#D97706" },
  green: { bg: "#DCFCE7", fg: "#16A34A" },
  red: { bg: "#FEE2E2", fg: "#DC2626" },
  blue: { bg: "#DBEAFE", fg: "#2563EB" },
  violet: { bg: "#EDE9FE", fg: "#7C3AED" },
  gold: { bg: "#FEF3C7", fg: "#B45309" },
  teal: { bg: "#CCFBF1", fg: "#0F766E" },
  slate: { bg: "#F1F5F9", fg: "#64748B" },
};

export function lookFor(scope: Scope, type: string): { Icon: Icon; bg: string; fg: string } {
  const d = scope === "team" ? teamDef(type) : userDef(type);
  return { Icon: ICONS[d.icon] ?? Bell, ...(TONES[d.tone] ?? TONES.slate) };
}

/* Where a notification opens, for this portal. Only paths on this site;
   partners' rows written with customer links open their own pages. */
export function linkFor(role: string, link: string | null | undefined): string {
  const home = role === "reseller" ? "/reseller" : scopeForRole(role) === "team" ? "/admin" : "/dashboard";
  const l = link && link.startsWith("/") && !link.startsWith("//") ? link : home;
  if (role === "reseller" && l.startsWith("/dashboard")) return l.startsWith("/dashboard/refer") ? "/reseller/earnings" : "/reseller";
  return l;
}

export type FeedItem = {
  id: number; type: string; category: string; title: string; message: string; link: string | null;
  isRead: boolean; createdAt: Date | string; needsAction?: boolean; resolvedAt?: Date | string | null; severity?: string;
};
export type Chip = { key: string; label: string; unread: number; total: number; action: number };
export type Summary = { unread: number; total: number; needsAction: number; categories: Chip[] };

export type Filter = { category?: string | null; unreadOnly?: boolean; needsAction?: boolean; q?: string };

/** The counts for the badge and the chips, polled while the tab is open. */
export function useNotifSummary(scope: Scope, opts: { poll?: boolean } = {}) {
  const interval = opts.poll === false ? false : 30_000;
  const user = trpc.notification.summary.useQuery(undefined, { enabled: scope === "user", refetchInterval: interval, retry: 1 });
  const team = trpc.teamNotification.summary.useQuery(undefined, { enabled: scope === "team", refetchInterval: interval, retry: 1 });
  const q = scope === "team" ? team : user;
  let data: Summary | undefined;
  if (scope === "team" && team.data) {
    const t = team.data;
    data = { unread: t.unread, total: t.total, needsAction: t.needsAction,
      categories: t.categories.map((c) => ({ key: c.key, label: c.label, ...t.byCategory[c.key] })) };
  } else if (scope === "user" && user.data) {
    const u = user.data;
    data = { unread: u.unread, total: u.total, needsAction: 0,
      categories: u.categories.map((c) => ({ key: c.key, label: c.label, action: 0, ...u.byCategory[c.key] })) };
  }
  return { data, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}

/** A page-at-a-time feed with the given filter. */
export function useNotifFeed(scope: Scope, filter: Filter, opts: { limit?: number; enabled?: boolean } = {}) {
  const base = {
    limit: opts.limit ?? 20,
    category: (filter.category || null) as never,
    unreadOnly: filter.unreadOnly || undefined,
    q: filter.q?.trim() || undefined,
  };
  const enabled = opts.enabled !== false;
  const next = { getNextPageParam: (last: { nextCursor: { at: Date; id: number } | null }) => last.nextCursor ?? undefined };
  const user = trpc.notification.feed.useInfiniteQuery(base, { ...next, enabled: enabled && scope === "user", retry: 1 });
  const team = trpc.teamNotification.feed.useInfiniteQuery({ ...base, needsAction: filter.needsAction || undefined }, { ...next, enabled: enabled && scope === "team", retry: 1 });
  const q = scope === "team" ? team : user;
  const items = (q.data?.pages ?? []).flatMap((p) => p.items as FeedItem[]);
  return {
    items, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch,
    hasMore: !!q.hasNextPage, loadMore: () => q.fetchNextPage(), loadingMore: q.isFetchingNextPage,
  };
}

/** Read / unread / dismiss / restore / mark-all / clear-all, for either feed.
    Every change refreshes the counts and the lists. */
export function useNotifActions(scope: Scope) {
  const utils = trpc.useUtils();
  const refresh = () => (scope === "team" ? utils.teamNotification.invalidate() : utils.notification.invalidate());
  const u = {
    markRead: trpc.notification.markRead.useMutation({ onSuccess: refresh }),
    markUnread: trpc.notification.markUnread.useMutation({ onSuccess: refresh }),
    markAllRead: trpc.notification.markAllRead.useMutation({ onSuccess: refresh }),
    dismiss: trpc.notification.dismiss.useMutation({ onSuccess: refresh }),
    restore: trpc.notification.restore.useMutation({ onSuccess: refresh }),
    clearAll: trpc.notification.clearAll.useMutation({ onSuccess: refresh }),
  };
  const t = {
    markRead: trpc.teamNotification.markRead.useMutation({ onSuccess: refresh }),
    markUnread: trpc.teamNotification.markUnread.useMutation({ onSuccess: refresh }),
    markAllRead: trpc.teamNotification.markAllRead.useMutation({ onSuccess: refresh }),
    dismiss: trpc.teamNotification.dismiss.useMutation({ onSuccess: refresh }),
    restore: trpc.teamNotification.restore.useMutation({ onSuccess: refresh }),
    clearAll: trpc.teamNotification.clearAll.useMutation({ onSuccess: refresh }),
  };
  const m = scope === "team" ? t : u;
  return {
    markRead: (ids: number[]) => m.markRead.mutateAsync({ ids }),
    markUnread: (ids: number[]) => m.markUnread.mutateAsync({ ids }),
    markAllRead: (category?: string | null) => m.markAllRead.mutateAsync({ category: (category || null) as never }),
    dismiss: (ids: number[]) => m.dismiss.mutateAsync({ ids }),
    restore: (ids: number[]) => m.restore.mutateAsync({ ids }),
    clearAll: async (category?: string | null) => (await m.clearAll.mutateAsync({ category: (category || null) as never })).ids,
    busy: Object.values(m).some((x) => x.isPending),
  };
}
