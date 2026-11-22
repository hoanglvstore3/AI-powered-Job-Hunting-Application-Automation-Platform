// Trang ứng tuyển / draft (FR-15–FR-16) — Giai đoạn 4.
// Chỉ tạo Gmail draft, KHÔNG gửi email (§11). Draft qua hoanglv00256@gmail.com;
// email gửi thật: hoanglvjob3@gmail.com.
export default function ApplicationsPage() {
  return (
    <div>
      <h1>Ứng tuyển / Email nháp</h1>
      <div className="warn">
        <strong>Giai đoạn 4 — chưa triển khai.</strong> Hệ thống chỉ tạo Gmail draft sau khi
        CV đã duyệt và bài đăng có email tuyển dụng. Hệ thống không có chức năng gửi thư —
        người dùng tự kiểm tra và tự gửi trong Gmail.
      </div>
      <p className="muted">
        Khi có dữ liệu thật, tab Applications sẽ hiện ở đây: job nào đã có draft, draft nào
        đang chờ, job nào không tạo được draft và lý do (ví dụ: bài đăng không có email tuyển dụng — FR-16).
        Mỗi job tối đa một draft đang chờ.
      </p>
    </div>
  );
}
