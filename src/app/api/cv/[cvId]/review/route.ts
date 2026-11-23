// POST /api/cv/[cvId]/review { action, note? } — FR-14: người dùng duyệt /
// yêu cầu sửa / từ chối bản CV tuỳ biến ngay trên website. Chỉ CV "Đã duyệt"
// mới đi tiếp (Giai đoạn 4). Đồng thời đổi trạng thái job theo §9.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { loadSheetData, updateCVVersion, updateJobStatus } from "@/lib/sheets";
import type { CVVersion } from "@/lib/types";

const ACTIONS = {
  approve: { status: "Đã duyệt" as const, jobStatus: "CV Approved" },
  "request-changes": { status: "Cần sửa" as const, jobStatus: "CV Drafting" },
  reject: { status: "Từ chối" as const, jobStatus: "CV Rejected" },
} as const;

export async function POST(req: Request, { params }: { params: { cvId: string } }) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const action = body?.action as keyof typeof ACTIONS | undefined;
  if (!action || !ACTIONS[action]) {
    return NextResponse.json(
      { ok: false, error: "action phải là approve, request-changes hoặc reject." },
      { status: 400 },
    );
  }
  const sheet = await loadSheetData();
  const version = sheet?.cvVersions.find((v) => v.cv_id === decodeURIComponent(params.cvId));
  if (!version) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy bản CV." }, { status: 404 });
  }
  const target = ACTIONS[action];
  const patch: Parameters<typeof updateCVVersion>[1] = {
    status: target.status,
    notes: typeof body?.note === "string" ? body.note : undefined,
  };
  if (action === "approve") patch.approved_at = new Date().toISOString();
  const ok = await updateCVVersion(version.cv_id, patch);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Không ghi được trạng thái vào Sheet." }, { status: 500 });
  }
  await updateJobStatus(version.job_id, target.jobStatus).catch(() => false);
  const updated: CVVersion = {
    ...version,
    status: target.status,
    approved_at: patch.approved_at ?? version.approved_at,
    notes: patch.notes ?? version.notes,
  };
  return NextResponse.json({ ok: true, version: updated });
}
