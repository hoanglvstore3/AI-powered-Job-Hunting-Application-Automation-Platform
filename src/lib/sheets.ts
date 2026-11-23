// Đọc Google Sheet "Job Hunting — Data" (§6) qua Google Sheets API, server-side only.
// Website KHÔNG lưu bản sao dữ liệu job riêng (§8). Credential chỉ ở server (§13).
// Khi chưa cấu hình GOOGLE_SHEET_ID thì trả về null — caller dùng dữ liệu mẫu có ghi rõ.
//
// Ghi ngược (Giai đoạn 3, v1.5 §8 "cần uỷ quyền ghi riêng"): service account đã
// được chia sẻ quyền Editor trên Sheet (23/11/2026) — đọc/ghi Sheet dùng SA.
// Upload file CV lên Drive dùng OAuth delegation (tài khoản chủ, xem
// isDriveOAuthConfigured): SA không có storage quota nên không tạo được file
// nào lên Drive (đã kiểm chứng 18:08 ngày 23/11/2026). Mọi lần ghi đều ghi rõ
// trong nhật ký: ai/lúc nào (created_at/approved_at).
import { Readable } from "node:stream";
import { google } from "googleapis";
import type { Job, Source, CVVersion, Application } from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const CV_FOLDER_ID = process.env.GOOGLE_DRIVE_CV_FOLDER_ID || "";

export function isSheetConfigured(): boolean {
  return Boolean(SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

/** Ghi ngược cần thêm thư mục Drive chứa CV tuỳ biến + OAuth Drive (tài khoản chủ). */
export function isWriteConfigured(): boolean {
  return isSheetConfigured() && Boolean(CV_FOLDER_ID) && isDriveOAuthConfigured();
}

function sheetsClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function writeAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function sheetsWriteClient() {
  return google.sheets({ version: "v4", auth: writeAuth() });
}

/** Drive client qua OAuth delegation (tài khoản chủ) — SA không có quota để tạo file. */
function driveOAuthClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth: oauth2 });
}

async function readRange(range: string): Promise<string[][]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return (res.data.values ?? []) as string[][];
}

// Các cột boolean trong Sheet ghi TRUE/FALSE (checkbox), không phải "Có"/"Không".
// Parse robust: nhận TRUE, Yes, 1, Matched, Có ("c..."), Bật ("b...").
function parseBoolCell(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1" || v === "matched") return true;
  if (v === "false" || v === "no" || v === "0" || v === "not matched" || v === "") return false;
  return v.startsWith("c") || v.startsWith("b"); // "Có", "Bật"
}

function rowsToJobs(rows: string[][]): Job[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const get = (name: string) => r[header.indexOf(name)] ?? "";
    const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      job_id: get("job_id"),
      source_id: get("source_id"),
      source_name: get("source_name"),
      post_url: get("post_url"),
      post_id: get("post_id"),
      posted_at: get("posted_at"),
      collected_at: get("collected_at"),
      raw_text: get("raw_text"),
      image_urls: get("image_urls"),
      job_title: get("job_title"),
      company: get("company"),
      role: get("role"),
      level: get("level"),
      location: get("location"),
      work_mode: (get("work_mode") || "") as Job["work_mode"],
      salary_text: get("salary_text"),
      skills_required: list(get("skills_required")),
      experience_required: get("experience_required"),
      deadline: get("deadline"),
      contact_email: get("contact_email"),
      apply_method: get("apply_method"),
      apply_link: get("apply_link"),
      match_score: Number(get("match_score") || 0),
      matched_skills: list(get("matched_skills")),
      missing_skills: list(get("missing_skills")),
      match_reason: get("match_reason"),
      is_matched: parseBoolCell(get("is_matched")),
      status: (get("status") || "New") as Job["status"],
      is_duplicate: parseBoolCell(get("is_duplicate")),
      notes: get("notes"),
    } satisfies Job;
  });
}

export interface SheetData {
  jobs: Job[];
  sources: Source[];
  cvVersions: CVVersion[];
  applications: Application[];
  lastSyncAt: string;
}

// Header tab CV_Versions (A1:T1 — 4 cột Canva thêm ngày 23/11/2026, cột changes
// thêm cùng ngày: tóm tắt bản Canva đã đổi gì so với CV gốc + các lần sửa theo
// feedback. Luồng mới: AI đánh giá → duplicate template Canva CV 1 → đổi tên +
// tuỳ biến content → lưu link. QA review (FR-20) đã bỏ theo ý Shu 19:23 23/11/2026.)
const CV_HEADER = [
  "cv_id", "job_id", "job_title", "company", "role", "version", "file_name",
  "docx_url", "pdf_url", "status", "qa_status", "qa_note", "created_at",
  "approved_at", "notes", "canva_url", "canva_design_id", "canva_status",
  "canva_pdf_url", "changes",
];

function rowsToCVVersions(rows: string[][]): CVVersion[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const get = (name: string) => r[header.indexOf(name)] ?? "";
    const pdf = get("pdf_url");
    return {
      cv_id: get("cv_id"),
      job_id: get("job_id"),
      job_title: get("job_title"),
      company: get("company"),
      role: get("role"),
      version: Number(get("version") || 1),
      file_name: get("file_name"),
      docx_url: get("docx_url"),
      pdf_url: pdf,
      file_url: pdf,
      status: (get("status") || "Chờ duyệt") as CVVersion["status"],
      qa_status: (get("qa_status") || "Chờ QA") as CVVersion["qa_status"],
      qa_note: get("qa_note"),
      created_at: get("created_at"),
      approved_at: get("approved_at"),
      notes: get("notes"),
      canva_url: get("canva_url"),
      canva_design_id: get("canva_design_id"),
      canva_pdf_url: get("canva_pdf_url"),
      canva_status: (get("canva_status") || "Chưa tạo") as CVVersion["canva_status"],
      changes: get("changes"),
    } satisfies CVVersion;
  });
}

function rowsToApplications(rows: string[][]): Application[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const get = (name: string) => r[header.indexOf(name)] ?? "";
    return {
      job_id: get("job_id"),
      company: get("company"),
      role: get("role"),
      draft_status: (get("draft_status") || "Chưa tạo") as Application["draft_status"],
      draft_id: get("draft_id"),
      reason_no_draft: get("reason_no_draft"),
      applied_at: get("applied_at"),
    } satisfies Application;
  });
}

export async function loadSheetData(): Promise<SheetData | null> {
  if (!isSheetConfigured()) return null;
  // Tab Sources và Profile đã bị xoá khỏi Sheet (v1.5) — không đọc nữa, nếu không
  // cả loadSheetData sẽ lỗi và website rơi về dữ liệu mẫu. Nguồn suy ra từ job.
  const [jobRows, cvRows, appRows] = await Promise.all([
    // Tab Jobs có 30 cột (job_id → notes, cột A→AD). Đọc đủ A1:AD — đọc A1:Z
    // sẽ mất 4 cột cuối (is_matched, status, is_duplicate, notes).
    readRange("Jobs!A1:AD"),
    readRange("CV_Versions!A1:T"),
    readRange("Applications!A1:Z"),
  ]);
  return {
    jobs: rowsToJobs(jobRows).sort((a, b) => b.posted_at.localeCompare(a.posted_at)),
    sources: [],
    cvVersions: rowsToCVVersions(cvRows),
    applications: rowsToApplications(appRows),
    lastSyncAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Ghi ngược (Giai đoạn 3): CV_Versions, trạng thái job, upload CV lên Drive.
//
// QUAN TRỌNG — Service account KHÔNG có storage quota (đã kiểm chứng 18:08
// ngày 23/11/2026): mọi cách tạo file lên Drive bằng SA đều lỗi 403
// storageQuotaExceeded — kể cả file nhị phân, convert sang Google Doc, hay
// tạo Doc trống. Shared Drive cũng không có (tài khoản Gmail cá nhân không
// tạo được). Vì vậy upload CV dùng OAuth delegation: website upload BẰNG TÀI
// KHOẢN CỦA CHỦ (refresh token, xem GOOGLE_OAUTH_*), file thuộc về chủ và
// nằm trong thư mục Drive của dự án đúng như §12. Đọc/ghi Sheet vẫn dùng SA
// (SA đã có quyền Editor trên Sheet nên không bị ảnh hưởng).

/** Upload Drive qua OAuth (tài khoản chủ) — bắt buộc cho FR-13. */
export function isDriveOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  );
}
export async function appendCVVersion(v: CVVersion): Promise<void> {
  const sheets = sheetsWriteClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "CV_Versions!A:T",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        v.cv_id, v.job_id, v.job_title, v.company, v.role, String(v.version),
        v.file_name, v.docx_url, v.pdf_url, v.status, v.qa_status, v.qa_note,
        v.created_at, v.approved_at, v.notes,
        v.canva_url ?? "", v.canva_design_id ?? "", v.canva_status ?? "Chờ xử lý",
        v.canva_pdf_url ?? "", v.changes ?? "",
      ]],
    },
  });
}

export interface CVVersionPatch {
  status?: CVVersion["status"];
  qa_status?: CVVersion["qa_status"];
  qa_note?: string;
  approved_at?: string;
  notes?: string;
  canva_url?: string;
  canva_design_id?: string;
  canva_pdf_url?: string;
  canva_status?: CVVersion["canva_status"];
  changes?: string;
}

const CV_COL: Record<string, string> = {
  status: "J", qa_status: "K", qa_note: "L", approved_at: "N", notes: "O",
  canva_url: "P", canva_design_id: "Q", canva_status: "R", canva_pdf_url: "S",
  changes: "T",
};

/** FR-14/FR-20: cập nhật trạng thái / kết quả QA của một bản CV theo cv_id. */
export async function updateCVVersion(cvId: string, patch: CVVersionPatch): Promise<boolean> {
  const sheets = sheetsWriteClient();
  const rows = await readRange("CV_Versions!A1:T");
  const header = rows[0] ?? CV_HEADER;
  const idx = rows.slice(1).findIndex((r) => r[header.indexOf("cv_id")] === cvId);
  if (idx < 0) return false;
  const rowNo = idx + 2; // +1 header, +1 vì findIndex trên slice(1)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const col = CV_COL[key];
    if (!col) continue;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `CV_Versions!${col}${rowNo}`,
      valueInputOption: "RAW",
      requestBody: { values: [[value]] },
    });
  }
  return true;
}

/** FR-11: đổi trạng thái job trên website, ghi ngược về tab Jobs. */
export async function updateJobStatus(jobId: string, status: string): Promise<boolean> {
  const sheets = sheetsWriteClient();
  const rows = await readRange("Jobs!A1:AD");
  if (rows.length < 2) return false;
  const header = rows[0];
  const statusCol = header.indexOf("status");
  const idCol = header.indexOf("job_id");
  if (statusCol < 0 || idCol < 0) return false;
  const idx = rows.slice(1).findIndex((r) => r[idCol] === jobId);
  if (idx < 0) return false;
  // Cột status là cột AB (index 27) — cần chuyển số cột sang chữ cái kiểu AA/AB...,
  // không dùng String.fromCharCode('A' + idx) vì chỉ đúng tới cột Z.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Jobs!${columnLetter(statusCol)}${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
  return true;
}

/** Đổi index cột 0-based sang chữ cái A1 (0→A, 25→Z, 26→AA, 27→AB...). */
function columnLetter(idx: number): string {
  let s = "";
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export interface UploadedCVFile {
  id: string;
  webViewLink: string;
}

/** FR-13: upload file CV vào thư mục Drive "CV" (bằng tài khoản chủ qua OAuth,
 * file thuộc về chủ). Ném lỗi rõ ràng nếu OAuth chưa cấu hình để route trả về
 * thông báo hành động được thay vì lỗi 403 khó hiểu. */
export async function uploadCVToDrive(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<UploadedCVFile> {
  if (!isDriveOAuthConfigured()) {
    throw new Error(
      "Drive OAuth chưa cấu hình: website cần GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN để upload CV bằng tài khoản của chủ (service account không có storage quota).",
    );
  }
  const drive = driveOAuthClient();
  const res = await drive.files.create({
    requestBody: { name: fileName, mimeType, parents: [CV_FOLDER_ID] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id,webViewLink",
  });
  const id = res.data.id as string;
  return { id, webViewLink: res.data.webViewLink as string };
}
