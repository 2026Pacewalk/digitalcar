/* Generated cover art for blog articles — no stock photos.

   Each article picks a motif (what the piece is about) and a tone (its
   colour). The art is plain SVG: it weighs almost nothing, stays sharp at any
   size, and renders identically on the server and in the browser, so it can't
   shift the layout while the page loads.

   It is an illustration, so it carries a text alternative (role="img" plus an
   aria-label describing what it shows). */
import { useId } from "react";
import type { BlogCover as Cover } from "@/data/blog";

const TONES: Record<Cover["tone"], { a: string; b: string; ink: string; accent: string; card: string; line: string }> = {
  gold:    { a: "#FFF7E0", b: "#F7B31C", ink: "#0F172A", accent: "#0F172A", card: "#FFFFFF", line: "#E2E8F0" },
  navy:    { a: "#1E293B", b: "#0B1120", ink: "#F8FAFC", accent: "#F7B31C", card: "#1F2A3E", line: "#334155" },
  teal:    { a: "#E6FFFA", b: "#14B8A6", ink: "#0F172A", accent: "#0F766E", card: "#FFFFFF", line: "#CCFBF1" },
  violet:  { a: "#F3EEFF", b: "#7C3AED", ink: "#1E1B4B", accent: "#F7B31C", card: "#FFFFFF", line: "#E9D5FF" },
  rose:    { a: "#FFF1F2", b: "#F43F5E", ink: "#1F2937", accent: "#0F172A", card: "#FFFFFF", line: "#FECDD3" },
  emerald: { a: "#ECFDF5", b: "#059669", ink: "#052E16", accent: "#F7B31C", card: "#FFFFFF", line: "#D1FAE5" },
};

const DESCRIPTIONS: Record<Cover["motif"], string> = {
  card: "Illustration of a digital visiting card with call and WhatsApp buttons",
  nfc: "Illustration of an NFC business card sending a tap signal to a phone",
  qr: "Illustration of a QR code beside a digital business card",
  stars: "Illustration of five-star Google review ratings",
  steps: "Illustration of three numbered steps to create a digital card",
  clinic: "Illustration of a doctor's digital visiting card with clinic timings",
  palette: "Illustration of colour swatches and type for visiting card design",
  links: "Illustration comparing a link-in-bio page with a digital business card",
};

/* A small digital card: avatar, name lines and two buttons. */
function MiniCard({ x, y, r = 0, s = 1, t }: { x: number; y: number; r?: number; s?: number; t: (typeof TONES)[Cover["tone"]] }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x="0" y="0" width="300" height="420" rx="34" fill={t.card} />
      <rect x="0" y="0" width="300" height="120" rx="34" fill={t.b} opacity="0.9" />
      <rect x="0" y="80" width="300" height="40" fill={t.b} opacity="0.9" />
      <circle cx="150" cy="122" r="42" fill={t.card} />
      <circle cx="150" cy="122" r="34" fill={t.accent} opacity="0.85" />
      <rect x="80" y="182" width="140" height="16" rx="8" fill={t.ink} opacity="0.85" />
      <rect x="100" y="210" width="100" height="11" rx="5.5" fill={t.ink} opacity="0.35" />
      <rect x="30" y="246" width="240" height="1.5" fill={t.line} />
      <rect x="30" y="268" width="112" height="44" rx="22" fill={t.b} />
      <rect x="158" y="268" width="112" height="44" rx="22" fill="#22C55E" />
      <rect x="30" y="330" width="240" height="12" rx="6" fill={t.ink} opacity="0.12" />
      <rect x="30" y="352" width="190" height="12" rx="6" fill={t.ink} opacity="0.12" />
      <rect x="30" y="374" width="210" height="12" rx="6" fill={t.ink} opacity="0.12" />
    </g>
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
}

/* A fixed QR-like pattern (not a scannable code), identical on every render. */
const QR_CELLS: [number, number][] = (() => {
  const cells: [number, number][] = [];
  let seed = 7919;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    seed = (seed * 16807) % 2147483647;
    if (!inFinder && seed % 100 < 46) cells.push([x, y]);
  }
  return cells;
})();

function Motif({ motif, t, uid }: { motif: Cover["motif"]; t: (typeof TONES)[Cover["tone"]]; uid: string }) {
  switch (motif) {
    case "card":
      return (
        <g>
          <MiniCard x={640} y={150} r={-8} t={t} />
          <MiniCard x={820} y={120} r={7} s={0.86} t={t} />
        </g>
      );
    case "nfc":
      return (
        <g>
          <g transform="translate(560 250) rotate(-10)">
            <rect width="360" height="226" rx="22" fill={t.card} />
            <rect x="26" y="30" width="54" height="42" rx="8" fill={t.accent} opacity="0.9" />
            <rect x="26" y="150" width="170" height="16" rx="8" fill={t.ink} opacity="0.8" />
            <rect x="26" y="178" width="120" height="11" rx="5.5" fill={t.ink} opacity="0.35" />
            <rect x="262" y="120" width="72" height="72" rx="10" fill={t.ink} opacity="0.85" />
          </g>
          {[70, 120, 170].map((r, i) => (
            <path key={r} d={`M ${930 + r * 0.2} ${250 - r} A ${r} ${r} 0 0 1 ${930 + r * 0.2} ${250 + r}`}
              fill="none" stroke={t.accent} strokeWidth="14" strokeLinecap="round" opacity={0.9 - i * 0.25} />
          ))}
          <g transform="translate(1000 110) rotate(12)">
            <rect width="150" height="290" rx="30" fill={t.ink} />
            <rect x="12" y="14" width="126" height="262" rx="22" fill={t.card} />
            <circle cx="75" cy="80" r="24" fill={t.b} />
            <rect x="35" y="120" width="80" height="10" rx="5" fill={t.ink} opacity="0.7" />
            <rect x="30" y="200" width="90" height="28" rx="14" fill="#22C55E" />
          </g>
        </g>
      );
    case "qr":
      return (
        <g>
          <g transform="translate(590 120)">
            <rect width="420" height="420" rx="36" fill={t.card} />
            {[[36, 36], [276, 36], [36, 276]].map(([x, y]) => (
              <g key={`${x}-${y}`}>
                <rect x={x} y={y} width="108" height="108" rx="18" fill={t.ink} />
                <rect x={x + 18} y={y + 18} width="72" height="72" rx="10" fill={t.card} />
                <rect x={x + 32} y={y + 32} width="44" height="44" rx="8" fill={t.ink} />
              </g>
            ))}
            {QR_CELLS.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={36 + x * 16.4} y={36 + y * 16.4} width="14" height="14" rx="3" fill={t.ink} />
            ))}
          </g>
          <MiniCard x={930} y={230} r={9} s={0.72} t={t} />
        </g>
      );
    case "stars":
      return (
        <g>
          <g transform="translate(540 170)">
            <rect width="560" height="330" rx="36" fill={t.card} />
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} cx={90 + i * 95} cy={110} r={40} fill="#F7B31C" />)}
            <rect x="50" y="190" width="380" height="18" rx="9" fill={t.ink} opacity="0.8" />
            <rect x="50" y="224" width="460" height="13" rx="6.5" fill={t.ink} opacity="0.25" />
            <rect x="50" y="252" width="320" height="13" rx="6.5" fill={t.ink} opacity="0.25" />
          </g>
          <g transform="translate(900 420)">
            <rect width="230" height="96" rx="48" fill={t.accent} />
            <text x="115" y="62" textAnchor="middle" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="44" fontWeight="800" fill={t.accent === "#F7B31C" ? "#0F172A" : "#FFFFFF"}>4.9 ★</text>
          </g>
        </g>
      );
    case "steps":
      return (
        <g>
          <path d="M 620 470 C 720 470, 720 320, 820 320 S 920 170, 1020 170" fill="none" stroke={t.accent} strokeWidth="10" strokeDasharray="4 22" strokeLinecap="round" />
          {[[620, 470, "1"], [820, 320, "2"], [1020, 170, "3"]].map(([x, y, n]) => (
            <g key={n}>
              <circle cx={x} cy={y} r="70" fill={t.card} />
              <circle cx={x} cy={y} r="54" fill={t.accent} />
              <text x={x} y={Number(y) + 19} textAnchor="middle" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="54" fontWeight="800" fill={t.accent === "#F7B31C" ? "#0F172A" : "#FFFFFF"}>{n}</text>
            </g>
          ))}
          <rect x="880" y="430" width="240" height="120" rx="26" fill={t.card} opacity="0.95" />
          <rect x="910" y="462" width="150" height="16" rx="8" fill={t.ink} opacity="0.8" />
          <rect x="910" y="494" width="100" height="12" rx="6" fill={t.ink} opacity="0.3" />
        </g>
      );
    case "clinic":
      return (
        <g>
          <MiniCard x={600} y={130} r={-6} t={t} />
          <g transform="translate(900 170)">
            <rect width="240" height="340" rx="30" fill={t.card} />
            <rect x="92" y="40" width="56" height="150" rx="14" fill={t.accent} />
            <rect x="45" y="87" width="150" height="56" rx="14" fill={t.accent} />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x="40" y={222 + i * 34} width="60" height="14" rx="7" fill={t.ink} opacity="0.55" />
                <rect x="112" y={222 + i * 34} width="88" height="14" rx="7" fill={t.ink} opacity="0.2" />
              </g>
            ))}
          </g>
        </g>
      );
    case "palette":
      return (
        <g>
          {["#0F172A", "#F7B31C", t.b, "#FFFFFF"].map((c, i) => (
            <rect key={c + i} x={600 + i * 120} y={150 + i * 26} width="200" height="300" rx="30" fill={c}
              transform={`rotate(${-12 + i * 8} ${700 + i * 120} ${300 + i * 26})`} stroke="#0F172A" strokeOpacity="0.08" strokeWidth="2" />
          ))}
          <text x="640" y="585" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="120" fontWeight="800" fill={t.ink} opacity="0.9">Aa</text>
        </g>
      );
    case "links":
      return (
        <g>
          <g transform="translate(560 110)">
            <rect width="270" height="460" rx="34" fill={t.card} />
            <circle cx="135" cy="80" r="38" fill={t.b} />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x="36" y={150 + i * 58} width="198" height="42" rx="21" fill={t.ink} opacity={0.14 + i * 0.02} />
            ))}
          </g>
          <text x="880" y="365" textAnchor="middle" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontSize="60" fontWeight="800" fill={t.accent} id={`${uid}-vs`}>vs</text>
          <MiniCard x={930} y={130} r={6} s={0.95} t={t} />
        </g>
      );
  }
}

export default function BlogCover({ cover, label, className = "" }: { cover: Cover; label?: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = TONES[cover.tone];
  return (
    <svg
      viewBox="0 0 1200 675"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label ?? DESCRIPTIONS[cover.motif]}
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="1" stopColor={t.b} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.2" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${uid}-dots`} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" fill={t.ink} opacity="0.12" />
        </pattern>
      </defs>
      <rect width="1200" height="675" fill={`url(#${uid}-bg)`} />
      <rect width="1200" height="675" fill={`url(#${uid}-dots)`} />
      <rect width="1200" height="675" fill={`url(#${uid}-glow)`} />
      <circle cx="230" cy="560" r="260" fill={t.card} opacity="0.12" />
      <Motif motif={cover.motif} t={t} uid={uid} />
    </svg>
  );
}
