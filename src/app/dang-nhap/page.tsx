"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Sai tài khoản hoặc mật khẩu.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Không kết nối được máy chủ, thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>
          <span className="gradient-text">Đăng nhập</span>
        </h1>
        <p className="muted">
          Website cá nhân của Lê Việt Hoàng — đăng nhập bằng tài khoản demo do chủ
          sở hữu cấp. Không có trang đăng ký công khai.
        </p>
        <form onSubmit={onSubmit}>
          <p>
            <label>
              Tài khoản
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
          </p>
          <p>
            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          </p>
          {error && <p className="error">{error}</p>}
          <p>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
