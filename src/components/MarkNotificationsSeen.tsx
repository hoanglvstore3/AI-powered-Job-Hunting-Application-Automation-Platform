// Đánh dấu đã xem hết thông báo khi mở trang /thong-bao (gọi Route Handler
// để ghi cookie — Server Component không được ghi cookie lúc render).
"use client";

import { useEffect } from "react";

export default function MarkNotificationsSeen() {
  useEffect(() => {
    fetch("/api/notifications/seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
