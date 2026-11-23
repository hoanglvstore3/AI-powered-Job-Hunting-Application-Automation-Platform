// Thông báo trong website (§16 câu 5: quét 30 phút/lần, thông báo trong website).
// Sự kiện suy ra trực tiếp từ dữ liệu Sheet (Jobs + CV_Versions + Applications)
// — không cần thêm tab hay hạ tầng mới. Mỗi sự kiện có thời gian để sắp xếp và
// để tính "chưa đọc" (so với cookie jobhunt_seen_at).
import type { SheetData } from "./sheets";

export interface AppNotification {
  id: string;
  time: string; // ISO
  kind: "job-new" | "cv-created" | "cv-approved" | "cv-needs-changes" | "cv-rejected" | "email-draft" | "email-sent";
  title: string;
  detail: string;
  href: string;
}

const MAX_NOTIFICATIONS = 50;

function toISO(v: string | undefined, fallback: string): string {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

export function buildNotifications(data: SheetData): AppNotification[] {
  const out: AppNotification[] = [];

  for (const job of data.jobs) {
    if (!job.is_matched) continue;
    const when = toISO(job.collected_at || job.posted_at, job.posted_at);
    out.push({
      id: `job-${job.job_id}`,
      time: when,
      kind: "job-new",
      title: `Job mới khớp: ${job.job_title || job.role} — ${job.company}`,
      detail: `${job.match_score}/100 điểm · ${job.location || ""}${job.level ? ` · ${job.level}` : ""}`,
      href: `/jobs/${encodeURIComponent(job.job_id)}`,
    });
  }

  for (const v of data.cvVersions) {
    const created = toISO(v.created_at, v.created_at);
    out.push({
      id: `cv-${v.cv_id}`,
      time: created,
      kind: "cv-created",
      title: `Đã tạo CV cho ${v.job_title || v.role} — ${v.company}`,
      detail: `${v.file_name} · v${v.version}`,
      href: "/cv",
    });
    if (v.status === "Đã duyệt") {
      out.push({
        id: `cv-ok-${v.cv_id}`,
        time: toISO(v.approved_at, created),
        kind: "cv-approved",
        title: `CV ${v.file_name} đã được duyệt`,
        detail: `${v.job_title || v.role} — ${v.company} · có thể soạn email ứng tuyển`,
        href: `/jobs/${encodeURIComponent(v.job_id)}`,
      });
    } else if (v.status === "Cần sửa") {
      out.push({
        id: `cv-fix-${v.cv_id}`,
        time: created,
        kind: "cv-needs-changes",
        title: `CV ${v.file_name} đang cần sửa`,
        detail: `${v.job_title || v.role} — ${v.company}`,
        href: "/cv",
      });
    } else if (v.status === "Từ chối") {
      out.push({
        id: `cv-no-${v.cv_id}`,
        time: created,
        kind: "cv-rejected",
        title: `CV ${v.file_name} đã bị từ chối`,
        detail: `${v.job_title || v.role} — ${v.company}`,
        href: "/cv",
      });
    }
  }

  for (const a of data.applications) {
    if (!a.job_id) continue;
    const when = toISO(a.applied_at || a.created_at, a.created_at || "");
    if (a.draft_status === "Đã gửi (tự gửi)") {
      out.push({
        id: `app-sent-${a.job_id}`,
        time: when,
        kind: "email-sent",
        title: `Đã gửi email ứng tuyển: ${a.role} — ${a.company}`,
        detail: `Tới ${a.email_to || "nhà tuyển dụng"}`,
        href: "/ung-tuyen",
      });
    } else if (a.draft_status === "Đã tạo draft") {
      out.push({
        id: `app-draft-${a.job_id}`,
        time: when,
        kind: "email-draft",
        title: `Đã soạn email ứng tuyển: ${a.role} — ${a.company}`,
        detail: `Tới ${a.email_to || "nhà tuyển dụng"} · chờ anh gửi`,
        href: "/ung-tuyen",
      });
    }
  }

  return out
    .filter((n) => n.time)
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, MAX_NOTIFICATIONS);
}

/** Số thông báo chưa đọc = sự kiện mới hơn mốc đã xem (cookie jobhunt_seen_at). */
export function countUnread(notifications: AppNotification[], seenAt: string | undefined): number {
  if (!seenAt) return notifications.length;
  const seen = new Date(seenAt).getTime();
  if (Number.isNaN(seen)) return notifications.length;
  return notifications.filter((n) => new Date(n.time).getTime() > seen).length;
}
