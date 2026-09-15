import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from "jose";
import { verifyGoogleIdToken } from "./google-auth";

const CLIENT_ID = "1234567890-test.apps.googleusercontent.com";

type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];

let keys: JWTVerifyGetKey;
let googleKey: SigningKey;
let strangerKey: SigningKey;

beforeAll(async () => {
  const google = await generateKeyPair("RS256");
  const stranger = await generateKeyPair("RS256");
  googleKey = google.privateKey;
  strangerKey = stranger.privateKey;
  const jwk = await exportJWK(google.publicKey);
  keys = createLocalJWKSet({ keys: [{ ...jwk, kid: "google-1", alg: "RS256", use: "sig" }] });
});

const now = () => Math.floor(Date.now() / 1000);

function token(
  claims: Record<string, unknown>,
  o: { iss?: string; aud?: string; exp?: number; key?: SigningKey } = {},
) {
  return new SignJWT({ email: "Aarav@Example.com", email_verified: true, name: "Aarav Mehta", picture: "https://lh3.googleusercontent.com/a/x", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "google-1" })
    .setIssuer(o.iss ?? "https://accounts.google.com")
    .setAudience(o.aud ?? CLIENT_ID)
    .setSubject("109876543210")
    .setIssuedAt()
    .setExpirationTime(o.exp ?? now() + 3600)
    .sign(o.key ?? googleKey);
}

describe("verifyGoogleIdToken", () => {
  it("returns the profile from a valid token, with the email lowercased", async () => {
    const profile = await verifyGoogleIdToken(await token({}), CLIENT_ID, keys);
    expect(profile).toEqual({ sub: "109876543210", email: "aarav@example.com", name: "Aarav Mehta", picture: "https://lh3.googleusercontent.com/a/x" });
  });

  it("accepts the short issuer form Google also uses", async () => {
    await expect(verifyGoogleIdToken(await token({}, { iss: "accounts.google.com" }), CLIENT_ID, keys)).resolves.toBeTruthy();
  });

  it("rejects a token minted for another site's Client ID", async () => {
    await expect(verifyGoogleIdToken(await token({}, { aud: "someone-else.apps.googleusercontent.com" }), CLIENT_ID, keys)).rejects.toThrow();
  });

  it("rejects a token not issued by Google", async () => {
    await expect(verifyGoogleIdToken(await token({}, { iss: "https://evil.example" }), CLIENT_ID, keys)).rejects.toThrow();
  });

  it("rejects a token signed with any key other than Google's", async () => {
    await expect(verifyGoogleIdToken(await token({}, { key: strangerKey }), CLIENT_ID, keys)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    await expect(verifyGoogleIdToken(await token({}, { exp: now() - 3600 }), CLIENT_ID, keys)).rejects.toThrow();
  });

  it("rejects an account whose email Google hasn't verified", async () => {
    await expect(verifyGoogleIdToken(await token({ email_verified: false }), CLIENT_ID, keys)).rejects.toThrow(/not verified/);
  });

  it("falls back to the email name when the profile has no name, and drops non-https pictures", async () => {
    const profile = await verifyGoogleIdToken(await token({ name: "", picture: "http://insecure/x.png" }), CLIENT_ID, keys);
    expect(profile.name).toBe("aarav");
    expect(profile.picture).toBeNull();
  });
});
