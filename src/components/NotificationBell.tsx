import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell, Mail, Inbox, Banknote, CheckCircle2, XCircle, Package,
  Sparkles, CalendarClock, Users, CheckCheck, Trash2, TrendingUp, Wand2, Clock,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEnquiryNotifications } from "@/hooks/useEnquiryNotifications";
import { readCustomer, scopedKey } from "@/hooks/useCustomer";
import { trpc } from "@/providers/trpc";

const timeAgo = (s: string | Date) => {
  const d = new Date(typeof s === "string" ? s.replace(" ", "T") : s); if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type Style = { icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>; bg: string; fg: string };

/* Type → icon + colours. Every notification kind gets its own look. */
const STYLE: Record<string, Style> = {
  enquiry:            { icon: Mail,          bg: "#FEF3C7", fg: "#D97706" },
  referral_joined:    { icon: Users,         bg: "#DBEAFE", fg: "#2563EB" },
  referral_reward:    { icon: Banknote,      bg: "#DCFCE7", fg: "#16A34A" },
  reseller_commission:{ icon: Banknote,      bg: "#DCFCE7", fg: "#16A34A" },
  reward:             { icon: Banknote,      bg: "#DCFCE7", fg: "#16A34A" },
  payout_paid:        { icon: CheckCircle2,  bg: "#DCFCE7", fg: "#16A34A" },
  payout_rejected:    { icon: XCircle,       bg: "#FEE2E2", fg: "#DC2626" },
  payment_verified:   { icon: CheckCircle2,  bg: "#DCFCE7", fg: "#16A34A" },
  payment_pending:    { icon: Clock,         bg: "#FEF3C7", fg: "#D97706" },
  payment_rejected:   { icon: XCircle,       bg: "#FEE2E2", fg: "#DC2626" },
  plan:               { icon: Package,       bg: "#EDE9FE", fg: "#7C3AED" },
  welcome:            { icon: Sparkles,      bg: "#FEF3C7", fg: "#F7B31C" },
  expiry:             { icon: CalendarClock, bg: "#FEE2E2", fg: "#DC2626" },
  trial_email_ending: { icon: CalendarClock, bg: "#FEF3C7", fg: "#D97706" },
  trial_email_ended:  { icon: CalendarClock, bg: "#FEE2E2", fg: "#DC2626" },
  ls_abandoned:       { icon: Wand2,         bg: "#FEF3C7", fg: "#F7B31C" },
  milestone:          { icon: TrendingUp,    bg: "#DBEAFE", fg: "#2563EB" },
  default:            { icon: Bell,          bg: "#F1F5F9", fg: "#64748B" },
};

/* Robust fallback so a NEW server type still gets a sensible icon/colour, never
   a blank grey bell — matched by keyword when there's no exact entry. */
const styleFor = (type: string): Style => {
  if (STYLE[type]) return STYLE[type];
  if (/trial|expir/.test(type)) return { icon: CalendarClock, bg: "#FEF3C7", fg: "#D97706" };
  if (/pay|commission|reward|payout|wallet|credit/.test(type)) return { icon: Banknote, bg: "#DCFCE7", fg: "#16A34A" };
  if (/referral|invite/.test(type)) return { icon: Users, bg: "#DBEAFE", fg: "#2563EB" };
  if (/enquiry|lead/.test(type)) return { icon: Mail, bg: "#FEF3C7", fg: "#D97706" };
  if (/view|milestone|reach/.test(type)) return { icon: TrendingUp, bg: "#DBEAFE", fg: "#2563EB" };
  if (/plan|upgrade|subscription|renew/.test(type)) return { icon: Package, bg: "#EDE9FE", fg: "#7C3AED" };
  if (/welcome|ls_|publish|complete/.test(type)) return { icon: Sparkles, bg: "#FEF3C7", fg: "#F7B31C" };
  return STYLE.default;
};

type FeedItem = {
  key: string;
  type: string;
  title: string;
  message: string;
  time: string | Date | null;
  unread: boolean;
  link: string;
  backendId?: number;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "leads", label: "Leads" },
  { id: "rewards", label: "Rewards" },
  { id: "system", label: "System" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

/* Which tab a notification type belongs to — keyword-matched so every kind,
   including new ones, lands in the right filter. */
const groupFor = (type: string): FilterId => {
  if (/enquiry|lead/.test(type)) return "leads";
  if (/referral|reward|payout|commission|wallet|credit/.test(type)) return "rewards";
  return "system";
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const utils = trpc.useUtils();

  // Local card enquiries (live, cross-tab)
  const { unreadCount: enqUnread, recent: enqRecent, markAllRead: markEnqRead } = useEnquiryNotifications();

  // Backend notifications — referral, payouts, plan, welcome (30s polling)
  const { data: backendList } = trpc.notification.list.useQuery(undefined, { refetchInterval: 30_000, retry: false });
  const { data: backendUnread } = trpc.notification.unreadCount.useQuery(undefined, { refetchInterval: 30_000, retry: false });
  const markAllReadMut = trpc.notification.markAllRead.useMutation();
  const markReadMut = trpc.notification.markRead.useMutation();
  const clearAllMut = trpc.notification.clearAll.useMutation();

  // Smart local alert: plan expiring within 7 days
  const expiryAlert = useMemo((): FeedItem | null => {
    try {
      const c = readCustomer();
      const exp = String(c.expired_on || "");
      if (!exp || exp === "0000-00-00") return null;
      const d = new Date(exp.replace(" ", "T"));
      if (isNaN(d.getTime())) return null;
      const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
      if (days > 7) return null;
      return {
        key: "local-expiry",
        type: "expiry",
        title: days <= 0 ? "Your plan has expired" : `Plan expires in ${days} day${days === 1 ? "" : "s"}`,
        message: days <= 0 ? "Renew now to keep your card live." : "Renew early so your card never goes offline.",
        time: null, unread: true, link: "/dashboard/subscription",
      };
    } catch { return null; }
  }, []);

  // New: celebrate card-view milestones (100, 500, 1k, 5k, 10k…). Uses the real
  // live view count; fires once per milestone (remembered per-user) so it never nags.
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    try {
      const slug = String(readCustomer()?.slug || "").toLowerCase();
      if (!slug) return;
      fetch(`/api/views/${encodeURIComponent(slug)}`).then((r) => r.json())
        .then((d) => { if (!cancelled && typeof d?.views === "number") setViews(d.views); })
        .catch(() => { /* ignore */ });
    } catch { /* ignore */ }
    return () => { cancelled = true; };
  }, []);
  const VIEW_MS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
  const reachedMs = views == null ? 0 : (VIEW_MS.filter((m) => views >= m).pop() || 0);
  const markMilestoneSeen = () => { try { if (reachedMs) localStorage.setItem(scopedKey("views_ms_seen"), String(reachedMs)); } catch { /* ignore */ } };
  const milestoneAlert = useMemo((): FeedItem | null => {
    if (!reachedMs) return null;
    try { if (reachedMs <= Number(localStorage.getItem(scopedKey("views_ms_seen")) || 0)) return null; } catch { return null; }
    return {
      key: "local-milestone", type: "milestone",
      title: `🎉 ${reachedMs.toLocaleString("en-IN")} card views!`,
      message: "Your digital card is getting noticed — keep sharing it to grow.",
      time: null, unread: true, link: "/dashboard/analytics",
    };
  }, [reachedMs]);

  /* Merge every source into one feed, newest first (local alerts pinned) */
  const feed = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];
    for (const n of backendList || []) {
      items.push({
        key: `b-${n.id}`, type: n.type, title: n.title, message: n.message,
        time: n.createdAt, unread: !n.isRead, link: n.link || "/dashboard", backendId: n.id,
      });
    }
    for (const e of enqRecent) {
      items.push({
        key: `e-${e.id}`, type: "enquiry",
        title: `New enquiry from ${e.name || "Someone"}`,
        message: e.description || e.contact || "",
        time: e.created_on, unread: true, link: "/dashboard/enquiry",
      });
    }
    items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
    const pinned = [expiryAlert, milestoneAlert].filter(Boolean) as FeedItem[];
    return [...pinned, ...items];
  }, [backendList, enqRecent, expiryAlert, milestoneAlert]);

  const visible = filter === "all" ? feed : feed.filter((i) => groupFor(i.type) === filter);
  const badge = enqUnread + (backendUnread?.count ?? 0) + (expiryAlert ? 1 : 0) + (milestoneAlert ? 1 : 0);

  const markAll = () => {
    markEnqRead(); markMilestoneSeen();
    markAllReadMut.mutate(undefined, { onSuccess: () => { utils.notification.list.invalidate(); utils.notification.unreadCount.invalidate(); } });
  };
  const clearAll = () => {
    markEnqRead(); markMilestoneSeen();
    clearAllMut.mutate(undefined, { onSuccess: () => { utils.notification.list.invalidate(); utils.notification.unreadCount.invalidate(); } });
  };
  const openItem = (i: FeedItem) => {
    if (i.backendId) markReadMut.mutate({ id: i.backendId }, { onSuccess: () => { utils.notification.list.invalidate(); utils.notification.unreadCount.invalidate(); } });
    if (i.type === "enquiry") markEnqRead();
    if (i.type === "milestone") markMilestoneSeen();
    setOpen(false);
    navigate(i.link);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-10 h-10 rounded-xl hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all relative" aria-label="Notifications">
        <Bell size={18} className={badge > 0 ? "text-[#F7B31C]" : ""} />
        {badge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
            <span className="text-[9px] font-bold text-white leading-none">{badge > 9 ? "9+" : badge}</span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
              <p className="text-sm font-bold text-[#0F172A]">Notifications</p>
              <div className="flex items-center gap-1">
                <button onClick={markAll} title="Mark all read" className="w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] transition-colors"><CheckCheck size={14} /></button>
                <button onClick={clearAll} title="Clear all" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[#94A3B8] transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 px-3 py-2 border-b border-[#F8FAFC]">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${filter === f.id ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Feed */}
            <div className="max-h-80 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox size={24} className="mx-auto text-[#CBD5E1] mb-2" />
                  <p className="text-xs text-[#94A3B8]">You're all caught up</p>
                  <p className="text-[10px] text-[#CBD5E1] mt-1">Enquiries, rewards & updates appear here.</p>
                </div>
              ) : visible.slice(0, 15).map((i) => {
                const st = styleFor(i.type);
                return (
                  <button key={i.key} onClick={() => openItem(i)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left border-b border-[#F8FAFC] last:border-0 ${i.unread ? "bg-[#FFFDF5]" : ""}`}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                      <st.icon size={14} style={{ color: st.fg }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`block text-xs truncate ${i.unread ? "font-bold text-[#0F172A]" : "font-semibold text-[#334155]"}`}>{i.title}</span>
                        {i.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#F7B31C] shrink-0" />}
                      </span>
                      {i.message && <span className="block text-[11px] text-[#64748B] mt-0.5 line-clamp-2">{i.message}</span>}
                      {i.time && <span className="block text-[10px] text-[#94A3B8] mt-1">{timeAgo(i.time)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
