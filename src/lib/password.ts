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
