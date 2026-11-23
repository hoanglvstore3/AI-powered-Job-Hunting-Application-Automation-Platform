import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSheetData } from "@/lib/sheets";
import { SAMPLE_JOBS } from "@/data/sample-jobs";

export const dynamic = "force-dynamic";

export default async function JobDetail({ params }: { params: { id: string } }) {
  const sheet = await loadSheetData().catch(() => null);
  const jobs = sheet?.jobs ?? SAMPLE_JOBS;
  const job = jobs.find((j) => j.job_id === decodeURIComponent(params.id));
  if (!job) notFound();

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
        <h2>Thông tin trích xuất (FR-03)</h2>
        <table><tbody>
          <tr><td>Công ty</td><td>{job.company || "Chưa rõ"}</td></tr>
          <tr><td>Lương</td><td>{job.salary_text || "Chưa rõ"}</td></tr>
          <tr><td>Kinh nghiệm</td><td>{job.experience_required || "Chưa rõ"}</td></tr>
          <tr><td>Hạn nộp</td><td>{job.deadline || "Chưa rõ"}</td></tr>
          <tr><td>Email tuyển dụng</td><td>{job.contact_email || "Chưa rõ"}</td></tr>
          <tr><td>Cách ứng tuyển</td><td>{job.apply_method || "Chưa rõ"}</td></tr>
          <tr><td>Trạng thái</td><td>{job.status}</td></tr>
        </tbody></table>
      </div>
      <div className="card">
        <h2>Toàn văn bài đăng</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{job.raw_text || "Chưa có toàn văn (dữ liệu mẫu)."}</p>
        <p><a href={job.post_url} target="_blank" rel="noreferrer">Bài đăng gốc ↗</a></p>
      </div>
      <p className="muted">
        Giai đoạn đầu website chỉ đọc: đổi trạng thái, ghi chú và duyệt CV thực hiện trực tiếp trên Google Sheet (§8).
      </p>
    </div>
  );
}
