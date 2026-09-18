/* The server's password rules (api/auth-router.ts `strongPassword`), shown as
   a live checklist while the owner types. */
export const PASSWORD_RULES = [
  { label: "8+ characters", ok: (p: string) => p.length >= 8 },
  { label: "a capital letter", ok: (p: string) => /[A-Z]/.test(p) },
  { label: "a number", ok: (p: string) => /\d/.test(p) },
  { label: "a symbol", ok: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/** "" when the password meets every rule, else what to add. */
export function passwordProblem(p: string): string {
  const missing = PASSWORD_RULES.filter((r) => !r.ok(p)).map((r) => r.label);
  return missing.length ? `Add ${missing.join(", ")}.` : "";
}
