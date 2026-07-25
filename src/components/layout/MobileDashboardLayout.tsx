import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Home, Palette, Users, BarChart3, User, LayoutDashboard, Store, UserCircle, Package, ClipboardList,
  Plus, Eye, Share2, CreditCard, Menu, MessageSquare,
  Settings, LogOut, HelpCircle, ChevronLeft,
  Info, ShoppingBag, Wallet, Image as ImageIcon, Star, Upload, Mail, Layers,
  ToggleRight, Search, ReceiptText, KeyRound, Gift,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProfileMenu from "@/components/ProfileMenu";
import NotificationBell from "@/components/NotificationBell";

/* ─── Mobile Layout Context (drawer) ─── */
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

type NavItem = { icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; label: string; path: string };
type NavGroup = { title: string; items: NavItem[] };
interface NavConfig { tabs: NavItem[]; drawer: NavGroup[]; roots: string[]; profile: string; settings?: string; bell: string; fab: boolean }

/* ─── Per-role navigation (mirrors the desktop Sidebar) ─── */
const NAV: Record<string, NavConfig> = {
  super_admin: {
    profile: "/admin/profile",
    settings: "/admin/settings",
    bell: "/admin/leads",
    fab: false,
    roots: ["/admin"],
    tabs: [
      { icon: LayoutDashboard, label: "Home", path: "/admin" },
      { icon: Store, label: "Resellers", path: "/admin/resellers" },
      { icon: UserCircle, label: "Customers", path: "/admin/customers" },
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    ],
    drawer: [
      { title: "Overview", items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
        { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      ] },
      { title: "Manage", items: [
        { icon: Store, label: "Resellers", path: "/admin/resellers" },
        { icon: ClipboardList, label: "Applications", path: "/admin/reseller-applications" },
        { icon: UserCircle, label: "Customers", path: "/admin/customers" },
        { icon: MessageSquare, label: "Leads", path: "/admin/leads" },
      ] },
      { title: "Catalog", items: [
        { icon: Package, label: "Packages", path: "/admin/packages" },
        { icon: Palette, label: "Templates", path: "/admin/templates" },
      ] },
      { title: "Growth", items: [
        { icon: Wallet, label: "Payments", path: "/admin/payments" },
        { icon: Gift, label: "Referrals & Payouts", path: "/admin/referrals" },
      ] },
      { title: "System", items: [
        { icon: Settings, label: "Settings", path: "/admin/settings" },
      ] },
    ],
  },
  reseller: {
    profile: "/reseller/profile",
    bell: "/reseller",
    fab: false,
    roots: ["/reseller"],
    tabs: [
      { icon: LayoutDashboard, label: "Home", path: "/reseller" },
      { icon: Users, label: "Customers", path: "/reseller/customers" },
      { icon: User, label: "Profile", path: "/reseller/profile" },
    ],
    drawer: [
      { title: "Overview", items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/reseller" }] },
      { title: "Manage", items: [
        { icon: Users, label: "My Customers", path: "/reseller/customers" },
        { icon: User, label: "Profile", path: "/reseller/profile" },
      ] },
    ],
  },
  customer: {
    profile: "/dashboard/profile",
    settings: "/dashboard/settings",
    bell: "/dashboard/enquiry",
    fab: true,
    roots: ["/dashboard", "/dashboard/home"],
    tabs: [
      { icon: Home, label: "Home", path: "/dashboard/home" },
      { icon: Palette, label: "Builder", path: "/dashboard/builder" },
      { icon: CreditCard, label: "Cards", path: "/dashboard/cards" },
      { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
      { icon: User, label: "Profile", path: "/dashboard/profile" },
    ],
    drawer: [
      { title: "Overview", items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: Eye, label: "View Card", path: "/dashboard/view" },
      ] },
      { title: "My Card", items: [
        { icon: Home, label: "Profile", path: "/dashboard/home" },
        { icon: Palette, label: "Templates", path: "/dashboard/templates" },
        { icon: Info, label: "About Us", path: "/dashboard/about" },
        { icon: ShoppingBag, label: "Products / Services", path: "/dashboard/products?tab=products" },
        { icon: Wallet, label: "Payments", path: "/dashboard/payments" },
        { icon: ImageIcon, label: "Gallery (Images / Videos)", path: "/dashboard/media" },
        { icon: Share2, label: "Social Links", path: "/dashboard/social" },
        { icon: Star, label: "Google Reviews", path: "/dashboard/reviews" },
        { icon: Upload, label: "Uploads", path: "/dashboard/uploads" },
      ] },
      { title: "Engage", items: [
        { icon: Mail, label: "Enquiries", path: "/dashboard/enquiry" },
        { icon: Layers, label: "Bulk Create", path: "/dashboard/bulk" },
        { icon: Gift, label: "Refer & Earn", path: "/dashboard/refer" },
      ] },
      { title: "Settings", items: [
        { icon: ToggleRight, label: "Modules", path: "/dashboard/settings?tab=module" },
        { icon: Search, label: "SEO", path: "/dashboard/settings?tab=seo" },
        { icon: Package, label: "Package", path: "/dashboard/settings?tab=package" },
        { icon: ReceiptText, label: "Invoice", path: "/dashboard/settings?tab=invoice" },
        { icon: KeyRound, label: "Password", path: "/dashboard/settings?tab=password" },
      ] },
    ],
  },
};

/* ─── Route → title map (all sections) ─── */
const ROUTE_TITLES: Record<string, string> = {
  // Customer
  "/dashboard": "Dashboard",
  "/dashboard/home": "Home",
  "/dashboard/about": "About Us",
  "/dashboard/products": "Products / Services",
  "/dashboard/offers": "Offers & Deals",
  "/dashboard/payments": "Payments",
  "/dashboard/qrcode": "QR Code",
  "/dashboard/qr": "QR Codes",
  "/dashboard/media": "Gallery",
  "/dashboard/social": "Social Links",
  "/dashboard/reviews": "Google Reviews",
  "/dashboard/uploads": "Uploads",
  "/dashboard/settings": "Settings",
  "/dashboard/view": "My Card",
  "/dashboard/enquiry": "Enquiries",
  "/dashboard/builder": "Card Builder",
  "/dashboard/leads": "Leads",
  "/dashboard/analytics": "Analytics",
  "/dashboard/profile": "Profile",
  "/dashboard/cards": "My Cards",
  "/dashboard/bulk": "Bulk Create",
  "/dashboard/refer": "Refer & Earn",
  "/dashboard/templates": "Templates",
  "/dashboard/subscription": "Subscription",
  "/dashboard/ai": "AI Tools",
  // Admin
  "/admin": "Dashboard",
  "/admin/resellers": "Resellers",
  "/admin/reseller-applications": "Reseller Applications",
  "/admin/customers": "Customers",
  "/admin/packages": "Packages",
  "/admin/templates": "Templates",
  "/admin/migration": "Migration",
  "/admin/analytics": "Analytics",
  "/admin/leads": "Leads",
  "/admin/referrals": "Referrals & Payouts",
  "/admin/payments": "Payments",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
  // Reseller
  "/reseller": "Dashboard",
  "/reseller/customers": "My Customers",
  "/reseller/profile": "Profile",
};

const FAB_ACTIONS = [
  { icon: Eye, label: "Preview Card", color: "bg-[#0F172A]", action: "/dashboard/view" },
  { icon: Share2, label: "Share Card", color: "bg-[#14B8A6]", action: "share" },
  { icon: CreditCard, label: "My Cards", color: "bg-[#8B5CF6]", action: "/dashboard/cards" },
  { icon: Plus, label: "Bulk Create", color: "bg-[#EC4899]", action: "/dashboard/bulk" },
];

export default function MobileDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);

  const role = user?.role || "customer";
  const cfg = NAV[role] || NAV.customer;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Active tab = the tab with the longest matching path prefix.
  let activeNav = -1, activeLen = -1;
  cfg.tabs.forEach((item, i) => {
    const match = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    if (match && item.path.length > activeLen) { activeNav = i; activeLen = item.path.length; }
  });

  const rootPaths = new Set([...cfg.tabs.map((t) => t.path), ...cfg.roots]);
  const isRoot = rootPaths.has(location.pathname);
  let title = pageTitle || ROUTE_TITLES[location.pathname] || "DigitalCarda";
  if (location.pathname === "/dashboard/products") {
    title = new URLSearchParams(location.search).get("tab") === "offers" ? "Offers / Deals" : "Products / Services";
  }

  const handleFabAction = (action: string) => {
    setFabOpen(false);
    if (action === "share") {
      const url = window.location.origin + "/dashboard/view";
      if (navigator.share) navigator.share({ title: "My Digital Card", url });
      else navigator.clipboard?.writeText(url);
    } else {
      navigate(action);
    }
  };

  return (
    <MobileLayoutContext.Provider value={{ openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false), isDrawerOpen: drawerOpen }}>
      <MobileChromeContext.Provider value={{ setTitle: setPageTitle, setAction: setHeaderAction }}>
        <div className={`min-h-screen bg-[#F8FAFC] touch-pan-y overscroll-contain ${cfg.tabs.length ? "pb-24" : "pb-6"}`}>

          {/* ─── Native App Bar ─── */}
          <header
            className={`sticky top-0 z-40 bg-white/90 backdrop-blur-xl pt-safe transition-shadow duration-200 ${
              scrolled ? "shadow-[0_1px_0_0_#E2E8F0,0_4px_16px_-8px_rgba(15,23,42,0.15)]" : "border-b border-[#F1F5F9]"
            }`}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center h-14 px-2">
              <div className="flex items-center justify-start">
                {isRoot ? (
                  <button onClick={() => setDrawerOpen(true)} aria-label="Menu" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[#F1F5F9] transition-colors">
                    <Menu size={22} className="text-[#0F172A]" />
                  </button>
                ) : (
                  <button onClick={() => navigate(-1)} aria-label="Back" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[#F1F5F9] transition-colors">
                    <ChevronLeft size={26} className="text-[#0F172A]" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center min-w-0 px-1">
                <h1 className="text-[17px] font-bold text-[#0F172A] tracking-tight truncate max-w-[58vw]">{title}</h1>
              </div>

              <div className="flex items-center justify-end gap-0.5">
                {headerAction && (
                  <span className="flex items-center mr-0.5 [&_a]:!h-8 [&_a]:!px-3 [&_a]:!text-[12px] [&_a]:!rounded-lg [&_a]:!gap-1 [&_a]:!whitespace-nowrap [&_button]:!h-8 [&_button]:!px-3 [&_button]:!text-[12px] [&_button]:!font-semibold [&_button]:!rounded-lg [&_button]:!gap-1 [&_button]:!whitespace-nowrap [&_svg]:!w-3.5 [&_svg]:!h-3.5">
                    {headerAction}
                  </span>
                )}
                <NotificationBell />
                <ProfileMenu />
              </div>
            </div>
          </header>

          {/* ─── Main Content ─── */}
          <main className="max-w-lg mx-auto w-full">{children}</main>

          {/* ─── Floating Action Button (customer only) ─── */}
          {cfg.fab && (
            <div className="fixed bottom-[86px] right-4 z-40 flex flex-col items-end gap-2">
              {fabOpen && (
                <>
                  <div className="fixed inset-0 -z-10" onClick={() => setFabOpen(false)} />
                  <div className="flex flex-col items-end gap-2.5 mb-1">
                    {FAB_ACTIONS.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleFabAction(item.action)}
                        className="flex items-center gap-2.5 animate-fab-pop"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <span className="text-[11px] font-semibold text-white bg-[#0F172A]/85 px-2.5 py-1.5 rounded-lg shadow-lg">{item.label}</span>
                        <div className={`w-11 h-11 ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                          <item.icon size={17} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => setFabOpen(!fabOpen)} className="fab gradient-gold text-[#0F172A]" aria-label="Quick actions">
                <span className={`transition-transform duration-300 ${fabOpen ? "rotate-45" : ""}`}><Plus size={24} /></span>
              </button>
            </div>
          )}

          {/* ─── Bottom Tab Bar ─── */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-xl border-t border-[#F1F5F9]">
            <div className="flex items-stretch justify-around h-16 px-1">
              {cfg.tabs.map((item, i) => {
                const active = activeNav === i;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(item.path)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 pt-1.5 active:scale-95 transition-transform"
                    aria-label={item.label}
                  >
                    <span className={`flex items-center justify-center h-8 w-14 rounded-full transition-colors ${active ? "bg-[#FEF3C7]" : ""}`}>
                      <item.icon size={21} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-[#D97706]" : "text-[#94A3B8]"} />
                    </span>
                    <span className={`text-[10px] font-semibold leading-none ${active ? "text-[#B45309]" : "text-[#94A3B8]"}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="h-safe-bottom" />
          </nav>

          {/* ─── Slide Drawer ─── */}
          {drawerOpen && (
            <div className="fixed inset-0 z-[100]">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-[284px] bg-white shadow-2xl animate-drawer-in flex flex-col pt-safe">
                <div className="p-5 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center">
                      <span className="text-[#0F172A] text-lg font-bold">{(user?.fullName || "U").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{user?.fullName || "User"}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate capitalize">{role.replace("_", " ")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto">
                  {cfg.drawer.map((group, gi) => (
                    <div key={group.title} className={gi > 0 ? "mt-4" : ""}>
                      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{group.title}</p>
                      <div className="space-y-0.5">
                        {group.items.map((item, i) => {
                          const [p, q] = item.path.split("?");
                          const defaultTab = p === "/dashboard/products" ? "products" : "module";
                          const curTab = new URLSearchParams(location.search).get("tab") || defaultTab;
                          const wantTab = q ? new URLSearchParams(q).get("tab") : null;
                          const isActive = location.pathname === p && (!wantTab || wantTab === curTab);
                          return (
                            <button
                              key={i}
                              onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                                isActive ? "bg-[#0F172A] text-white" : "text-[#64748B] active:bg-[#F1F5F9]"
                              }`}
                            >
                              <item.icon size={17} /> {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-[#F1F5F9] space-y-1 pb-safe">
                  <button onClick={() => { navigate(cfg.profile); setDrawerOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#64748B] active:bg-[#F1F5F9] transition-all">
                    <HelpCircle size={18} /> Help & Support
                  </button>
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 active:bg-red-50 transition-all">
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </MobileChromeContext.Provider>
    </MobileLayoutContext.Provider>
  );
}
