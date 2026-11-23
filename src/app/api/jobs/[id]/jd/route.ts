// POST /api/jobs/[id]/jd { jd_text } — lưu mô tả công việc (JD) do Shu cung
// cấp khi xin được, ghi vào cột jd_text (AE) của tab Jobs. JD dùng thêm cùng
// bài post để phân tích (FR-12) và tuỳ biến CV cho khớp hơn. Nếu job đã có
// bản Canva hoàn thành thì đánh dấu bản đó "Chờ sửa" để worker Canva tuỳ biến
// lại theo JD; nếu chưa có CV thì CV tạo sau sẽ tự dùng JD này.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, updateJobJD, updateCVVersion } from "@/lib/sheets";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const jdText = body?.jd_text;
  if (typeof jdText !== "string") {
    return NextResponse.json({ ok: false, error: "jd_text phải là chuỗi." }, { status: 400 });
  }
  if (jdText.length > 20000) {
    return NextResponse.json({ ok: false, error: "JD dài tối đa 20.000 ký tự." }, { status: 400 });
  }
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === decodeURIComponent(params.id));
  if (!job) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy job." }, { status: 404 });
  }
  const ok = await updateJobJD(job.job_id, jdText.trim());
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không ghi được JD vào Sheet." }, { status: 500 });
  }

  // Nếu job đã có bản Canva hoàn thành thì kích hoạt tuỳ biến lại theo JD.
  // Chỉ kích hoạt khi bản mới nhất đã hoàn thành — nếu đang chờ xử lý (CV mới
  // đang được chuẩn bị) thì bản đó sẽ tự dùng JD; nếu đang chờ sửa (feedback
  // đang xử lý) thì để worker xử lý feedback xong đã, tránh đè lẫn nhau.
  let retaylorTriggered = false;
  const versions = (sheet?.cvVersions ?? [])
    .filter((v) => v.job_id === job.job_id)
    .sort((a, b) => b.version - a.version);
  const latest = versions[0];
  if (latest && latest.canva_status === "Hoàn thành" && latest.canva_design_id && jdText.trim()) {
    const stamp = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date());
    await updateCVVersion(latest.cv_id, {
      canva_status: "Chờ sửa",
      notes: `${latest.notes ? `${latest.notes}\n` : ""}[JD mới ${stamp}] Đã cập nhật JD — tuỳ biến lại CV theo JD.`,
    });
    retaylorTriggered = true;
  }
  return NextResponse.json({ ok: true, job_id: job.job_id, retaylorTriggered });
}
