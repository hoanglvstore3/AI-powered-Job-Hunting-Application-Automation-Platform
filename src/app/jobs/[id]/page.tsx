import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSheetData } from "@/lib/sheets";
import { analyzeCV } from "@/lib/cv";
import { CvGenerateButton, JobStatusChanger } from "@/components/cv-actions";
import { SAMPLE_JOBS } from "@/data/sample-jobs";

export const dynamic = "force-dynamic";

export default async function JobDetail({ params }: { params: { id: string } }) {
  const sheet = await loadSheetData().catch(() => null);
  const jobs = sheet?.jobs ?? SAMPLE_JOBS;
  const job = jobs.find((j) => j.job_id === decodeURIComponent(params.id));
  if (!job) notFound();
  const isSample = !sheet;
  const analysis = analyzeCV(job);
  const versions = (sheet?.cvVersions ?? []).filter((v) => v.job_id === job.job_id);

  return (
    <div>
      <p><Link href="/" className="back-link">← Danh sách job</Link></p>
      <h1>{job.job_title}</h1>
      <p className="muted">{job.company} · {job.role} · {job.level || "Chưa rõ"} · {job.location || "Chưa rõ"} · {job.work_mode || "Chưa rõ"}</p>
      <p>
        <span className={`badge ${job.is_matched ? "matched" : "notmatched"}`}>
          Matching {job.match_score}/100 · {job.is_matched ? "Đạt ngưỡng" : "Chưa đạt"}
        </span>
      </p>
      <div className="scorebar" aria-hidden="true">
        <div className="scorebar-fill" style={{ width: `${Math.max(0, Math.min(100, job.match_score))}%` }} />
      </div>
      <div className="card">
        <h2>Giải thích điểm matching (FR-05)</h2>
        <p>{job.match_reason}</p>
        <p>Skill khớp:</p>
        <div className="chip-row">
          {job.matched_skills.length > 0
            ? job.matched_skills.map((s) => (<span key={s} className="chip ok">✓ {s}</span>))
            : <span className="muted">—</span>}
        </div>
        <p>Skill thiếu:</p>
        <div className="chip-row">
          {job.missing_skills.length > 0
            ? job.missing_skills.map((s) => (<span key={s} className="chip miss">{s}</span>))
            : <span className="muted">—</span>}
        </div>
      </div>
      <div className="card">
        <h2>Phân tích CV gốc cho job này (FR-12)</h2>
        <p>{analysis.roleFit}</p>
        <p>Skill khớp với CV gốc:</p>
        <div className="chip-row">
          {analysis.matchedSkills.length > 0
            ? analysis.matchedSkills.map((s) => (<span key={s} className="chip ok">✓ {s}</span>))
            : <span className="muted">—</span>}
        </div>
        <p>Skill thiếu — CV gốc chưa có, không chèn vào CV (§10):</p>
        <div className="chip-row">
          {analysis.missingSkills.length > 0
            ? analysis.missingSkills.map((s) => (<span key={s} className="chip miss">{s}</span>))
            : <span className="muted">—</span>}
        </div>
        {analysis.keywordsMissing.length > 0 && (
          <p>Từ khoá trong tiêu đề job mà CV gốc chưa nhắc tới: {analysis.keywordsMissing.join(", ")}</p>
        )}
        <p>Đề xuất sửa cụ thể:</p>
        <ul>
          {analysis.suggestions.map((s, i) => (
            <li key={i}><strong>{s.section}:</strong> {s.text}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>CV tuỳ biến (FR-13 / FR-14)</h2>
        {isSample ? (
          <p className="muted">Chưa có dữ liệu thật nên chưa tạo được CV tuỳ biến.</p>
        ) : (
          <CvGenerateButton jobId={job.job_id} />
        )}
        {versions.length > 0 && (
          <div>
            <p>Các bản đã tạo cho job này:</p>
            <ul>
              {versions.map((v) => (
                <li key={v.cv_id}>
                  v{v.version} — {v.file_name} · {v.status}
                  {v.canva_status === "Chờ sửa" || v.canva_status === "Đang sửa" ? ` · Canva: ${v.canva_status}` : ""}
                  {" · "}
                  <a href={v.docx_url} target="_blank" rel="noreferrer">DOCX</a>
                  {" · "}
                  <a href={v.pdf_url} target="_blank" rel="noreferrer">PDF</a>
                </li>
              ))}
            </ul>
            <p><a href="/cv">Mở trang CV để duyệt</a></p>
          </div>
        )}
      </div>
      <div className="card">
        <h2>Thông tin trích xuất (FR-03)</h2>
        <table><tbody>
          <tr><td>Công ty</td><td>{job.company || "Chưa rõ"}</td></tr>
          <tr><td>Lương</td><td>{job.salary_text || "Chưa rõ"}</td></tr>
          <tr><td>Kinh nghiệm</td><td>{job.experience_required || "Chưa rõ"}</td></tr>
          <tr><td>Hạn nộp</td><td>{job.deadline || "Chưa rõ"}</td></tr>
          <tr><td>Email tuyển dụng</td><td>{job.contact_email || "Chưa rõ"}</td></tr>
          <tr><td>Cách ứng tuyển</td><td>{job.apply_method || "Chưa rõ"}</td></tr>
          <tr><td>Trạng thái</td><td>{isSample ? job.status : <JobStatusChanger jobId={job.job_id} current={job.status} />}</td></tr>
        </tbody></table>
      </div>
      <div className="card">
        <h2>Toàn văn bài đăng</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{job.raw_text || "Chưa có toàn văn (dữ liệu mẫu)."}</p>
        <p><a href={job.post_url} target="_blank" rel="noreferrer">Bài đăng gốc ↗</a></p>
      </div>
      <p className="muted">
        Giai đoạn 3: đổi trạng thái job và duyệt CV thực hiện ngay trên website, ghi ngược về Google Sheet (§8, v1.5).
        QA review (FR-20) đã bỏ — thay bằng ô feedback trên trang CV: gửi feedback, DevBot cập nhật trực tiếp bản Canva.
      </p>
    </div>
  );
}
