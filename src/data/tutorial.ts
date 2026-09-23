/* The official DigitalCarda walkthrough — one place for the video's facts so the
   dashboard, the homepage and the guide page can never drift apart.

   Everything here is taken from the video itself (youtu.be/7d0G0Hu4x7o,
   published 21 Sep 2026, 5 min 39 s) — nothing is estimated. */

const ID = "7d0G0Hu4x7o";

export const TUTORIAL = {
  id: ID,
  /** Opens on YouTube — used by "Watch on YouTube" links and the JSON-LD. */
  watchUrl: `https://youtu.be/${ID}`,
  title: "How to make a digital business card with a QR code",
  /** One line for cards and buttons. */
  tagline: "A full walkthrough: fill in your details, add links, publish and share.",
  /** Longer copy for the page sections and the search-engine description. */
  description:
    "A step-by-step walkthrough of DigitalCarda: create your digital visiting card, add your business and contact details, customise the design, add clickable links and a QR code, then publish and share it on WhatsApp.",
  /** youtube-nocookie + autoplay — only ever loaded after the visitor presses play. */
  embedUrl: `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
  poster: `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`,
  posterFallback: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
  lengthLabel: "5 min 39 sec",
  lengthShort: "5 min",
  isoDuration: "PT5M39S",
  uploadDate: "2026-09-21",
} as const;

/* VideoObject markup, so the walkthrough can show up as a video result and the
   "how do I make one" answer engines can quote it. Rendered by whichever page
   actually embeds the player — never twice on one page. */
export const tutorialVideoLd = () => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: TUTORIAL.title,
  description: TUTORIAL.description,
  thumbnailUrl: [TUTORIAL.poster],
  uploadDate: TUTORIAL.uploadDate,
  duration: TUTORIAL.isoDuration,
  contentUrl: TUTORIAL.watchUrl,
  embedUrl: `https://www.youtube.com/embed/${ID}`,
  // The brand entity is already declared once in PublicLayout — referenced, not
  // repeated, so Google ties the video to the same Organization.
  publisher: { "@id": "https://digitalcarda.in/#organization" },
});
