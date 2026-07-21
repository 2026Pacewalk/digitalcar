import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { SidebarContext } from "./SidebarContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMenu = () => setMobileOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ toggleMenu }}>
      <div className="min-h-screen bg-[#F8FAFC]">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileToggle={toggleMenu}
        />
        <main className={`transition-all duration-300 min-h-screen ${collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}`}>
          {title && <TopBar title={title} subtitle={subtitle} />}
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
