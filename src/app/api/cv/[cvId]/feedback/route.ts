// POST /api/cv/[cvId]/feedback { feedback } — ô feedback trên trang CV.
//
// Shu gửi feedback sau khi xem bản Canva; feedback được lưu vào cột notes của
// dòng CV_Versions và canva_status chuyển thành "Chờ sửa" để worker Canva
// (cron canva-cv-worker-2m) áp dụng sửa rồi báo lại. QA review (FR-20) đã bỏ
// theo ý Shu 19:23 ngày 23/11/2026 — feedback thay cho bước QA.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, updateCVVersion } from "@/lib/sheets";

function vnNow(): string {
  // Server chạy ở UTC nên phải đổi sang giờ Việt Nam (Asia/Bangkok) cho đúng.
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("day")}/${get("month")}`;
}

export async function POST(req: Request, { params }: { params: { cvId: string } }) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const cvId = params.cvId;
  if (!cvId) {
    return NextResponse.json({ ok: false, error: "Thiếu cv_id." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : "";
  if (!feedback) {
    return NextResponse.json({ ok: false, error: "Chưa nhập feedback." }, { status: 400 });
  }
  if (feedback.length > 2000) {
    return NextResponse.json({ ok: false, error: "Feedback dài quá 2000 ký tự." }, { status: 400 });
  }

  const sheet = await loadSheetData();
  const cv = sheet?.cvVersions.find((v) => v.cv_id === cvId);
  if (!cv) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy bản CV." }, { status: 404 });
  }
  // Chỉ nhận feedback khi bản Canva đã xong (ô feedback chỉ hiện lúc đó).
  // Nếu Canva chưa xong thì feedback sẽ bị trôi vì worker chưa có design để sửa.
  if (cv.canva_status !== "Hoàn thành" && cv.canva_status !== "Chờ sửa" && cv.canva_status !== "Đang sửa") {
    return NextResponse.json(
      { ok: false, error: "Bản Canva chưa xong, đợi worker làm xong rồi gửi feedback." },
      { status: 409 },
    );
  }

  const line = `[Feedback ${vnNow()}] ${feedback}`;
  const notes = cv.notes ? `${cv.notes}\n${line}` : line;
  const ok = await updateCVVersion(cvId, { notes, canva_status: "Chờ sửa" });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không lưu được feedback vào Sheet." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, canva_status: "Chờ sửa" });
}
