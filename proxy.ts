import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// Next.js 16: the `middleware` convention was renamed to `proxy` (nodejs runtime).
// This guards page navigations only (see matcher); API routes enforce auth
// themselves via requireUser().

const ACCESS_COOKIE = "at";
const REFRESH_COOKIE = "rt";
const ACCESS_TTL = 60 * 15;

const accessSecret = () =>
  new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = () =>
  new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

async function verify(token: string, key: Uint8Array, typ: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.typ !== typ || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

const PROTECTED = ["/feed"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  if (!isProtected && !isAuthPage) return NextResponse.next();

  const at = req.cookies.get(ACCESS_COOKIE)?.value;
  let userId = at ? await verify(at, accessSecret(), "access") : null;
  let refreshed: string | null = null;

  if (!userId) {
    const rt = req.cookies.get(REFRESH_COOKIE)?.value;
    const fromRefresh = rt ? await verify(rt, refreshSecret(), "refresh") : null;
    if (fromRefresh) {
      userId = fromRefresh;
      refreshed = await new SignJWT({ sub: userId, typ: "access" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TTL}s`)
        .sign(accessSecret());
    }
  }

  if (isAuthPage && userId) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }
  if (isProtected && !userId) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (refreshed) {
    res.cookies.set(ACCESS_COOKIE, refreshed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TTL,
    });
  }
  return res;
}

export const config = {
  matcher: ["/feed/:path*", "/login", "/register"],
};
