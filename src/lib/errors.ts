/* A mutation error as a sentence a person can act on.

   The server has no tRPC errorFormatter, so when an input fails its zod schema
   the error's message is the whole issue list, JSON-encoded — a toast would
   show raw `[{"origin": "string", "code": ...}]`. This picks out the first
   issue's own message ("A GSTIN is 15 letters and numbers") instead. Any other
   message passes through untouched. */
export function readableError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (!msg) return fallback;
  if (!msg.trimStart().startsWith("[")) return msg;
  try {
    const issues = JSON.parse(msg) as unknown;
    if (Array.isArray(issues)) {
      const first = issues.find((i): i is { message: string } => !!i && typeof (i as { message?: unknown }).message === "string");
      if (first?.message) return first.message;
    }
  } catch { /* not JSON after all */ }
  return fallback;
}
