import Link from "next/link";
import { loadSheetData } from "@/lib/sheets";
import { SAMPLE_JOBS, SAMPLE_PROFILE_NOTE } from "@/data/sample-jobs";
import { matchThreshold } from "@/lib/profile";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic"; // Làm mới dữ liệu mỗi lần tải trang (§8), cache tối đa 5 phút ở tầng Sheet.

// Bố cục trang chủ theo ảnh UI Shu gửi (tin 238, ảnh gửi lại trong chat chính):
// cột giữa: hero + danh sách job; cột phải: panel chi tiết job đang chọn.
// Sidebar + topbar đã có trong layout.tsx; theme phẳng, không gradient kiểu AI.

const LOGO_COLORS = [
  ["#2563eb", "#ffffff"],
  ["#059669", "#ffffff"],
  ["#ea580c", "#ffffff"],
  ["#dc2626", "#ffffff"],
  ["#7c3aed", "#ffffff"],
  ["#0891b2", "#ffffff"],
  ["#475569", "#ffffff"],
];

function logoStyle(company: string): { background: string; color: string } {
  let h = 0;
  for (let i = 0; i < company.length; i++) h = (h * 31 + company.charCodeAt(i)) >>> 0;
  const [background, color] = LOGO_COLORS[h % LOGO_COLORS.length];
  return { background, color };
}

function initials(company: string): string {
  const words = company.replace(/[^A-Za-zÀ-ỹ0-9 ]/g, "").split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function timeAgo(iso: string): string | null {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "Mới đăng";
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Mới đăng";
  if (hours < 24) return `Đăng ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Đăng ${days} ngày trước`;
  return `Đăng ${Math.floor(days / 30)} tháng trước`;
}

function postedLabel(j: Job): string | null {
  return timeAgo(j.posted_at || j.collected_at);
}

function withParams(
  base: { q?: string; matched?: string; source?: string },
  extra: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (base.q) params.set("q", base.q);
  if (base.matched) params.set("matched", base.matched);
  if (base.source) params.set("source", base.source);
  for (const [k, v] of Object.entries(extra)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; matched?: string; source?: string; job?: string };
}) {
  const sheet = await loadSheetData().catch(() => null);
  const isSample = !sheet;
  const jobs = (sheet?.jobs ?? SAMPLE_JOBS).slice();
  const lastSync = sheet?.lastSyncAt ?? null;

  const q = (searchParams.q || "").toLowerCase();
  const onlyMatched = searchParams.matched === "1";
  const sourceFilter = searchParams.source || "";
  const filtered = jobs.filter((j) => {
    if (onlyMatched && !j.is_matched) return false;
    if (sourceFilter && j.source_id !== sourceFilter) return false;
    if (q) {
      const hay = `${j.job_title} ${j.company} ${j.role} ${j.location} ${j.skills_required.join(" ")} ${j.raw_text}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const matchedCount = jobs.filter((j) => j.is_matched).length;
  const selected: Job | null =
    filtered.find((j) => j.job_id === searchParams.job) ?? filtered[0] ?? null;
  const baseParams = { q: searchParams.q, matched: searchParams.matched, source: sourceFilter || undefined };

  // Lọc theo page: tab Sources hiện trống (0 dòng) nên không dùng được làm
  // danh sách page — suy ra các page trực tiếp từ job thật (source_id/name
  // trên từng dòng Jobs), kèm số lượng job mỗi page, xếp theo số lượng giảm dần.
  const pages = (() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const j of jobs) {
      const id = j.source_id || "unknown";
      const entry = map.get(id) ?? { id, name: j.source_name || id, count: 0 };
      entry.count++;
      map.set(id, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="home-grid">
      <div className="home-center">
        <section className="hero">
          <div className="hero-text">
            <h1>Không bỏ lỡ cơ hội việc làm phù hợp với bạn</h1>
            <p>
              AI Job Hunting tự động theo dõi các fanpage tuyển dụng IT, phân tích bài
              đăng và gợi ý những công việc phù hợp với kỹ năng, kinh nghiệm của bạn.
            </p>
            <a href="#jobs" className="btn-primary hero-cta">
              Khám phá ngay <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <rect x="28" y="22" width="64" height="52" rx="14" fill="#1e293b" />
              <circle cx="48" cy="46" r="6" fill="#fff" />
              <circle cx="72" cy="46" r="6" fill="#fff" />
              <rect x="50" y="58" width="20" height="4" rx="2" fill="#fff" />
              <rect x="56" y="12" width="8" height="12" rx="4" fill="#1e293b" />
              <circle cx="60" cy="10" r="4" fill="#2563eb" />
              <rect x="36" y="74" width="48" height="26" rx="8" fill="#2563eb" />
              <rect x="46" y="82" width="28" height="4" rx="2" fill="#bfdbfe" />
              <rect x="46" y="90" width="18" height="4" rx="2" fill="#bfdbfe" />
            </svg>
          </div>
        </section>

        <div className="section-head" id="jobs">
          <h2>
            Việc làm mới phù hợp với bạn{" "}
            <span className="count-badge">{filtered.length}</span>
          </h2>
          <Link href="/" className="see-all">
            Xem tất cả <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="muted">
          Ngưỡng matching: {matchThreshold()}/100 · Job đạt ngưỡng: {matchedCount}/
          {jobs.length}
          {lastSync ? ` · Cập nhật gần nhất: ${new Date(lastSync).toLocaleString("vi-VN")}` : " · Chưa có Sheet thật"}
        </p>

        {isSample && (
          <div className="warn">
            <strong>Dữ liệu mẫu — chưa phải job thật.</strong> Chưa cấu hình Google Sheet
            &quot;Job Hunting — Data&quot; (GOOGLE_SHEET_ID). Các job dưới đây chỉ minh hoạ
            định dạng hiển thị. Cần tạo workbook theo §6 để xem dữ liệu thật.
          </div>
        )}

        <form method="get" className="filter-row">
          <input name="q" placeholder="Tìm theo từ khoá, công ty, skill…" defaultValue={searchParams.q || ""} />
          <label className="filter-check">
            <input type="checkbox" name="matched" value="1" defaultChecked={onlyMatched} /> Chỉ job đạt ngưỡng
          </label>
          <button type="submit" className="btn-primary">Lọc</button>
        </form>

        <div className="page-chips" role="group" aria-label="Lọc post theo page">
          <Link
            href={withParams(baseParams, { source: undefined })}
            className={`page-chip${!sourceFilter ? " active" : ""}`}
          >
            Tất cả ({jobs.length})
          </Link>
          {pages.map((p) => (
            <Link
              key={p.id}
              href={withParams(baseParams, { source: p.id })}
              className={`page-chip${sourceFilter === p.id ? " active" : ""}`}
            >
              {p.name} ({p.count})
            </Link>
          ))}
        </div>

        {filtered.length === 0 && <p>Không có job nào khớp bộ lọc.</p>}
        {filtered.map((j, i) => {
          const shown = j.skills_required.slice(0, 3);
          const extra = j.skills_required.length - shown.length;
          const posted = postedLabel(j);
          const isSelected = selected?.job_id === j.job_id;
          return (
            <article
              className={`job-card${isSelected ? " selected" : ""}`}
              key={j.job_id}
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              <Link
                href={withParams(baseParams, { job: j.job_id })}
                className="job-main"
                aria-label={`${j.job_title} tại ${j.company}`}
              >
                <span className="logo-tile" style={logoStyle(j.company)}>
                  {initials(j.company)}
                </span>
                <span className="job-info">
                  <span className="job-company">{j.company}</span>
                  <span className="job-title">{j.job_title}</span>
                  <span className="chip-row">
                    {shown.map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                    {extra > 0 && <span className="chip">+{extra}</span>}
                  </span>
                  <span className="job-meta">
                    {j.location || "Chưa rõ địa điểm"}
                    {posted ? ` · ${posted}` : ""}
                  </span>
                </span>
              </Link>
              <span className={`badge ${j.is_matched ? "matched" : "notmatched"}`}>
                {j.match_score}/100 · {j.is_matched ? "Đạt ngưỡng" : "Chưa đạt"}
              </span>
              <span className="job-actions">
                <Link href={`/jobs/${encodeURIComponent(j.job_id)}`} className="btn-detail">
                  Xem chi tiết
                </Link>
                <Link
                  href={`/jobs/${encodeURIComponent(j.job_id)}`}
                  className="bookmark"
                  aria-label={`Lưu ${j.job_title}`}
                  title="Xem chi tiết"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </Link>
              </span>
            </article>
          );
        })}

        <p className="muted" style={{ marginTop: 18 }}>{SAMPLE_PROFILE_NOTE}</p>
      </div>

      <aside className="home-right">
        {selected ? (
          <>
            <section className="detail-card">
              <div className="detail-head">
                <span className="logo-tile large" style={logoStyle(selected.company)}>
                  {initials(selected.company)}
                </span>
                <div>
                  <div className="job-company">{selected.company}</div>
                  <h2 className="detail-title">{selected.job_title}</h2>
                </div>
              </div>
              <p className="job-meta">
                {selected.location || "Chưa rõ địa điểm"}
                {postedLabel(selected) ? ` · ${postedLabel(selected)}` : ""}
              </p>
              <div className="chip-row">
                {selected.skills_required.slice(0, 4).map((s) => (
                  <span key={s} className="chip">{s}</span>
                ))}
                {selected.skills_required.length > 4 && (
                  <span className="chip">+{selected.skills_required.length - 4}</span>
                )}
              </div>
              {selected.post_url && (
                <p>
                  <a href={selected.post_url} target="_blank" rel="noreferrer" className="see-all">
                    Xem bài gốc <span aria-hidden="true">↗</span>
                  </a>
                </p>
              )}
              <h3 className="detail-sub">Phân tích với AI</h3>
              <div className="ai-box">
                <span className={`badge ${selected.is_matched ? "matched" : "notmatched"}`}>
                  {selected.is_matched ? "✓ Phù hợp với bạn" : `${selected.match_score}/100 · Chưa đạt`}
                </span>
                <p className="muted">{selected.match_reason || "Chưa có lý do matching."}</p>
                {selected.matched_skills.length > 0 && (
                  <div className="chip-row">
                    {selected.matched_skills.map((s) => (
                      <span key={s} className="chip ok">✓ {s}</span>
                    ))}
                  </div>
                )}
                {selected.missing_skills.length > 0 && (
                  <div className="chip-row">
                    {selected.missing_skills.map((s) => (
                      <span key={s} className="chip miss">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="scorebar" aria-hidden="true">
                <div
                  className="scorebar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, selected.match_score))}%` }}
                />
              </div>
            </section>

            <section className="detail-card">
              <h3 className="detail-sub">Đề xuất cập nhật CV <span className="mini-tag">AI phân tích</span></h3>
              <p className="muted">AI đã so sánh JD với CV hiện tại và đề xuất các thay đổi:</p>
              {selected.missing_skills.length > 0 ? (
                <ul className="check-list">
                  {selected.missing_skills.slice(0, 3).map((s) => (
                    <li key={s}>Bổ sung kỹ năng {s} (nếu có)</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">CV đã khớp tốt với JD này, không cần bổ sung kỹ năng.</p>
              )}
              <Link href="/cv" className="btn-primary btn-block">
                Xem bản cập nhật CV <span aria-hidden="true">→</span>
              </Link>
            </section>

            <section className="detail-card">
              <h3 className="detail-sub">Tạo bản nháp email gửi nhà tuyển dụng</h3>
              <p className="muted">Chuẩn bị email ứng tuyển cho vị trí này theo đúng JD.</p>
              <Link href="/ung-tuyen" className="btn-primary btn-block">
                Mở trang ứng tuyển <span aria-hidden="true">→</span>
              </Link>
            </section>

            <section className={`detail-card status-card${selected.status === "CV Approved" ? " ok" : ""}`}>
              {selected.status === "CV Approved" ? (
                <>
                  <strong>✓ Bạn đã duyệt CV</strong>
                  <p className="muted">Hệ thống sẽ gửi email khi bạn xác nhận. Bạn có thể chỉnh sửa trước khi gửi.</p>
                </>
              ) : (
                <>
                  <strong>Trạng thái: {selected.status || "Mới"}</strong>
                  <p className="muted">Bạn có thể chỉnh sửa CV trước khi gửi ứng tuyển.</p>
                </>
              )}
              <Link href="/cv" className="see-all">
                Chỉnh sửa CV <span aria-hidden="true">→</span>
              </Link>
            </section>
          </>
        ) : (
          <section className="detail-card">
            <p className="muted">Chưa có job nào để hiển thị. Hãy kiểm tra lại bộ lọc hoặc Sheet dữ liệu.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
