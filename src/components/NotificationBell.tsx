// Chuông thông báo trên topbar (§16 câu 5: thông báo trong website).
// Đọc Sheet, tính số thông báo chưa đọc (sự kiện mới hơn cookie jobhunt_seen_at)
// rồi hiện badge số lượng; bấm vào chuông mở trang /thong-bao.
import Link from "next/link";
import { cookies } from "next/headers";
import { loadSheetData } from "@/lib/sheets";
import { buildNotifications, countUnread } from "@/lib/notifications";

export default async function NotificationBell() {
  const sheet = await loadSheetData().catch(() => null);
  const notifications = sheet ? buildNotifications(sheet) : [];
  const seenAt = cookies().get("jobhunt_seen_at")?.value;
  const unread = countUnread(notifications, seenAt);
  return (
    <Link
      href="/thong-bao"
      className="bell"
      title={unread > 0 ? `${unread} thông báo chưa đọc` : "Không có thông báo mới"}
      aria-label="Thông báo"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {unread > 0 ? <span className="bell-count">{unread > 99 ? "99+" : unread}</span> : <span className="bell-dot" />}
    </Link>
  );
}
