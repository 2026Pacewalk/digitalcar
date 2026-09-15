/*
 * Builds public/samples/sample-logo.png — the logo of the made-up business
 * ("Nayara Interiors") the public email-signature generator shows before a
 * visitor types their own details.
 *
 * A PNG on purpose: email clients block SVG and data: URIs in <img>, and the
 * sample signature must look exactly like a customer's real one does.
 *
 *   node scripts/gen-sample-logo.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const W = 360, H = 120;
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F7B31C"/>
      <stop offset="1" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect x="8" y="16" width="88" height="88" rx="22" fill="#0F172A"/>
  <path d="M34 84V38l36 46V38" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="114" y="62" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#0F172A" letter-spacing="1">NAYARA</text>
  <text x="116" y="92" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#B45309" letter-spacing="6.5">INTERIORS</text>
</svg>`;

mkdirSync("public/samples", { recursive: true });
await sharp(Buffer.from(svg), { density: 288 }).resize(W * 2, H * 2).png({ compressionLevel: 9 }).toFile("public/samples/sample-logo.png");
console.log("wrote public/samples/sample-logo.png");
