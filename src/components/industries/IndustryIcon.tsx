/* Icon maps for the industry pages: the lucide icon behind each
   IndustryIconKey (hub tiles, eyebrow pills, breadcrumbs) and each
   Feature["icon"] (use-case table, pain rows, bento tiles). Both records are
   exhaustive, so a data file can only name an icon that exists here. */
import type { LucideIcon } from "lucide-react";
import {
  Activity, BadgePercent, BriefcaseBusiness, Brush, Building2, Calculator, Camera, CarFront, ChartColumn, CirclePlay,
  ClipboardList, ContactRound, FileText, Gem, Globe, GraduationCap, IdCard, Images, Inbox, Link2, Mail, MapPin, Megaphone,
  MessageCircle, MessageSquareText, Nfc, PartyPopper, Phone, Plane, QrCode, Scale, ScanQrCode, Scissors, Share2, ShieldCheck,
  Shirt, SmartphoneNfc, Sofa, Stethoscope, Tag, Users, UtensilsCrossed, WandSparkles, Wrench,
} from "lucide-react";
import type { Feature, IndustryIconKey } from "@/data/industries";

const INDUSTRY_ICONS: Record<IndustryIconKey, LucideIcon> = {
  stethoscope: Stethoscope,
  activity: Activity,
  scale: Scale,
  calculator: Calculator,
  "shield-check": ShieldCheck,
  "building-2": Building2,
  sofa: Sofa,
  wrench: Wrench,
  "utensils-crossed": UtensilsCrossed,
  gem: Gem,
  shirt: Shirt,
  "car-front": CarFront,
  plane: Plane,
  scissors: Scissors,
  brush: Brush,
  "party-popper": PartyPopper,
  camera: Camera,
  megaphone: Megaphone,
  "briefcase-business": BriefcaseBusiness,
  "graduation-cap": GraduationCap,
};

const FEATURE_ICONS: Record<Feature["icon"], LucideIcon> = {
  phone: Phone,
  "message-circle": MessageCircle,
  "contact-round": ContactRound,
  "qr-code": QrCode,
  "link-2": Link2,
  "clipboard-list": ClipboardList,
  inbox: Inbox,
  "chart-column": ChartColumn,
  tag: Tag,
  images: Images,
  "circle-play": CirclePlay,
  "badge-percent": BadgePercent,
  "message-square-text": MessageSquareText,
  "scan-qr-code": ScanQrCode,
  "map-pin": MapPin,
  "share-2": Share2,
  nfc: Nfc,
  "smartphone-nfc": SmartphoneNfc,
  globe: Globe,
  "id-card": IdCard,
  users: Users,
  mail: Mail,
  "file-text": FileText,
  "wand-sparkles": WandSparkles,
};

/** The profession's icon (decorative: lucide marks its SVG aria-hidden). */
export function IndustryIcon({ name, size = 20, className }: { name: IndustryIconKey; size?: number; className?: string }) {
  const Icon = INDUSTRY_ICONS[name];
  return <Icon size={size} className={className} />;
}

/** A feature's icon, keyed by Feature["icon"] from src/data/industries/features.ts. */
export function FeatureIcon({ name, size = 18, className }: { name: Feature["icon"]; size?: number; className?: string }) {
  const Icon = FEATURE_ICONS[name];
  return <Icon size={size} className={className} />;
}
