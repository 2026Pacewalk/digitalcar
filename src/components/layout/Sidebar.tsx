import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { roleTheme } from "@/lib/roleTheme";
import { trpc } from "@/providers/trpc";
import {
  LayoutDashboard, Palette, Users, UserCircle, Package,
  BarChart3, MessageSquare, Settings, LogOut, ChevronLeft,
  ChevronRight, Store, X, ReceiptText,
  Info, ShoppingBag, Wallet, Image as ImageIcon, Share2, Upload, Eye, Mail,
  Star, Layers, Gift, ClipboardList, Wand2, QrCode, CreditCard, ShoppingCart, Link2, Globe,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

type NavLink = { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; path: string };
type NavGroup = { title: string; items: NavLink[] };

// Core journey first (§39), then the detailed card-section editors, then account.
const customerGroups: NavGroup[] = [
  { title: "My Card", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Edit Card", icon: Wand2, path: "/dashboard/build" },
    { label: "View Card", icon: Eye, path: "/dashboard/view" },
  ] },
  { title: "Grow", items: [
    { label: "Leads", icon: Mail, path: "/dashboard/leads" },
    { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
    { label: "QR & Share", icon: QrCode, path: "/dashboard/qr" },
    { label: "Refer & Earn", icon: Gift, path: "/dashboard/refer" },
  ] },
  { title: "Card Sections", items: [
    { label: "Templates", icon: Palette, path: "/dashboard/templates" },
    { label: "Products / Services", icon: ShoppingBag, path: "/dashboard/products?tab=products" },
    { label: "Gallery & Videos", icon: ImageIcon, path: "/dashboard/media" },
    { label: "Social Links", icon: Share2, path: "/dashboard/social" },
    { label: "Google Reviews", icon: Star, path: "/dashboard/reviews" },
    { label: "About Us", icon: Info, path: "/dashboard/about" },
    { label: "Payments", icon: Wallet, path: "/dashboard/payments" },
    { label: "Uploads", icon: Upload, path: "/dashboard/uploads" },
  ] },
  { title: "Account", items: [
    { label: "Subscription", icon: CreditCard, path: "/dashboard/subscription" },
    { label: "Billing", icon: ReceiptText, path: "/dashboard/billing" },
    { label: "Custom Domain", icon: Globe, path: "/dashboard/domain" },
    { label: "Bulk Create", icon: Layers, path: "/dashboard/bulk" },
    { label: "Profile", icon: UserCircle, path: "/dashboard/profile" },
    { label: "Settings", icon: Settings, path: "/dashboard/settings?tab=module" },
  ] },
];

const superAdminGroups: NavGroup[] = [
  { title: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  ] },
  { title: "Manage", items: [
    { label: "Resellers", icon: Store, path: "/admin/resellers" },
    { label: "Applications", icon: ClipboardList, path: "/admin/reseller-applications" },
    { label: "Customers", icon: UserCircle, path: "/admin/customers" },
    { label: "Leads", icon: MessageSquare, path: "/admin/leads" },
    { label: "Bulk Orders", icon: ShoppingCart, path: "/admin/bulk-orders" },
    { label: "AI Generator", icon: Wand2, path: "/admin/ai-generator" },
  ] },
  { title: "Catalog", items: [
    { label: "Products", icon: ShoppingBag, path: "/admin/products" },
    { label: "Packages", icon: Package, path: "/admin/packages" },
    { label: "Templates", icon: Palette, path: "/admin/templates" },
  ] },
  { title: "Growth", items: [
    { label: "Payment Orders", icon: ReceiptText, path: "/admin/payment-orders" },
    { label: "Referrals & Payouts", icon: Gift, path: "/admin/referrals" },
  ] },
  { title: "System", items: [
    { label: "URL Conflicts", icon: Link2, path: "/admin/url-conflicts" },
    { label: "Custom Domains", icon: Globe, path: "/admin/domains" },
    { label: "Settings", icon: Settings, path: "/admin/settings" },
  ] },
];

const resellerGroups: NavGroup[] = [
  { title: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/reseller" }] },
  { title: "Manage", items: [
    { label: "My Customers", icon: Users, path: "/reseller/customers" },
    { label: "Payment Orders", icon: ReceiptText, path: "/reseller/payments" },
  ] },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const role = user?.role || "customer";
  const groups = role === "super_admin" ? superAdminGroups : role === "reseller" ? resellerGroups : customerGroups;
  const theme = roleTheme(role);
  // Live count of new bulk-order requests → badge on the admin "Bulk Orders" item.
  const { data: bulkNew } = trpc.bulkOrder.newCount.useQuery(undefined, {
    enabled: role === "super_admin", retry: false, refetchInterval: 60_000,
  });
  const badgeFor = (path: string): number => (path === "/admin/bulk-orders" ? (bulkNew?.count ?? 0) : 0);
  const BrandIcon = theme.Icon;

  const isActive = (path: string) => {
    const [p, q] = path.split("?");
    if (location.pathname !== p) return false;
    if (!q) return true;
    const wantTab = new URLSearchParams(q).get("tab");
    const defaultTab = p === "/dashboard/products" ? "products" : "module";
    const curTab = new URLSearchParams(location.search).get("tab") || defaultTab;
    return curTab === wantTab;
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onMobileToggle} />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen bg-[#0F172A] z-50 transition-all duration-300 flex flex-col
          ${mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}
          lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
      >
        <button onClick={onToggle} className={`hidden lg:flex absolute -right-3 top-20 w-6 h-6 ${theme.toggleBg} rounded-full items-center justify-center z-10 shadow-md`}>
          {collapsed ? <ChevronRight size={12} className={theme.iconColor} /> : <ChevronLeft size={12} className={theme.iconColor} />}
        </button>

        <button onClick={onMobileToggle} className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-white z-10">
          <X size={16} />
        </button>

        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-[#1E293B] shrink-0">
          <div className={`w-8 h-8 rounded-lg ${theme.brandGrad} flex items-center justify-center shrink-0`}>
            <BrandIcon size={16} className={theme.iconColor} />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden flex items-center gap-1.5">
              <span className="text-sm font-bold text-white whitespace-nowrap">DigitalCarda</span>
              {theme.badge
                ? <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide whitespace-nowrap ${theme.badgeCls}`}>{theme.badge}</span>
                : <span className="text-[10px] text-[#F7B31C] font-medium">{theme.brandName}</span>}
            </div>
          )}
        </div>

        {/* Grouped Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-none">
          {groups.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? (collapsed ? "mt-2 pt-2 border-t border-[#1E293B]/70" : "mt-4") : ""}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => { if (window.innerWidth < 1024) onMobileToggle(); }}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group
                        ${active ? theme.activeNav : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"}
                        ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                    >
                      <item.icon size={17} className={`shrink-0 ${active ? theme.activeIcon : "text-[#64748B] group-hover:text-[#F8FAFC]"}`} />
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                      {badgeFor(item.path) > 0 && (
                        <span className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F7B31C] text-[#0F172A] text-[10px] font-bold flex items-center justify-center ${collapsed ? "lg:absolute lg:top-1 lg:right-1" : ""}`}>{badgeFor(item.path)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-[#1E293B]">
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-all w-full ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <LogOut size={18} className="shrink-0 text-[#64748B]" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
