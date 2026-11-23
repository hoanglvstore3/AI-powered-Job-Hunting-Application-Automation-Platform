// Trang CV tuỳ biến và duyệt CV (FR-12–FR-14, FR-20) — Giai đoạn 3, v1.5.
// Đọc tab CV_Versions trên Sheet; duyệt / yêu cầu sửa / từ chối ngay trên
// website (ghi ngược về Sheet). Quy tắc cứng (§10): CV tuỳ biến chỉ dùng dữ
// kiện có trong CV gốc, không bịa thông tin. Sau khi tạo bản CV, bot QA
// (@h1h6qabot) đánh giá đối chiếu yêu cầu job + §10 trước khi người dùng duyệt.
import Link from "next/link";
import { loadSheetData } from "@/lib/sheets";
import { CvReviewButtons } from "@/components/cv-actions";
import { BASE_CV } from "@/lib/cv";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  if (status === "Đã duyệt") return "pill ok";
  if (status === "Từ chối") return "pill bad";
  if (status === "Cần sửa") return "pill warn";
  return "pill pending";
}

function qaClass(qa: string): string {
  if (qa === "Đạt") return "pill ok";
  if (qa === "Không đạt") return "pill bad";
  if (qa === "Cần sửa") return "pill warn";
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
                <span className={qaClass(v.qa_status)}>QA: {v.qa_status}</span>
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
            {v.qa_note && (
              <p><strong>Đánh giá QA (@h1h6qabot):</strong> {v.qa_note}</p>
            )}
            {!v.qa_note && v.qa_status === "Chờ QA" && (
              <p className="muted">
                Đang chờ @h1h6qabot đánh giá bản này đối chiếu yêu cầu job và quy tắc cứng §10 (FR-20).
                Kết quả sẽ hiện ở đây trước khi bạn duyệt.
              </p>
            )}
            {v.notes && <p className="muted">Ghi chú: {v.notes}</p>}
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
