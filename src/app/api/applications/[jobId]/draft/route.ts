// POST /api/applications/[jobId]/draft — Giai đoạn 4 (FR-15/FR-16): soạn nội
// dung email ứng tuyển cho nhà tuyển dụng. CHỈ soạn content, KHÔNG truy cập
// hay gửi Gmail (Shu dặn tin 295, 18:17 23/11/2026). Chỉ tạo draft khi CV đã
// duyệt VÀ bài đăng có email tuyển dụng; nếu không, trả lý do rõ ràng.
// Lưu draft vào tab Applications (mỗi job tối đa 1 draft) + đổi trạng thái job
// thành "Email Draft Created" (§9).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, upsertApplication, updateJobStatus } from "@/lib/sheets";
import { analyzeCV } from "@/lib/cv";
import { buildEmailDraft } from "@/lib/email";

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
  // FR-15/FR-16: chỉ soạn email khi CV đã duyệt.
  const versions = (sheet?.cvVersions ?? [])
    .filter((v) => v.job_id === job.job_id)
    .sort((a, b) => b.version - a.version);
  const latest = versions[0];
  if (!latest || latest.status !== "Đã duyệt") {
    return NextResponse.json({
      ok: false,
      error: "Chưa soạn được email: CV cho job này chưa được duyệt. Hãy duyệt bản CV trên trang CV trước.",
    }, { status: 409 });
  }
  if (!job.contact_email) {
    return NextResponse.json({
      ok: false,
      error: "Chưa soạn được email: bài đăng không có email tuyển dụng.",
    }, { status: 409 });
  }
  const analysis = analyzeCV(job);
  const draft = buildEmailDraft(job, analysis);
  const ok = await upsertApplication({
    job_id: job.job_id,
    company: job.company,
    role: job.role || job.job_title,
    email_to: draft.to,
    email_subject: draft.subject,
    email_body: draft.body,
  });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không lưu được draft vào Sheet." }, { status: 500 });
  }
  await updateJobStatus(job.job_id, "Email Draft Created").catch(() => false);
  return NextResponse.json({ ok: true, draft });
}
