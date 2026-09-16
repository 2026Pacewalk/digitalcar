import type { BlogPost } from "../types";

export const digitalVisitingCardForDoctors: BlogPost = {
  slug: "digital-visiting-card-for-doctors",
  title: "Digital Visiting Card for Doctors and Clinics: What to Include (and What to Leave Off)",
  seoTitle: "Digital Visiting Card for Doctors & Clinics: What to Add",
  description: "What doctors and clinics should put on a digital visiting card — timings, location, appointment button, registration details — and what to leave off.",
  excerpt: "Patients don't need your life story. They need your timings, your location and a way to book. A practical guide for doctors, dentists and clinics.",
  category: "industries",
  keywords: ["visiting card for doctor", "digital visiting card for doctors", "doctor visiting card", "clinic visiting card"],
  publishedAt: "2026-07-03",
  updatedAt: "2026-07-03",
  cover: { motif: "clinic", tone: "teal" },
  takeaways: [
    "Put clinic timings, location and an appointment button at the top. That's what patients look for.",
    "Keep it factual: qualifications, registration number, specialities, languages spoken.",
    "Check the National Medical Commission's current rules on how doctors may publicise themselves before adding anything promotional.",
    "A QR standee at reception lets patients save your number and find you again without asking staff.",
  ],
  intro: [
    "A patient walks out of your clinic with a prescription and a vague memory of your name. Three weeks later they need a follow-up. They search, can't find the right \"Dr Sharma\", and end up somewhere else.",
    "A digital visiting card fixes that small, costly gap. But a doctor's card isn't a sales page, and it shouldn't read like one. Here's what belongs on it, what doesn't, and how to set it up so patients actually use it.",
  ],
  sections: [
    {
      id: "what-patients-need",
      heading: "What patients actually look for on a doctor's card",
      blocks: [
        { type: "p", text: "Put yourself in the patient's place — often worried, sometimes in pain, usually on a phone. They want answers to four questions, fast:" },
        { type: "steps", items: [
          { title: "Is this the right doctor?", text: "Your full name, photo, qualifications and speciality, stated plainly." },
          { title: "When can I come?", text: "Clinic timings for each day, and which days you're not available." },
          { title: "Where exactly are you?", text: "The clinic address with a Google Maps button. Mention the floor or a landmark if the building is confusing." },
          { title: "How do I book?", text: "One clear button — call, WhatsApp or an appointment form, whichever your front desk actually answers." },
        ] },
      ],
    },
    {
      id: "checklist",
      heading: "What to include on a doctor's digital visiting card",
      blocks: [
        { type: "checklist", items: [
          "Full name, photo, qualifications and speciality",
          "Medical registration number and council, if you're comfortable displaying it",
          "Clinic or hospital name, with timings for each location if you consult at more than one",
          "Call and WhatsApp buttons for appointments",
          "Address with a Google Maps link",
          "Services offered, in words patients use (\"root canal treatment\", \"child vaccination\")",
          "Languages you speak — it matters more than you'd think",
          "Your Google review link, so satisfied patients can share their experience",
          "Emergency guidance, such as the nearest hospital to contact out of hours",
        ] },
        { type: "tip", title: "Save Contact is your best friend", text: "Patients who tap **Save Contact** have your number with your name and clinic attached — no \"Dr S Clinic\" guesses in their phonebook. See how it works in our guide to [QR code business cards and vCards](/blog/qr-code-business-card-vcard)." },
      ],
    },
    {
      id: "careful",
      heading: "What to be careful about",
      blocks: [
        { type: "p", text: "In India, the National Medical Commission sets rules on how registered medical practitioners may publicise themselves. Those rules can change, so read the current regulations or check with your medical association before adding anything that could look like advertising." },
        { type: "p", text: "A simple principle keeps you on safe ground: **facts, not claims.** Your qualifications, services, timings and location are facts. Promises and comparisons are claims." },
        { type: "table", head: ["Usually fine", "Better to avoid"], rows: [
          ["\"MBBS, MD (Paediatrics)\"", "\"Best child specialist in the city\""],
          ["\"Consultations: Mon–Sat, 10 am–1 pm\"", "\"Guaranteed results\""],
          ["\"Services: diabetes management, thyroid care\"", "Before-and-after photos of patients"],
          ["\"Languages: Hindi, English, Marathi\"", "Discounts or offers on treatments"],
        ] },
        { type: "tip", tone: "warn", title: "Patient privacy", text: "Never put patient names, photos or case details on your card, even with good intentions. Testimonials that identify patients are best left off entirely." },
      ],
    },
    {
      id: "clinics",
      heading: "For clinics with several doctors",
      blocks: [
        { type: "p", text: "Give each doctor their own card with their speciality and timings, and one clinic card that links to all of them. Patients can then save the specific doctor they saw. With DigitalCarda's [cards for teams](/bulk-cards), every doctor's card shares the clinic's template and branding, so the whole practice looks consistent." },
        { type: "p", text: "At reception, a counter standee with a QR code (or an [NFC standee](/blog/nfc-business-card-india) patients can tap) lets people save your details while they wait, without asking your staff to write anything down." },
      ],
    },
    {
      id: "getting-started",
      heading: "Setting one up in a few minutes",
      blocks: [
        { type: "p", text: "Pick a calm, clean design — whites, blues and teals work well for healthcare. Add the checklist items above, preview on your phone, and share the link with your front desk so they can send it to every patient on WhatsApp after booking. You'll find ideas for other professions on our [industries page](/industries)." },
        { type: "cta", title: "A card patients can actually find you with", text: "Timings, location, appointment buttons and Save Contact — ready in minutes. Free for 30 days, no payment needed.", href: "/signup?promo=FREE30D", label: "Create a clinic card free" },
      ],
    },
  ],
  faqs: [
    { q: "What should a doctor's visiting card include?", a: "Name, photo, qualifications, speciality, clinic timings, address with a map link, and a clear way to book — call, WhatsApp or an appointment form. Registration details and languages spoken are also useful." },
    { q: "Can doctors in India advertise on a digital visiting card?", a: "The National Medical Commission has rules on how doctors may publicise themselves. Keep the card factual and check the current regulations before adding anything promotional." },
    { q: "Should a clinic have one card or one per doctor?", a: "Both work well together: one card per doctor with their own timings, and a clinic card that links to all of them." },
    { q: "Can patients save a doctor's number from a digital card?", a: "Yes. A Save Contact button adds the doctor's name, number and clinic straight to the patient's phonebook." },
  ],
  related: ["google-review-qr-code", "what-is-a-digital-visiting-card", "nfc-business-card-india"],
};
