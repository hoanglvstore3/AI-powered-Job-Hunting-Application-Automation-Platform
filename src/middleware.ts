import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

// Bảo vệ toàn bộ website, trừ trang đăng nhập và API auth.
// Chưa đăng nhập thì redirect về /dang-nhap (requirement §15.8).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/dang-nhap" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  const username = await verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value,
  );
  if (username) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/dang-nhap";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
