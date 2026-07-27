import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "./SidebarContext";
import { Menu, Search, Settings, LogOut, User, Lock, Activity, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router";
import NotificationBell from "@/components/NotificationBell";
import CardSwitcher from "@/components/customer/CardSwitcher";
import { roleTheme } from "@/lib/roleTheme";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { toggleMenu } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const theme = roleTheme(user?.role);

  return (
    <header className={`sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#F1F5F9] ${theme.badge ? "border-t-2 " + theme.topAccent : ""}`}>
      <div className="h-14 flex items-center px-3 lg:px-5">
        {/* Menu Button */}
        <button
          onClick={toggleMenu}
          className="w-9 h-9 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all cursor-pointer mr-2 shrink-0"
          type="button"
        >
          <Menu size={18} />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#0F172A] truncate">{title}</h1>
            {theme.badge && (
              <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide ${theme.badgeCls}`}>{theme.badge}</span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#64748B] truncate">{subtitle}</p>}
        </div>

        {/* Multi-card switcher (customers) */}
        {(user as unknown as { role?: string })?.role === "customer" && (
          <div className="shrink-0 mr-2"><CardSwitcher /></div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <div className="relative hidden sm:block">
            {searchOpen ? (
              <div className="flex items-center bg-[#F1F5F9] rounded-lg px-3 h-9 w-52">
                <Search size={14} className="text-[#94A3B8] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder:text-[#94A3B8]"
                />
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all"
              >
                <Search size={16} />
              </button>
            )}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <div className="relative ml-1 pl-2 border-l border-[#F1F5F9]">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg hover:bg-[#F8FAFC] px-2 py-1.5 transition-all"
            >
              <div className={`w-8 h-8 rounded-full ${theme.brandGrad} flex items-center justify-center shrink-0`}>
                <span className={`${theme.iconColor} text-xs font-bold`}>{(user?.fullName || "U").charAt(0).toUpperCase()}</span>
              </div>
              <span className="hidden lg:block text-xs font-medium text-[#0F172A]">{user?.fullName || "User"}</span>
              <ChevronDown size={14} className="hidden lg:block text-[#94A3B8]" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-premium-lg border border-[#F1F5F9] p-2 z-20">
                  {/* User Info */}
                  <div className="px-3 py-3 border-b border-[#F1F5F9]">
                    <p className="text-sm font-semibold text-[#0F172A]">{user?.fullName || "User"}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{user?.email || ""}</p>
                    <span className="inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold capitalize">{(user as any)?.role || "customer"}</span>
                  </div>
                  {/* Menu Items */}
                  <div className="py-1">
                    {[
                      { icon: User, label: "My Profile", action: () => { setProfileOpen(false); navigate(`/${(user as any)?.role === "admin" ? "admin" : (user as any)?.role === "reseller" ? "reseller" : "dashboard"}/profile`); } },
                      { icon: Settings, label: "Account Settings", action: () => { setProfileOpen(false); navigate(`/${(user as any)?.role === "admin" ? "admin" : (user as any)?.role === "reseller" ? "reseller" : "dashboard"}/settings`); } },
                      { icon: Lock, label: "Change Password", action: () => { setProfileOpen(false); navigate(`/${(user as any)?.role === "admin" ? "admin" : (user as any)?.role === "reseller" ? "reseller" : "dashboard"}/profile?tab=security`); } },
                      { icon: Activity, label: "Login Activity", action: () => { setProfileOpen(false); navigate(`/${(user as any)?.role === "admin" ? "admin" : (user as any)?.role === "reseller" ? "reseller" : "dashboard"}/profile?tab=activity`); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all text-left"
                      >
                        <item.icon size={15} /> {item.label}
                      </button>
                    ))}
                  </div>
                  {/* Logout */}
                  <div className="border-t border-[#F1F5F9] pt-1">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all text-left"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
