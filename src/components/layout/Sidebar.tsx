import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CreditCard, Palette, Users, UserCircle, Package,
  BarChart3, MessageSquare, Settings, LogOut, ChevronLeft,
  ChevronRight, Store, X, Search, ToggleRight, ReceiptText, KeyRound,
  Home as HomeIcon, Info, ShoppingBag, Wallet, Image as ImageIcon, Share2, Upload, Eye, Mail,
  Tag, QrCode, Star, Layers, Gift,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

type NavLink = { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; path: string };
type NavGroup = { title: string; items: NavLink[] };

const customerGroups: NavGroup[] = [
  { title: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "View Card", icon: Eye, path: "/dashboard/view" },
  ] },
  { title: "My Card", items: [
    { label: "Profile", icon: HomeIcon, path: "/dashboard/home" },
    { label: "Templates", icon: Palette, path: "/dashboard/templates" },
    { label: "About Us", icon: Info, path: "/dashboard/about" },
    { label: "Products / Services", icon: ShoppingBag, path: "/dashboard/products?tab=products" },
    { label: "Payments", icon: Wallet, path: "/dashboard/payments" },
    { label: "Gallery (Images / Videos)", icon: ImageIcon, path: "/dashboard/media" },
    { label: "Social Links", icon: Share2, path: "/dashboard/social" },
    { label: "Google Reviews", icon: Star, path: "/dashboard/reviews" },
    { label: "Uploads", icon: Upload, path: "/dashboard/uploads" },
  ] },
  { title: "Engage", items: [
    { label: "Enquiries", icon: Mail, path: "/dashboard/enquiry" },
    { label: "Bulk Create", icon: Layers, path: "/dashboard/bulk" },
    { label: "Refer & Earn", icon: Gift, path: "/dashboard/refer" },
  ] },
  { title: "Settings", items: [
    { label: "Modules", icon: ToggleRight, path: "/dashboard/settings?tab=module" },
    { label: "SEO", icon: Search, path: "/dashboard/settings?tab=seo" },
    { label: "Package", icon: Package, path: "/dashboard/settings?tab=package" },
    { label: "Invoice", icon: ReceiptText, path: "/dashboard/settings?tab=invoice" },
    { label: "Password", icon: KeyRound, path: "/dashboard/settings?tab=password" },
  ] },
];

const superAdminGroups: NavGroup[] = [
  { title: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  ] },
  { title: "Manage", items: [
    { label: "Resellers", icon: Store, path: "/admin/resellers" },
    { label: "Customers", icon: UserCircle, path: "/admin/customers" },
    { label: "Leads", icon: MessageSquare, path: "/admin/leads" },
  ] },
  { title: "Catalog", items: [
    { label: "Packages", icon: Package, path: "/admin/packages" },
    { label: "Templates", icon: Palette, path: "/admin/templates" },
  ] },
  { title: "Growth", items: [
    { label: "Payments", icon: Wallet, path: "/admin/payments" },
    { label: "Referrals & Payouts", icon: Gift, path: "/admin/referrals" },
  ] },
  { title: "System", items: [
    { label: "Settings", icon: Settings, path: "/admin/settings" },
  ] },
];

const resellerGroups: NavGroup[] = [
  { title: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/reseller" }] },
  { title: "Manage", items: [{ label: "My Customers", icon: Users, path: "/reseller/customers" }] },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const role = user?.role || "customer";
  const groups = role === "super_admin" ? superAdminGroups : role === "reseller" ? resellerGroups : customerGroups;
  const brandName = role === "super_admin" ? "Admin" : role === "reseller" ? "Reseller" : "Dashboard";

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
        <button onClick={onToggle} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#F7B31C] rounded-full items-center justify-center z-10 shadow-md">
          {collapsed ? <ChevronRight size={12} className="text-[#0F172A]" /> : <ChevronLeft size={12} className="text-[#0F172A]" />}
        </button>

        <button onClick={onMobileToggle} className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-white z-10">
          <X size={16} />
        </button>

        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-[#1E293B] shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-[#0F172A]" />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <span className="text-sm font-bold text-white whitespace-nowrap">DigitalCarda</span>
              <span className="text-[10px] text-[#F7B31C] ml-1.5 font-medium">{brandName}</span>
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group
                        ${active ? "bg-[#F7B31C]/10 text-[#F7B31C] border-l-2 border-[#F7B31C]" : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"}
                        ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                    >
                      <item.icon size={17} className={`shrink-0 ${active ? "text-[#F7B31C]" : "text-[#64748B] group-hover:text-[#F8FAFC]"}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
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
