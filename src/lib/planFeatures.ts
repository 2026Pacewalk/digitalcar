/* Single source of truth for the per-plan feature bullets shown on BOTH the
   public /pricing page and the dashboard Subscription module, so the two never
   drift apart. Built from the live subscription_packages row (limits + flags). */

export type PlanPkg = {
  name: string;
  description?: string | null;
  monthlyPrice: string | number;
  yearlyPrice: string | number;
  maxCards: number;
  maxProducts: number;
  maxGalleryImages: number;
  maxVideos: number;
  featureCustomDomain?: boolean;
  featureSEO?: boolean;
  featureAnalytics?: boolean;
  featureLeadCapture?: boolean;
  featureRemoveBranding?: boolean;
  featureWhiteLabel?: boolean;
  featurePrioritySupport?: boolean;
  featureAI?: boolean;
  featureMultilingual?: boolean;
  featureCRM?: boolean;
};

export const num = (v: unknown) => Number(v ?? 0);

/** True when a package is the free 30-day trial (no monthly/yearly price). */
export const isFreePlan = (p: PlanPkg) => num(p.monthlyPrice) === 0 && num(p.yearlyPrice) === 0;

/** A plan's tier rank for ordering (higher price = higher tier). Used to hide
    downgrades — a Platinum member is never offered Gold/Trial. */
export const planRank = (p: PlanPkg) => num(p.yearlyPrice) || num(p.monthlyPrice);

const TRIAL_FEATURES = [
  "Your live digital card in minutes",
  "All premium features unlocked",
  "Custom QR code + shareable link",
  "Call, WhatsApp & Save-Contact buttons",
  "No credit card required",
];

/** Feature bullets for a PAID plan, derived from its limits + flags. */
export function planBullets(p: PlanPkg): string[] {
  const b: string[] = [];
  const cards = p.maxCards ?? 1;
  b.push(cards <= 1 ? "1 digital card + personal link & QR" : `Up to ${cards} digital cards`);
  b.push(num(p.maxProducts) >= 9999 ? "Unlimited products & services" : `Up to ${p.maxProducts} products / services`);
  b.push(`${p.maxGalleryImages}-photo gallery + ${p.maxVideos} videos`);
  if (p.featureLeadCapture) b.push("Enquiry form — capture every lead");
  b.push("Google reviews + payment links");
  b.push("All 31 designs + link-in-bio styles");
  b.push(p.featureCustomDomain ? "Advanced analytics + export" : "Visit & tap analytics");
  // Custom domain is a paid add-on (free on Platinum 3-year), surfaced on its own
  // highlighted row — not a plain feature bullet here.
  if (p.featureRemoveBranding) b.push("Remove DigitalCarda branding");
  if (p.featureAI) b.push("AI writes your card content");
  if (p.featureMultilingual) b.push("Multi-language card");
  if (p.featureSEO) b.push("Full SEO controls");
  if (p.featureWhiteLabel) b.push("White-label reseller panel");
  if (p.featurePrioritySupport) b.push("Priority support");
  return b;
}

/** The complete feature list for any plan (trial or paid). */
export function planFeatures(p: PlanPkg): string[] {
  return isFreePlan(p) ? TRIAL_FEATURES : planBullets(p);
}
