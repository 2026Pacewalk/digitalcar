#!/usr/bin/env node
/*
 * Print every WhatsApp message template, filled with sample data.
 *
 *   npx tsx scripts/preview-whatsapp.mjs
 *
 * A DEV AID. These messages are plain text read on a phone, so the only useful
 * review is reading them as text — which is exactly what this prints.
 */
import { WA_TEMPLATES, buildWaMessage, WA_SOFT_LIMIT } from "../src/lib/whatsappMessage.ts";

const d = {
  name: "Shekhar Jain",
  designation: "Managing Director",
  company: "PACEWALK Pvt. Ltd.",
  phone: "+91 99881 44844",
  email: "md@pacewalk.com",
  website: "https://pacewalk.com",
  address: "SCO-209, Green Lotus Avenue, Zirakpur",
  cardUrl: "https://digitalcarda.in/pacewalk",
  mapUrl: "https://maps.app.goo.gl/example",
  reviewUrl: "https://g.page/r/pacewalk/review",
  upi: "pacewalk@upi",
};

for (const t of WA_TEMPLATES) {
  const m = buildWaMessage(t.id, d);
  const flag = m.length > WA_SOFT_LIMIT ? "  ⚠ OVER LIMIT" : "";
  console.log(`\n${"═".repeat(66)}`);
  console.log(`${t.name}   [${t.slot}]   ${m.length} chars${flag}`);
  console.log("─".repeat(66));
  console.log(m);
}

// A card with almost nothing filled in must still produce a usable message —
// no stray blank lines, no "undefined", no dangling punctuation.
const bare = {
  name: "", designation: "", company: "", phone: "", email: "", website: "",
  address: "", cardUrl: "https://digitalcarda.in/newuser", mapUrl: "", reviewUrl: "", upi: "",
};
console.log(`\n${"═".repeat(66)}`);
console.log("EMPTY-CARD CHECK — welcome / thanks / payment on a blank profile");
console.log("─".repeat(66));
for (const id of ["welcome", "thanks", "payment"]) {
  console.log(`\n--- ${id} ---`);
  console.log(buildWaMessage(id, bare));
}
