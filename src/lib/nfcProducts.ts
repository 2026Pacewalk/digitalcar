/* Physical NFC products — ONE definition used by the pricing page, the
 * dashboard order page and the server. The server charges from this table,
 * never from a price the browser sends.
 *
 * Import-free so the server bundle can use it directly. */

export type NfcProductId = "nfc_card" | "nfc_standee";

export type NfcProduct = {
  id: NfcProductId;
  name: string;
  short: string;
  price: number;
  unit: string;
  print: string;
  tagline: string;
  points: string[];
};

export const NFC_PRODUCTS: NfcProduct[] = [
  {
    id: "nfc_card",
    name: "NFC PVC Card",
    short: "NFC Card",
    price: 499,
    unit: "card",
    print: "Printed on both sides",
    tagline: "A premium PVC business card with an NFC chip inside — tap it on a phone and your digital card opens.",
    points: [
      "Tap to share on NFC phones, with a QR code on the back for every other phone",
      "Full-colour printing on both sides",
      "Durable PVC, the size of a bank card",
      "Opens your card link, so changing your details never means reprinting",
    ],
  },
  {
    id: "nfc_standee",
    name: "NFC Standee",
    short: "NFC Standee",
    price: 1499,
    unit: "standee",
    print: "Printed on one side",
    tagline: "A counter standee for your shop, clinic or reception — customers tap or scan to save your details.",
    points: [
      "Tap with an NFC phone or scan the printed QR code",
      "Full-colour single-side print with your name and QR code",
      "Stands on any counter, desk or reception table",
      "Customers can save your contact, leave a review or pay on the spot",
    ],
  },
];

export const NFC_DELIVERY = { label: "3–7 working days", minDays: 3, maxDays: 7, area: "Pan-India" } as const;

export const NFC_MAX_QTY = 100;

export const nfcProduct = (id: string): NfcProduct | null => NFC_PRODUCTS.find((p) => p.id === id) ?? null;
