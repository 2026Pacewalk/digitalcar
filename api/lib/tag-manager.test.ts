import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { isLiveHost, pageForHost, withoutTagManager } from "./tag-manager";

const page = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

// Google's container snippet for GTM-PK44T5J9, as issued. Verification looks
// for this code, so the page must carry it character for character.
const HEAD_SNIPPET = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PK44T5J9');</script>`;
const BODY_SNIPPET = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PK44T5J9"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

describe("Google Tag Manager in index.html", () => {
  it("carries Google's snippet unmodified, in the head and first in the body", () => {
    expect(flat(page)).toContain(flat(HEAD_SNIPPET));
    expect(flat(page)).toContain(flat(BODY_SNIPPET));
    const head = page.slice(0, page.indexOf("</head>"));
    expect(head).toContain("googletagmanager.com/gtm.js");
    // High in the head: before the GA4 tag and every other script.
    expect(head.indexOf("<script>")).toBe(head.indexOf("<script>(function(w,d,s,l,i)"));
    // Immediately after <body>: only whitespace and Google's own comment between.
    const afterBody = page.slice(page.indexOf("<body>") + "<body>".length);
    expect(afterBody.replace(/^\s*<!-- Google Tag Manager \(noscript\) -->\s*/, "").startsWith("<noscript><iframe")).toBe(true);
  });

  it("is served only on the live site", () => {
    for (const host of ["digitalcarda.in", "www.digitalcarda.in", "DigitalCarda.in", "digitalcarda.in:443"]) {
      expect(isLiveHost(host)).toBe(true);
      expect(pageForHost(page, host)).toBe(page);
    }
    for (const host of ["localhost:3001", "127.0.0.1", "card.example.com", "evildigitalcarda.in", "digitalcarda.in.example.com", "", undefined, null]) {
      expect(isLiveHost(host)).toBe(false);
      const out = pageForHost(page, host);
      expect(out).not.toContain("googletagmanager.com/gtm.js");
      expect(out).not.toContain("googletagmanager.com/ns.html");
      expect(out).not.toContain("GTM-PK44T5J9");
    }
  });

  it("takes out the snippet and nothing else", () => {
    const out = withoutTagManager(page);
    expect(out).toContain('<div id="root"></div>');
    expect(out).toContain("G-ZQ76JQ5PY2"); // the GA4 tag stays (it guards itself by hostname)
    expect(out).toContain("<body>");
    expect(withoutTagManager(out)).toBe(out);
    // What's left is the original page minus exactly the two blocks.
    const removed = page.length - out.length;
    expect(removed).toBeGreaterThan(flat(HEAD_SNIPPET).length + flat(BODY_SNIPPET).length);
    expect(removed).toBeLessThan(1400);
  });
});
