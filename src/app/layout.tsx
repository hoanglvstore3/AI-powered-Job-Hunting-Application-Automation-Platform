import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Job Hunting — Lê Việt Hoàng", robots: "noindex, nofollow" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
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
            {session?.user?.email ? (
              <>
                {session.user.email} · <a href="/api/auth/signout">Đăng xuất</a>
              </>
            ) : (
              <a href="/api/auth/signin">Đăng nhập Google</a>
            )}
          </span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
