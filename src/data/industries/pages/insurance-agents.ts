import type { IndustryPage } from "../types";

/* Insurance Agents & Financial Advisors. Share flow: whatsapp-link (the card
   link sent in the chat after the first call). IRDAI / insurer wording in
   conduct: no offers or rebates anywhere on the page. LIC is named
   descriptively only, never with its logo. */
export const insuranceAgents: IndustryPage = {
  slug: "insurance-agents",
  name: "Insurance Agents & Financial Advisors",
  crumb: "Insurance Agents",
  audience: "insurance agents",
  group: "legal-finance",
  order: 4,

  h1: "Digital Visiting Card for Insurance Agents",
  seoTitle: "Insurance Agent Visiting Card: Digital & QR | DigitalCarda",
  description: "A digital visiting card for LIC and insurance agents: plans you offer, WhatsApp, call, an enquiry form and save contact. Free for 30 days.",
  excerpt: "The plans you handle, WhatsApp, an enquiry form and save contact, sent as one link after the first call.",
  answer: "A **digital visiting card for insurance agents** is one link with your name, the insurer you represent, your agency code, the plans you handle and buttons to call, WhatsApp or save your number. Customers open it from a WhatsApp message after your first call, or by scanning your QR, and every enquiry lands in your Leads list.",
  primaryKeyword: "insurance agent visiting card",
  keywords: [
    "lic agent visiting card",
    "digital business card for insurance agents",
    "lic agent digital card",
    "mutual fund distributor visiting card",
    "financial advisor visiting card",
    "lic agent ka visiting card kaise banaye",
  ],
  searchTerms: ["lic", "insurance", "mutual fund", "financial advisor", "loan", "policy"],
  publishedAt: "2026-09-17",
  updatedAt: "2026-09-17",

  theme: { accent: "#2563EB", ink: "#1D4ED8", icon: "shield-check", motif: "shield" },

  sample: {
    name: "Deepak Sharma",
    role: "Insurance & Loan Advisor",
    org: "SecureLife Advisors",
    services: ["Life & health insurance", "Term plans", "Claims help"],
  },

  pains: [
    {
      pain: "Customers save you as \"insurance agent\" and cannot find you when a claim comes.",
      fix: "**Save Contact** puts your full name, agency, number and email in their phonebook in one tap, so they find you by name.",
      feature: "saveContact",
    },
    {
      pain: "A happy customer wants to refer you, but all they can forward is a bare phone number.",
      fix: "They forward your digitalcarda.in link instead. It opens with your name and a preview, and the new customer can call or WhatsApp.",
      feature: "shareLink",
    },
    {
      pain: "Enquiries pile up across chats, and the follow-up after the first meeting slips.",
      fix: "Enquiries from your card land in your **Leads** list, where you mark the stage, add a note and set a follow-up date.",
      feature: "leadsPipeline",
    },
  ],

  checklist: [
    { item: "Your name, photo and the insurer you represent", why: "Customers buy from a person they remember. A clear face and the insurer's name in plain text do that job.", part: "profile" },
    { item: "Your agency code, as issued by the insurer", why: "A plain fact a customer can check with the insurer. Write it exactly as it appears on your appointment letter.", part: "profile" },
    { item: "Your ARN, if you distribute mutual funds", why: "AMFI registers distributors and issues the ARN. Show it as issued and check AMFI's current guidance on display.", part: "profile" },
    { item: "The number you answer on WhatsApp", why: "Customers reply on WhatsApp after the first call, so put that number on the WhatsApp button, not the landline.", part: "actions" },
    { item: "The plans and services you handle", why: "Term, health, motor or a home loan, each as a service with a button, so a customer asks about the right one.", part: "services" },
    { item: "Claims help, said plainly", why: "Say that you help with claim paperwork and premium due dates. Families stay with an agent who is there after the sale.", part: "about" },
    { item: "Office address with a Maps link", why: "Customers who prefer to meet tap the address for directions instead of calling you for the route.", part: "actions" },
    { item: "An enquiry form for customers who won't call", why: "They send their name, number and the cover they need, and it lands in your Leads list.", part: "enquiry" },
  ],

  useCases: [
    { need: "Customers asking about a plan", how: "One tap opens a WhatsApp chat with you. A plan's service button opens the chat with that plan's name already typed in.", feature: "whatsapp" },
    { need: "Showing the plans you handle", how: "List term plans, health cover, motor policies and loans as services, each with a note and a button to call or WhatsApp you.", feature: "servicesWithPrices" },
    { need: "Cover requests from customers who won't call", how: "Customers send their name, number, email and the cover they need from your card; those who leave an email get an automatic reply.", feature: "enquiryForm" },
    { need: "Following up before the interest fades", how: "Every enquiry lands in your Leads list. Mark its stage, add notes, set a follow-up date and reply by call or WhatsApp.", feature: "leadsPipeline" },
    { need: "Referrals from existing customers", how: "Customers forward your digitalcarda.in link on WhatsApp. It shows your name with a proper preview and opens your card.", feature: "shareLink" },
    { need: "Being found when a claim comes", how: "**Save Contact** puts your name, number, email, website and office address into the customer's phonebook in one tap.", feature: "saveContact" },
  ],

  shareFlow: { kind: "whatsapp-link", where: "first call", client: "customer" },

  conduct: {
    body: "IRDAI, your insurer (AMFI for mutual fund distributors)",
    note: "**IRDAI** and **your insurer** set the rules on agent advertising, and rebates or gifts for buying a policy are not allowed. Keep the card to facts: name, agency code, insurer, plans and contact details. Mutual fund distributors show their ARN and follow **AMFI** guidance. Check the current rules before you publish.",
    avoid: ["offers"],
  },

  faqs: [
    {
      q: "What should an insurance agent put on a visiting card?",
      a: "Your name and photo, the insurer you represent written in plain text, your agency code, the plans you handle, the number you answer on WhatsApp, your office address and an email. On a digital card, add buttons to call, WhatsApp and save your number, and an enquiry form for customers who prefer to write. Leave out discounts, gifts and promises about returns; keep it to facts.",
    },
    {
      q: "How do I make an LIC agent visiting card?",
      a: "Sign up free, choose a design and write LIC agent and your agency code in plain text under your name, then add the plans you handle as services, your WhatsApp number and office address. Use your own photo and colours rather than the insurer's logo, which belongs to the insurer. Share the link on WhatsApp after every first call. You can write the details in Hindi or any language; the buttons stay in English.",
    },
    {
      q: "What should a mutual fund distributor show on a visiting card?",
      a: "Your name, your ARN as issued by AMFI, the name you are registered under and your contact details. AMFI has guidance on how distributors present themselves, including the ARN, and it changes from time to time, so check AMFI's current guidance before you publish. Keep the card to facts, with no promised returns or comparisons. This is general information, not legal advice.",
    },
    {
      q: "Can customers WhatsApp me about a policy from the card?",
      a: "Yes. The WhatsApp button opens a chat with you in one tap, and each plan you list as a service has its own button that opens WhatsApp with that plan's name already typed in, so you know which policy they mean. Enquiries sent through the form land in your Leads list instead, where you set a follow-up date. The card does not send messages by itself; every reply comes from you.",
    },
    {
      q: "Can customers pay their premium from my card?",
      a: "No. Your card does not take payments, and premiums go to the insurer, not to you. What you can do is add a service button that opens a link, such as the insurer's official premium payment page, so customers pay in the right place. Claims help and renewal dates are best handled in the WhatsApp chat the card opens.",
    },
    {
      q: "How much does a digital visiting card for an insurance agent cost?",
      a: "Free for 30 days with no payment details, which covers a full month of first calls before you decide. After that, Gold is ₹99 a month or ₹999 a year, and Platinum is ₹199 a month or ₹1,999 a year. Gold covers what an agent uses day to day: the plans you handle as services, WhatsApp, the enquiry form and your Leads list are on every plan. Your link and QR stay the same when you upgrade, so a QR printed on your paper card keeps working.",
    },
  ],

  templateNatures: ["Insurance & Loans", "Finance & Tax"],
  whatsappText: "Hi DigitalCarda, I want a digital visiting card for my insurance business",
  nfcFit: false,
  bulkFit: false,
  relatedIndustries: ["chartered-accountants", "real-estate", "automobile"],
  relatedPosts: ["how-to-make-a-digital-visiting-card", "qr-code-business-card-vcard", "what-is-a-digital-visiting-card"],
};

export default insuranceAgents;
