/* DigitalCarda design tokens — the same gold and navy as the website, tuned
   for phone screens in light and dark. Components read these through
   useTheme(); nothing hard-codes a colour. */

export const brand = {
  gold: "#F7B31C",
  goldDeep: "#D97706",
  navy: "#0F172A",
  whatsapp: "#25D366",
} as const;

export type Palette = {
  ground: string;       // screen background
  surface: string;      // cards, sheets, inputs
  surfaceAlt: string;   // pressed rows, subtle fills
  ink: string;          // primary text
  ink2: string;         // secondary text
  muted: string;        // captions, placeholders
  rule: string;         // hairlines, borders
  accent: string;       // gold — primary actions
  accentInk: string;    // text on accent
  accentText: string;   // gold used as text (contrast-safe)
  accentWash: string;   // selected tab, soft highlights
  hero: string;         // the navy card-at-a-glance panel
  heroInk: string;
  heroMuted: string;
  good: string; goodWash: string;
  warn: string; warnWash: string;
  bad: string; badWash: string;
  info: string; infoWash: string;
  tabBar: string;
};

export const light: Palette = {
  ground: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F5",
  ink: "#0F172A",
  ink2: "#334155",
  muted: "#64748B",
  rule: "#E3E7EE",
  accent: brand.gold,
  accentInk: "#0F172A",
  accentText: "#9A5B06",
  accentWash: "#FEF3C7",
  hero: "#0F172A",
  heroInk: "#FFFFFF",
  heroMuted: "#94A3B8",
  good: "#15803D", goodWash: "#DCFCE7",
  warn: "#B45309", warnWash: "#FEF3C7",
  bad: "#B91C1C", badWash: "#FEE2E2",
  info: "#1D4ED8", infoWash: "#DBEAFE",
  tabBar: "#FFFFFF",
};

export const dark: Palette = {
  ground: "#0A1020",
  surface: "#111A2E",
  surfaceAlt: "#18233A",
  ink: "#E7ECF4",
  ink2: "#C3CCDA",
  muted: "#8F9BB0",
  rule: "#223048",
  accent: brand.gold,
  accentInk: "#0F172A",
  accentText: "#FBC54A",
  accentWash: "rgba(247,179,28,0.14)",
  hero: "#16223B",
  heroInk: "#FFFFFF",
  heroMuted: "#9AA7BC",
  good: "#4ADE80", goodWash: "rgba(74,222,128,0.12)",
  warn: "#FBC54A", warnWash: "rgba(251,197,74,0.12)",
  bad: "#F87171", badWash: "rgba(248,113,113,0.13)",
  info: "#93C5FD", infoWash: "rgba(147,197,253,0.13)",
  tabBar: "#0E1628",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

// Loaded in the root layout; system fonts are used until they're ready.
export const fonts = {
  display: "PlusJakartaSans_800ExtraBold",
  heading: "PlusJakartaSans_700Bold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const;
