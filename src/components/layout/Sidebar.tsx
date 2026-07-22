import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CreditCard, Palette, Users, UserCircle, Package,
  BarChart3, MessageSquare, Settings, LogOut, ChevronLeft,
  ChevronRight, Store, X,
  Home as HomeIcon, Info, ShoppingBag, Wallet, Image as ImageIcon, Share2, Upload, Eye, Mail,
  Tag, QrCode, Star,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

const superAdminNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Resellers", icon: Store, path: "/admin/resellers" },
  { label: "Customers", icon: UserCircle, path: "/admin/customers" },
  { label: "Packages", icon: Package, path: "/admin/packages" },
  { label: "Templates", icon: Palette, path: "/admin/templates" },
  { label: "Cards", icon: CreditCard, path: "/admin/cards" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Leads", icon: MessageSquare, path: "/admin/leads" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const customerNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Home", icon: HomeIcon, path: "/dashboard/home" },
  { label: "About Us", icon: Info, path: "/dashboard/about" },
  { label: "Products", icon: ShoppingBag, path: "/dashboard/products" },
  { label: "Offers / Deals", icon: Tag, path: "/dashboard/offers" },
  { label: "Payments", icon: Wallet, path: "/dashboard/payments" },
  { label: "QR Code", icon: QrCode, path: "/dashboard/qrcode" },
  { label: "Media", icon: ImageIcon, path: "/dashboard/media" },
  { label: "Social", icon: Share2, path: "/dashboard/social" },
  { label: "Google Reviews", icon: Star, path: "/dashboard/reviews" },
  { label: "Uploads", icon: Upload, path: "/dashboard/uploads" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
  { label: "View Card", icon: Eye, path: "/dashboard/view" },
  { label: "Enquiry", icon: Mail, path: "/dashboard/enquiry" },
];

const resellerNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/reseller" },
  { label: "My Customers", icon: Users, path: "/reseller/customers" },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const role = user?.role || "customer";
  const navItems = role === "super_admin" ? superAdminNav : role === "reseller" ? resellerNav : customerNav;
  const brandName = role === "super_admin" ? "Admin" : role === "reseller" ? "Reseller" : "Dashboard";

  return (
    <>
      {/* ─── Mobile Overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#0F172A] z-50 transition-all duration-300 flex flex-col
          ${mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}
          lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
      >
        {/* Collapse toggle (desktop) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#F7B31C] rounded-full items-center justify-center z-10 shadow-md"
        >
          {collapsed ? <ChevronRight size={12} className="text-[#0F172A]" /> : <ChevronLeft size={12} className="text-[#0F172A]" />}
        </button>

        {/* Close button (mobile) */}
        <button
          onClick={onMobileToggle}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-white z-10"
        >
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 1024) onMobileToggle(); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${isActive
                    ? "bg-[#F7B31C]/10 text-[#F7B31C] border-l-2 border-[#F7B31C]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
                  }
                  ${collapsed ? "lg:justify-center lg:px-2" : ""}
                `}
              >
                <item.icon size={18} className={`shrink-0 ${isActive ? "text-[#F7B31C]" : "text-[#64748B] group-hover:text-[#F8FAFC]"}`} />
                {(!collapsed) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-[#1E293B] space-y-1">
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-all w-full
              ${collapsed ? "lg:justify-center lg:px-2" : ""}
            `}
          >
            <LogOut size={18} className="shrink-0 text-[#64748B]" />
            {(!collapsed) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
