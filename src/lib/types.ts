// Kiểu dữ liệu theo §6 requirement v1.4 — cột của tab Jobs và các tab liên quan.
export type JobStatus =
  | "New"
  | "Matched"
  | "Not Matched"
  | "Interested"
  | "Ignored"
  | "CV Drafting"
  | "CV Pending Review"
  | "CV Approved"
  | "CV Rejected"
  | "Email Draft Created"
  | "Applied"
  | "Interviewing"
  | "Closed";

export interface Job {
  job_id: string;
  source_id: string;
  source_name: string;
  post_url: string;
  post_id: string;
  posted_at: string;
  collected_at: string;
  raw_text: string;
  image_urls: string;
  job_title: string;
  company: string;
  role: string;
  level: string;
  location: string;
  work_mode: "onsite" | "hybrid" | "remote" | "";
  salary_text: string;
  skills_required: string[];
  experience_required: string;
  deadline: string;
  contact_email: string;
  apply_method: string;
  apply_link: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_reason: string;
  is_matched: boolean;
  status: JobStatus;
  is_duplicate: boolean;
  notes: string;
}

export interface Source {
  source_id: string;
  name: string;
  url: string;
  type: "Group" | "Fanpage" | "";
  verified: boolean;
  enabled: boolean;
  is_private: boolean | null;
  note: string;
}

export interface CVVersion {
  cv_id: string;
  job_id: string;
  company: string;
  role: string;
  status: "Chờ duyệt" | "Đã duyệt" | "Từ chối" | "Cần sửa";
  file_url: string;
  created_at: string;
}

export interface Application {
  job_id: string;
  company: string;
  role: string;
  draft_status: "Chưa tạo" | "Đã tạo draft" | "Đã gửi (tự gửi)";
  draft_id: string;
  reason_no_draft: string;
  applied_at: string;
}
