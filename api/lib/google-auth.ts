import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/* Verifies the ID token ("credential") Google Identity Services hands the
   browser after someone picks their Google account.

   Only the Client ID is needed — no client secret. The token is a JWT signed by
   Google, so the server checks, without trusting anything from the browser:
     · the signature, against Google's published keys
     · that Google issued it
     · that it was minted for OUR Client ID (audience) — a token another site
       obtained cannot be replayed here
     · that it hasn't expired
     · that Google has verified the email address */

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Cached across requests; jose refreshes the key set when Google rotates keys.
let remoteKeys: JWTVerifyGetKey | null = null;
const googleKeys = () => (remoteKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));

export type GoogleProfile = { sub: string; email: string; name: string; picture: string | null };

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  keys: JWTVerifyGetKey = googleKeys(),
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(credential, keys, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
    clockTolerance: 60,
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : "";
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !verified) throw new Error("Google account email is not verified");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Google token has no account id");

  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0];
  const picture = typeof payload.picture === "string" && payload.picture.startsWith("https://") ? payload.picture : null;
  return { sub: payload.sub, email, name: name.slice(0, 255), picture: picture ? picture.slice(0, 500) : null };
}
