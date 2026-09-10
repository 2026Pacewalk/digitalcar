#!/usr/bin/env node
/*
 * Render every signature template to public/_sig-preview.html so they can be
 * eyeballed in a browser side by side.
 *
 *   node scripts/preview-signatures.mjs [origin]
 *
 * A DEV AID — the file it writes is git-ignored and never shipped. `origin`
 * defaults to the dev server so the hosted icons resolve locally.
 */
import fs from "node:fs";
import { SIGNATURE_TEMPLATES, buildSignature } from "../src/lib/emailSignature.ts";

const ORIGIN = process.argv[2] || "http://localhost:3000";
const cardUrl = `${ORIGIN}/aarav-mehta`;

const data = {
  name: "Aarav Mehta",
  designation: "Director — Sales & Partnerships",
  company: "Nayara Interiors Pvt Ltd",
  phone: "+91 98110 24680",
  whatsapp: "+91 98110 24681",
  email: "aarav@nayarainteriors.in",
  website: "https://nayarainteriors.in",
  address: "504 Trident Tower, Sector 44, Gurugram 122003",
  logo: `${ORIGIN}/logo.png`,
  cardUrl,
  qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(cardUrl)}`,
  socials: [
    { platform: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/aarav" },
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/nayara" },
    { platform: "facebook", label: "Facebook", url: "https://facebook.com/nayara" },
    { platform: "youtube", label: "YouTube", url: "https://youtube.com/@nayara" },
  ],
};

const opts = {
  accent: "#F7B31C",
  showLogo: true,
  showQr: true,
  showSocials: true,
  showAddress: true,
  tagline: "Save my details in one tap",
};

const blocks = SIGNATURE_TEMPLATES.map((t) => `
  <section>
    <h2>${t.name}<small>${t.blurb}</small></h2>
    <div class="mail">
      <p class="body">Thanks — sending the revised quote across today.</p>
      <hr />
      ${buildSignature(t.id, data, opts)}
    </div>
  </section>`).join("");

fs.writeFileSync("public/_sig-preview.html", `<!doctype html>
<meta charset="utf-8"><title>Signature templates</title>
<style>
  body{background:#eef1f5;margin:0;padding:28px;font:14px system-ui,sans-serif;color:#0f172a}
  h1{font-size:19px;margin:0 0 20px}
  section{margin:0 0 26px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:#64748b;margin:0 0 8px;font-weight:700}
  h2 small{display:block;text-transform:none;letter-spacing:0;font-weight:400;color:#94a3b8;font-size:12px;margin-top:3px}
  .mail{background:#fff;border:1px solid #dbe1e8;border-radius:8px;padding:20px 22px;max-width:760px}
  .body{margin:0 0 14px;color:#334155;font-size:14px}
  hr{border:0;border-top:1px solid #eef2f6;margin:0 0 16px}
</style>
<h1>DigitalCarda — e-mail signature templates</h1>
${blocks}
`);
console.log("✓ public/_sig-preview.html");
