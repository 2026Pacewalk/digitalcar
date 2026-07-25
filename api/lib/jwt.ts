import { SignJWT, jwtVerify } from "jose";

// The JWT signing key. In production it MUST be provided (>=16 chars) — we
// refuse to boot with a default, so tokens can never be forged with a public
// key. In dev a fixed local-only key keeps sessions stable across restarts.
const DEV_ONLY_SECRET = "digitalcarda-dev-only-key-not-valid-in-production";
const RAW_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET is not set (needs >=16 chars). Set a strong random value (openssl rand -hex 48) before starting in production.");
  }
  return DEV_ONLY_SECRET;
})();
const SECRET_KEY = new TextEncoder().encode(RAW_SECRET);
// A distinct key for password-reset tokens so they can NEVER be used as auth
// tokens (verifyToken uses SECRET_KEY and will reject these).
const RESET_KEY = new TextEncoder().encode(RAW_SECRET + "::pwreset");

export async function createToken(payload: {
  userId: number;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<{
  userId: number;
  email: string;
  role: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      clockTolerance: 60,
    });
    return payload as unknown as {
      userId: number;
      email: string;
      role: string;
    };
  } catch {
    return null;
  }
}

// ── Password-reset tokens (short-lived, single-use via password-hash binding) ──

/** `ph` is a snippet of the user's current password hash — once the password
    changes, the token no longer matches and becomes invalid (single-use). */
export async function createResetToken(userId: number, ph: string): Promise<string> {
  return new SignJWT({ userId, ph, purpose: "pwreset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(RESET_KEY);
}

export async function verifyResetToken(token: string): Promise<{ userId: number; ph: string } | null> {
  try {
    const { payload } = await jwtVerify(token, RESET_KEY, { clockTolerance: 60 });
    if (payload.purpose !== "pwreset") return null;
    return { userId: Number(payload.userId), ph: String(payload.ph) };
  } catch {
    return null;
  }
}
