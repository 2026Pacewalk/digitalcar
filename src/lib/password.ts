/* Shared password policy for signup, reset, and change-password flows.
   Login is intentionally NOT gated by this — legacy accounts keep working. */

export const PASSWORD_HINT = "8+ characters with an uppercase letter, a number & a symbol";

/* Returns the list of unmet requirements (empty ⇒ strong enough). */
export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 8) p.push("at least 8 characters");
  if (!/[A-Z]/.test(pw)) p.push("an uppercase letter");
  if (!/[a-z]/.test(pw)) p.push("a lowercase letter");
  if (!/\d/.test(pw)) p.push("a number");
  if (!/[^A-Za-z0-9]/.test(pw)) p.push("a special character");
  return p;
}

export function isStrongPassword(pw: string): boolean {
  return passwordProblems(pw).length === 0;
}

/* Individual checks, for a live requirements checklist in the UI. */
export function passwordChecks(pw: string) {
  return [
    { label: "8+ characters", ok: pw.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "Number", ok: /\d/.test(pw) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/* A strong random password that always satisfies passwordProblems().

   Uses the browser's cryptographic RNG (never Math.random) with rejection
   sampling, so every character is uniformly likely — no modulo bias. Characters
   people misread when copying by hand (0/O, 1/l/I) are left out, and the symbols
   are ones every keyboard, phone and password manager handles. */
const PW_SETS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnopqrstuvwxyz",
  digit: "23456789",
  symbol: "!@#$%&*?-_+=",
};

function randomIndex(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n; // largest multiple of n below 2^32
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

export function generateStrongPassword(length = 16): string {
  const len = Math.max(12, Math.min(64, Math.round(length)));
  const all = PW_SETS.upper + PW_SETS.lower + PW_SETS.digit + PW_SETS.symbol;
  const pick = (set: string) => set[randomIndex(set.length)];
  // One from each required class, the rest from everything…
  const chars = [pick(PW_SETS.upper), pick(PW_SETS.lower), pick(PW_SETS.digit), pick(PW_SETS.symbol)];
  while (chars.length < len) chars.push(pick(all));
  // …then a Fisher–Yates shuffle so the guaranteed ones aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
