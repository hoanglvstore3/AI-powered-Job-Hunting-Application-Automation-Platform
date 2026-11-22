import "./globals.css";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import Link from "next/link";

export const metadata = { title: "Job Hunting — Lê Việt Hoàng", robots: "noindex, nofollow" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const username = await verifySessionToken(
    cookies().get(SESSION_COOKIE)?.value,
  );
  return (
    <html lang="vi">
      <body>
        <header>
          <Link href="/"><strong>Job Hunting</strong></Link>
          <nav>
            <Link href="/">Việc làm</Link>
            <Link href="/cv">CV tuỳ biến</Link>
            <Link href="/ung-tuyen">Ứng tuyển / Draft</Link>
            <Link href="/cai-dat">Cài đặt</Link>
          </nav>
          <span style={{ marginLeft: "auto", fontSize: 14 }}>
            {username ? (
              <>
                {username} ·{" "}
                <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
                  <button type="submit">Đăng xuất</button>
                </form>
              </>
            ) : (
              <a href="/dang-nhap">Đăng nhập</a>
            )}
          </span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
