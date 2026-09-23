import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home, Users, BarChart3, LayoutDashboard, UserCircle, MessageSquare, Wallet, ReceiptText,
  Eye, Share2, Settings, LogOut, ChevronLeft, ChevronRight, Wand2, QrCode, Mail, ArrowLeft,
  LayoutGrid, MessageCircle, RefreshCw, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getToken, clearSession } from "@/lib/session";
import { useAuth } from "@/hooks/useAuth";
import { roleTheme } from "@/lib/roleTheme";
import { readCustomer } from "@/hooks/useCustomer";
import { CONTACT } from "@/lib/publicNav";
import { haptic, useEdgeToEdge, useKeyboardOpen } from "@/lib/nativeApp";
import ProfileMenu from "@/components/ProfileMenu";
import NotificationBell from "@/components/NotificationBell";
import AppSheet from "@/components/mobile/AppSheet";
import { InstallAppBanner, InstallAppRow } from "@/components/mobile/InstallApp";
import { TutorialModal } from "@/components/TutorialPlayer";
import { customerGroups, superAdminGroups, resellerGroups, staffGroups, type NavGroup, type NavLink } from "@/components/layout/Sidebar";
import { useStaffAccess } from "@/hooks/useStaffAccess";

/* ─── Phone shell for the customer, reseller and admin dashboards ───────────
 * Built like a native app: an app bar (back / title / actions), a bottom tab
 * bar whose last tab opens a "More" sheet with every other screen, pull down
 * to refresh, bars that step aside for the keyboard, and an install offer. */

/* Drawer context — kept for callers; "the drawer" is now the More sheet. */
interface MobileLayoutContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
}
const MobileLayoutContext = createContext<MobileLayoutContextType | null>(null);
export function useMobileLayout() {
  const ctx = useContext(MobileLayoutContext);
  if (!ctx) throw new Error("useMobileLayout must be used inside MobileDashboardLayout");
  return ctx;
}

/* ─── Page-chrome context — a page (via ModuleShell) can hoist its primary
 *    action (Save) into the native app bar. Returns null on desktop. */
interface MobileChrome {
  setTitle: (t: string | null) => void;
  setAction: (a: ReactNode) => void;
}
const MobileChromeContext = createContext<MobileChrome | null>(null);
export function useMobileChrome(title: string | null, action: ReactNode) {
  const chrome = useContext(MobileChromeContext);
  useEffect(() => {
    if (!chrome) return;
    chrome.setTitle(title);
    chrome.setAction(action ?? null);
    return () => { chrome.setTitle(null); chrome.setAction(null); };
  }, [chrome, title, action]);
}

type Icon = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
type Tab = { icon: Icon; label: string; path: string; match: (p: string) => boolean };
interface NavConfig { home: string; profile: string; tabs: Tab[]; groups: NavGroup[] }

const under = (...prefixes: string[]) => (p: string) => prefixes.some((x) => p === x || p.startsWith(`${x}/`));

/* Tabs claim the screens that belong to them, so the right tab stays lit deep
   inside a flow (e.g. Edit while on About Us). Anything unclaimed lights More. */
const NAV: Record<string, NavConfig> = {
  customer: {
    home: "/dashboard",
    profile: "/dashboard/profile",
    tabs: [
      { icon: Home, label: "Home", path: "/dashboard", match: (p) => p === "/dashboard" },
      { icon: Wand2, label: "Edit", path: "/dashboard/build", match: under(
        "/dashboard/build", "/dashboard/home", "/dashboard/templates", "/dashboard/social", "/dashboard/about",
        "/dashboard/products", "/dashboard/payments", "/dashboard/media", "/dashboard/reviews", "/dashboard/uploads",
        "/dashboard/view", "/dashboard/builder", "/dashboard/cards", "/dashboard/ai") },
      { icon: QrCode, label: "Share", path: "/dashboard/qr", match: under("/dashboard/qr", "/dashboard/signature", "/dashboard/whatsapp", "/dashboard/instagram", "/dashboard/tools") },
      { icon: Mail, label: "Leads", path: "/dashboard/leads", match: under("/dashboard/leads", "/dashboard/enquiry") },
    ],
    groups: customerGroups,
  },
  super_admin: {
    home: "/admin",
    profile: "/admin/profile",
    tabs: [
      { icon: LayoutDashboard, label: "Home", path: "/admin", match: (p) => p === "/admin" },
      { icon: UserCircle, label: "Customers", path: "/admin/customers", match: under("/admin/customers") },
      { icon: MessageSquare, label: "Leads", path: "/admin/leads", match: under("/admin/leads") },
      { icon: ReceiptText, label: "Payments", path: "/admin/payment-orders", match: under("/admin/payment-orders", "/admin/payments") },
    ],
    groups: superAdminGroups,
  },
  reseller: {
    home: "/reseller",
    profile: "/reseller/profile",
    tabs: [
      { icon: LayoutDashboard, label: "Home", path: "/reseller", match: (p) => p === "/reseller" },
      { icon: Users, label: "Customers", path: "/reseller/customers", match: under("/reseller/customers") },
      { icon: Wallet, label: "Payments", path: "/reseller/payments", match: under("/reseller/payments") },
    ],
    groups: resellerGroups,
  },
};

/* ─── Route → title map (all sections) ─── */
const ROUTE_TITLES: Record<string, string> = {
  // Customer
  "/dashboard": "Dashboard",
  "/dashboard/build": "Edit Card",
  "/dashboard/home": "Basics",
  "/dashboard/about": "About Us",
  "/dashboard/products": "Products / Services",
  "/dashboard/payments": "Payments",
  "/dashboard/signature": "Email Signature",
  "/dashboard/whatsapp": "WhatsApp Messages",
  "/dashboard/instagram": "Instagram Bio",
  "/dashboard/tools": "Free Tools",
  "/dashboard/nfc": "NFC Card & Standee",
  "/dashboard/qr": "QR & Share",
  "/dashboard/media": "Gallery & Videos",
  "/dashboard/social": "Social Links",
  "/dashboard/reviews": "Google Reviews",
  "/dashboard/uploads": "Uploads",
  "/dashboard/settings": "Settings",
  "/dashboard/view": "My Card",
  "/dashboard/leads": "Leads",
  "/dashboard/analytics": "Analytics",
  "/dashboard/profile": "Profile",
  "/dashboard/cards": "My Cards",
  "/dashboard/bulk": "Bulk Create",
  "/dashboard/refer": "Refer & Earn",
  "/dashboard/templates": "Templates",
  "/dashboard/subscription": "Subscription",
  "/dashboard/billing": "Billing",
  "/dashboard/domain": "Custom Domain",
  "/dashboard/ai": "AI Tools",
  // Admin
  "/admin": "Dashboard",
  "/admin/resellers": "Resellers",
  "/admin/reseller-accounts": "Reseller Accounts",
  "/admin/reseller-applications": "Applications",
  "/admin/customers": "Customers",
  "/admin/products": "Products",
  "/admin/packages": "Packages",
  "/admin/templates": "Templates",
  "/admin/migration": "Migration",
  "/admin/url-conflicts": "URL Conflicts",
  "/admin/domains": "Custom Domains",
  "/admin/email-log": "Email Log",
  "/admin/email-previews": "Email Previews",
  "/admin/analytics": "Analytics",
  "/admin/leads": "Leads",
  "/admin/bulk-orders": "Bulk Orders",
  "/admin/nfc-orders": "NFC Orders",
  "/admin/coupons": "Coupons",
  "/admin/announcements": "Offer Popups",
  "/admin/ai-generator": "AI Generator",
  "/admin/referrals": "Referrals & Payouts",
  "/admin/payments": "Payments",
  "/admin/payment-orders": "Payment Orders",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
  "/admin/staff": "Staff & Access",
  "/admin/activity": "Activity Log",
  // Reseller
  "/reseller": "Dashboard",
  "/reseller/customers": "My Customers",
  "/reseller/payments": "Payment Orders",
  "/reseller/profile": "Profile",
};

/* Icon tints per menu section, so a long list scans like a phone's settings. */
const TINTS: Record<string, string> = {
  "My Card": "bg-[#FEF3C7] text-[#B45309]",
  "Overview": "bg-[#FEF3C7] text-[#B45309]",
  "Grow": "bg-[#DCFCE7] text-[#15803D]",
  "Growth": "bg-[#DCFCE7] text-[#15803D]",
  "Manage": "bg-[#DBEAFE] text-[#1D4ED8]",
  "Catalog": "bg-[#EDE9FE] text-[#6D28D9]",
  "Account": "bg-[#E2E8F0] text-[#334155]",
  "System": "bg-[#E2E8F0] text-[#334155]",
};

/* ─── Pull to refresh ─────────────────────────────────────────────────────── */
const PULL_TRIGGER = 64;

function usePullToRefresh(onRefresh: () => Promise<unknown>, enabled: boolean) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let startY: number | null = null;
    let startX = 0;
    let dist = 0;
    let active = false;
    let armed = false;

    // A gesture that starts inside something scrolled (a list, a sheet) belongs to it.
    const ownedByInner = (t: EventTarget | null) => {
      for (let el = t as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.getAttribute?.("role") === "dialog") return true;
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollTop > 0) return true;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      startY = null;
      if (busy.current || e.touches.length !== 1 || window.scrollY > 0) return;
      if (document.body.style.overflow === "hidden" || ownedByInner(e.target)) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      dist = 0; active = false; armed = false;
    };
    const onMove = (e: TouchEvent) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (!active) {
        if (dy < -4 || dx > 14) { startY = null; return; }
        if (dy > 10 && dy > dx * 1.6 && window.scrollY <= 0) active = true;
        else return;
      }
      dist = Math.min(110, Math.max(0, dy - 10) * 0.5);
      setPull(dist);
      if (dist >= PULL_TRIGGER && !armed) { armed = true; haptic(); }
      else if (dist < PULL_TRIGGER) armed = false;
    };
    const onEnd = async () => {
      if (startY == null) return;
      startY = null;
      if (!active) return;
      if (dist < PULL_TRIGGER) { setPull(0); return; }
      busy.current = true;
      setRefreshing(true);
      setPull(PULL_TRIGGER);
      try {
        await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 700))]);
      } finally {
        busy.current = false;
        setRefreshing(false);
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, onRefresh]);

  return { pull, refreshing };
}

export default function MobileDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);
  const typing = useKeyboardOpen();
  useEdgeToEdge();

  const role = user?.role || "customer";
  const access = useStaffAccess();
  // Staff: the admin shell with only the tabs and menu entries they may open.
  const cfg: NavConfig = role === "staff"
    ? { ...NAV.super_admin, home: access.home, tabs: NAV.super_admin.tabs.filter((t) => access.canOpenPath(t.path)), groups: staffGroups(access.canOpenPath) }
    : NAV[role] || NAV.customer;
  const theme = roleTheme(role);
  const path = location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A new screen opens at its top, like a pushed view.
  useEffect(() => { window.scrollTo(0, 0); setMoreOpen(false); }, [path]);

  const refresh = useCallback(async () => {
    window.dispatchEvent(new Event("dc:refresh"));
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { pull, refreshing } = usePullToRefresh(refresh, !moreOpen);

  const activeTab = cfg.tabs.findIndex((t) => t.match(path));
  const onTabRoot = cfg.tabs.some((t) => t.path === path);
  const title = (() => {
    if (pageTitle) return pageTitle;
    if (path === "/dashboard/products") {
      return new URLSearchParams(location.search).get("tab") === "offers" ? "Offers / Deals" : "Products / Services";
    }
    return ROUTE_TITLES[path] || "DigitalCarda";
  })();

  // Back goes to the previous screen; opened directly (a shortcut, a link) it
  // goes up to the section home instead of leaving the app.
  const goBack = () => {
    haptic();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(cfg.home, { replace: true });
  };

  const go = (to: string) => { haptic(); navigate(to); };

  const shareCard = async () => {
    haptic();
    const slug = String(readCustomer()?.slug || "");
    if (!slug) { navigate("/dashboard/qr"); return; }
    const url = `${window.location.origin}/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: "My digital business card", url });
      else { await navigator.clipboard.writeText(url); toast.success("Card link copied"); }
    } catch { /* share sheet dismissed */ }
  };

  const impersonating = !path.startsWith("/admin") && !!getToken("admin");
  const initial = (user?.fullName || "U").charAt(0).toUpperCase();
  const moreActive = activeTab === -1;

  return (
    <MobileLayoutContext.Provider value={{ openDrawer: () => setMoreOpen(true), closeDrawer: () => setMoreOpen(false), isDrawerOpen: moreOpen }}>
      <MobileChromeContext.Provider value={{ setTitle: setPageTitle, setAction: setHeaderAction }}>
        <div className="min-h-screen bg-[#F4F6F9] pb-[calc(env(safe-area-inset-bottom,0px)+84px)]">

          {/* ─── App bar ─── */}
          <header
            className={`sticky top-0 z-40 bg-white/90 pt-safe backdrop-blur-xl transition-shadow duration-200 ${theme.badge ? `border-t-2 ${theme.topAccent}` : ""} ${
              scrolled ? "shadow-[0_1px_0_0_#E2E8F0,0_6px_18px_-12px_rgba(15,23,42,0.25)]" : "shadow-[0_1px_0_0_#EEF1F5]"}`}
          >
            <div className="flex h-14 items-center gap-1 pl-1.5 pr-2">
              {onTabRoot ? (
                <span className="w-2.5 shrink-0" />
              ) : (
                <button onClick={goBack} aria-label="Back"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0F172A] active:bg-[#F1F5F9]">
                  <ChevronLeft size={26} />
                </button>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h1 className={`truncate tracking-tight text-[#0F172A] ${onTabRoot ? "text-[21px] font-extrabold" : "text-[17px] font-bold"}`}>{title}</h1>
                {theme.badge && (
                  <span className={`shrink-0 rounded px-1.5 py-px text-[9px] font-bold tracking-wider ${theme.badgeCls}`}>{theme.badge}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {headerAction && (
                  <span className="mr-0.5 flex items-center [&_a]:!h-8 [&_a]:!gap-1 [&_a]:!whitespace-nowrap [&_a]:!rounded-lg [&_a]:!px-3 [&_a]:!text-[12px] [&_button]:!h-8 [&_button]:!gap-1 [&_button]:!whitespace-nowrap [&_button]:!rounded-lg [&_button]:!px-3 [&_button]:!text-[12px] [&_button]:!font-semibold [&_svg]:!h-3.5 [&_svg]:!w-3.5">
                    {headerAction}
                  </span>
                )}
                <NotificationBell />
                {onTabRoot && <ProfileMenu />}
              </div>
            </div>
          </header>

          {/* ─── Pull-to-refresh indicator ─── */}
          {(pull > 0 || refreshing) && (
            <div className="pointer-events-none fixed inset-x-0 z-30 flex justify-center"
              style={{ top: `calc(env(safe-area-inset-top, 0px) + 56px + ${pull - 44}px)` }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_-6px_rgba(15,23,42,0.35)] ring-1 ring-[#EEF1F5]">
                <RefreshCw size={18}
                  className={`text-[#D97706] ${refreshing ? "dc-ptr-spin" : ""}`}
                  style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)`, opacity: Math.min(1, pull / PULL_TRIGGER) }} />
              </span>
            </div>
          )}

          {/* ─── Screen ─── */}
          <main className="dc-screen-in mx-auto w-full max-w-lg">{children}</main>

          <InstallAppBanner hidden={typing || moreOpen} />

          {/* ─── Bottom tab bar ─── */}
          <nav aria-label="Main"
            className={`dc-bar fixed inset-x-0 bottom-0 z-50 border-t border-[#E9EDF2] bg-white/95 backdrop-blur-xl ${typing ? "dc-bar-hidden" : ""}`}>
            <div className="mx-auto flex h-[62px] max-w-lg items-stretch px-1">
              {cfg.tabs.map((t, i) => (
                <TabButton key={t.path} icon={t.icon} label={t.label} active={activeTab === i}
                  onClick={() => { if (activeTab === i && path === t.path) window.scrollTo({ top: 0, behavior: "smooth" }); else go(t.path); }} />
              ))}
              <TabButton icon={LayoutGrid} label="More" active={moreActive || moreOpen} onClick={() => { haptic(); setMoreOpen(true); }} />
            </div>
            <div className="h-safe-bottom" />
          </nav>

          {/* ─── More ─── */}
          <AppSheet open={moreOpen} onClose={() => setMoreOpen(false)} tall>
            <button type="button" onClick={() => go(cfg.profile)}
              className="dc-press mt-1 flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-[#E7EAF0]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-gold text-lg font-bold text-[#0F172A]">{initial}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-[#0F172A]">{user?.fullName || "My account"}</span>
                <span className="block truncate text-[12px] text-[#64748B]">{user?.email || role.replace("_", " ")}</span>
              </span>
              <ChevronRight size={17} className="text-[#CBD5E1]" />
            </button>

            {role === "customer" && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { icon: Eye, label: "My card", onClick: () => go("/dashboard/view") },
                  { icon: Share2, label: "Share", onClick: shareCard },
                  { icon: BarChart3, label: "Analytics", onClick: () => go("/dashboard/analytics") },
                  { icon: Settings, label: "Settings", onClick: () => go("/dashboard/settings?tab=module") },
                ].map((q) => (
                  <button key={q.label} type="button" onClick={q.onClick}
                    className="dc-press flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 ring-1 ring-[#E7EAF0]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-[#F7B31C]"><q.icon size={17} /></span>
                    <span className="text-[11.5px] font-semibold text-[#334155]">{q.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3"><InstallAppRow /></div>

            {cfg.groups.map((g) => (
              <MenuGroup key={g.title} group={g} path={path} search={location.search} onGo={go} />
            ))}

            <p className="mb-1.5 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Support</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7EAF0]">
              {role === "customer" && (
                <button type="button" onClick={() => { setMoreOpen(false); setWatching(true); }}
                  className="flex w-full items-center gap-3 border-b border-[#F1F5F9] px-3 py-3 text-left active:bg-[#F8FAFC]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]"><PlayCircle size={16} /></span>
                  <span className="flex-1 text-[14px] font-medium text-[#0F172A]">Watch tutorial</span>
                  <ChevronRight size={16} className="text-[#CBD5E1]" />
                </button>
              )}
              <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-3 active:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#15803D]"><MessageCircle size={16} /></span>
                <span className="flex-1 text-[14px] font-medium text-[#0F172A]">Chat with support</span>
                <ChevronRight size={16} className="text-[#CBD5E1]" />
              </a>
              {impersonating && (
                <button type="button" onClick={() => { clearSession("main"); window.location.href = "/admin/customers"; }}
                  className="flex w-full items-center gap-3 border-t border-[#F1F5F9] px-3 py-3 text-left active:bg-[#F8FAFC]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]"><ArrowLeft size={16} /></span>
                  <span className="flex-1 text-[14px] font-semibold text-[#0F172A]">Return to admin</span>
                </button>
              )}
              <button type="button" onClick={() => { haptic("warning"); logout(); }}
                className="flex w-full items-center gap-3 border-t border-[#F1F5F9] px-3 py-3 text-left active:bg-[#FEF2F2]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]"><LogOut size={16} /></span>
                <span className="flex-1 text-[14px] font-semibold text-[#DC2626]">Log out</span>
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] text-[#94A3B8]">DigitalCarda · digitalcarda.in</p>
          </AppSheet>
          {watching && <TutorialModal onClose={() => setWatching(false)} />}
        </div>
      </MobileChromeContext.Provider>
    </MobileLayoutContext.Provider>
  );
}

function TabButton({ icon: I, label, active, onClick }: { icon: Icon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 active:opacity-70">
      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${active ? "bg-[#FEF3C7]" : ""}`}>
        <I size={21} strokeWidth={active ? 2.4 : 1.9} className={active ? "text-[#D97706]" : "text-[#64748B]"} />
      </span>
      <span className={`text-[10.5px] leading-none ${active ? "font-bold text-[#B45309]" : "font-medium text-[#64748B]"}`}>{label}</span>
    </button>
  );
}

/* One section of the More sheet as a grouped list. Items with sub-screens
   (Edit Card) list those as their own group underneath. */
function MenuGroup({ group, path, search, onGo }: { group: NavGroup; path: string; search: string; onGo: (to: string) => void }) {
  const tint = TINTS[group.title] || TINTS.Account;
  const rows: NavLink[] = group.items;
  const nested = rows.filter((r) => r.children?.length);

  const isOn = (to: string) => {
    const [p, q] = to.split("?");
    if (p !== path) return false;
    if (!q) return true;
    const want = new URLSearchParams(q).get("tab");
    const cur = new URLSearchParams(search).get("tab") || (p === "/dashboard/products" ? "products" : "module");
    return !want || want === cur;
  };

  const list = (title: string, items: NavLink[], t: string) => (
    <div key={title}>
      <p className="mb-1.5 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">{title}</p>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7EAF0]">
        {items.map((it, i) => {
          const on = isOn(it.path);
          return (
            <button key={it.path} type="button" onClick={() => onGo(it.path)} aria-current={on ? "page" : undefined}
              className={`flex w-full items-center gap-3 px-3 py-[11px] text-left active:bg-[#F8FAFC] ${i ? "border-t border-[#F1F5F9]" : ""} ${on ? "bg-[#FFFBEB]" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t}`}><it.icon size={16} /></span>
              <span className={`flex-1 truncate text-[14px] ${on ? "font-bold text-[#B45309]" : "font-medium text-[#0F172A]"}`}>{it.label}</span>
              <ChevronRight size={16} className="shrink-0 text-[#CBD5E1]" />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {list(group.title, rows, tint)}
      {nested.map((n) => list(`${n.label} · sections`, n.children!, "bg-[#FFF7ED] text-[#C2410C]"))}
    </>
  );
}
