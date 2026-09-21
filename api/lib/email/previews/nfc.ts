/*
 * Gallery previews for the NFC emails. Fictional data only: "pacewalk" is the
 * owner's own demo card; everything else is made up (@example.com, +91 90000 0xxxx,
 * pay_DEMO…). The "hostile" variants prove user text is escaped and wraps.
 */
import type { Email } from "../kit";
import {
  nfcOrderAdminEmail, nfcOrderCancelledEmail, nfcOrderConfirmedEmail, nfcOrderDeliveredEmail,
  nfcOrderReceivedEmail, nfcOrderShippedEmail,
  type NfcItem, type NfcPrint, type NfcShip,
} from "../nfc";

const MODULE = "nfc";
const CARD_URL = "https://digitalcarda.in/pacewalk";
const AT = new Date("2026-09-21T10:12:00Z");

const CARD = { product: "nfc_card", name: "NFC PVC Card", print: "Printed on both sides", quantity: 2, unitPrice: 499, amount: 998 };
const STANDEE = { product: "nfc_standee", name: "NFC Standee", print: "Printed on one side", quantity: 1, unitPrice: 1499, amount: 1499 };
const CARD_ONE: NfcItem = { ...CARD, quantity: 1, amount: 499 };

const SHIP: NfcShip = {
  name: "Aarav Mehta", phone: "9000001234",
  line1: "Flat 402, Sunrise Residency, Sector 70", line2: "Near City Park",
  city: "Mohali", state: "Punjab", pincode: "160062",
};
const PRINT: NfcPrint = { name: "Aarav Mehta", title: "Founder & Principal Designer", company: "Mehta Interiors", phone: "+91 90000 01234" };
const PRINT_LINES = [PRINT.name, PRINT.title!, PRINT.company!, PRINT.phone!];
const ADDRESS = "Aarav Mehta, Flat 402, Sunrise Residency, Sector 70, Near City Park, Mohali, Punjab 160062 · 9000001234";

const HOSTILE_NAME = `Aarav <b>"Mehta"</b> & Sons' <script>alert(1)</script>`;
const HOSTILE_SHIP: NfcShip = {
  name: HOSTILE_NAME, phone: "9000001299",
  line1: `Plot-77-Supercalifragilisticexpialidocious-Industrial-Estate-Phase-Two-Extension <img src=x onerror=alert(1)>`,
  line2: `"Behind the temple" & <u>opposite</u> Sharma's`,
  city: "Zirakpur", state: "Punjab", pincode: "140603",
};
const HOSTILE_LINES = [HOSTILE_NAME, "Chief<br>Everything-Officer-With-An-Extremely-Long-Unbroken-Designation-Title", `"Mehta & Mehta" <i>Associates</i>`, "+91 90000 01299"];

type Preview = { name: string; module: string; audience: "customer" | "admin" | "visitor" | "reseller" | "prospect"; variant?: string; render: () => Email };

export const previews: Preview[] = [
  /* ── Received (manual checkout) ── */
  {
    name: "nfcOrderReceivedEmail", module: MODULE, audience: "customer", variant: "upi-and-bank",
    render: () => nfcOrderReceivedEmail({
      name: "Aarav Mehta", ids: [102, 101], items: [CARD, STANDEE], total: 2497,
      printLines: PRINT_LINES, print: PRINT, cardUrl: CARD_URL, ship: SHIP, at: AT,
      payment: {
        upiId: "digitalcarda.demo@examplebank", payeeName: "DigitalCarda",
        bank: { name: "Example Bank", account: "000011112222", ifsc: "EXMP0001234", holder: "DigitalCarda Demo" },
        note: "Please add your order number in the payment remark.",
      },
    }),
  },
  {
    name: "nfcOrderReceivedEmail", module: MODULE, audience: "customer", variant: "no-payment-details",
    render: () => nfcOrderReceivedEmail({
      name: "Aarav Mehta", ids: [101], items: [CARD_ONE],
      printLines: ["Aarav Mehta", "Mehta Interiors", "+91 90000 01234"], cardUrl: CARD_URL, ship: SHIP, at: AT,
    }),
  },
  {
    name: "nfcOrderReceivedEmail", module: MODULE, audience: "customer", variant: "hosted-qr-standee",
    render: () => nfcOrderReceivedEmail({
      name: "Diya Kapoor", ids: [140], items: [STANDEE], total: 1499,
      printLines: ["Diya Kapoor", "Owner", "Nayara Interiors"],
      print: { name: "Diya Kapoor", title: "Owner", company: "Nayara Interiors" },
      logoUrl: "https://digitalcarda.in/samples/sample-logo.png",
      cardUrl: CARD_URL, address: "Diya Kapoor, 12 Lake View Road, Udaipur, Rajasthan 313001 · 9000001250",
      payment: { upiId: "digitalcarda.demo@examplebank", upiQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=328x328&data=upi%3A%2F%2Fpay%3Fpa%3Ddigitalcarda.demo%40examplebank" },
    }),
  },

  /* ── Confirmed (paid) ── */
  {
    name: "nfcOrderConfirmedEmail", module: MODULE, audience: "customer", variant: "legacy-single-card",
    // Exactly what api/nfc-router.ts passes today.
    render: () => nfcOrderConfirmedEmail({
      name: "Aarav Mehta", orderId: 101, productName: "NFC PVC Card", quantity: 1,
      items: [{ name: "NFC PVC Card", quantity: 1 }], amount: 499,
      printLines: PRINT_LINES, address: ADDRESS, cardUrl: CARD_URL, deliveryDays: "3–7 working days",
      paidAt: AT,
    }),
  },
  {
    name: "nfcOrderConfirmedEmail", module: MODULE, audience: "customer", variant: "card-and-standee-full",
    render: () => nfcOrderConfirmedEmail({
      name: "Aarav Mehta", orderId: 101, ids: [101, 102], productName: "NFC PVC Card", quantity: 2,
      items: [CARD, STANDEE], amount: 2497,
      printLines: PRINT_LINES, print: PRINT, address: ADDRESS, ship: SHIP, cardUrl: CARD_URL,
      deliveryDays: "3–7 working days", paymentId: "pay_DEMO123", paidAt: AT,
    }),
  },
  {
    name: "nfcOrderConfirmedEmail", module: MODULE, audience: "customer", variant: "legacy-both-with-logo",
    // Legacy items (no amounts) for two products: amounts come from the catalogue only because they add up.
    render: () => nfcOrderConfirmedEmail({
      name: "Diya Kapoor", orderId: 140, productName: "NFC PVC Card", quantity: 1,
      items: [{ name: "NFC PVC Card", quantity: 1 }, { name: "NFC Standee", quantity: 1 }], amount: 1998,
      printLines: ["Diya Kapoor", "Owner", "Nayara Interiors", "+91 90000 01250"],
      logoUrl: "https://digitalcarda.in/samples/sample-logo.png",
      address: "Diya Kapoor, 12 Lake View Road, Udaipur, Rajasthan 313001 · 9000001250",
      cardUrl: CARD_URL, deliveryDays: "3–7 working days", paidAt: AT,
    }),
  },

  /* ── Shipped ── */
  {
    name: "nfcOrderShippedEmail", module: MODULE, audience: "customer", variant: "legacy-tracking-text",
    render: () => nfcOrderShippedEmail({ name: "Aarav Mehta", orderId: 101, productName: "NFC PVC Card", quantity: 1, tracking: "DTDC D12345678" }),
  },
  {
    name: "nfcOrderShippedEmail", module: MODULE, audience: "customer", variant: "whole-checkout-tracking-link",
    render: () => nfcOrderShippedEmail({
      name: "Aarav Mehta", orderId: 101, ids: [101, 102], productName: "NFC PVC Card", quantity: 2,
      items: [CARD, STANDEE], tracking: "EX123456789IN", courier: "India Post Speed Post",
      trackingUrl: "https://tracking.example.com/?id=EX123456789IN", ship: SHIP, cardUrl: CARD_URL,
    }),
  },
  {
    name: "nfcOrderShippedEmail", module: MODULE, audience: "customer", variant: "no-tracking",
    render: () => nfcOrderShippedEmail({ name: null, orderId: 140, productName: "NFC Standee", quantity: 1, tracking: null }),
  },

  /* ── Delivered ── */
  {
    name: "nfcOrderDeliveredEmail", module: MODULE, audience: "customer", variant: "card-and-standee",
    render: () => nfcOrderDeliveredEmail({ name: "Aarav Mehta", ids: [101, 102], items: [CARD, STANDEE], cardUrl: CARD_URL }),
  },
  {
    name: "nfcOrderDeliveredEmail", module: MODULE, audience: "customer", variant: "card-only-no-link",
    render: () => nfcOrderDeliveredEmail({ name: "Aarav Mehta", ids: [101], items: [{ name: "NFC PVC Card", quantity: 1 }] }),
  },

  /* ── Cancelled ── */
  {
    name: "nfcOrderCancelledEmail", module: MODULE, audience: "customer", variant: "paid-with-reason",
    render: () => nfcOrderCancelledEmail({
      name: "Aarav Mehta", ids: [101, 102], items: [CARD, STANDEE], amount: 2497, paid: true, paymentId: "pay_DEMO123",
      reason: "You asked us to cancel this order on WhatsApp so you could change the design.\nWe'll help you place a fresh one.",
    }),
  },
  {
    name: "nfcOrderCancelledEmail", module: MODULE, audience: "customer", variant: "unpaid-no-reason",
    render: () => nfcOrderCancelledEmail({ name: "Aarav Mehta", ids: [101], items: [CARD_ONE] }),
  },
  {
    name: "nfcOrderCancelledEmail", module: MODULE, audience: "customer", variant: "hostile",
    render: () => nfcOrderCancelledEmail({
      name: HOSTILE_NAME, ids: [666], items: [{ name: `<b>Card</b> & "Co"`, quantity: 1, amount: 499 }],
      reason: `<script>alert("x")</script> & 'quotes' "here"`,
    }),
  },

  /* ── Team alert ── */
  {
    name: "nfcOrderAdminEmail", module: MODULE, audience: "admin", variant: "paid-card-and-standee",
    render: () => nfcOrderAdminEmail({
      ids: [102, 101], paid: true, paymentId: "pay_DEMO123",
      items: [CARD, STANDEE],
      printLines: PRINT_LINES, print: PRINT, cardUrl: CARD_URL,
      logoUrl: "https://cdn.example.com/uploads/customer-9/mehta-interiors-logo.png",
      ship: { ...SHIP, phone: "9000001234" },
      customer: { id: 1042, name: "Aarav Mehta", email: "aarav@example.com" },
      delivery: { label: "3–7 working days", maxDays: 7 }, at: AT,
    }),
  },
  {
    name: "nfcOrderAdminEmail", module: MODULE, audience: "admin", variant: "awaiting-payment-card",
    // What notifyTeam() passes today on a manual checkout: no `print`, so the middle line is ambiguous.
    render: () => nfcOrderAdminEmail({
      ids: [101], paid: false,
      items: [{ product: "nfc_card", name: "NFC PVC Card", print: "Printed on both sides", quantity: 1, unitPrice: 499, amount: 499 }],
      printLines: ["Aarav Mehta", "Mehta Interiors", "+91 90000 01234"], cardUrl: CARD_URL, logoUrl: null,
      ship: { ...SHIP, phone: "9000001234" },
      customer: { id: 1042, name: "Aarav Mehta", email: "aarav@example.com" },
      delivery: { label: "3–7 working days", maxDays: 7 }, at: AT, customerEmailed: true,
    }),
  },
  {
    name: "nfcOrderAdminEmail", module: MODULE, audience: "admin", variant: "hostile",
    render: () => nfcOrderAdminEmail({
      ids: [666], paid: false,
      items: [{ product: "nfc_standee", name: "NFC Standee", print: "Printed on one side", quantity: 1, unitPrice: 1499, amount: 1499 }],
      printLines: HOSTILE_LINES, cardUrl: CARD_URL,
      logoUrl: "https://files.example-cdn.com/u/9/%3Cb%3Elogo%3C%2Fb%3E-with-a-very-long-file-name-for-testing.png",
      ship: { ...HOSTILE_SHIP, phone: "9000001299" },
      customer: { id: 7, name: HOSTILE_NAME, email: "o'brien+test@example.com" },
      delivery: { label: "3–7 working days", maxDays: 7 }, at: AT,
    }),
  },
];
