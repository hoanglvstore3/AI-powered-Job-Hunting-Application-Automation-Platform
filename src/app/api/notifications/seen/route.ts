// POST /api/notifications/seen — đánh dấu đã xem hết thông báo (cookie
// jobhunt_seen_at). Cookie chỉ được ghi trong Route Handler / Server Action,
// không ghi được trong Server Component lúc render (Next.js sẽ lỗi 500).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("jobhunt_seen_at", new Date().toISOString(), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
