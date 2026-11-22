import Link from "next/link";
import { loadSheetData } from "@/lib/sheets";
import { SAMPLE_JOBS, SAMPLE_SOURCES, SAMPLE_PROFILE_NOTE } from "@/data/sample-jobs";
import { matchThreshold } from "@/lib/profile";

export const dynamic = "force-dynamic"; // Làm mới dữ liệu mỗi lần tải trang (§8), cache tối đa 5 phút ở tầng Sheet.

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; matched?: string; source?: string };
}) {
  const sheet = await loadSheetData().catch(() => null);
  const isSample = !sheet;
  const jobs = (sheet?.jobs ?? SAMPLE_JOBS).slice();
  const sources = sheet?.sources ?? SAMPLE_SOURCES;
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

  return (
    <div>
      <h1>Việc làm đã lọc</h1>
      <p className="muted">{SAMPLE_PROFILE_NOTE}</p>
      <p className="muted">
        Ngưỡng matching: {matchThreshold()}/100 (chưa chốt trong doc — xem PLAN.md B3) ·{" "}
        {jobs.length} job · {matchedCount} job đạt ngưỡng ·{" "}
        {lastSync ? `Cập nhật gần nhất: ${new Date(lastSync).toLocaleString("vi-VN")}` : "Chưa có Sheet thật"}
      </p>

      {isSample && (
        <div className="warn">
          <strong>Dữ liệu mẫu — chưa phải job thật.</strong> Chưa cấu hình Google Sheet
          &quot;Job Hunting — Data&quot; (GOOGLE_SHEET_ID). Các job dưới đây chỉ minh hoạ
          định dạng hiển thị. Cần tạo workbook theo §6 để xem dữ liệu thật.
        </div>
      )}

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input name="q" placeholder="Tìm theo từ khoá, công ty, skill…" defaultValue={searchParams.q || ""} />
        <select name="source" defaultValue={sourceFilter}>
          <option value="">Mọi nguồn</option>
          {sources.map((s) => (
            <option key={s.source_id} value={s.source_id}>{s.name}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" name="matched" value="1" defaultChecked={onlyMatched} /> Chỉ job đạt ngưỡng
        </label>
        <button type="submit">Lọc</button>
      </form>

      {filtered.length === 0 && <p>Không có job nào khớp bộ lọc.</p>}
      {filtered.map((j) => (
        <div className="card" key={j.job_id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Link href={`/jobs/${encodeURIComponent(j.job_id)}`}><strong>{j.job_title}</strong></Link>
            <span className={`badge ${j.is_matched ? "matched" : "notmatched"}`}>
              {j.match_score}/100 · {j.is_matched ? "Đạt ngưỡng" : "Chưa đạt"}
            </span>
          </div>
          <p className="muted">{j.company} · {j.role} · {j.level || "Chưa rõ"} · {j.location || "Chưa rõ"} · {j.work_mode || "Chưa rõ"}</p>
          <p className="muted">Skill yêu cầu: {j.skills_required.join(", ") || "Chưa rõ"} · Nguồn: {j.source_name}</p>
          <p className="muted">{j.match_reason}</p>
        </div>
      ))}

      <h2>Thống kê (FR-19)</h2>
      <p className="muted">
        Job mới: {jobs.length} · Job matched: {matchedCount} · CV đã tạo: 0 (Giai đoạn 3) · Draft đã tạo: 0 (Giai đoạn 4)
      </p>
    </div>
  );
}
