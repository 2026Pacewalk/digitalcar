/*
 * Fictional demo personas for the Live Demo system (Phase 09).
 * Every value here is invented sample data — clearly-fake numbers
 * (+91 90000 000xx), example.com emails — so a demo NEVER exposes a real
 * customer's information (Section 20). A product's category picks the
 * matching persona; anything else falls back to a generic business.
 */
type DemoProduct = { id: number; name: string; filename: string; price: string; offer_price: string; description: string; button: string; button_title: string };
export type DemoBundle = { customer: Record<string, unknown>; products: DemoProduct[] };

const base = {
  logo: "", gst: "", establishment: "2019", about_on: 1, product_on: 1, enquiry_on: 1,
  payment_on: 0, gallery_on: 0, video_on: 0, qrcode_on: 0, offer_on: 0, feedback_on: 0,
  mobile2: "+91 90000 00002", email: "hello@example.com", views: 128,
  facebook: "https://facebook.com", instagram: "https://instagram.com", linkedin: "https://linkedin.com",
};
const svc = (id: number, name: string, description: string, button_title: string): DemoProduct =>
  ({ id, name, filename: "", price: "", offer_price: "", description, button: "", button_title });

type Persona = { keys: string[]; bundle: DemoBundle };

const PERSONAS: Persona[] = [
  {
    keys: ["real estate", "loan advisors", "insurance"],
    bundle: {
      customer: { ...base, name: "Aditya Rao", designation: "Real Estate Advisor", company_name: "Skyline Estates",
        nature: "Real Estate", mobile1: "+91 90000 00011", url: "https://example.com", address: "MG Road, Bengaluru 560001",
        google_map: "https://maps.google.com", about_us: "Helping families find their perfect home for 8+ years. Residential, commercial and rental — end to end.",
        specialties_title: "What we do", specialities: "Home Buying, Commercial Leasing, Investment Advisory, Site Visits" },
      products: [
        svc(1, "3BHK Luxury Apartments", "Ready-to-move premium flats near the metro. Book a free site visit.", "Visit Us"),
        svc(2, "Commercial Office Space", "Grade-A office spaces from 1,000 sq ft. Flexible terms.", "WhatsApp"),
        svc(3, "Free Property Consultation", "Talk to an advisor about buying, selling or investing.", "Call Now"),
      ],
    },
  },
  {
    keys: ["doctors & clinics", "doctors", "clinics", "healthcare"],
    bundle: {
      customer: { ...base, name: "Dr. Meera Nair", designation: "Dental Surgeon, BDS MDS", company_name: "SmileCare Dental Clinic",
        nature: "Healthcare", mobile1: "+91 90000 00022", url: "https://example.com", address: "Jubilee Hills, Hyderabad 500033",
        google_map: "https://maps.google.com", about_us: "Gentle, modern dentistry. Painless treatments with the latest technology and a caring team.",
        specialties_title: "Treatments", specialities: "Implants, Braces & Aligners, Root Canal, Teeth Whitening, Kids Dentistry" },
      products: [
        svc(1, "Book an Appointment", "Same-day slots available. Reserve your visit in seconds.", "WhatsApp"),
        svc(2, "Free Dental Check-up", "Complimentary first consultation and X-ray review.", "Call Now"),
        svc(3, "Find the Clinic", "Easy parking, near the metro. Get directions.", "Visit Us"),
      ],
    },
  },
  {
    keys: ["consultants", "digital marketers", "chartered accountants", "lawyers", "freelancers"],
    bundle: {
      customer: { ...base, name: "Rohit Verma", designation: "Growth & Marketing Consultant", company_name: "Northstar Consulting",
        nature: "Consulting", mobile1: "+91 90000 00033", url: "https://example.com", address: "Andheri East, Mumbai 400069",
        google_map: "https://maps.google.com", about_us: "I help small businesses grow with clear strategy, better marketing and measurable results. 120+ clients served.",
        specialties_title: "Services", specialities: "Growth Strategy, Performance Marketing, Branding, Sales Funnels" },
      products: [
        svc(1, "Free 30-min Strategy Call", "Tell me your goals — I'll share 3 quick wins, no strings attached.", "WhatsApp"),
        svc(2, "Marketing Audit", "A full review of your funnel with an action plan.", "Get Quote"),
        svc(3, "Talk to Rohit", "Prefer to chat? Give me a call.", "Call Now"),
      ],
    },
  },
  {
    keys: ["restaurants"],
    bundle: {
      customer: { ...base, name: "Spice Route", designation: "Modern Indian Kitchen", company_name: "Spice Route Restaurant",
        nature: "Restaurant", mobile1: "+91 90000 00044", url: "https://example.com", address: "Koramangala, Bengaluru 560095",
        google_map: "https://maps.google.com", about_us: "Bold flavours, warm hospitality. Dine-in, takeaway and delivery — every day 12pm to 11pm.",
        specialties_title: "Highlights", specialities: "Live Tandoor, Family Booths, Pure Veg Section, Home Delivery" },
      products: [
        svc(1, "Reserve a Table", "Book your table for tonight in one tap.", "WhatsApp"),
        svc(2, "Order Delivery", "Craving something? Order now, hot to your door.", "Visit Us"),
        svc(3, "Call the Restaurant", "Large party or a special request? Give us a ring.", "Call Now"),
      ],
    },
  },
  {
    keys: ["beauty & salon", "beauty", "salon"],
    bundle: {
      customer: { ...base, name: "Glow Studio", designation: "Hair · Skin · Makeup", company_name: "Glow Beauty Studio",
        nature: "Beauty & Salon", mobile1: "+91 90000 00055", url: "https://example.com", address: "Sector 29, Gurugram 122001",
        google_map: "https://maps.google.com", about_us: "Look and feel your best. Certified stylists, premium products and a relaxing space.",
        specialties_title: "Services", specialities: "Hair Styling, Bridal Makeup, Facials, Nail Art, Spa" },
      products: [
        svc(1, "Book an Appointment", "Weekend slots fill fast — reserve yours now.", "WhatsApp"),
        svc(2, "Bridal Packages", "Custom bridal looks with a free trial. Ask for details.", "Get Quote"),
        svc(3, "Call the Studio", "Questions about a service? We're happy to help.", "Call Now"),
      ],
    },
  },
];

const DEFAULT: DemoBundle = {
  customer: { ...base, name: "Aarav Sharma", designation: "Founder & CEO", company_name: "Bright Ideas Pvt Ltd",
    nature: "Business Services", mobile1: "+91 90000 00001", url: "https://example.com", address: "Connaught Place, New Delhi 110001",
    google_map: "https://maps.google.com", about_us: "A modern business built on trust and quality. Reach out — we'd love to work with you.",
    specialties_title: "What we offer", specialities: "Consultation, Quality Service, Fast Support, Fair Pricing" },
  products: [
    svc(1, "Enquire Now", "Interested in working together? Send us a message.", "WhatsApp"),
    svc(2, "Get a Free Quote", "Tell us what you need and we'll send a quick estimate.", "Get Quote"),
    svc(3, "Call Us", "Prefer to talk? We're just a call away.", "Call Now"),
  ],
};

/* Pick a persona from a product's category (case-insensitive), else default. */
export function demoFor(category?: string | null): DemoBundle {
  const c = (category || "").toLowerCase().trim();
  if (c) for (const p of PERSONAS) if (p.keys.some((k) => c.includes(k) || k.includes(c))) return p.bundle;
  return DEFAULT;
}
