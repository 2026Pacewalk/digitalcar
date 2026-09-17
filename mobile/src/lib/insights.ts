/* One definition of "what visitors did" for Home and Insights, grouped the
   way an owner thinks about it. Event names match the server's TRACK_TYPES
   (api/lib/analytics.ts); engagement signals such as scroll depth and time on
   card are not actions and are never counted as taps. */

export const ACTION_GROUPS: { label: string; types: string[] }[] = [
  { label: "Calls", types: ["call"] },
  { label: "WhatsApp chats", types: ["whatsapp"] },
  { label: "Contacts saved", types: ["save_contact", "vcard_download"] },
  { label: "Enquiries sent", types: ["enquiry"] },
  { label: "QR scans", types: ["qr_scan"] },
  { label: "Card shared", types: ["share", "share_channel", "copy_link"] },
  { label: "Emails", types: ["email"] },
  { label: "Website visits", types: ["website"] },
  { label: "Directions", types: ["directions", "map_click"] },
  { label: "Social profiles opened", types: ["social", "social_click"] },
  { label: "Services & products opened", types: ["product", "product_click", "product_enquiry", "catalogue_view", "offer_click"] },
  { label: "Gallery & videos viewed", types: ["gallery_open", "gallery_image", "video_play"] },
  { label: "Brochure opened", types: ["brochure"] },
  { label: "Reviews opened", types: ["review_click", "review_write"] },
  { label: "Payment details used", types: ["pay_click", "upi_copy", "bank_copy", "payment_qr"] },
];

const ACTION_TYPES = new Set(ACTION_GROUPS.flatMap((g) => g.types));

export function groupedActions(counts: Record<string, number> | undefined) {
  const c = counts ?? {};
  return ACTION_GROUPS
    .map((g) => ({ label: g.label, n: g.types.reduce((sum, t) => sum + Number(c[t] ?? 0), 0) }))
    .filter((g) => g.n > 0)
    .sort((a, b) => b.n - a.n);
}

export function totalActions(counts: Record<string, number> | undefined) {
  return Object.entries(counts ?? {}).reduce((sum, [type, n]) => sum + (ACTION_TYPES.has(type) ? Number(n) : 0), 0);
}
