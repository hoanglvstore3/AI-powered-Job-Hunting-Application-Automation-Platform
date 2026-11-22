// Đăng nhập Google — requirement §8: website cá nhân, bắt buộc đăng nhập Google,
// chỉ chủ sở hữu truy cập được. Không có trang đăng ký công khai.
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const OWNER_EMAILS = (process.env.OWNER_EMAILS || "hoanglv00256@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || "").toLowerCase();
      return OWNER_EMAILS.includes(email);
    },
  },
  pages: { signIn: "/dang-nhap" },
};
