// Trang CV tuỳ biến (FR-12–FR-14) — Giai đoạn 3.
// Giai đoạn đầu: chỉ đọc tab CV_Versions trên Sheet; việc duyệt CV làm trực tiếp trên Sheet (§8).
export default function CVPage() {
  return (
    <div>
      <h1>CV tuỳ biến và duyệt CV</h1>
      <div className="warn">
        <strong>Giai đoạn 3 — chưa triển khai.</strong> Chức năng phân tích CV gốc theo từng
        job và tạo bản CV tuỳ biến sẽ làm sau khi website Giai đoạn 2 chạy ổn với dữ liệu thật.
        Quy tắc cứng (§10): CV tuỳ biến chỉ dùng dữ kiện có trong CV gốc, không bịa thông tin.
      </div>
      <p className="muted">
        CV gốc: “Lê Việt Hoàng - Backend Developer.pdf” trong thư mục Drive của dự án.
        Khi có dữ liệu thật, các bản CV tuỳ biến trong tab CV_Versions sẽ hiện ở đây kèm trạng thái Chờ duyệt / Đã duyệt / Từ chối.
        Việc duyệt thực hiện trực tiếp trên Sheet ở giai đoạn đầu.
      </p>
    </div>
  );
}
