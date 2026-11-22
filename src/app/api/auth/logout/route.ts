import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// POST /api/auth/logout — xoá session cookie rồi về trang đăng nhập.
export async function POST(req: Request) {
  const url = new URL("/dang-nhap", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
