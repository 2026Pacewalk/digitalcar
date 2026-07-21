import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "digitalcarda-super-secret-key-2024-change-in-production"
);

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
