/* Content for the Live Demo industry showcase (see demoShowcase.ts).
   Fictional businesses with realistic Indian services, prices and hours. */
export type ShowcaseContent = {
  label: string;
  businessName: string;
  designation: string;
  about: string;
  specialities: string[];
  hours: string;
  services: { name: string; description: string; price: string; offerPrice: string; duration: string }[];
  offer?: { title: string; description: string };
  area: string;
  phone: string;
  email: string;
  website: string;
  established?: string;
  /** Service photos, in the same order as services (public/demo/<id>/…). */
  images?: string[];
  /** Extra gallery photos. */
  gallery?: string[];
};

export const SHOWCASE_CONTENT: Record<string, ShowcaseContent> = {
  "salon": {
    "label": "Beauty Salon",
    "businessName": "Noor & Nuance Studio",
    "designation": "Hair · Skin · Makeup",
    "about": "A calm, light-filled unisex studio in Sector 29 for precise cuts, healthy colour, glowing skin and occasion makeup, each look shaped over an unhurried consultation.",
    "specialities": [
      "Precision haircuts",
      "Global colour & balayage",
      "Keratin & hair spa",
      "Hydrating facials",
      "Bridal & party makeup"
    ],
    "hours": "Mon–Sat 10:30 AM – 9 PM · Sun 10 AM – 8 PM",
    "services": [
      {
        "name": "Signature Haircut & Style",
        "description": "Consultation, wash, precision cut and blow-dry finish, tailored for every hair type",
        "price": "899",
        "offerPrice": "",
        "duration": "45 min"
      },
      {
        "name": "Keratin Smoothening",
        "description": "Frizz-control treatment for smooth, manageable hair; price for shoulder-length hair",
        "price": "5999",
        "offerPrice": "5099",
        "duration": "2.5 hr"
      },
      {
        "name": "Hydra Glow Facial",
        "description": "Deep cleanse, gentle exfoliation and layered hydration for a fresh, even glow",
        "price": "2499",
        "offerPrice": "",
        "duration": "60 min"
      },
      {
        "name": "Bridal Makeup",
        "description": "HD bridal look with hairstyling and dupatta draping; trial session on request",
        "price": "15999",
        "offerPrice": "",
        "duration": "3 hr"
      }
    ],
    "offer": {
      "title": "Weekday Welcome",
      "description": "New guests get 15% off their first hair or skin service, Monday to Thursday. Show this card when you check in."
    },
    "area": "Sector 29, Gurugram 122001",
    "phone": "+91 90000 01011",
    "email": "hello@noor-and-nuance-studio.example.com",
    "website": "https://noor-and-nuance-studio.example.com",
    "established": "2016",
    "images": ["/demo/salon/svc-1.webp","/demo/salon/svc-2.webp","/demo/salon/svc-3.webp","/demo/salon/svc-4.webp"],
    "gallery": ["/demo/salon/gal-1.webp","/demo/salon/gal-2.webp"]
  },
  "cafe": {
    "label": "Café & Bakery",
    "businessName": "Thimble & Crust",
    "designation": "Coffee · Bakes · Brunch",
    "about": "A sunlit Indiranagar cafe pouring Chikmagalur estate coffee alongside croissants, sourdough and cakes baked in-house every morning.",
    "specialities": [
      "Chikmagalur estate coffee",
      "Laminated croissants",
      "Slow-ferment sourdough",
      "All-day brunch",
      "Celebration cakes to order"
    ],
    "hours": "Mon–Fri 8 AM – 10:30 PM · Sat–Sun 8 AM – 11 PM",
    "services": [
      {
        "name": "Classic Cappuccino",
        "description": "Double shot of house espresso with silky steamed milk; oat milk on request",
        "price": "220",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Butter Croissant",
        "description": "Laminated over three days for a crisp, golden shell and airy honeycomb layers",
        "price": "180",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Avocado Sourdough Toast",
        "description": "House sourdough with smashed avocado, cherry tomatoes, feta and chilli flakes",
        "price": "390",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Celebration Cake 500 g",
        "description": "Belgian chocolate or red velvet, finished to order with 24 hours' notice",
        "price": "1199",
        "offerPrice": "",
        "duration": ""
      }
    ],
    "offer": {
      "title": "Morning Pairing",
      "description": "Any hot coffee with a butter croissant for ₹349 before 11 AM, Monday to Friday."
    },
    "area": "Indiranagar, Bengaluru 560038",
    "phone": "+91 90000 01022",
    "email": "hello@thimble-and-crust.example.com",
    "website": "https://thimble-and-crust.example.com",
    "established": "2019",
    "images": ["/demo/cafe/svc-1.webp","/demo/cafe/svc-2.webp","/demo/cafe/svc-3.webp","/demo/cafe/svc-4.webp"],
    "gallery": ["/demo/cafe/gal-1.webp","/demo/cafe/gal-2.webp"]
  },
  "dental": {
    "label": "Dental Clinic",
    "businessName": "Brightmere Dental Studio",
    "designation": "Family · Cosmetic · Implant Dentistry",
    "about": "A calm, modern dental studio in Jubilee Hills for gentle family care, smile design and implants, with every plan explained clearly before you begin.",
    "specialities": [
      "Smile design & veneers",
      "Clear aligners",
      "Dental implants",
      "Root canal & crowns",
      "Family & kids' dentistry"
    ],
    "hours": "Mon–Sat 10 AM – 8:30 PM · Sun 10 AM – 2 PM (by appointment)",
    "services": [
      {
        "name": "Scaling & Polishing",
        "description": "Ultrasonic cleaning and polish to lift tartar and stains, plus a gum health check",
        "price": "1999",
        "offerPrice": "1499",
        "duration": "45 min"
      },
      {
        "name": "Teeth Whitening",
        "description": "In-clinic whitening session for a visibly brighter smile, with sensitivity care",
        "price": "12000",
        "offerPrice": "",
        "duration": "60 min"
      },
      {
        "name": "Root Canal Treatment",
        "description": "Rotary root canal under local anaesthesia to save an infected tooth; crown extra",
        "price": "4500",
        "offerPrice": "",
        "duration": "60–90 min"
      },
      {
        "name": "Dental Implant",
        "description": "Titanium implant, abutment and crown to replace a missing tooth, planned on a 3D scan",
        "price": "30000",
        "offerPrice": "",
        "duration": "3 visits"
      }
    ],
    "offer": {
      "title": "New Patient Welcome",
      "description": "Your first consultation plus scaling & polishing together at ₹1,499, with a written treatment plan to take home."
    },
    "area": "Jubilee Hills, Hyderabad 500033",
    "phone": "+91 90000 01033",
    "email": "hello@brightmere-dental-studio.example.com",
    "website": "https://brightmere-dental-studio.example.com",
    "established": "2012",
    "images": ["/demo/dental/svc-1.webp","/demo/dental/svc-2.webp","/demo/dental/svc-3.webp","/demo/dental/svc-4.webp"],
    "gallery": ["/demo/dental/gal-1.webp","/demo/dental/gal-2.webp"]
  },
  "fitness": {
    "label": "Gym & Fitness",
    "businessName": "Keelstone Fitness",
    "designation": "Strength · Conditioning · Personal Training",
    "about": "A strength-first gym and personal training studio in Baner, with coached floor sessions, body composition tracking and plans built around your workday.",
    "specialities": [
      "Strength & powerlifting coaching",
      "1:1 personal training",
      "HIIT & functional classes",
      "Body composition tracking",
      "Nutrition guidance"
    ],
    "hours": "Mon–Sat 5:30 AM – 10:30 PM · Sun 7 AM – 1 PM",
    "services": [
      {
        "name": "Monthly Membership",
        "description": "Full gym floor and group class access, with a fitness assessment when you join",
        "price": "2999",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Personal Training Pack",
        "description": "12 one-on-one sessions a month with a certified coach and a programme built for you",
        "price": "10999",
        "offerPrice": "9499",
        "duration": "60 min / session"
      },
      {
        "name": "Body Composition Scan",
        "description": "Scan of muscle, fat and body water with a coach walkthrough of your numbers",
        "price": "499",
        "offerPrice": "",
        "duration": "20 min"
      },
      {
        "name": "Nutrition Consultation",
        "description": "One-on-one diet plan built around everyday Indian meals and your training goals",
        "price": "1499",
        "offerPrice": "",
        "duration": "45 min"
      }
    ],
    "offer": {
      "title": "Complimentary Trial Day",
      "description": "Try one coached workout and a body composition scan on us before you choose a plan."
    },
    "area": "Baner, Pune 411045",
    "phone": "+91 90000 01044",
    "email": "hello@keelstone-fitness.example.com",
    "website": "https://keelstone-fitness.example.com",
    "established": "2018",
    "images": ["/demo/fitness/svc-1.webp","/demo/fitness/svc-2.webp","/demo/fitness/svc-3.webp","/demo/fitness/svc-4.webp"],
    "gallery": ["/demo/fitness/gal-1.webp","/demo/fitness/gal-2.webp"]
  },
  "yoga": {
    "label": "Yoga & Wellness",
    "businessName": "Amaltas Yoga House",
    "designation": "Yoga · Breathwork · Sound",
    "about": "A sunlit studio under the amaltas trees of Koregaon Park, offering small-group yoga, breathwork and sound sessions for every body and every level.",
    "specialities": [
      "Hatha & vinyasa flow",
      "Prenatal yoga",
      "Pranayama & meditation",
      "Sound bath evenings",
      "Small batches of 12"
    ],
    "hours": "Mon–Sat 6 AM – 9 PM · Sun 7 AM – 12 PM",
    "services": [
      {
        "name": "Drop-in Studio Class",
        "description": "Hatha or vinyasa flow in a small group, with mats and props provided",
        "price": "800",
        "offerPrice": "",
        "duration": "60 min"
      },
      {
        "name": "Monthly Unlimited Pass",
        "description": "Unlimited group classes for 30 days, plus one weekend breathwork workshop",
        "price": "5500",
        "offerPrice": "4500",
        "duration": "30 days"
      },
      {
        "name": "Private One-on-One Session",
        "description": "A one-to-one class planned around your goals, pace and any past injuries",
        "price": "1500",
        "offerPrice": "",
        "duration": "60 min"
      },
      {
        "name": "Sound Bath & Meditation",
        "description": "Singing bowls and guided rest in a softly lit room, limited to 14 guests",
        "price": "1800",
        "offerPrice": "",
        "duration": "75 min"
      }
    ],
    "offer": {
      "title": "New Member Welcome",
      "description": "Your first class is on us, and your first monthly pass comes at the introductory member rate."
    },
    "area": "Koregaon Park, Pune 411001",
    "phone": "+91 90000 01055",
    "email": "hello@amaltas-yoga-house.example.com",
    "website": "https://amaltas-yoga-house.example.com",
    "established": "2017",
    "images": ["/demo/yoga/svc-1.webp","/demo/yoga/svc-2.webp","/demo/yoga/svc-3.webp","/demo/yoga/svc-4.webp"],
    "gallery": ["/demo/yoga/gal-1.webp","/demo/yoga/gal-2.webp"]
  },
  "photography": {
    "label": "Photographer",
    "businessName": "Silverpier Studio",
    "designation": "Wedding · Portrait · Pre-Wedding",
    "about": "A Bandra West studio telling wedding and portrait stories in soft, honest light. Candid frames, calm direction and albums made to be handed down.",
    "specialities": [
      "Candid wedding storytelling",
      "Pre-wedding shoots across Mumbai",
      "Maternity & family portraits",
      "Hand-bound heirloom albums",
      "Same-week preview galleries"
    ],
    "hours": "Tue–Sun 11 AM – 8 PM · Mon by appointment",
    "services": [
      {
        "name": "Wedding Day Story",
        "description": "Candid and classic coverage by two photographers, with 500+ edited images",
        "price": "85000",
        "offerPrice": "",
        "duration": "10 hr"
      },
      {
        "name": "Pre-Wedding Session",
        "description": "Golden-hour shoot at two Mumbai locations, 60 edited images and a teaser reel",
        "price": "35000",
        "offerPrice": "29999",
        "duration": "4 hr"
      },
      {
        "name": "Maternity Portrait Session",
        "description": "Studio or seaside session with outfit guidance and 40 retouched images",
        "price": "18000",
        "offerPrice": "",
        "duration": "2 hr"
      },
      {
        "name": "Heirloom Wedding Album",
        "description": "40-page lay-flat album, hand-bound with a linen or leather cover",
        "price": "15000",
        "offerPrice": "",
        "duration": ""
      }
    ],
    "offer": {
      "title": "Early Booking for Couples",
      "description": "Couples who confirm wedding-day coverage get the pre-wedding session at an introductory ₹29,999 and a same-week preview gallery."
    },
    "area": "Bandra West, Mumbai 400050",
    "phone": "+91 90000 01066",
    "email": "hello@silverpier-studio.example.com",
    "website": "https://silverpier-studio.example.com",
    "established": "2015",
    "images": ["/demo/photography/svc-1.webp","/demo/photography/svc-2.webp","/demo/photography/svc-3.webp","/demo/photography/svc-4.webp"],
    "gallery": ["/demo/photography/gal-1.webp","/demo/photography/gal-2.webp"]
  },
  "restaurant": {
    "label": "Restaurant",
    "businessName": "Saffron Ledger",
    "designation": "Modern Indian · Small Plates · Tasting Menu",
    "about": "A Koramangala dining room where regional Indian recipes meet modern technique, from charcoal-grilled small plates to a seasonal chef's tasting menu.",
    "specialities": [
      "Seasonal chef's tasting menu",
      "Coastal Karnataka ghee roasts",
      "Tandoor and charcoal grills",
      "Regional small plates to share",
      "Private dining for 12 guests"
    ],
    "hours": "Daily 12 PM – 3:30 PM · 7 PM – 11 PM",
    "services": [
      {
        "name": "Chef's Tasting Menu",
        "description": "Seven seasonal courses tracing regional Indian kitchens, with an optional drinks pairing",
        "price": "2499",
        "offerPrice": "2199",
        "duration": "2 hr"
      },
      {
        "name": "Galouti Kebab Sliders",
        "description": "Lucknowi galouti kebab on saffron brioche buns with mint chutney and pickled onion",
        "price": "395",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Chicken Ghee Roast",
        "description": "Mangalorean-style roast in byadgi chilli and tamarind, served with soft neer dosa",
        "price": "525",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Smoked Dal Tadka",
        "description": "Black lentils slow-cooked overnight on charcoal, finished with white butter",
        "price": "425",
        "offerPrice": "",
        "duration": ""
      }
    ],
    "offer": {
      "title": "Weekday Tasting Preview",
      "description": "Chef's Tasting Menu at ₹2,199 per guest for Monday to Thursday dinners. Reserve 24 hours ahead."
    },
    "area": "Koramangala, Bengaluru 560095",
    "phone": "+91 90000 01077",
    "email": "hello@saffron-ledger.example.com",
    "website": "https://saffron-ledger.example.com",
    "established": "2014",
    "images": ["/demo/restaurant/svc-1.webp","/demo/restaurant/svc-2.webp","/demo/restaurant/svc-3.webp","/demo/restaurant/svc-4.webp"],
    "gallery": ["/demo/restaurant/gal-1.webp","/demo/restaurant/gal-2.webp"]
  },
  "realestate": {
    "label": "Real Estate",
    "businessName": "Bluegable Property Advisors",
    "designation": "Buy · Sell · Lease · NRI Services",
    "about": "An MG Road advisory helping families and NRIs buy, sell and lease homes across Bengaluru, with verified paperwork and honest, unhurried guidance.",
    "specialities": [
      "Resale & new-launch homes",
      "Title & document checks",
      "NRI property management",
      "Rentals & tenant sourcing",
      "Home loan coordination"
    ],
    "hours": "Mon–Sat 10 AM – 7 PM · Sun site visits by appointment",
    "services": [
      {
        "name": "Property Consultation",
        "description": "One-hour session on budget, micro-markets and shortlisting, adjusted against your deal",
        "price": "2500",
        "offerPrice": "",
        "duration": "60 min"
      },
      {
        "name": "Title Verification Report",
        "description": "Advocate-led review of sale deeds, EC, khata and approvals for a standard apartment",
        "price": "9500",
        "offerPrice": "7500",
        "duration": "2–3 working days"
      },
      {
        "name": "Property Valuation Report",
        "description": "Market valuation by an approved valuer for resale pricing, loans or records",
        "price": "6000",
        "offerPrice": "",
        "duration": "2 days"
      },
      {
        "name": "NRI Home Care Plan",
        "description": "Rent collection, quarterly inspections and repair coordination for owners abroad",
        "price": "3500",
        "offerPrice": "",
        "duration": "Monthly"
      }
    ],
    "offer": {
      "title": "Paperwork-First Welcome",
      "description": "Buyers who shortlist a home with us get the title verification report at an introductory ₹7,500, plus one accompanied site-visit day."
    },
    "area": "MG Road, Bengaluru 560001",
    "phone": "+91 90000 01088",
    "email": "hello@bluegable-property-advisors.example.com",
    "website": "https://bluegable-property-advisors.example.com",
    "established": "2011",
    "images": ["/demo/realestate/svc-1.webp","/demo/realestate/svc-2.webp","/demo/realestate/svc-3.webp","/demo/realestate/svc-4.webp"],
    "gallery": ["/demo/realestate/gal-1.webp","/demo/realestate/gal-2.webp"]
  },
  "interior": {
    "label": "Interior Design",
    "businessName": "Studio Jaalika",
    "designation": "Residential Interiors · Kitchens · Turnkey Homes",
    "about": "A Banjara Hills design studio creating warm, detailed homes that pair Deccan craft like jaali and stone with clean modern layouts and clear timelines.",
    "specialities": [
      "Full-home turnkey interiors",
      "Modular kitchens and wardrobes",
      "3D visualisation before execution",
      "Custom jaali & teak detailing",
      "Villa and apartment makeovers"
    ],
    "hours": "Mon–Sat 10 AM – 7 PM · Sun by appointment",
    "services": [
      {
        "name": "Design Consultation Visit",
        "description": "A 90-minute site visit to review layout, budget and style, with a written design brief",
        "price": "2500",
        "offerPrice": "1499",
        "duration": "90 min"
      },
      {
        "name": "3D Room Visualisation",
        "description": "Photo-real 3D views of one room with material and lighting options and two revisions",
        "price": "15000",
        "offerPrice": "",
        "duration": "7 days"
      },
      {
        "name": "Modular Kitchen Package",
        "description": "L-shaped kitchen in BWP ply with soft-close hardware, quartz counter and tall unit",
        "price": "225000",
        "offerPrice": "",
        "duration": "4–6 weeks"
      },
      {
        "name": "Turnkey 3BHK Interiors",
        "description": "Design, civil, carpentry, lighting and styling managed end to end until handover",
        "price": "1800000",
        "offerPrice": "",
        "duration": "10–12 weeks"
      }
    ],
    "offer": {
      "title": "First Consultation at ₹1,499",
      "description": "Site visit and design brief for homes in Banjara Hills, Jubilee Hills and nearby; the fee is adjusted against your final project."
    },
    "area": "Banjara Hills, Hyderabad 500034",
    "phone": "+91 90000 01099",
    "email": "hello@studio-jaalika.example.com",
    "website": "https://studio-jaalika.example.com",
    "established": "2016",
    "images": ["/demo/interior/svc-1.webp","/demo/interior/svc-2.webp","/demo/interior/svc-3.webp","/demo/interior/svc-4.webp"],
    "gallery": ["/demo/interior/gal-1.webp","/demo/interior/gal-2.webp"]
  },
  "boutique": {
    "label": "Boutique",
    "businessName": "Kesarvi Boutique",
    "designation": "Bridal · Festive · Couture",
    "about": "A Lajpat Nagar atelier for made-to-measure lehengas, suits and blouses, where hand embroidery meets easy, modern silhouettes for every celebration.",
    "specialities": [
      "Bridal lehengas",
      "Zardozi & gota patti",
      "Designer blouses",
      "Made-to-measure fits",
      "Trousseau styling"
    ],
    "hours": "Tue–Sun 10:30 AM – 8:30 PM · Mon closed",
    "services": [
      {
        "name": "Bridal Lehenga Couture",
        "description": "Made-to-measure bridal lehengas with hand zardozi, three fittings and a styled dupatta",
        "price": "45000",
        "offerPrice": "",
        "duration": "4–6 weeks"
      },
      {
        "name": "Designer Blouse Stitching",
        "description": "Padded, princess-cut or backless blouses with latkans and optional hand embroidery",
        "price": "1800",
        "offerPrice": "1499",
        "duration": "7 days"
      },
      {
        "name": "Festive Kurta Sets",
        "description": "Ready-to-wear chanderi, organza and georgette sets with dupatta and free fit alterations",
        "price": "4500",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Anarkali Suit Tailoring",
        "description": "Custom anarkali and sharara suits cut to your measurements, in your fabric or ours",
        "price": "1500",
        "offerPrice": "",
        "duration": "5–7 days"
      }
    ],
    "offer": {
      "title": "Bridal Trousseau Welcome",
      "description": "Book a bridal lehenga and get your first designer blouse stitched free, plus a complimentary one-on-one styling session."
    },
    "area": "Lajpat Nagar, New Delhi 110024",
    "phone": "+91 90000 01110",
    "email": "hello@kesarvi-boutique.example.com",
    "website": "https://kesarvi-boutique.example.com",
    "established": "2013",
    "images": ["/demo/boutique/svc-1.webp","/demo/boutique/svc-2.webp","/demo/boutique/svc-3.webp","/demo/boutique/svc-4.webp"],
    "gallery": ["/demo/boutique/gal-1.webp","/demo/boutique/gal-2.webp"]
  },
  "jewellery": {
    "label": "Jewellery",
    "businessName": "Gulabi Kothi Jewels",
    "designation": "Kundan · Polki · Meenakari",
    "about": "A family-run jewellery house in Johari Bazaar, hand-setting kundan, polki and meenakari pieces for brides, festivals and everyday heirlooms.",
    "specialities": [
      "Bridal kundan & polki",
      "Hand-enamelled meenakari",
      "Certified gemstones",
      "BIS-hallmarked gold",
      "Custom & heirloom redesign"
    ],
    "hours": "Mon–Sat 10:30 AM – 8 PM · Sun by appointment",
    "services": [
      {
        "name": "Kundan Choker Set",
        "description": "Hand-set kundan choker with matching earrings, gold-plated, for festive wear",
        "price": "5500",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Silver Meenakari Jhumkas",
        "description": "92.5 sterling silver jhumkas with hand-painted enamel in Jaipur colours",
        "price": "6500",
        "offerPrice": "5900",
        "duration": ""
      },
      {
        "name": "Polki Jadau Earrings",
        "description": "Uncut diamonds set in hallmarked 22k gold, finished with meenakari backs",
        "price": "85000",
        "offerPrice": "",
        "duration": ""
      },
      {
        "name": "Certified Emerald Ring",
        "description": "Natural panna set in 92.5 silver, supplied with a gem lab certificate",
        "price": "12000",
        "offerPrice": "",
        "duration": ""
      }
    ],
    "offer": {
      "title": "Wedding Season Preview",
      "description": "Flat 15% off making charges on bridal kundan and polki sets, with complimentary cleaning for a year."
    },
    "area": "Johari Bazaar, Jaipur 302003",
    "phone": "+91 90000 01121",
    "email": "hello@gulabi-kothi-jewels.example.com",
    "website": "https://gulabi-kothi-jewels.example.com",
    "established": "1998",
    "images": ["/demo/jewellery/svc-1.webp","/demo/jewellery/svc-2.webp","/demo/jewellery/svc-3.webp","/demo/jewellery/svc-4.webp"],
    "gallery": ["/demo/jewellery/gal-1.webp","/demo/jewellery/gal-2.webp"]
  },
  "coaching": {
    "label": "Coaching",
    "businessName": "Kalvipath Academy",
    "designation": "Boards · NEET · JEE · TNPSC",
    "about": "A T. Nagar learning centre for Class 9–12 boards, NEET, JEE and TNPSC, with small batches, patient faculty and weekly tests that keep progress visible.",
    "specialities": [
      "CBSE & Samacheer Kalvi syllabus",
      "Batches of 20 students",
      "Weekly tests & parent reports",
      "Tamil & English medium",
      "Daily doubt-clearing hour"
    ],
    "hours": "Mon–Sat 6:30 AM – 8:30 PM · Sun 8 AM – 1 PM",
    "services": [
      {
        "name": "Board Exam Tuition",
        "description": "Class 9–12 maths and science, CBSE and State Board, with weekly tests; fee per month",
        "price": "2500",
        "offerPrice": "",
        "duration": "90 min / class"
      },
      {
        "name": "NEET-JEE One-Year Programme",
        "description": "Class 12 and repeat-year batches with daily practice, mock tests and a doubt desk",
        "price": "85000",
        "offerPrice": "75000",
        "duration": "10 months"
      },
      {
        "name": "TNPSC Group 2 & 4",
        "description": "General Studies, aptitude and Tamil eligibility papers, plus a full-length test series",
        "price": "15000",
        "offerPrice": "",
        "duration": "6 months"
      },
      {
        "name": "NEET Crash Course",
        "description": "Fast revision of the full NEET syllabus with daily tests and answer analysis",
        "price": "25000",
        "offerPrice": "",
        "duration": "45 days"
      }
    ],
    "offer": {
      "title": "Sunday Scholarship Test",
      "description": "Take our free scholarship test on any Sunday to earn up to 50% off course fees. Your first week of classes is free to try."
    },
    "area": "T. Nagar, Chennai 600017",
    "phone": "+91 90000 01132",
    "email": "hello@kalvipath-academy.example.com",
    "website": "https://kalvipath-academy.example.com",
    "established": "2010",
    "images": ["/demo/coaching/svc-1.webp","/demo/coaching/svc-2.webp","/demo/coaching/svc-3.webp","/demo/coaching/svc-4.webp"],
    "gallery": ["/demo/coaching/gal-1.webp","/demo/coaching/gal-2.webp"]
  },
};
