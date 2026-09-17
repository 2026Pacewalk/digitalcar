/* One line-art motif per industry (theme.motif), drawn inline so it takes the
   accent colour from `currentColor` and needs no image request. Every motif is
   a fixed set of at most 12 SVG elements in a 320×120 box: nothing random, so
   the server and the browser draw the same picture. The hero wipes it in
   (dc-ind-wipe on a wrapper) and the hub card shows it in the top band. */
import type { ReactNode } from "react";
import type { MotifKey } from "@/data/industries";

/* Camera aperture: six blades, each a line from a hexagon vertex out to the
   ring along the previous edge. Computed once at module load. */
const APERTURE_BLADES = (() => {
  const cx = 160, cy = 60, r = 22, R = 42;
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3, b = a - Math.PI / 3;
    const vx = cx + r * Math.cos(a), vy = cy + r * Math.sin(a);
    const ux = vx - (cx + r * Math.cos(b)), uy = vy - (cy + r * Math.sin(b));
    const len = Math.hypot(ux, uy), dx = ux / len, dy = uy / len;
    const wx = vx - cx, wy = vy - cy, wu = wx * dx + wy * dy;
    const t = -wu + Math.sqrt(wu * wu - (wx * wx + wy * wy) + R * R);
    parts.push(`M${vx.toFixed(1)} ${vy.toFixed(1)}L${(vx + t * dx).toFixed(1)} ${(vy + t * dy).toFixed(1)}`);
  }
  return parts.join("");
})();

const MOTIFS: Record<MotifKey, ReactNode> = {
  /* doctors: an ECG trace with a second, fainter beat and a small cross */
  pulse: (
    <>
      <path d="M0 62H72l9-20 11 42 12-34 7 12h55l9-28 12 46 11-30 7 10H320" />
      <path d="M0 92h100l5-9 7 18 7-14 4 5h197" opacity=".3" />
      <circle cx="72" cy="62" r="3" />
      <circle cx="175" cy="62" r="3" />
      <path d="M286 18v16M278 26h16" />
    </>
  ),
  /* physiotherapists: a joint sweeping through its range, with motion lines */
  motion: (
    <>
      <path d="M60 100a70 70 0 0 1 140 0" />
      <path d="M80 100a50 50 0 0 1 100 0" opacity=".6" />
      <path d="M100 100a30 30 0 0 1 60 0" opacity=".35" />
      <circle cx="130" cy="100" r="4" />
      <path d="M130 100L188 58" />
      <circle cx="188" cy="58" r="5" />
      <path d="M228 40h22M236 56h30M228 72h22" opacity=".6" />
      <path d="M254 100c14-26 34-30 56-14" strokeDasharray="1 7" />
    </>
  ),
  /* advocates: a courthouse portico */
  columns: (
    <>
      <path d="M92 32L160 10l68 22" />
      <path d="M100 32h120v8H100z" />
      <path d="M110 48h20M114 48v46M126 48v46M106 94h28" />
      <path d="M150 48h20M154 48v46M166 48v46M146 94h28" />
      <path d="M190 48h20M194 48v46M206 48v46M186 94h28" />
      <path d="M92 108h136" />
      <path d="M84 116h152" opacity=".4" />
    </>
  ),
  /* chartered accountants: a ledger with rising bars and a tick */
  ledger: (
    <>
      <path d="M20 30h280M20 54h280M20 78h280M20 102h280" opacity=".3" />
      <path d="M60 14v98" opacity=".5" />
      <rect x="112" y="86" width="14" height="16" rx="2" />
      <rect x="142" y="72" width="14" height="30" rx="2" />
      <rect x="172" y="58" width="14" height="44" rx="2" />
      <rect x="202" y="42" width="14" height="60" rx="2" />
      <rect x="232" y="26" width="14" height="76" rx="2" />
      <path d="M119 78L149 64l30-14 30-14 30-14" opacity=".45" strokeDasharray="4 5" />
      <circle cx="276" cy="30" r="11" />
      <path d="M270 30l4 4 8-8" />
    </>
  ),
  /* insurance agents: a shield with its halo and a tick */
  shield: (
    <>
      <path d="M160 14l46 16v34c0 24-22 40-46 46-24-6-46-22-46-46V30z" />
      <path d="M160 2l62 20v44c0 30-30 48-62 52M160 2L98 22v44c0 30 30 48 62 52" opacity=".3" />
      <path d="M142 62l12 12 24-26" />
      <path d="M50 38v12M44 44h12" />
      <path d="M268 74v12M262 80h12" />
    </>
  ),
  /* real estate: a skyline with lit windows */
  skyline: (
    <>
      <path d="M0 110h30V70h20V50h20v60h20V40h20V24h20v86h20V60h20v20h20v30h20V30h18V14h18v96h20V66h24v44h30" />
      <path d="M40 78h4M40 90h4M56 60h4M56 72h4M56 84h4M98 52h6M98 64h6M98 76h6M98 88h6M116 36h6M116 48h6M116 60h6M116 72h6M116 84h6M156 70h6M156 82h6M156 94h6M216 42h6M216 54h6M216 66h6M216 78h6M216 90h6M234 26h6M234 38h6M234 50h6M234 62h6M234 74h6M234 86h6M274 76h6M274 88h6M274 100h6" opacity=".7" />
      <path d="M237 14V6" />
      <circle cx="292" cy="28" r="10" opacity=".6" />
    </>
  ),
  /* interior designers: a floor plan with door swings and furniture */
  plan: (
    <>
      <rect x="60" y="14" width="200" height="92" rx="2" />
      <path d="M150 14v40M150 72v34M60 62h60M136 62h124" />
      <path d="M150 54a18 18 0 0 1 18 18" opacity=".6" />
      <path d="M120 62a16 16 0 0 1 16-16" opacity=".6" />
      <rect x="72" y="22" width="40" height="26" rx="3" />
      <path d="M72 30h40" opacity=".6" />
      <circle cx="100" cy="86" r="9" />
      <rect x="176" y="80" width="46" height="14" rx="4" />
      <path d="M52 116h216M52 112v8M268 112v8" opacity=".4" />
    </>
  ),
  /* home services: a lightning bolt in a ring, sparking */
  bolt: (
    <>
      <path d="M150 8l-32 58h30l-14 46 50-64h-30l16-40z" />
      <circle cx="151" cy="60" r="54" opacity=".25" />
      <path d="M96 30l-8-8M92 56h-12M100 84l-8 8" />
      <path d="M210 30l8-8M216 56h12M206 84l8 8" />
      <path d="M40 60h20M262 60h20" opacity=".4" strokeDasharray="2 6" />
    </>
  ),
  /* restaurants: a steaming cup, fork and spoon */
  steam: (
    <>
      <path d="M110 64h100l-8 40a10 10 0 0 1-10 8h-64a10 10 0 0 1-10-8z" />
      <path d="M210 72h12a12 12 0 0 1 0 24h-16" />
      <path d="M92 116h136" opacity=".5" />
      <path d="M136 50c-8-10 8-18 0-30" opacity=".7" />
      <path d="M160 48c-8-12 8-20 0-34" />
      <path d="M184 50c-8-10 8-18 0-30" opacity=".7" />
      <path d="M40 30v60M34 30v12a6 6 0 0 0 12 0V30" />
      <ellipse cx="280" cy="38" rx="8" ry="12" />
      <path d="M280 50v40" />
    </>
  ),
  /* jewellers: a cut gem with facets and sparkles */
  facets: (
    <>
      <path d="M112 44l24-24h48l24 24-48 60z" />
      <path d="M112 44h96M136 20l14 24 10 60M184 20l-14 24-10 60M150 44h20" opacity=".7" />
      <path d="M58 40v16M50 48h16" />
      <path d="M250 70v12M244 76h12" />
      <path d="M244 22v8M240 26h8" />
      <circle cx="82" cy="86" r="2" />
      <circle cx="270" cy="34" r="2" />
    </>
  ),
  /* boutiques: a running stitch, a needle and a button */
  stitch: (
    <>
      <path d="M0 70C40 30 80 110 120 70s80-40 120 0 60 30 80 0" strokeDasharray="8 7" />
      <path d="M228 22l58 58" />
      <circle cx="233" cy="27" r="3" />
      <path d="M232 28c-30-10-52 10-40 32" opacity=".6" />
      <circle cx="70" cy="30" r="12" />
      <circle cx="66" cy="30" r="1.5" />
      <circle cx="74" cy="30" r="1.5" />
    </>
  ),
  /* automobile: a road to the horizon */
  road: (
    <>
      <path d="M40 116L150 24M280 116L170 24" />
      <path d="M0 24h320" opacity=".4" />
      <path d="M160 116V98M160 84V70M160 60V50M160 42v-8" />
      <path d="M176 24l26-16 22 16" opacity=".5" />
      <circle cx="254" cy="12" r="7" opacity=".6" />
      <path d="M0 116h320" opacity=".25" />
    </>
  ),
  /* travel agencies: a dotted route between two pins, and a plane */
  route: (
    <>
      <path d="M40 96C90 10 150 10 170 60s80 50 110 32" strokeDasharray="2 8" />
      <path d="M40 96c-10-12-14-18-14-26a14 14 0 0 1 28 0c0 8-4 14-14 26z" />
      <circle cx="40" cy="70" r="5" />
      <path d="M280 92c-10-12-14-18-14-26a14 14 0 0 1 28 0c0 8-4 14-14 26z" />
      <circle cx="280" cy="66" r="5" />
      <path d="M232 30l28-12-6 14 12 6-22 2-4 8-4-8-8-4z" />
    </>
  ),
  /* beauty parlours: sparkles over a soft curve */
  sparkle: (
    <>
      <path d="M110 24c2 20 10 28 30 30-20 2-28 10-30 30-2-20-10-28-30-30 20-2 28-10 30-30z" />
      <path d="M200 44c1 12 6 17 18 18-12 1-17 6-18 18-1-12-6-17-18-18 12-1 17-6 18-18z" />
      <path d="M250 14c.6 7 3 9.4 10 10-7 .6-9.4 3-10 10-.6-7-3-9.4-10-10 7-.6 9.4-3 10-10z" />
      <path d="M62 88c.6 7 3 9.4 10 10-7 .6-9.4 3-10 10-.6-7-3-9.4-10-10 7-.6 9.4-3 10-10z" />
      <path d="M20 104c80 20 200 20 280-8" opacity=".35" />
      <circle cx="160" cy="24" r="2" />
      <circle cx="290" cy="60" r="2" />
    </>
  ),
  /* makeup artists: a brush and three sweeps of colour */
  brush: (
    <>
      <path d="M20 106l120-70 10 12-120 70z" />
      <path d="M140 36c20-20 46-18 52-4 4 12-16 24-42 16" />
      <path d="M150 48l-10-12" opacity=".6" />
      <path d="M204 42c36-14 72 20 108 4M206 56c36-14 72 20 106 4M208 70c36-14 72 20 104 4" opacity=".5" />
      <circle cx="250" cy="100" r="3" />
    </>
  ),
  /* event planners: confetti, positions fixed by hand */
  confetti: (
    <>
      <rect x="40" y="20" width="10" height="16" rx="2" transform="rotate(20 45 28)" />
      <circle cx="100" cy="40" r="5" />
      <path d="M130 20c6 6 12-6 18 0" />
      <rect x="180" y="16" width="8" height="14" rx="2" transform="rotate(-30 184 23)" />
      <path d="M230 26l6 10h-12z" />
      <circle cx="280" cy="30" r="4" />
      <rect x="60" y="76" width="12" height="8" rx="2" transform="rotate(-15 66 80)" />
      <path d="M110 90c6-6 12 6 18 0" />
      <circle cx="160" cy="84" r="6" />
      <rect x="200" y="72" width="9" height="16" rx="2" transform="rotate(35 204 80)" />
      <path d="M250 96h14l-7-12z" />
      <path d="M290 80c-6 6-12-6-18 0" />
    </>
  ),
  /* photographers: a lens with its aperture blades */
  aperture: (
    <>
      <circle cx="160" cy="60" r="52" />
      <circle cx="160" cy="60" r="42" opacity=".5" />
      <path d={APERTURE_BLADES} />
      <circle cx="238" cy="20" r="4" opacity=".7" />
      <path d="M40 60h40M240 60h40" opacity=".3" strokeDasharray="2 6" />
    </>
  ),
  /* digital agencies: a network of nodes */
  nodes: (
    <>
      <path d="M60 80l60-40 60 36 60-46 50 40M120 40l60-20 60 10M60 80l60 20 60-24" opacity=".6" />
      <circle cx="60" cy="80" r="6" />
      <circle cx="120" cy="40" r="6" />
      <circle cx="180" cy="76" r="8" />
      <circle cx="240" cy="30" r="6" />
      <circle cx="290" cy="70" r="6" />
      <circle cx="180" cy="20" r="5" />
      <circle cx="120" cy="100" r="5" />
      <circle cx="180" cy="76" r="14" opacity=".3" />
    </>
  ),
  /* consultants: a compass */
  compass: (
    <>
      <circle cx="160" cy="60" r="48" />
      <circle cx="160" cy="60" r="38" opacity=".4" />
      <path d="M160 100v8M112 60h8M200 60h8" />
      <path d="M155 22V10l10 12V10" />
      <path d="M176 32l-10 34-22 22 10-34z" />
      <circle cx="160" cy="60" r="4" />
      <path d="M20 60h84M216 60h84" opacity=".3" />
    </>
  ),
  /* schools & coaching: ruled paper with a pencil and a tick */
  ruled: (
    <>
      <path d="M40 24h260M40 44h260M40 64h260M40 84h260M40 104h260" opacity=".3" />
      <path d="M76 8v104" opacity=".5" />
      <path d="M20 24a4 4 0 1 0 8 0 4 4 0 1 0-8 0M20 44a4 4 0 1 0 8 0 4 4 0 1 0-8 0M20 64a4 4 0 1 0 8 0 4 4 0 1 0-8 0M20 84a4 4 0 1 0 8 0 4 4 0 1 0-8 0M20 104a4 4 0 1 0 8 0 4 4 0 1 0-8 0" opacity=".6" />
      <path d="M236 18l50 50-12 12-50-50z" />
      <path d="M274 80l12-12 14 26z" />
      <path d="M232 38l12-12" opacity=".6" />
      <path d="M92 44l6 6 12-12" />
      <path d="M120 40c8-6 12 6 20 0s12 6 20 0" opacity=".6" />
    </>
  ),
};

export default function IndustryArt({ motif, className }: { motif: MotifKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      width="320"
      height="120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {MOTIFS[motif]}
    </svg>
  );
}
