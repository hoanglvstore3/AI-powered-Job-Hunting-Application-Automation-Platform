// Session đăng nhập ký HMAC-SHA256 bằng WebCrypto — chạy được cả ở Edge
// middleware và Node route handler (không dùng node:crypto ở đây để
// middleware không lỗi runtime).
export const SESSION_COOKIE = "jobhunt_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-insecure-secret-change-me"
  );
}

function b64urlEncodeText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeText(encoded: string): string | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Tạo token session `payload.signature`, payload = `username.expiry` (base64url). */
export async function createSessionToken(username: string): Promise<string> {
  if (!username || username.includes(".")) {
    throw new Error("Tên đăng nhập không hợp lệ cho session token.");
  }
  const expiry = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${username}.${expiry}`;
  return `${b64urlEncodeText(payload)}.${await hmacHex(payload)}`;
}

/** Trả về username nếu token hợp lệ và chưa hết hạn, ngược lại null. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const payload = b64urlDecodeText(payloadB64);
  if (!payload) return null;
  const [username, expiryStr] = payload.split(".");
  const expiry = Number(expiryStr);
  if (!username || !Number.isFinite(expiry) || expiry * 1000 < Date.now()) {
    return null;
  }
  return timingSafeEqual(sig, await hmacHex(payload)) ? username : null;
}
