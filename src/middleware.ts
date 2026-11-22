export { default } from "next-auth/middleware";

// Bảo vệ toàn bộ website, trừ trang đăng nhập và API auth (requirement §8, §15.8).
export const config = { matcher: ["/((?!api/auth|dang-nhap).*)"] };
