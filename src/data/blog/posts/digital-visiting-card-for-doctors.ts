import type { BlogPost } from "../types";

export const digitalVisitingCardForDoctors: BlogPost = {
  slug: "digital-visiting-card-for-doctors",
  title: "Doctor Visiting Card Format: What to Include (and What to Leave Off)",
  seoTitle: "Doctor Visiting Card Format: What to Include & Leave Off",
  description: "The format for a doctor's or clinic's visiting card: timings, location, a booking button and registration details, plus what NMC rules say to leave off.",
  excerpt: "Patients need your timings, your location and a way to book, not your life story. The visiting card format that works for doctors, dentists and clinics, and what to leave off.",
  category: "industries",
  keywords: ["doctor visiting card format", "what to write on a doctor visiting card", "clinic visiting card", "NMC rules doctor visiting card"],
  publishedAt: "2026-07-03",
  updatedAt: "2026-09-17",
  cover: { motif: "clinic", tone: "teal" },
  image: { src: "/blog/digital-visiting-card-for-doctors.jpg", alt: "A phone showing a doctor’s digital visiting card with call, WhatsApp and appointment buttons, beside a clinic QR standee", width: 1600, height: 900 },
  takeaways: [
    "Put clinic timings, location and an appointment button at the top.",
    "Keep it factual: qualifications, registration number, specialities and languages spoken.",
    "Check the National Medical Commission's current rules on how doctors may publicise themselves before adding anything promotional.",
    "A QR standee at reception lets patients save your number while they wait, without asking staff.",
  ],
  intro: [
    "A **doctor's digital visiting card** is a small mobile web page, shared as a link or QR code, that shows your name, qualifications, clinic timings and address, with one-tap Call, WhatsApp and Save Contact buttons. What patients need most from it is simple: when you consult, where the clinic is, and how to book.",
    "Here's the gap it closes. A patient leaves your clinic with a prescription and a vague memory of your name. Three weeks later they need a follow-up, search for \"Dr Sharma\", can't find the right one, and end up somewhere else.",
    "A doctor's card isn't a sales page, though. Here's what belongs on it, what to leave off, and how to set it up.",
  ],
  sections: [
    {
      id: "what-patients-need",
      heading: "What patients actually look for on a doctor's card",
      blocks: [
        { type: "p", text: "Put yourself in the patient's place: often worried, sometimes in pain, usually on a phone. They want answers to four questions, fast:" },
        { type: "steps", items: [
          { title: "Is this the right doctor?", text: "Your full name, photo, qualifications and speciality, stated plainly." },
          { title: "When can I come?", text: "Clinic timings for each day, and which days you're not available." },
          { title: "Where exactly are you?", text: "The clinic address with a Google Maps button. Mention the floor or a landmark if the building is confusing." },
          { title: "How do I book?", text: "One clear button (call, WhatsApp or an enquiry form), whichever your front desk actually answers." },
        ] },
      ],
    },
    {
      id: "checklist",
      heading: "Doctor visiting card format: what to include",
      blocks: [
        { type: "p", text: "A good format for a doctor's visiting card covers who you are, when and where you consult, and how patients can reach you:" },
        { type: "checklist", items: [
          "Full name, photo, qualifications and speciality",
          "Medical registration number and council, if you're comfortable displaying it",
          "Clinic or hospital name, with timings for each location if you consult at more than one",
          "Call and WhatsApp buttons for appointments",
          "Address with a [Google Maps link](https://support.google.com/maps/answer/144361)",
          "Services offered, in words patients use (\"root canal treatment\", \"child vaccination\")",
          "Languages you speak, so patients know they can explain their symptoms comfortably",
          "Your [Google review link](https://support.google.com/business/answer/16816815), so satisfied patients can share their experience",
          "Emergency guidance, such as the nearest hospital to contact out of hours",
        ] },
        { type: "tip", title: "Save Contact is your best friend", text: "Patients who tap **Save Contact** get your number saved with your name and clinic attached, not a guess like \"Dr S Clinic\" in their phonebook. See how it works in our guide to [QR code business cards and vCards](/blog/qr-code-business-card-vcard)." },
      ],
    },
    {
      id: "careful",
      heading: "What to be careful about: NMC rules and patient privacy",
      blocks: [
        { type: "p", text: "In India, the [National Medical Commission](https://www.nmc.org.in) sets rules on how registered medical practitioners may publicise themselves. Those rules can change, so read the current regulations or check with your medical association before adding anything that could look like advertising." },
        { type: "p", text: "One principle keeps you on safe ground: **facts, not claims.** Your qualifications, services, timings and location are facts. Promises and comparisons are claims." },
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
        { type: "p", text: "Give each doctor their own card with their speciality and timings, and one clinic card that links to all of them. Patients can then save the specific doctor they saw. With DigitalCarda's [cards for teams](/bulk-cards), you can use the same template for every doctor so the whole practice looks consistent." },
        { type: "p", text: "At reception, a counter standee with a QR code (or an [NFC standee](/blog/nfc-business-card-india) patients can tap) lets people save your details while they wait, without asking your staff to write anything down. Put a [Google review QR code](/blog/google-review-qr-code) on the same counter." },
        { type: "related", slug: "how-to-make-a-digital-visiting-card", note: "Want the full walkthrough? This guide takes you step by step from a blank page to a live card." },
      ],
    },
    {
      id: "getting-started",
      heading: "Putting the format into a digital card",
      blocks: [
        { type: "steps", items: [
          { title: "Pick a calm, clean design", text: "Whites, blues and teals suit a clinic visiting card design, and our [layout and colour ideas for visiting cards](/blog/visiting-card-design-ideas) help keep it easy to read." },
          { title: "Add the checklist details", text: "Start with timings, address and booking buttons." },
          { title: "Preview on your phone", text: "Tap every button to check the links work." },
          { title: "Share it after every booking", text: "Your front desk can send the link to patients on WhatsApp." },
        ] },
        { type: "cta", title: "Make your clinic's card", text: "See what a digital visiting card for doctors includes, with sample designs.", href: "/industries/doctors", label: "Digital cards for doctors" },
        { type: "p", text: "You'll find ideas for other professions on our [industries page](/industries)." },
        { type: "cta", title: "A card patients can actually find you with", text: "Timings, location, appointment buttons and Save Contact on one page. Free for 30 days, no payment needed.", href: "/signup?promo=FREE30D", label: "Create a clinic card free" },
      ],
    },
  ],
  faqs: [
    { q: "What should a doctor's visiting card include?", a: "A doctor's visiting card should include your name, photo, qualifications, speciality, clinic timings, address with a map link, and a clear way to book by call, WhatsApp or a form. Registration details and languages spoken are also useful." },
    { q: "Can doctors in India advertise on a digital visiting card?", a: "Doctors in India must follow the National Medical Commission's rules on how they publicise themselves. Keep the card factual (qualifications, services, timings, location) and check the current regulations before adding anything promotional." },
    { q: "Should a clinic have one card or one card per doctor?", a: "A clinic works best with both: one card per doctor showing their own speciality and timings, and one clinic card that links to all of them." },
    { q: "Can patients save a doctor's number from a digital card?", a: "Yes. A Save Contact button adds the doctor's name, number and clinic straight to the patient's phonebook as a contact card (vCard)." },
    { q: "Can I make a doctor visiting card online for free?", a: "You can make a doctor visiting card online with DigitalCarda and use it free for 30 days, with no payment needed. Paid plans start at Rs 99 a month." },
    { q: "Is a digital business card for doctors better than a printed one?", a: "A digital business card for doctors can be updated when timings change and lets patients call, WhatsApp or save your number in one tap, which a printed card can't. You can also print its QR code on a paper card." },
  ],
  related: ["google-review-qr-code", "what-is-a-digital-visiting-card", "nfc-business-card-india"],
};
