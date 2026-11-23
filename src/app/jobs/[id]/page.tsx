import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSheetData } from "@/lib/sheets";
import { analyzeCV } from "@/lib/cv";
import { CvGenerateButton, JobDescriptionForm, JobStatusChanger } from "@/components/cv-actions";
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
  // Trạng thái tuỳ biến lại CV theo JD — để Shu thấy rõ KHI NÀO và CẬP NHẬT GÌ.
  const latest = versions.length > 0 ? [...versions].sort((a, b) => b.version - a.version)[0] : null;
  // Giờ lưu JD gần nhất (từ marker [JD mới HH:MM dd-MM] trong notes).
  const jdTime = (() => {
    if (!latest) return "";
    const m = [...latest.notes.matchAll(/\[JD mới ([0-9:]+ [0-9-]+)\]/g)];
    return m.length > 0 ? m[m.length - 1][1] : "";
  })();
  const jdPending = Boolean(latest && latest.canva_status === "Chờ sửa" && latest.notes.includes("[JD mới"));
  // "Đã dùng JD" gồm 2 trường hợp: tuỳ biến LẠI bản đã có (changes có "JD mới")
  // và tạo MỚI khi JD đã có sẵn (changes có "Dùng JD").
  const jdDone = Boolean(
    latest &&
    latest.canva_status === "Hoàn thành" &&
    (latest.changes.includes("JD mới") || latest.changes.includes("Dùng JD")),
  );
  const jdError = Boolean(latest && latest.canva_status === "Lỗi" && latest.notes.includes("[JD mới"));

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
        {analysis.usedJD && <p className="ok-text">Đã dùng thêm JD bạn cung cấp để phân tích (skill khớp/thiếu ở dưới đã gộp cả JD).</p>}
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
        <h2>Mô tả công việc (JD)</h2>
        {isSample ? (
          <p className="muted">Chưa có dữ liệu thật nên chưa lưu được JD.</p>
        ) : (
          <JobDescriptionForm jobId={job.job_id} currentJd={job.jd_text || ""} />
        )}
        {!isSample && job.jd_text && (
          <div>
            {jdPending && (
              <p className="ok-text">
                JD đã lưu{jdTime ? ` lúc ${jdTime}` : ""}. CV v{latest!.version} đang được tuỳ biến lại theo JD — DevBot kiểm tra và cập nhật trong ~2 phút, xong sẽ hiện ở mục “Đã thay đổi” bên dưới.
              </p>
            )}
            {jdDone && (
              <p className="ok-text">
                JD đã lưu{jdTime ? ` lúc ${jdTime}` : ""}. CV v{latest!.version} đã dùng JD để tuỳ biến xong — xem mục “Đã thay đổi” ở card CV tuỳ biến bên dưới.
              </p>
            )}
            {jdError && (
              <p className="error-text">
                Tuỳ biến lại theo JD bị lỗi — xem lý do ở mục CV tuỳ biến bên dưới, rồi lưu lại JD để thử lại.
              </p>
            )}
            {latest && latest.canva_status === "Chờ xử lý" && (
              <p className="muted">JD đã lưu. CV v{latest.version} đang được chuẩn bị — bản Canva sẽ dùng JD này.</p>
            )}
            {!latest && (
              <p className="muted">JD đã lưu. Chưa có CV cho job này — khi bấm “Tạo CV tuỳ biến”, bản Canva sẽ dùng JD này.</p>
            )}
            {latest && latest.canva_status === "Hoàn thành" && !jdDone && !jdPending && !jdError && (
              <p className="muted">
                JD đã lưu{jdTime ? ` lúc ${jdTime}` : ""}. CV v{latest.version} chưa tuỳ biến lại theo JD này (đang chờ xử lý khác) — lưu lại JD sau khi bản Canva xử lý xong để kích hoạt.
              </p>
            )}
          </div>
        )}
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
                  {v.canva_status && v.canva_status !== "Chưa tạo" ? ` · Canva: ${v.canva_status}` : ""}
                  {" · "}
                  <a href={v.docx_url} target="_blank" rel="noreferrer">DOCX</a>
                  {" · "}
                  <a href={v.pdf_url} target="_blank" rel="noreferrer">PDF</a>
                  {v.canva_url && (
                    <>
                      {" · "}
                      <a href={v.canva_url} target="_blank" rel="noreferrer">Canva</a>
                    </>
                  )}
                  {v.changes && (
                    <p className="muted">Đã thay đổi so với CV gốc: {v.changes}</p>
                  )}
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
