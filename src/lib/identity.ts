import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Who is making the request, until real accounts arrive (step 4).
 *
 * Each browser gets an anonymous id in a signed, httpOnly cookie. Billing and the
 * free-pack counter hang off that id. It is a stopgap: clearing cookies starts a
 * new free allowance, and a subscription bought in one browser is not seen in
 * another. Accounts replace this; the rest of billing keys off userRef and won't change.
 *
 * SESSION_SECRET  long random string used to sign the cookie (required in production)
 */

export const IDENTITY_COOKIE = "wdf_uid";
const ONE_YEAR_SECONDS = 365 * 86400;
const DEV_SECRET = "dev-only-session-secret";

type Env = Record<string, string | undefined>;

export interface Identity {
  userRef: string;
  /** Set-Cookie header to send when the id is new; null when the browser already had one. */
  setCookie: string | null;
}

function secret(env: Env): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production.");
  return DEV_SECRET;
}

function sign(id: string, key: string): string {
  return createHmac("sha256", key).update(id).digest("base64url");
}

function readCookie(header: string | null, name: string): string | null {
  for (const part of header?.split(";") ?? []) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function identify(request: Request, env: Env = process.env): Identity {
  const key = secret(env);
  const raw = readCookie(request.headers.get("cookie"), IDENTITY_COOKIE);
  if (raw) {
    const [id, mac] = raw.split(".");
    if (id && mac) {
      const expected = Buffer.from(sign(id, key));
      const given = Buffer.from(mac);
      if (expected.length === given.length && timingSafeEqual(expected, given)) return { userRef: id, setCookie: null };
    }
  }
  const id = randomUUID();
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    userRef: id,
    setCookie: `${IDENTITY_COOKIE}=${id}.${sign(id, key)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_SECONDS}${secure}`,
  };
}

/** Adds the identity cookie to a response when it is new. */
export function withIdentity(response: Response, identity: Identity): Response {
  if (identity.setCookie) response.headers.append("Set-Cookie", identity.setCookie);
  return response;
}
