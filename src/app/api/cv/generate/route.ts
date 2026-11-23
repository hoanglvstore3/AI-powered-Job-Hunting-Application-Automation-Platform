// POST /api/cv/generate { job_id } — FR-12/FR-13: phân tích CV gốc theo job,
// tạo bản CV tuỳ biến DOCX + PDF, upload lên Drive, ghi dòng mới vào tab
// CV_Versions (trạng thái Chờ duyệt, QA Chờ QA), đổi trạng thái job thành
// "CV Pending Review". Mỗi lần tạo là một phiên bản mới, không ghi đè (§10).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import {
  loadSheetData, isWriteConfigured, appendCVVersion, updateJobStatus, uploadCVToDrive,
} from "@/lib/sheets";
import { analyzeCV, buildCVFileName } from "@/lib/cv";
import { buildCvDocx } from "@/lib/cv-docx";
import { buildCvPdf } from "@/lib/cv-pdf";
import type { CVVersion } from "@/lib/types";

export async function POST(req: Request) {
  const username = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const jobId = body?.job_id;
  if (typeof jobId !== "string" || !jobId) {
    return NextResponse.json({ ok: false, error: "Thiếu job_id." }, { status: 400 });
  }
  if (!isWriteConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chưa cấu hình upload Drive: website cần GOOGLE_DRIVE_CV_FOLDER_ID và OAuth Drive (GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN) — service account không có storage quota nên không upload được.",
      },
      { status: 503 },
    );
  }
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === jobId);
  if (!job) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy job." }, { status: 404 });
  }

  const analysis = analyzeCV(job);
  const fileName = buildCVFileName(job);
  const existing = (sheet?.cvVersions ?? []).filter((v) => v.job_id === jobId);
  const version = existing.length + 1;
  const cvId = `cv_${jobId.replace(/[^A-Za-z0-9]+/g, "_")}_v${version}`;
  const createdAt = new Date().toISOString();

  try {
    const [docxBuf, pdfBuf] = await Promise.all([
      buildCvDocx(job, analysis),
      buildCvPdf(job, analysis),
    ]);
    const [docxFile, pdfFile] = await Promise.all([
      uploadCVToDrive(`${fileName}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBuf),
      uploadCVToDrive(`${fileName}.pdf`, "application/pdf", pdfBuf),
    ]);

    const record: CVVersion = {
      cv_id: cvId,
      job_id: jobId,
      job_title: job.job_title,
      company: job.company,
      role: job.role || job.job_title,
      version,
      file_name: fileName,
      docx_url: docxFile.webViewLink,
      pdf_url: pdfFile.webViewLink,
      file_url: pdfFile.webViewLink,
      status: "Chờ duyệt",
      qa_status: "Chờ QA",
      qa_note: "",
      created_at: createdAt,
      approved_at: "",
      notes:
        analysis.missingSkills.length > 0
          ? `Skill thiếu (chưa có, không chèn vào CV): ${analysis.missingSkills.join(", ")}`
          : "",
      // Luồng Canva mới (23/11/2026): worker chạy mỗi 2 phút sẽ duplicate
      // template Canva "Lê Việt Hoàng CV 1", đổi tên theo file_name, tuỳ biến
      // About Me + thứ tự skill theo phân tích, rồi ghi link Canva vào dòng này.
      canva_url: "",
      canva_design_id: "",
      canva_pdf_url: "",
      canva_status: "Chờ xử lý",
      // Tóm tắt thay đổi so với CV gốc — worker Canva ghi sau khi tuỳ biến xong.
      changes: "",
    };
    await appendCVVersion(record);
    const jobStatusUpdated = await updateJobStatus(jobId, "CV Pending Review").catch(() => false);

    return NextResponse.json({
      ok: true,
      cv_id: cvId,
      version,
      file_name: fileName,
      docx_url: docxFile.webViewLink,
      pdf_url: pdfFile.webViewLink,
      canva_status: "Chờ xử lý",
      jobStatusUpdated,
      analysis: {
        matchedSkills: analysis.matchedSkills,
        missingSkills: analysis.missingSkills,
        keywordsMissing: analysis.keywordsMissing,
      },
    });
  } catch (err) {
    console.error("generate CV failed", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Drive OAuth chưa cấu hình")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: "Tạo CV thất bại — kiểm tra quyền ghi Sheet/Drive rồi thử lại." },
      { status: 500 },
    );
  }
}
