import { Globe, Mail, MapPin, MonitorSmartphone, Nfc, PackageCheck, Printer, Truck, Zap } from "lucide-react";
import LegalLayout, { LegalLink } from "@/components/legal/LegalLayout";
import type { LegalHighlight, LegalSection } from "@/components/legal/LegalLayout";
import { CONTACT } from "@/lib/publicNav";
import { NFC_DELIVERY, NFC_PRODUCTS } from "@/lib/nfcProducts";

/* Shipping & Delivery policy. Delivery times and where we ship come from
   src/lib/nfcProducts.ts — the same values the order page and the order emails
   use — so this page can't promise something the checkout doesn't. */

const HIGHLIGHTS: LegalHighlight[] = [
  { icon: Zap, title: "Plans are delivered online", text: "Nothing is shipped — your plan works in your account straight away." },
  { icon: Truck, title: "Free delivery in India", text: `NFC cards and standees ship free, ${NFC_DELIVERY.label}.` },
  { icon: MapPin, title: "Within India only", text: "Physical products ship to Indian addresses with a 6-digit PIN code." },
  { icon: Mail, title: "Tracking by email", text: "You get the tracking details as soon as your order ships." },
];

const Rule = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] px-4 py-3"><strong className="text-[#0F172A]">{label}:</strong> {children}</li>
);

const mail = <LegalLink to={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>;
const productNames = NFC_PRODUCTS.map((p) => p.name).join(" and ");

const SECTIONS: LegalSection[] = [
  {
    id: "overview", title: "What we deliver", icon: PackageCheck,
    body: <p>DigitalCarda sells two kinds of things: <strong>digital services</strong> — your digital business card, plans, add-ons and custom domains, which are delivered online — and <strong>physical NFC products</strong> ({productNames}), which we print and ship to you. This policy explains how each one reaches you.</p>,
  },
  {
    id: "digital", title: "Digital plans and add-ons", icon: MonitorSmartphone,
    body: (
      <ul className="space-y-2">
        <Rule label="No shipping">plans, add-ons and custom domains are delivered online to your DigitalCarda account. Nothing is posted to you.</Rule>
        <Rule label="Paid online">your plan or add-on starts as soon as the payment is confirmed.</Rule>
        <Rule label="Paid by UPI or bank transfer">it starts once our team has verified the payment, and we email you when it&apos;s done.</Rule>
        <Rule label="Worldwide">your card, link and QR code work in every country.</Rule>
      </ul>
    ),
  },
  {
    id: "nfc", title: "NFC cards and standees", icon: Nfc,
    body: (
      <ul className="space-y-2">
        <Rule label="Where we ship">anywhere in India, to an address with a valid 6-digit PIN code and an Indian mobile number for the delivery person.</Rule>
        <Rule label="Delivery charge">free.</Rule>
        <Rule label="Delivery time">{NFC_DELIVERY.label} after your payment is confirmed. Remote areas can take a little longer.</Rule>
        <Rule label="Orders from outside India">we can&apos;t ship physical products abroad yet. Your digital card still works everywhere.</Rule>
      </ul>
    ),
  },
  {
    id: "printing", title: "Before we print", icon: Printer,
    body: <p>When your order is confirmed we email you the exact text we&apos;ll print and the link your NFC chip and QR code will open. If anything is wrong, reply to that email or {<LegalLink to={CONTACT.whatsappHref}>message us on WhatsApp</LegalLink>} as soon as you can, so we can correct it before printing. We test every chip and QR code before it leaves us.</p>,
  },
  {
    id: "tracking", title: "Tracking your order", icon: Truck,
    body: <p>You can follow your order under <strong>Dashboard → NFC Cards</strong>, where it moves from Confirmed to Printing, Shipped and Delivered. When it ships, we email you the tracking details.</p>,
  },
  {
    id: "problems", title: "If something goes wrong", icon: Globe,
    body: <p>If your parcel hasn&apos;t arrived within the delivery time, arrives damaged, or the card doesn&apos;t open your digital card when tapped or scanned, email {mail} or <LegalLink to={CONTACT.whatsappHref}>WhatsApp us</LegalLink> with your order number and, for damage, a photo. We&apos;ll look into it and get back to you. Refunds are covered by our <LegalLink to="/refund-policy">Refund Policy</LegalLink>.</p>,
  },
  {
    id: "contact-us", title: "Questions?", icon: Mail,
    body: <p>For anything about delivery, email {mail}, call <LegalLink to={CONTACT.phoneHref}>{CONTACT.phone}</LegalLink> or <LegalLink to={CONTACT.whatsappHref}>message us on WhatsApp</LegalLink>. See also our <LegalLink to="/terms-of-service">Terms &amp; Conditions</LegalLink>.</p>,
  },
];

export default function ShippingPolicy() {
  return (
    <LegalLayout
      current="shipping"
      updated="September 21, 2026"
      readMinutes={3}
      intro={`Plans and add-ons are delivered online, straight to your account. NFC cards and standees are printed for you and shipped free within India, ${NFC_DELIVERY.label}.`}
      highlights={HIGHLIGHTS}
      sections={SECTIONS}
    />
  );
}
