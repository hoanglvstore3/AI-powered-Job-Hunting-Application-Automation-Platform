// Đọc Google Sheet "Job Hunting — Data" (§6) qua Google Sheets API, server-side only.
// Website KHÔNG lưu bản sao dữ liệu job riêng (§8). Credential chỉ ở server (§13).
// Khi chưa cấu hình GOOGLE_SHEET_ID thì trả về null — caller dùng dữ liệu mẫu có ghi rõ.
import { google } from "googleapis";
import type { Job, Source, CVVersion, Application } from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "";

export function isSheetConfigured(): boolean {
  return Boolean(SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function sheetsClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

async function readRange(range: string): Promise<string[][]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return (res.data.values ?? []) as string[][];
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
      is_matched: get("is_matched").toLowerCase().startsWith("c"),
      status: (get("status") || "New") as Job["status"],
      is_duplicate: get("is_duplicate").toLowerCase().startsWith("c"),
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

export async function loadSheetData(): Promise<SheetData | null> {
  if (!isSheetConfigured()) return null;
  const [jobRows, sourceRows] = await Promise.all([
    // Tab Jobs có 30 cột (job_id → notes, cột A→AD). Đọc đủ A1:AD — đọc A1:Z
    // sẽ mất 4 cột cuối (is_matched, status, is_duplicate, notes).
    readRange("Jobs!A1:AD"),
    readRange("Sources!A1:Z"),
  ]);
  const sources: Source[] = sourceRows.slice(1).map((r) => ({
    source_id: r[0] ?? "",
    name: r[1] ?? "",
    url: r[2] ?? "",
    type: (r[3] as Source["type"]) || "",
    verified: (r[4] ?? "").toLowerCase().startsWith("c"),
    enabled: (r[5] ?? "").toLowerCase().startsWith("b"),
    is_private: r[6] ? r[6].toLowerCase().startsWith("c") : null,
    note: r[7] ?? "",
  }));
  // CV_Versions và Applications đọc ở giai đoạn 3–4; giai đoạn 2 trả về rỗng có chủ đích.
  return {
    jobs: rowsToJobs(jobRows).sort((a, b) => b.posted_at.localeCompare(a.posted_at)),
    sources,
    cvVersions: [],
    applications: [],
    lastSyncAt: new Date().toISOString(),
  };
}
