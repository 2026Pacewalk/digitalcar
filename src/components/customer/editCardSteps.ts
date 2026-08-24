/*
 * The "Edit Card" journey — the ordered set of sections a customer moves through
 * to build their card. Used by the interlinked step strip + Back/Continue bar so
 * every section feels like one guided, app-like flow instead of scattered pages.
 */
import { Wand2, Palette, Share2, Info, ShoppingBag, Wallet, Images, Star, Upload, Eye } from "lucide-react";

export type EditStep = {
  key: string;
  label: string;   // full label
  short: string;   // compact label for the chip strip
  path: string;    // route (no query)
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

export const EDIT_CARD_STEPS: EditStep[] = [
  { key: "build", label: "Card Basics", short: "Basics", path: "/dashboard/build", icon: Wand2 },
  { key: "templates", label: "Templates", short: "Design", path: "/dashboard/templates", icon: Palette },
  { key: "social", label: "Social Links", short: "Social", path: "/dashboard/social", icon: Share2 },
  { key: "about", label: "About Us", short: "About", path: "/dashboard/about", icon: Info },
  { key: "products", label: "Products / Services", short: "Products", path: "/dashboard/products", icon: ShoppingBag },
  { key: "payments", label: "Payments", short: "Payments", path: "/dashboard/payments", icon: Wallet },
  { key: "media", label: "Gallery & Videos", short: "Gallery", path: "/dashboard/media", icon: Images },
  { key: "reviews", label: "Google Reviews", short: "Reviews", path: "/dashboard/reviews", icon: Star },
  { key: "uploads", label: "Uploads", short: "Uploads", path: "/dashboard/uploads", icon: Upload },
  { key: "view", label: "View Card", short: "View", path: "/dashboard/view", icon: Eye },
];

/** Index of the step matching a pathname, or -1 when the route isn't part of the journey. */
export function currentStepIndex(pathname: string): number {
  return EDIT_CARD_STEPS.findIndex((s) => pathname === s.path || pathname.startsWith(s.path + "/"));
}
