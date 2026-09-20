/**
 * City data for /digital-visiting-card/:slug pages.
 * One long-tail SEO page per Tier 1/2 Indian city, mapped from Semrush search
 * volume for "digital visiting card in <city>" and "digital business card
 * <city>" (Sept 2026 India database).
 */

export type CityPageData = {
  slug: string;
  name: string;
  state: string;
  locale1: string;
  locale2: string;
  localLanguage: string;
  industries: string;
  context: string;
};

export const CITIES: CityPageData[] = [
  { slug: "delhi", name: "Delhi", state: "Delhi", locale1: "Connaught Place", locale2: "Nehru Place", localLanguage: "Hindi", industries: "doctors in Green Park, real estate agents in Gurgaon, jewellers in Karol Bagh, restaurants in Hauz Khas", context: "Delhi's business districts run from Connaught Place to Nehru Place, Gurgaon and Noida, and a single digital card follows a professional across every branch and networking event, updating in real time." },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", locale1: "Andheri", locale2: "BKC", localLanguage: "Marathi", industries: "real estate agents in Andheri, boutiques in Bandra, jewellers in Zaveri Bazaar, doctors in South Bombay", context: "Mumbai professionals meet 40+ new contacts a week between BKC, Andheri and South Bombay. A single link that opens even on Bombay's slowest network still beats a paper card that gets tossed by end of day." },
  { slug: "bangalore", name: "Bangalore", state: "Karnataka", locale1: "Koramangala", locale2: "Whitefield", localLanguage: "Kannada", industries: "startups in Koramangala, real estate in Whitefield, cafes in Indiranagar, coaches across the city", context: "Bangalore's founder and freelancer scene runs on WhatsApp and LinkedIn. A digital card is the standard handoff in Koramangala, Indiranagar, HSR and Whitefield — no paper, no clutter." },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", locale1: "Hitech City", locale2: "Banjara Hills", localLanguage: "Telugu", industries: "doctors in Banjara Hills, tech consultants in Hitech City, jewellers in Charminar, restaurants in Jubilee Hills", context: "Hyderabad's Hitech City and Banjara Hills professionals move between client offices daily. A digital card that shows Telugu and English side by side wins across old city and new city alike." },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", locale1: "T. Nagar", locale2: "OMR", localLanguage: "Tamil", industries: "jewellers in T. Nagar, tech firms on OMR, doctors in Adyar, silk merchants across the city", context: "Chennai jewellers, silk merchants and IT services firms use digital cards in Tamil and English side by side, with UPI for advance orders and Google Maps to the shop." },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal", locale1: "Park Street", locale2: "Salt Lake", localLanguage: "Bengali", industries: "advocates near High Court, jewellers in Bowbazar, restaurants on Park Street, coaches across Salt Lake", context: "Kolkata's advocates near High Court and jewellers in Bowbazar switch to digital cards to publish credentials, timings and today's gold rate in Bengali and English." },
  { slug: "pune", name: "Pune", state: "Maharashtra", locale1: "Baner", locale2: "Koregaon Park", localLanguage: "Marathi", industries: "real estate in Baner, cafes in Koregaon Park, doctors in Aundh, coaches in Kothrud", context: "Pune's builder, cafe and coaching-class scene runs on WhatsApp. A digital card with property photos, WhatsApp booking and UPI advance converts warm leads to bookings the same day." },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat", locale1: "SG Highway", locale2: "CG Road", localLanguage: "Gujarati", industries: "jewellers in Manek Chowk, real estate on SG Highway, textile merchants across the city, doctors in Bodakdev", context: "Ahmedabad's textile merchants and jewellers use digital cards in Gujarati and English to publish rates, catalogues and UPI advance payment." },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan", locale1: "MI Road", locale2: "Vaishali Nagar", localLanguage: "Hindi", industries: "jewellers in Johari Bazaar, tour operators across the city, hotels near Amer, wedding planners", context: "Jaipur jewellers, wedding planners and tour operators use digital cards for gold rate, catalogue, itinerary and UPI advance — one link across every wedding-season enquiry." },
  { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh", locale1: "Sector 17", locale2: "Sector 22", localLanguage: "Punjabi", industries: "advocates in Sector 17, doctors in Sector 32, boutiques in Sector 22, coaches across the city", context: "Chandigarh's advocates, doctors and coaches switch to a digital card as the professional handover at every court, clinic and coaching visit." },
  { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh", locale1: "Hazratganj", locale2: "Gomti Nagar", localLanguage: "Hindi", industries: "doctors in Hazratganj, jewellers in Aminabad, coaches in Gomti Nagar, chikankari boutiques", context: "Lucknow doctors, chikankari boutiques and coaching institutes use digital cards to publish OPD timings, catalogue and admission enquiry — one link, updated live." },
  { slug: "surat", name: "Surat", state: "Gujarat", locale1: "Vesu", locale2: "Adajan", localLanguage: "Gujarati", industries: "textile merchants on Ring Road, diamond firms in Varachha, jewellers, real estate across the city", context: "Surat textile and diamond merchants use digital cards to publish live rates, catalogues in Gujarati/English and take UPI advances from wholesale buyers." },
  { slug: "ludhiana", name: "Ludhiana", state: "Punjab", locale1: "Model Town", locale2: "Sarabha Nagar", localLanguage: "Punjabi", industries: "hosiery exporters, real estate in Model Town, jewellers in Chaura Bazaar, doctors in Sarabha Nagar", context: "Ludhiana's hosiery exporters, jewellers and doctors use digital cards in Punjabi and English to publish catalogues and bookings across export enquiries and local walk-ins." },
  { slug: "indore", name: "Indore", state: "Madhya Pradesh", locale1: "Vijay Nagar", locale2: "Palasia", localLanguage: "Hindi", industries: "restaurants in Sarafa, coaches in Vijay Nagar, jewellers in Rajwada, doctors in Palasia", context: "Indore's coaching institutes, doctors and restaurants use digital cards for admission enquiries, table booking and menu updates — one link, updated daily." },
  { slug: "nagpur", name: "Nagpur", state: "Maharashtra", locale1: "Dharampeth", locale2: "Sadar", localLanguage: "Marathi", industries: "advocates near High Court, oranges wholesalers in Kalamna, doctors in Dharampeth, coaching institutes", context: "Nagpur professionals across Dharampeth and Sadar switch to digital cards to publish court timings, wholesale rates and consultation bookings — one link in Marathi and English." },
  { slug: "gurgaon", name: "Gurgaon", state: "Haryana", locale1: "Cyber City", locale2: "MG Road", localLanguage: "Hindi", industries: "consultants in Cyber City, real estate on Golf Course Road, doctors in Sector 56, F&B in DLF Phase 2", context: "Gurgaon's consultants, real-estate agents and doctors carry one digital card across Cyber City, Golf Course Road and DLF — updating tower, phase or clinic details in a tap." },
];

export function getCity(slug: string): CityPageData | undefined {
  return CITIES.find((c) => c.slug === slug);
}
