import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/token";
import type { SessionPayload } from "@/lib/auth/session";

const SESSION_COOKIE = "naap_session";
const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const session =
    token && secret
      ? await verifyToken<SessionPayload>(token, secret)
      : null;

  if (!session || session.exp * 1000 < Date.now()) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - api routes that need their own auth handling (none yet)
     * - static files / images / favicon
     * - Next.js internals
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
