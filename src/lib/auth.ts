// Đăng nhập bằng tài khoản demo (username/password) — thay Google Auth theo
// yêu cầu của Shu lúc 04:37 ngày 23/11/2026 (message 77 trong group).
// Google Auth (NextAuth) đã gỡ bỏ ở phase này và dời sang phase sau.
//
// Cách dùng an toàn:
// - Tài khoản đọc từ biến môi trường DEMO_USERNAME / DEMO_PASSWORD_HASH
//   (hash bcrypt, KHÔNG lưu mật khẩu plaintext trong repo).
// - Chỉ khi chưa đặt DEMO_PASSWORD_HASH và KHÔNG phải production mới dùng
//   tài khoản mặc định chỉ dùng local (demo / demo-local-only). Ở production
//   mà chưa đặt biến môi trường thì không tài khoản nào đăng nhập được.
// - Tạo hash mới: node -e "console.log(require('bcryptjs').hashSync('mat-khau-moi', 10))"
// - Tuyệt đối không commit mật khẩu plaintext, không gửi mật khẩu vào group.
import bcrypt from "bcryptjs";
import { createSessionToken } from "./session";

export { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session";

export const DEMO_USERNAME = process.env.DEMO_USERNAME || "demo";

// Hash bcrypt của mật khẩu mặc định CHỈ DÙNG LOCAL "demo-local-only".
// Mật khẩu này được ghi công khai trong README để dev local dùng, và bị chặn
// ở production (xem getPasswordHash) — bắt buộc đổi trước khi deploy thật.
const DEFAULT_PASSWORD_HASH =
  "$2b$10$XbjtXLlMDs8fXmBRAiI9C.hW51dDNOnM.hvEMM3tVQqCn3AKBlCa2";

function getPasswordHash(): string | null {
  const raw = process.env.DEMO_PASSWORD_HASH;
  if (raw) return normalizePasswordHash(raw);
  if (process.env.NODE_ENV === "production") return null;
  return DEFAULT_PASSWORD_HASH;
}

// Chuẩn hoá hash từ biến môi trường. Lưu ý đã kiểm chứng: bộ load .env của
// Next.js expand ký tự `$` nên hash bcrypt thô `$2b$10$...` ghi trong .env.local
// sẽ bị biến dạng khi load. Vì vậy chấp nhận 2 dạng:
//  - hash bcrypt thô bắt đầu bằng `$2a$`/`$2b$`/`$2y$` (dùng được khi đặt trực
//    tiếp trên Vercel, giá trị ở đó được lấy nguyên văn);
//  - hash bcrypt đã base64-encode (khuyên dùng cho .env.local): giá trị không
//    chứa `$` nên load nguyên vẹn, code tự decode lại.
function normalizePasswordHash(raw: string): string {
  const value = raw.trim();
  if (/^\$2[aby]\$/.test(value)) return value;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    if (/^\$2[aby]\$/.test(decoded)) return decoded;
  } catch {
    // Rơi xuống dưới: bcrypt.compare sẽ trả false một cách an toàn.
  }
  return value;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Kiểm tra username/password. Sai username vẫn chạy bcrypt.compare để tránh lộ thông tin qua thời gian phản hồi. */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const hash = getPasswordHash();
  if (!hash) return false;
  const userOk = timingSafeEqual(username, DEMO_USERNAME);
  if (!userOk) {
    await bcrypt.compare(password, DEFAULT_PASSWORD_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}
