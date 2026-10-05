import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import MobileDashboardLayout from "./MobileDashboardLayout";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import { useCardHydration, useFirstLoadFailed } from "@/hooks/useCardHydration";
import { useAutoPublish } from "@/hooks/useAutoPublish";
import { LOAD_FAILED } from "@/lib/snapshotSync";

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
  // That load failed and this browser has never held the card: what the pages
  // below show is a blank one, and nothing typed into it is saved.
  const loadFailed = useFirstLoadFailed();
  // Keep a live card's public page in sync as the owner edits (auto-publish).
  useAutoPublish();

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

  // Said on every page, above its content, until a load goes through.
  const notice = loadFailed && (
    <div className="px-4 pt-3 sm:px-6 sm:pt-6 mx-auto w-full max-w-[1360px]">
      <div role="alert" className="flex items-center gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
        <AlertTriangle size={18} className="text-[#DC2626] shrink-0" />
        <p className="flex-1 min-w-0 text-[13px] font-semibold text-[#991B1B]">{LOAD_FAILED}</p>
        <button type="button" onClick={() => window.location.reload()} className="h-9 px-3.5 rounded-xl bg-[#991B1B] text-white text-[12px] font-semibold shrink-0 hover:bg-[#7F1D1D] transition-colors">Reload</button>
      </div>
    </div>
  );

  if (isMobile) {
    return <MobileDashboardLayout>{notice}{children}<AnnouncementPopup audience="dashboard" /></MobileDashboardLayout>;
  }
  return <DashboardLayout title={title} subtitle={subtitle}>{notice}{children}<AnnouncementPopup audience="dashboard" /></DashboardLayout>;
}
