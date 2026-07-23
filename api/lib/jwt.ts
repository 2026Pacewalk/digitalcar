import { SignJWT, jwtVerify } from "jose";

const RAW_SECRET = process.env.JWT_SECRET || "digitalcarda-super-secret-key-2024-change-in-production";
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
