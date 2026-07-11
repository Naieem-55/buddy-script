import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "at";
export const REFRESH_COOKIE = "rt";

const ACCESS_TTL = 60 * 15; // 15 minutes
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days

type TokenType = "access" | "refresh";

function secret(type: TokenType): Uint8Array {
  const raw =
    type === "access"
      ? process.env.JWT_ACCESS_SECRET
      : process.env.JWT_REFRESH_SECRET;
  if (!raw) throw new Error(`Missing ${type} JWT secret`);
  return new TextEncoder().encode(raw);
}

export async function signToken(
  userId: string,
  type: TokenType
): Promise<string> {
  const ttl = type === "access" ? ACCESS_TTL : REFRESH_TTL;
  return new SignJWT({ sub: userId, typ: type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret(type));
}

export async function verifyToken(
  token: string,
  type: TokenType
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(type));
    if (payload.typ !== type || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

const baseCookie = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Issue fresh access + refresh cookies for a user. */
export async function createSession(userId: string) {
  const [at, rt] = await Promise.all([
    signToken(userId, "access"),
    signToken(userId, "refresh"),
  ]);
  const store = await cookies();
  store.set(ACCESS_COOKIE, at, { ...baseCookie, maxAge: ACCESS_TTL });
  store.set(REFRESH_COOKIE, rt, { ...baseCookie, maxAge: REFRESH_TTL });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Resolve the current user id from cookies.
 * Tries the access token; falls back to the refresh token and silently
 * re-issues a new access cookie so the session stays alive (rotation).
 */
export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  const at = store.get(ACCESS_COOKIE)?.value;
  if (at) {
    const uid = await verifyToken(at, "access");
    if (uid) return uid;
  }
  const rt = store.get(REFRESH_COOKIE)?.value;
  if (rt) {
    const uid = await verifyToken(rt, "refresh");
    if (uid) {
      const fresh = await signToken(uid, "access");
      store.set(ACCESS_COOKIE, fresh, { ...baseCookie, maxAge: ACCESS_TTL });
      return uid;
    }
  }
  return null;
}
