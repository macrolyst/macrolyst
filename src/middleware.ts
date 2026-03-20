import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "__Secure-neon-auth.session_token";
// Dev mode uses non-secure cookies (no __Secure- prefix)
const SESSION_COOKIE_DEV = "neon-auth.session_token";

export function middleware(request: NextRequest) {
  const hasSession =
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(SESSION_COOKIE_DEV);

  if (!hasSession) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
