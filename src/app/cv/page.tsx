// Trang CV tuỳ biến và duyệt CV (FR-12–FR-14) — Giai đoạn 3, v1.5.
// Đọc tab CV_Versions trên Sheet; duyệt / yêu cầu sửa / từ chối ngay trên
// website (ghi ngược về Sheet). Quy tắc cứng (§10): CV tuỳ biến chỉ dùng dữ
// kiện có trong CV gốc, không bịa thông tin. QA review (FR-20) đã bỏ theo ý
// Shu 19:23 ngày 23/11/2026 — thay bằng ô feedback: Shu gửi feedback, DevBot
// cập nhật trực tiếp bản Canva. Mỗi bản Canva có note "đã thay đổi gì so với
// CV gốc" (cột changes) để tiện kiểm tra.
import Link from "next/link";
import { loadSheetData } from "@/lib/sheets";
import { CvReviewButtons, CvFeedbackForm } from "@/components/cv-actions";
import { BASE_CV } from "@/lib/cv";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  if (status === "Đã duyệt") return "pill ok";
  if (status === "Từ chối") return "pill bad";
  if (status === "Cần sửa") return "pill warn";
  return "pill pending";
}

export default async function CVPage() {
  const sheet = await loadSheetData().catch(() => null);
  const versions = (sheet?.cvVersions ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const jobs = sheet?.jobs ?? [];

  return (
    <div>
      <h1>CV tuỳ biến và duyệt CV</h1>
      <p className="muted">
        CV gốc: “Lê Việt Hoàng - Backend Developer.pdf” trong thư mục Drive của dự án.
        Mỗi lần tạo là một phiên bản mới, không ghi đè bản đã duyệt (§10).
      </p>

      {!sheet && (
        <div className="warn">
          <strong>Chưa có dữ liệu thật.</strong> Kết nối Google Sheet để dùng tính năng CV tuỳ biến.
        </div>
      )}

      {sheet && versions.length === 0 && (
        <div className="warn">
          <strong>Chưa có bản CV tuỳ biến nào.</strong> Mở một job ở trang chủ, xem phần “CV tuỳ biến”
          rồi bấm “Tạo CV tuỳ biến cho job này”. Bản DOCX + PDF sẽ được lưu lên Drive và ghi vào tab CV_Versions.
        </div>
      )}

      {versions.map((v) => {
        const job = jobs.find((j) => j.job_id === v.job_id);
        return (
          <div key={v.cv_id} className="card cv-version-card">
            <div className="cv-version-head">
              <div>
                <strong>{v.job_title || v.role}</strong> · {v.company}
                <span className="muted"> — v{v.version} · {v.file_name}</span>
              </div>
              <div>
                <span className={statusClass(v.status)}>{v.status}</span>{" "}
                {v.canva_status === "Hoàn thành" ? (
                  <span className="pill ok">Canva: {v.canva_status}</span>
                ) : v.canva_status === "Chờ xử lý" ? (
                  <span className="pill pending">Canva: {v.canva_status}</span>
                ) : v.canva_status === "Chờ sửa" || v.canva_status === "Đang sửa" ? (
                  <span className="pill warn">Canva: {v.canva_status}</span>
                ) : v.canva_status === "Lỗi" ? (
                  <span className="pill bad">Canva: {v.canva_status}</span>
                ) : null}
              </div>
            </div>
            <p className="muted">
              Tạo lúc {v.created_at ? new Date(v.created_at).toLocaleString("vi-VN") : "—"}
              {v.approved_at ? ` · Duyệt lúc ${new Date(v.approved_at).toLocaleString("vi-VN")}` : ""}
              {job ? <> · <Link href={`/jobs/${encodeURIComponent(job.job_id)}`}>Xem job</Link></> : null}
            </p>
            <p>
              <a href={v.docx_url} target="_blank" rel="noreferrer">Tải DOCX (bản chỉnh sửa)</a>
              {" · "}
              <a href={v.pdf_url} target="_blank" rel="noreferrer">Tải PDF (đính kèm email)</a>
              {v.canva_url ? (
                <>
                  {" · "}
                  <a href={v.canva_url} target="_blank" rel="noreferrer">Mở bản Canva (đã tuỳ biến)</a>
                </>
              ) : v.canva_status === "Chờ xử lý" ? (
                <>
                  {" · "}
                  <span className="muted">Đang chuẩn bị bản Canva…</span>
                </>
              ) : null}
              {v.canva_pdf_url ? (
                <>
                  {" · "}
                  <a href={v.canva_pdf_url} target="_blank" rel="noreferrer">Tải PDF Canva</a>
                </>
              ) : null}
            </p>
            {v.changes && (
              <p><strong>Đã thay đổi so với CV gốc:</strong> {v.changes}</p>
            )}
            {v.notes && <p className="muted">Ghi chú: {v.notes}</p>}
            {v.canva_url ? (
              <CvFeedbackForm cvId={v.cv_id} canvaStatus={v.canva_status} />
            ) : v.canva_status === "Chờ xử lý" ? (
              <p className="muted">Bản Canva đang được chuẩn bị — xong sẽ hiện ô feedback ở đây.</p>
            ) : null}
            <CvReviewButtons cvId={v.cv_id} status={v.status} />
          </div>
        );
      })}

      <div className="card">
        <h2>CV gốc (không sửa đổi)</h2>
        <p>
          <strong>{BASE_CV.name}</strong> — {BASE_CV.title} · {BASE_CV.location} · {BASE_CV.phone} · {BASE_CV.email}
        </p>
        <p className="muted">{BASE_CV.education} · {BASE_CV.experience.company} {BASE_CV.experience.period}</p>
        <p className="muted">
          Mọi bản tuỳ biến chỉ dùng dữ kiện trong CV gốc: không thêm kinh nghiệm, công ty, dự án,
          chứng chỉ hay thành tích không có sẵn. Skill job yêu cầu mà CV gốc không có được ghi rõ
          là “chưa có”, không chèn vào CV.
        </p>
      </div>
    </div>
  );
}
