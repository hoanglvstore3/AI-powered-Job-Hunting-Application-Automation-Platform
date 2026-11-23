// POST /api/applications/[jobId]/sent — đánh dấu Shu đã tự gửi email ứng tuyển
// (gửi tay trong Gmail, website không đụng Gmail). Đổi draft_status thành
// "Đã gửi (tự gửi)", ghi applied_at, đổi trạng thái job thành "Applied" (§9).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, markApplicationSent, updateJobStatus } from "@/lib/sheets";

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === decodeURIComponent(params.jobId));
  if (!job) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy job." }, { status: 404 });
  }
  const app = (sheet?.applications ?? []).find((a) => a.job_id === job.job_id);
  if (!app || app.draft_status !== "Đã tạo draft") {
    return NextResponse.json({
      ok: false,
      error: "Chưa có email draft cho job này để đánh dấu đã gửi.",
    }, { status: 409 });
  }
  const ok = await markApplicationSent(job.job_id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không ghi được vào Sheet." }, { status: 500 });
  }
  await updateJobStatus(job.job_id, "Applied").catch(() => false);
  return NextResponse.json({ ok: true });
}
