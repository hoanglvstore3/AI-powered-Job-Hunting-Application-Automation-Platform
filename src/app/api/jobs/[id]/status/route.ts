// POST /api/jobs/[id]/status { status } — FR-11: người dùng đổi trạng thái job
// trên website, ghi ngược về tab Jobs. Chỉ các trạng thái do người dùng chuyển
// (§9); trạng thái CV (CV Drafting / Pending Review / Approved / Rejected) do
// hệ thống chuyển trong luồng CV, không đặt trực tiếp ở đây.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, updateJobStatus } from "@/lib/sheets";

const USER_STATUSES = ["Matched", "Interested", "Ignored", "Applied", "Interviewing", "Closed"] as const;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !(USER_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { ok: false, error: `status phải là một trong: ${USER_STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === decodeURIComponent(params.id));
  if (!job) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy job." }, { status: 404 });
  }
  const ok = await updateJobStatus(job.job_id, status);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không ghi được trạng thái vào Sheet." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, job_id: job.job_id, status });
}
