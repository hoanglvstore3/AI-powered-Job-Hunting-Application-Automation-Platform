import { loadSheetData } from "@/lib/sheets";
import { SAMPLE_SOURCES, SAMPLE_PROFILE_NOTE } from "@/data/sample-jobs";
import { PROFILE, matchThreshold } from "@/lib/profile";

export const dynamic = "force-dynamic";

// Trang Cài đặt (§8) — Giai đoạn đầu chỉ đọc/hiển thị; sửa nguồn và tiêu chí
// matching thực hiện trực tiếp trên Sheet (tab Sources / Config), FR-18 làm sau.
export default async function SettingsPage() {
  const sheet = await loadSheetData().catch(() => null);
  const sources = sheet?.sources ?? SAMPLE_SOURCES;
  return (
    <div>
      <h1>Cài đặt</h1>
      {!sheet && (
        <div className="warn"><strong>Chưa có Sheet thật.</strong> Các giá trị dưới đây là mặc định theo requirement v1.4.</div>
      )}
      <div className="card">
        <h2>Profile matching</h2>
        <p>{SAMPLE_PROFILE_NOTE}</p>
        <p className="muted">
          Ngưỡng matching: {matchThreshold()}/100 (chưa chốt — xem PLAN.md B3) · Tần suất quét: 30 phút/lần ·
          Thông báo: trong website · Deploy: Vercel · Đăng nhập: tài khoản demo (username/password), Google Auth dời sang phase sau theo yêu cầu của Shu lúc 04:37 ngày 23/11/2026.
        </p>
        <p className="muted">
          Chưa chốt: loại hình/lương tối thiểu, skill đang học, role loại ngay.
        </p>
      </div>
      <div className="card">
        <h2>Nguồn theo dõi (FR-18, §4)</h2>
        <table>
          <thead><tr><th>Nguồn</th><th>Loại</th><th>Đã xác minh</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_id}>
                <td><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></td>
                <td>{s.type || "Chưa rõ"}</td>
                <td>{s.verified ? "Đã xác minh" : "Chưa xác minh"}</td>
                <td>{s.enabled ? "Bật" : "Tắt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Cả 4 nguồn đều là link chia sẻ Group, chưa xác minh tên/ID (Giai đoạn 0).
          Thêm/bớt nguồn bằng cách sửa tab Sources trên Sheet — không cần sửa code (§4).
        </p>
      </div>
      <div className="card">
        <h2>Thông tin liên hệ</h2>
        <p>{PROFILE.name} · SĐT {PROFILE.phone} · Liên hệ {PROFILE.emailContact} · Tạo draft {PROFILE.emailDraft}</p>
      </div>
    </div>
  );
}
