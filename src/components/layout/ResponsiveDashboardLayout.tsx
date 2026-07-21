import { useEffect, useState, type ReactNode } from "react";
import DashboardLayout from "./DashboardLayout";
import MobileDashboardLayout from "./MobileDashboardLayout";

/* ─── Responsive Dashboard Layout
 * Desktop: Sidebar + TopBar (DashboardLayout)
 * Mobile: Bottom Nav + FAB + Sticky Header (MobileDashboardLayout)
 */

export default function ResponsiveDashboardLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return <MobileDashboardLayout>{children}</MobileDashboardLayout>;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}
