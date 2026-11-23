import "./globals.css";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import Link from "next/link";
import SideNav from "@/components/SideNav";
import NotificationBell from "@/components/NotificationBell";

export const metadata = { title: "Job Hunting — Lê Việt Hoàng", robots: "noindex, nofollow" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const username = await verifySessionToken(
    cookies().get(SESSION_COOKIE)?.value,
  );

  // Chưa đăng nhập: giữ header đơn giản cho trang /dang-nhap.
  if (!username) {
    return (
      <html lang="vi">
        <body>
          <header className="site-header">
            <Link href="/" className="brand">
              <span className="brand-mark">✦</span>
              Job Hunting
            </Link>
            <nav>
              <a href="/dang-nhap" className="nav-link">Đăng nhập</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            Job Hunting · Lê Việt Hoàng — Backend Developer · Đà Nẵng
          </footer>
        </body>
      </html>
    );
  }

  // Đã đăng nhập: bố cục dashboard 3 vùng theo mẫu UI Shu gửi (tin 238):
  // sidebar trái + topbar (tìm kiếm, chuông, user) + nội dung chính.
  return (
    <html lang="vi">
      <body>
        <div className="dash">
          <aside className="dash-sidebar">
            <Link href="/" className="brand">
              <span className="brand-mark">✦</span>
              <span>
                AI Job Hunting
                <span className="brand-tag">Find. Fit. Apply. Smarter.</span>
              </span>
            </Link>
            <Suspense fallback={<nav className="side-nav" />}>
              <SideNav />
            </Suspense>
            <div className="side-foot">
              <div className="side-ai-card">
                <strong>AI giúp bạn tìm việc và tối ưu CV mỗi ngày.</strong>
                <span>Tiết kiệm thời gian, tăng cơ hội trúng tuyển!</span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-ghost">Đăng xuất ({username})</button>
              </form>
            </div>
          </aside>
          <div className="dash-right">
            <header className="dash-topbar">
              <form method="get" action="/" className="top-search">
                <input name="q" placeholder="Tìm kiếm job, công ty, công nghệ..." aria-label="Tìm kiếm job" />
              </form>
              <Suspense fallback={<span className="bell" aria-label="Thông báo" />}>
                <NotificationBell />
              </Suspense>
              <span className="top-user">
                <span className="avatar">LH</span>
                <span className="top-user-text">
                  <strong>Lê Việt Hoàng</strong>
                  <small>Backend Developer</small>
                </span>
              </span>
            </header>
            <main className="dash-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
