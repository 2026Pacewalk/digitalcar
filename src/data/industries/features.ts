/* The approved wording for every DigitalCarda feature an industry page may name.
   Pages refer to features only by FeatureKey, and their own copy (pains[].fix,
   useCases[].how, FAQ answers) must agree with the `text` here.

   Every line was checked against the code on 2026-09-17:
   - gallery 20/60 and video 8/25: db/seed-plans-inr.sql, PACKAGE_LIMITS in src/hooks/useCustomer.ts
   - NFC card ₹499, NFC standee ₹1,499: src/lib/nfcProducts.ts
   - custom domain ₹499 one-time, free on Platinum 3-Year: api/domain-router.ts
   - bulk ₹799 → ₹399 per card per year from 10 cards, plus 18% GST: src/pages/public/BulkCards.tsx
   - up to 3 cards on Platinum: max_cards in db/seed-plans-inr.sql

   Import-free apart from its own types, so the server bundle can use it. */
import type { Feature, FeatureKey, FeaturePlan } from "./types";

export const FEATURES: Record<FeatureKey, Feature> = {
  call: {
    key: "call", label: "One-tap call", plan: "all-plans", icon: "phone", href: "/features",
    text: "Customers call you with one tap from your card.",
  },
  whatsapp: {
    key: "whatsapp", label: "WhatsApp chat", plan: "all-plans", icon: "message-circle", href: "/features",
    text: "One tap opens a WhatsApp chat with you. Service buttons can open WhatsApp with the service name already typed in.",
  },
  saveContact: {
    key: "saveContact", label: "Save contact", plan: "all-plans", icon: "contact-round", href: "/blog/qr-code-business-card-vcard",
    text: "Save Contact puts your name, number, email, website and address into the customer's phonebook in one tap.",
  },
  qr: {
    key: "qr", label: "Your own QR code", plan: "all-plans", icon: "qr-code", href: "/features",
    text: "A QR code in your colours as PNG or SVG, plus a printable counter standee. The QR link stays the same when you redesign your card.",
  },
  shareLink: {
    key: "shareLink", label: "Short link & share menu", plan: "all-plans", icon: "link-2", href: "/features",
    text: "A digitalcarda.in/yourname link with a share menu for WhatsApp, Telegram, LinkedIn, Facebook, X, SMS and email, and a proper preview when the link is pasted.",
  },
  enquiryForm: {
    key: "enquiryForm", label: "Enquiry form", plan: "all-plans", icon: "clipboard-list", href: "/features",
    text: "Visitors send their name, number, email and requirement from your card and, if they leave an email, get an automatic reply saying you received it. Link-in-bio designs don't include the form.",
  },
  leadsPipeline: {
    key: "leadsPipeline", label: "Leads pipeline", plan: "all-plans", icon: "inbox", href: "/features",
    text: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.",
  },
  analytics: {
    key: "analytics", label: "Visits & taps", plan: "all-plans", icon: "chart-column", href: "/features",
    text: "See how many people opened your card, what they tapped and where they came from, such as WhatsApp or a QR scan. Export it as CSV.",
  },
  servicesWithPrices: {
    key: "servicesWithPrices", label: "Services with prices", plan: "all-plans", icon: "tag", href: "/features",
    text: "List services or products with photos, MRP and offer price, and a button to call, WhatsApp, get directions or open a link.",
  },
  gallery: {
    key: "gallery", label: "Photo gallery", plan: "all-plans", icon: "images", href: "/pricing",
    text: "Show your work in a gallery that opens full screen: 20 photos on Gold, 60 on Platinum.",
  },
  video: {
    key: "video", label: "Videos & reels", plan: "all-plans", icon: "circle-play", href: "/features",
    text: "Add YouTube videos, Shorts and Instagram Reels that play on your card.",
  },
  offers: {
    key: "offers", label: "Offers with end dates", plan: "all-plans", icon: "badge-percent", href: "/features",
    text: "Post an offer with a \"valid till\" date. It drops off your card by itself when it expires.",
  },
  reviewButton: {
    key: "reviewButton", label: "Google review button", plan: "all-plans", icon: "message-square-text", href: "/blog/google-review-qr-code",
    text: "A \"Write a Review\" button that opens your Google review page.",
  },
  paymentQr: {
    key: "paymentQr", label: "Payment QR", plan: "all-plans", icon: "scan-qr-code", href: "/features",
    text: "Show your payment QR and your Paytm, PhonePe or Google Pay number so customers can scan or copy it. The money goes straight to you.",
  },
  mapsLink: {
    key: "mapsLink", label: "Directions", plan: "all-plans", icon: "map-pin", href: "/features",
    text: "Tap the address to open directions in Google Maps.",
  },
  socials: {
    key: "socials", label: "Social links", plan: "all-plans", icon: "share-2", href: "/features",
    text: "Link Instagram, Facebook, YouTube, LinkedIn and more.",
  },
  nfcCard: {
    key: "nfcCard", label: "NFC card, ₹499", plan: "add-on", icon: "nfc", href: "/pricing",
    text: "A PVC card with an NFC chip: tap it on a phone, or scan the printed QR, and your card opens.",
  },
  nfcStandee: {
    key: "nfcStandee", label: "NFC standee, ₹1,499", plan: "add-on", icon: "smartphone-nfc", href: "/pricing",
    text: "A counter standee customers tap or scan to open your card.",
  },
  customDomain: {
    key: "customDomain", label: "Your own domain", plan: "add-on", icon: "globe", href: "/custom-domain",
    text: "Put your card on your own domain for a one-time ₹499, free on Platinum 3-Year. Our team connects it with HTTPS.",
  },
  multiCard: {
    key: "multiCard", label: "Up to 3 cards", plan: "platinum", icon: "id-card", href: "/pricing",
    text: "Platinum runs up to 3 cards from one login, each with its own link and QR.",
  },
  bulkCards: {
    key: "bulkCards", label: "Cards for your team", plan: "bulk", icon: "users", href: "/bulk-cards",
    text: "For 10 or more staff: add the team, pick one design and get volume pricing from ₹799 down to ₹399 per card per year, plus GST.",
  },
  emailSignature: {
    key: "emailSignature", label: "Email signature", plan: "free-tool", icon: "mail", href: "/email-signature-generator",
    text: "Make a free email signature that links to your card.",
  },
  whatsappTemplates: {
    key: "whatsappTemplates", label: "WhatsApp message templates", plan: "free-tool", icon: "file-text", href: "/whatsapp-message-templates",
    text: "Ready-to-copy WhatsApp Business messages that include your card link.",
  },
  aiGenerator: {
    key: "aiGenerator", label: "AI first draft", plan: "free-tool", icon: "wand-sparkles", href: "/ai-card-generator",
    text: "Enter your business name and profession and get a first draft of your card to review and edit.",
  },
};

export const PLAN_LABEL: Record<FeaturePlan, string> = {
  "all-plans": "All plans",
  platinum: "Platinum",
  "add-on": "Add-on",
  bulk: "Teams",
  "free-tool": "Free tool",
};
