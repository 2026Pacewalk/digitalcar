export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  RESELLER: "reseller" as const,
  CUSTOMER: "customer" as const,
};

export const BLOCK_TYPES = [
  { id: "profile_header", name: "Profile Header", icon: "User", category: "header" },
  { id: "cover_image", name: "Cover Image", icon: "Image", category: "header" },
  { id: "contact_info", name: "Contact Info", icon: "Phone", category: "contact" },
  { id: "about_us", name: "About Us", icon: "FileText", category: "content" },
  { id: "services", name: "Services", icon: "Briefcase", category: "content" },
  { id: "products", name: "Products", icon: "ShoppingBag", category: "content" },
  { id: "gallery", name: "Gallery", icon: "Grid3X3", category: "media" },
  { id: "video", name: "Video", icon: "Play", category: "media" },
  { id: "pdf_brochure", name: "PDF Brochure", icon: "FileDown", category: "media" },
  { id: "payment_qr", name: "Payment QR", icon: "QrCode", category: "business" },
  { id: "social_links", name: "Social Links", icon: "Share2", category: "social" },
  { id: "website_link", name: "Website Link", icon: "Link", category: "social" },
  { id: "business_hours", name: "Business Hours", icon: "Clock", category: "business" },
  { id: "map", name: "Map", icon: "MapPin", category: "business" },
  { id: "testimonials", name: "Testimonials", icon: "Star", category: "content" },
  { id: "enquiry_form", name: "Enquiry Form", icon: "MessageSquare", category: "advanced" },
  { id: "whatsapp_button", name: "WhatsApp Button", icon: "MessageCircle", category: "contact" },
  { id: "custom_html", name: "Custom HTML", icon: "Code", category: "advanced" },
];

export const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500" },
  { value: "interested", label: "Interested", color: "bg-yellow-500" },
  { value: "follow_up", label: "Follow-up", color: "bg-purple-500" },
  { value: "converted", label: "Converted", color: "bg-emerald-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
  { value: "closed", label: "Closed", color: "bg-red-500" },
];
