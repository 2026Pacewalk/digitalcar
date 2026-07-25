import { Shield, Store, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* Per-role visual identity for the dashboard shell, so the admin console can
   never be mistaken for a customer/reseller dashboard when you're logged into
   more than one. Class strings are kept as literals so Tailwind's JIT keeps
   them. Customer = gold (unchanged), Admin = red, Reseller = emerald. */
export interface RoleTheme {
  brandName: string;   // sidebar sub-label
  badge: string | null; // header/sidebar badge text; null = customer (no badge)
  Icon: LucideIcon;    // brand icon
  iconColor: string;   // brand/avatar glyph colour on the accent gradient
  brandGrad: string;   // brand icon + avatar background
  toggleBg: string;    // sidebar collapse toggle background
  activeNav: string;   // active nav item classes
  activeIcon: string;  // active nav icon colour
  badgeCls: string;    // badge pill classes
  topAccent: string;   // header top-border accent colour
}

const CUSTOMER: RoleTheme = {
  brandName: "Dashboard",
  badge: null,
  Icon: CreditCard,
  iconColor: "text-[#0F172A]",
  brandGrad: "gradient-gold",
  toggleBg: "bg-[#F7B31C]",
  activeNav: "bg-[#F7B31C]/10 text-[#F7B31C] border-l-2 border-[#F7B31C]",
  activeIcon: "text-[#F7B31C]",
  badgeCls: "bg-[#FEF3C7] text-[#92400E]",
  topAccent: "border-[#F7B31C]",
};

const ADMIN: RoleTheme = {
  brandName: "Admin Console",
  badge: "ADMIN",
  Icon: Shield,
  iconColor: "text-white",
  brandGrad: "bg-gradient-to-br from-[#F43F5E] to-[#BE123C]",
  toggleBg: "bg-[#F43F5E]",
  activeNav: "bg-[#F43F5E]/12 text-[#FB7185] border-l-2 border-[#F43F5E]",
  activeIcon: "text-[#FB7185]",
  badgeCls: "bg-[#F43F5E] text-white",
  topAccent: "border-[#F43F5E]",
};

const RESELLER: RoleTheme = {
  brandName: "Reseller",
  badge: "RESELLER",
  Icon: Store,
  iconColor: "text-white",
  brandGrad: "bg-gradient-to-br from-[#10B981] to-[#047857]",
  toggleBg: "bg-[#10B981]",
  activeNav: "bg-[#10B981]/12 text-[#34D399] border-l-2 border-[#10B981]",
  activeIcon: "text-[#34D399]",
  badgeCls: "bg-[#10B981] text-white",
  topAccent: "border-[#10B981]",
};

export function roleTheme(role?: string): RoleTheme {
  if (role === "super_admin") return ADMIN;
  if (role === "reseller") return RESELLER;
  return CUSTOMER;
}
