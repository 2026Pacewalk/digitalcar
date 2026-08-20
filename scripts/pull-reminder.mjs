/* Printed before `npm run dev` (predev). A gentle reminder that online
   (digitalcarda.in) is the source of truth for local data, plus how fresh the
   local copy is. Never blocks or fails dev — always exits 0. */
import fs from "fs";
import path from "path";

const C = { dim: "\x1b[2m", gold: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m", bold: "\x1b[1m" };
let status = `${C.red}not synced yet${C.reset}`;
try {
  const marker = path.resolve(".last-live-sync");
  if (fs.existsSync(marker)) {
    const ts = new Date(fs.readFileSync(marker, "utf8").trim());
    const mins = Math.max(0, Math.round((Date.now() - ts.getTime()) / 60000));
    const ago = mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`;
    status = mins > 1440 ? `${C.red}synced ${ago} — stale, consider re-syncing${C.reset}` : `synced ${ago}`;
  }
} catch { /* ignore — never break dev */ }

console.log(`\n${C.gold}${C.bold}● DigitalCarda${C.reset} ${C.dim}— online (digitalcarda.in) is the source of truth for data.${C.reset}`);
console.log(`  ${C.dim}Local DB:${C.reset} ${status}`);
console.log(`  ${C.dim}Refresh from live:${C.reset} ${C.gold}sync-from-live.cmd${C.reset} ${C.dim}(one-way — local edits never touch prod)${C.reset}\n`);
