import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";

// The JWT signing key. Production MUST provide JWT_SECRET (>=16 chars). If it is
// missing we NEVER fall back to a public/committed key — instead we generate a
// strong random per-process key and warn loudly. Fail-safe: the app still boots
// (no outage) and tokens can't be forged, but sessions reset on each restart
// until a persistent JWT_SECRET is set (the deploy writes one to .env). In dev a
// fixed local-only key keeps sessions stable across restarts.
const DEV_ONLY_SECRET = "digitalcarda-dev-only-key-not-valid-in-production";
const RAW_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠ JWT_SECRET not set — using a random per-process key. Set a persistent JWT_SECRET in .env (openssl rand -hex 48).");
    return randomBytes(48).toString("hex");
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

// ── Email-verification tokens (3-day, distinct key so they can't be reused as
//    auth or reset tokens). Binds the userId + email at issue time. ──
const VERIFY_KEY = new TextEncoder().encode(RAW_SECRET + "::emailverify");

export async function createVerifyToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ userId, email, purpose: "emailverify" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3d")
    .sign(VERIFY_KEY);
}

export async function verifyVerifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, VERIFY_KEY, { clockTolerance: 60 });
    if (payload.purpose !== "emailverify") return null;
    return { userId: Number(payload.userId), email: String(payload.email) };
  } catch {
    return null;
  }
}
