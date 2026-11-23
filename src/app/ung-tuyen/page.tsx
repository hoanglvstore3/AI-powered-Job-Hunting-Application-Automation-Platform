// Trang ứng tuyển / email nháp (FR-15–FR-16) — Giai đoạn 4.
// CHỈ soạn nội dung email, KHÔNG truy cập/gửi Gmail (Shu dặn tin 295, 18:17
// 23/11/2026). Draft chỉ tạo khi CV đã duyệt VÀ bài đăng có email tuyển dụng.
// Shu tự copy nội dung rồi gửi trong Gmail, sau đó bấm "Đã gửi email" trên
// trang job để website ghi lại ngày ứng tuyển.
import Link from "next/link";
import { loadSheetData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const sheet = await loadSheetData().catch(() => null);
  const applications = (sheet?.applications ?? []).filter((a) => a.job_id);
  const jobs = sheet?.jobs ?? [];

  return (
    <div>
      <h1>Ứng tuyển / Email nháp</h1>
      <p className="muted">
        Giai đoạn 4 — chỉ soạn nội dung email, không gửi Gmail. Email chỉ soạn khi CV đã
        duyệt và bài đăng có email tuyển dụng. Anh tự copy nội dung rồi gửi trong Gmail,
        sau đó bấm “Đã gửi email” trên trang job để website ghi lại ngày ứng tuyển.
      </p>

      {!sheet && (
        <div className="warn">
          <strong>Chưa có dữ liệu thật.</strong> Kết nối Google Sheet để xem danh sách ứng tuyển.
        </div>
      )}

      {sheet && applications.length === 0 && (
        <div className="warn">
          <strong>Chưa có email ứng tuyển nào.</strong> Mở một job đã duyệt CV, vào mục
          “Email ứng tuyển” rồi bấm “Soạn email ứng tuyển”.
        </div>
      )}

      {applications.map((a) => {
        const job = jobs.find((j) => j.job_id === a.job_id);
        return (
          <div key={a.job_id} className="card">
            <div className="cv-version-head">
              <div>
                <strong>{a.role}</strong> · {a.company}
                {job && (
                  <span className="muted">
                    {" — "}
                    <Link href={`/jobs/${encodeURIComponent(a.job_id)}`}>Xem job</Link>
                  </span>
                )}
              </div>
              <div>
                {a.draft_status === "Đã gửi (tự gửi)" ? (
                  <span className="pill ok">{a.draft_status}</span>
                ) : (
                  <span className="pill pending">{a.draft_status}</span>
                )}
              </div>
            </div>
            {a.email_subject && (
              <p>
                <strong>Tiêu đề:</strong> {a.email_subject}
                <br />
                <strong>Tới:</strong> {a.email_to || "Chưa rõ"}
                {a.applied_at && (
                  <>
                    <br />
                    <strong>Đã gửi lúc:</strong>{" "}
                    {new Date(a.applied_at).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}
                  </>
                )}
              </p>
            )}
            {a.reason_no_draft && <p className="muted">Không tạo được draft: {a.reason_no_draft}</p>}
            {a.email_body && <pre className="email-body">{a.email_body}</pre>}
          </div>
        );
      })}
    </div>
  );
}
