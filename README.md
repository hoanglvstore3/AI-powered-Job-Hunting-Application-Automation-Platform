# AI-powered Job Hunting & Application Automation Platform — Website

Website cá nhân của Lê Việt Hoàng, đọc dữ liệu từ Google Sheet "Job Hunting — Data"
qua Google Sheets API (requirement v1.4). **Giai đoạn đầu chỉ đọc** — đổi trạng thái,
ghi chú và duyệt CV làm trực tiếp trên Sheet (§8).

## Chạy local

```bash
cp .env.example .env.local   # điền DEMO_USERNAME/DEMO_PASSWORD_HASH, SESSION_SECRET, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON
npm install
npm run dev                  # http://localhost:3000
npm run build                # kiểm tra build
```

## Đăng nhập — tài khoản demo (thay Google Auth theo yêu cầu của Shu lúc 04:37 ngày 23/11/2026)

- Website dùng form đăng nhập username/password, session cookie ký HMAC
  (httpOnly, 7 ngày). Google Auth đã gỡ ở phase này và dời sang phase sau.
- Tài khoản demo đọc từ biến môi trường `DEMO_USERNAME` /
  `DEMO_PASSWORD_HASH` (hash bcrypt — **không lưu mật khẩu plaintext trong
  repo**). Tạo hash mới (dạng base64, xem lưu ý dưới):
  `node -e "console.log(Buffer.from(require('bcryptjs').hashSync('mat-khau-moi', 10)).toString('base64'))"`
  rồi dán kết quả vào `DEMO_PASSWORD_HASH`. Dùng base64 vì bộ load `.env`
  của Next.js sẽ expand ký tự `$` trong hash bcrypt thô (`$2b$10$...`) khi
  ghi trong `.env.local` — đã kiểm chứng bị biến dạng; trên Vercel đặt hash
  thô trực tiếp cũng được, code tự nhận cả 2 dạng.
- Chưa đặt biến môi trường thì dùng tài khoản mặc định **chỉ dùng local**:
  tài khoản `demo`, mật khẩu `demo-local-only`. Tài khoản này **chỉ có hiệu
  lực khi không phải production** — ở production mà chưa đặt
  `DEMO_PASSWORD_HASH` thì không ai đăng nhập được.
- **Bắt buộc đổi trước khi deploy thật:** đặt `DEMO_USERNAME`,
  `DEMO_PASSWORD_HASH` và `SESSION_SECRET` (chuỗi ngẫu nhiên dài) trên Vercel.
  Không dùng tài khoản mặc định ở môi trường thật.

Chưa cấu hình Sheet thì trang chạy ở chế độ **dữ liệu mẫu** (ghi rõ trên giao diện).

## Test matching (FR-05/FR-06)

```bash
npx tsc src/lib/matching.ts src/lib/profile.ts --outDir build-test --module nodenext --target es2022 --moduleResolution nodenext
npm run test:matching
```

## Cấu trúc

- `src/lib/profile.ts` — profile đã xác nhận (§3/§16), ngưỡng matching.
- `src/lib/matching.ts` — chấm điểm 0–100 + chống trùng job_id (FR-02, FR-05).
- `src/lib/sheets.ts` — đọc Sheet server-side only (§6, §13).
- `src/lib/auth.ts` — đăng nhập tài khoản demo (bcrypt hash qua biến môi trường, tài khoản mặc định chỉ dùng local); `src/lib/session.ts` — session cookie ký HMAC.
- `src/app/` — trang: `/` danh sách job, `/jobs/[id]` chi tiết, `/cv` (GĐ 3), `/ung-tuyen` (GĐ 4), `/cai-dat`.

## Deploy

Vercel — kéo code từ repo GitHub `hoanglvstore3/AI-powered-Job-Hunting-Application-Automation-Platform`
(hiện repo còn rỗng, chưa push). Đặt biến môi trường theo `.env.example` trên Vercel.
