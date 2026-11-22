# AI-powered Job Hunting & Application Automation Platform — Website

Website cá nhân của Lê Việt Hoàng, đọc dữ liệu từ Google Sheet "Job Hunting — Data"
qua Google Sheets API (requirement v1.4). **Giai đoạn đầu chỉ đọc** — đổi trạng thái,
ghi chú và duyệt CV làm trực tiếp trên Sheet (§8).

## Chạy local

```bash
cp .env.example .env.local   # điền GOOGLE_CLIENT_ID/SECRET, NEXTAUTH_SECRET, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON
npm install
npm run dev                  # http://localhost:3000
npm run build                # kiểm tra build
```

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
- `src/lib/auth.ts` — NextAuth Google, chỉ email chủ sở hữu.
- `src/app/` — trang: `/` danh sách job, `/jobs/[id]` chi tiết, `/cv` (GĐ 3), `/ung-tuyen` (GĐ 4), `/cai-dat`.

## Deploy

Vercel — kéo code từ repo GitHub `hoanglvstore3/AI-powered-Job-Hunting-Application-Automation-Platform`
(hiện repo còn rỗng, chưa push). Đặt biến môi trường theo `.env.example` trên Vercel.
