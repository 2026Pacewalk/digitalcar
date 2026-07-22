import { useEffect, useState, type ReactNode } from "react";
import DashboardLayout from "./DashboardLayout";
import MobileDashboardLayout from "./MobileDashboardLayout";

/* ─── Responsive Dashboard Layout
 * Desktop: Sidebar + TopBar (DashboardLayout)
 * Mobile: Native app bar + Bottom Tab Bar + FAB (MobileDashboardLayout)
 *
 * Works for customer, reseller, and admin sections — the mobile layout adapts
 * its navigation to the signed-in user's role.
 */

export default function ResponsiveDashboardLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
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
  return <DashboardLayout title={title} subtitle={subtitle}>{children}</DashboardLayout>;
}
