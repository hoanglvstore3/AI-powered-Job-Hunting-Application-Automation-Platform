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
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">✦</span>
            Job Hunting
          </Link>
          <nav>
            <Link href="/" className="nav-link">Việc làm</Link>
            <Link href="/cv" className="nav-link">CV tuỳ biến</Link>
            <Link href="/ung-tuyen" className="nav-link">Ứng tuyển / Draft</Link>
            <Link href="/cai-dat" className="nav-link">Cài đặt</Link>
          </nav>
          <span className="header-user">
            {username ? (
              <>
                {username} ·{" "}
                <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
                  <button type="submit" className="btn-ghost">Đăng xuất</button>
                </form>
              </>
            ) : (
              <a href="/dang-nhap" className="nav-link">Đăng nhập</a>
            )}
          </span>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Job Hunting · Lê Việt Hoàng — Backend Developer · Đà Nẵng
        </footer>
      </body>
    </html>
  );
}
