/* Username helpers shared by signup (auto-derive) and the dashboard (edit).
   The username is the card handle; a user may change it once every 45 days. */

export const USERNAME_COOLDOWN_DAYS = 45;

/* Turn a business/full name into a clean URL-safe handle. */
export function slugifyUsername(s: string): string {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/* If the user changed their username less than 45 days ago, returns the Date
   they can next change it; otherwise null (change allowed now). */
export function usernameNextChangeDate(lastChangedAt: unknown): Date | null {
  if (!lastChangedAt) return null;
  const d = new Date(String(lastChangedAt));
  if (isNaN(d.getTime())) return null;
  const next = new Date(d.getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000);
  return Date.now() < next.getTime() ? next : null;
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
