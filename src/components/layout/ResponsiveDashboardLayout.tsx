import { useEffect, useState, type ReactNode } from "react";
import DashboardLayout from "./DashboardLayout";
import MobileDashboardLayout from "./MobileDashboardLayout";
import { useCardHydration } from "@/hooks/useCardHydration";

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
  // First load: pull the signed-in customer's real card into local storage so
  // the dashboard shows their actual profile/products instead of a blank seed.
  const hydrated = useCardHydration();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#F7B31C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return <MobileDashboardLayout>{children}</MobileDashboardLayout>;
  }
  return <DashboardLayout title={title} subtitle={subtitle}>{children}</DashboardLayout>;
}
