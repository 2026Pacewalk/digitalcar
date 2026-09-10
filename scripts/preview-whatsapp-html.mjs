#!/usr/bin/env node
/*
 * Render every WhatsApp template as a chat bubble, so the messages can be
 * judged the way they are actually read.
 *
 *   npx tsx scripts/preview-whatsapp-html.mjs
 *
 * A DEV AID — writes a git-ignored page. It imports the SAME builder and the
 * same markup renderer the dashboard uses, so what shows here is what the
 * customer sees.
 */
import fs from "node:fs";
import { WA_TEMPLATES, buildWaMessage, waPreviewHtml, WA_SOFT_LIMIT } from "../src/lib/whatsappMessage.ts";

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

const cards = WA_TEMPLATES.map((t) => {
  const msg = buildWaMessage(t.id, d);
  const over = msg.length > WA_SOFT_LIMIT;
  return `
  <section>
    <h2>${t.name}<span class="slot">${t.slot}</span></h2>
    <p class="blurb">${t.blurb}</p>
    <div class="chat">
      <div class="bubble">
        <div class="body">${waPreviewHtml(msg)}</div>
        <div class="time">10:24</div>
      </div>
    </div>
    <p class="count${over ? " over" : ""}">${msg.length} characters${over ? " — over the WhatsApp limit" : ""}</p>
  </section>`;
}).join("");

fs.writeFileSync("public/_wa-preview.html", `<!doctype html>
<meta charset="utf-8"><title>WhatsApp messages</title>
<style>
  body{background:#f1f3f5;margin:0;padding:26px;font:14px system-ui,sans-serif;color:#0f172a}
  h1{font-size:19px;margin:0 0 4px}
  .lede{color:#64748b;margin:0 0 22px;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:18px;align-items:start}
  section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 14px 10px}
  h2{font-size:13px;margin:0 0 2px;display:flex;align-items:center;gap:8px;justify-content:space-between}
  .slot{font-size:10px;font-weight:600;color:#16a34a;background:#dcfce7;padding:2px 7px;border-radius:20px;white-space:nowrap}
  .blurb{font-size:11.5px;color:#94a3b8;margin:0 0 10px}
  .chat{background:#efe7de;border-radius:8px;padding:12px}
  .bubble{background:#fff;border-radius:8px;border-top-left-radius:0;padding:8px 10px;box-shadow:0 1px 1px #0000001a;max-width:100%}
  .body{font-size:13px;line-height:1.45;color:#111b21;white-space:pre-wrap;word-break:break-word}
  .time{font-size:10px;color:#8696a0;text-align:right;margin-top:3px}
  .count{font-size:10.5px;color:#94a3b8;margin:8px 0 0}
  .count.over{color:#dc2626;font-weight:600}
</style>
<h1>DigitalCarda — WhatsApp messages</h1>
<p class="lede">Twelve ready-made replies, filled in from a customer's card. Each is editable before copying.</p>
<div class="grid">${cards}</div>
`);
console.log("✓ public/_wa-preview.html");
