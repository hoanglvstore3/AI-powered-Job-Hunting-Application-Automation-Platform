import { NextResponse } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

// POST /api/auth/login { username, password } — đăng nhập bằng tài khoản demo.
// Sai thì trả 401 với thông báo chung, không tiết lộ sai username hay sai mật khẩu.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "Thiếu tài khoản hoặc mật khẩu." },
      { status: 400 },
    );
  }
  const ok = await verifyCredentials(username, password);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Sai tài khoản hoặc mật khẩu." },
      { status: 401 },
    );
  }
  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
