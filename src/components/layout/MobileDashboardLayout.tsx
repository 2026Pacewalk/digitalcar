import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Home, Palette, Users, BarChart3, User,
  Plus, Eye, Share2, CreditCard, X,
  Settings, LogOut, HelpCircle, Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/* ─── Mobile Layout Context ─── */
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

/* ─── Bottom Nav Items ─── */
const BOTTOM_NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Palette, label: "Builder", path: "/dashboard/builder" },
  { icon: Users, label: "Leads", path: "/dashboard/leads" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
];

/* ─── FAB Quick Actions ─── */
const FAB_ACTIONS = [
  { icon: Eye, label: "Preview Card", color: "bg-[#0F172A]", action: "/c/demo" },
  { icon: Share2, label: "Share Card", color: "bg-[#14B8A6]", action: "share" },
  { icon: CreditCard, label: "Change Template", color: "bg-[#8B5CF6]", action: "/dashboard/settings" },
  { icon: Plus, label: "Add Product", color: "bg-[#EC4899]", action: "#" },
];

export default function MobileDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for sticky header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const activeNav = BOTTOM_NAV_ITEMS.findIndex((item) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );

  const handleFabAction = (action: string) => {
    setFabOpen(false);
    if (action === "share") {
      if (navigator.share) { navigator.share({ title: "My Digital Card", url: window.location.origin + "/c/demo" }); }
      else { alert("Share URL copied: " + window.location.origin + "/c/demo"); }
    } else {
      navigate(action);
    }
  };

  return (
    <MobileLayoutContext.Provider value={{ openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false), isDrawerOpen: drawerOpen }}>
      <div className="min-h-screen bg-[#F8FAFC] touch-pan-y overscroll-contain md:pb-0 pb-20">

        {/* ─── Sticky Header ─── */}
        <header
          className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md transition-shadow duration-200 ${
            scrolled ? "shadow-md border-b border-[#F1F5F9]" : "border-b border-transparent"
          }`}
        >
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1F5F9] transition-colors md:hidden"
              >
                <Menu size={20} className="text-[#0F172A]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center">
                  <span className="text-[#0F172A] text-[10px] font-bold">DC</span>
                </div>
                <h1 className="text-sm font-bold text-[#0F172A]">DigitalCarda</h1>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/profile")}
              className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center shrink-0"
            >
              <span className="text-[#0F172A] text-xs font-bold">{(user?.fullName || "U").charAt(0).toUpperCase()}</span>
            </button>
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main className="max-w-lg mx-auto w-full">
          <div className="p-4 space-y-4">
            {children}
          </div>
        </main>

        {/* ─── Floating Action Button ─── */}
        <div className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col items-end gap-2">
          {/* FAB Menu */}
          {fabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-fade-in">
              {FAB_ACTIONS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleFabAction(item.action)}
                  className={`flex items-center gap-2 animate-fab-pop`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="text-[10px] font-semibold text-white bg-[#0F172A]/80 px-2 py-1 rounded-lg">{item.label}</span>
                  <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <item.icon size={16} className="text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Main FAB */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className="fab gradient-gold text-[#0F172A] animate-fab-pop"
          >
            {fabOpen ? <X size={22} /> : <Plus size={22} />}
          </button>
        </div>

        {/* ─── Bottom Navigation ─── */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#F1F5F9] md:hidden animate-bottom-nav-pop">
          <div className="flex items-center justify-around h-16 pb-safe">
            {BOTTOM_NAV_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                  activeNav === i ? "active text-[#F7B31C]" : "text-[#94A3B8]"
                }`}
              >
                <item.icon size={20} strokeWidth={activeNav === i ? 2.5 : 1.5} />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ─── Slide Drawer (Mobile Sidebar) ─── */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl animate-drawer-in flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center">
                    <span className="text-[#0F172A] text-lg font-bold">{(user?.fullName || "U").charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{user?.fullName || "User"}</p>
                    <p className="text-[10px] text-[#94A3B8]">{user?.email || ""}</p>
                  </div>
                </div>
              </div>
              {/* Drawer Menu */}
              <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                {[
                  { icon: Home, label: "Dashboard", path: "/dashboard" },
                  { icon: Palette, label: "Card Builder", path: "/dashboard/builder" },
                  { icon: User, label: "My Card", path: "/c/demo" },
                  { icon: Users, label: "Leads", path: "/dashboard/leads" },
                  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
                  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
                ].map((item, i) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={i}
                      onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <item.icon size={18} /> {item.label}
                    </button>
                  );
                })}
              </div>
              {/* Drawer Footer */}
              <div className="p-3 border-t border-[#F1F5F9] space-y-1">
                <button onClick={() => { navigate("/dashboard/settings?tab=help"); setDrawerOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-all">
                  <HelpCircle size={18} /> Help & Support
                </button>
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MobileLayoutContext.Provider>
  );
}
