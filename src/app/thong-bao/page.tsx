// Trang thông báo trong website (§16 câu 5).
// Liệt kê sự kiện mới nhất suy ra từ Sheet: job mới khớp, CV mới tạo / duyệt /
// cần sửa / bị từ chối, email draft đã soạn / đã gửi. Mở trang này là đánh dấu
// đã xem hết (cookie jobhunt_seen_at) nên chuông trên topbar hết badge.
import Link from "next/link";
import { cookies } from "next/headers";
import { loadSheetData } from "@/lib/sheets";
import { buildNotifications, type AppNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<AppNotification["kind"], string> = {
  "job-new": "Job mới",
  "cv-created": "CV mới",
  "cv-approved": "CV đã duyệt",
  "cv-needs-changes": "CV cần sửa",
  "cv-rejected": "CV bị từ chối",
  "email-draft": "Email draft",
  "email-sent": "Đã gửi email",
};

const KIND_CLASS: Record<AppNotification["kind"], string> = {
  "job-new": "pill ok",
  "cv-created": "pill pending",
  "cv-approved": "pill ok",
  "cv-needs-changes": "pill warn",
  "cv-rejected": "pill bad",
  "email-draft": "pill pending",
  "email-sent": "pill ok",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" });
}

export default async function NotificationsPage() {
  const sheet = await loadSheetData().catch(() => null);
  const notifications = sheet ? buildNotifications(sheet) : [];
  const seenAt = cookies().get("jobhunt_seen_at")?.value;
  const seenMs = seenAt ? new Date(seenAt).getTime() : 0;

  // Đánh dấu đã xem: lần mở trang sau chuông sẽ hết badge.
  cookies().set("jobhunt_seen_at", new Date().toISOString(), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return (
    <div>
      <h1>Thông báo</h1>
      <p className="muted">
        Job mới khớp, CV mới tạo / duyệt / cần sửa, email ứng tuyển đã soạn / đã gửi.
        Mở trang này là đánh dấu đã xem hết.
      </p>

      {!sheet && (
        <div className="warn">
          <strong>Chưa có dữ liệu thật.</strong> Kết nối Google Sheet để xem thông báo.
        </div>
      )}

      {sheet && notifications.length === 0 && (
        <div className="warn">
          <strong>Chưa có thông báo nào.</strong> Khi có job mới khớp hoặc CV mới,
          thông báo sẽ hiện ở đây.
        </div>
      )}

      {notifications.map((n) => {
        const unread = !Number.isNaN(seenMs) && new Date(n.time).getTime() > seenMs;
        return (
          <Link key={n.id} href={n.href} className={`notif-item${unread ? " unread" : ""}`}>
            <span className={KIND_CLASS[n.kind]}>{KIND_LABEL[n.kind]}</span>
            <span className="notif-body">
              <strong>{n.title}</strong>
              <span className="muted">{n.detail}</span>
            </span>
            <span className="muted notif-time">{fmtTime(n.time)}</span>
          </Link>
        );
      })}
    </div>
  );
}
