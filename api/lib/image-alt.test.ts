/* Alt text must describe the picture that is actually in the frame. The mockup
   tool exported the earlier batches in different orders, so the file name only
   says what a picture shows for the designs that were checked one by one. */
import { describe, expect, it } from "vitest";
import { productImageAlt, webpFor } from "@/lib/imageSources";

const NAME = "Terminal Digital Business Card";

describe("productImageAlt", () => {
  it("describes the frame for the designs whose files were checked", () => {
    const p = (f: string) => productImageAlt(`/products/terminal/terminal-digital-business-card${f}.png`, NAME);
    expect(p("")).toContain("open on a phone");
    expect(p("-preview")).toContain("QR code stand");
    expect(p("-features")).toContain("no app to install");
    expect(p("-services")).toContain("The full");
  });

  it("says only what is true of every picture on the older designs", () => {
    for (const f of ["", "-preview", "-features", "-services"]) {
      expect(productImageAlt(`/products/aurora-glass-bio/aurora-glass-bio-digital-business-card${f}.png`, "Aurora Glass"))
        .toBe("Aurora Glass — digital business card");
    }
    expect(productImageAlt("/products/emerald/emerald-digital-business-card-showcase.png", "Emerald"))
      .toBe("Emerald — digital business card");
  });

  it("names the design for an upload, a remote picture or no name", () => {
    expect(productImageAlt("/uploads/42-photo.png", "Ruby")).toBe("Ruby — digital business card");
    expect(productImageAlt("https://cdn.example.com/a.png", "Ruby")).toBe("Ruby — digital business card");
    expect(productImageAlt(null, "Ruby")).toBe("Ruby — digital business card");
    expect(productImageAlt("/products/terminal/x.png", "")).toContain("Digital business card");
  });
});

describe("webpFor", () => {
  it("offers a WebP for the folders the script converts", () => {
    expect(webpFor("/products/terminal/terminal-digital-business-card.png")).toBe("/products/terminal/terminal-digital-business-card.webp");
    expect(webpFor("/blog/nfc-business-card-india.jpg")).toBe("/blog/nfc-business-card-india.webp");
  });

  it("never claims one for a social banner or an upload", () => {
    expect(webpFor("/products/terminal/og.jpg")).toBeNull();
    expect(webpFor("/products/terminal/OG.JPG")).toBeNull();
    expect(webpFor("/uploads/42.png")).toBeNull();
    expect(webpFor("https://cdn.example.com/a.png")).toBeNull();
    expect(webpFor(null)).toBeNull();
  });
});
