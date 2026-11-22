// DỮ LIỆU MẪU — chỉ dùng khi chưa cấu hình Google Sheet thật (PLAN.md B2).
// Luôn hiển thị kèm cảnh báo "Dữ liệu mẫu" trên giao diện. Không bao giờ trình bày
// các job này như job thật. Nội dung mẫu được bịa minh hoạ định dạng, không phải
// bài đăng thật — xoá khi Sheet thật đã có dữ liệu.
import type { Job, Source } from "../lib/types";
import { scoreJob } from "../lib/matching";
import { PROFILE, matchThreshold } from "../lib/profile";

export const SAMPLE_SOURCES: Source[] = [
  { source_id: "src-1", name: "Group Đà Nẵng 1 (chưa xác minh)", url: "https://www.facebook.com/share/g/1cKK9SpsMm/?mibextid=wwXIfr", type: "Group", verified: false, enabled: true, is_private: null, note: "Chưa xác minh tên/ID — Giai đoạn 0" },
  { source_id: "src-2", name: "Group Đà Nẵng 2 (chưa xác minh)", url: "https://www.facebook.com/share/g/1D7WEe6p5h/?mibextid=wwXIfr", type: "Group", verified: false, enabled: true, is_private: null, note: "Chưa xác minh tên/ID — Giai đoạn 0" },
  { source_id: "src-3", name: "Group Đà Nẵng 3 (chưa xác minh)", url: "https://www.facebook.com/share/g/1A6MTBNenm/?mibextid=wwXIfr", type: "Group", verified: false, enabled: true, is_private: null, note: "Chưa xác minh tên/ID — Giai đoạn 0" },
  { source_id: "src-4", name: "Group Đà Nẵng 4 (chưa xác minh)", url: "https://www.facebook.com/share/g/19B4yX8ZVP/?mibextid=wwXIfr", type: "Group", verified: false, enabled: true, is_private: null, note: "Chưa xác minh tên/ID — Giai đoạn 0" },
];

function sampleJob(partial: Partial<Job> & Pick<Job, "job_id" | "job_title" | "company">): Job {
  const base: Job = {
    job_id: partial.job_id,
    source_id: "src-1",
    source_name: "Group Đà Nẵng 1 (chưa xác minh)",
    post_url: "https://www.facebook.com/share/g/1cKK9SpsMm/?mibextid=wwXIfr",
    post_id: "",
    posted_at: new Date().toISOString(),
    collected_at: new Date().toISOString(),
    raw_text: "",
    image_urls: "",
    job_title: partial.job_title,
    company: partial.company,
    role: "Backend Developer",
    level: "Junior",
    location: "Đà Nẵng",
    work_mode: "onsite",
    salary_text: "Chưa rõ",
    skills_required: ["Node.js", "TypeScript"],
    experience_required: "1-2 năm",
    deadline: "",
    contact_email: "",
    apply_method: "Xem bài đăng gốc",
    apply_link: "",
    match_score: 0,
    matched_skills: [],
    missing_skills: [],
    match_reason: "",
    is_matched: false,
    status: "New",
    is_duplicate: false,
    notes: "",
  };
  const job = { ...base, ...partial };
  const m = scoreJob(
    { role: job.role, level: job.level, location: job.location, work_mode: job.work_mode, skills_required: job.skills_required },
    matchThreshold(),
  );
  return { ...job, match_score: m.score, matched_skills: m.matched_skills, missing_skills: m.missing_skills, match_reason: m.reason, is_matched: m.is_matched, status: m.is_matched ? "Matched" : "Not Matched" };
}

export const SAMPLE_JOBS: Job[] = [
  sampleJob({ job_id: "sample-1", job_title: "[MẪU] Backend Developer (Node.js)", company: "Công ty Mẫu A", location: "Đà Nẵng", skills_required: ["Node.js", "TypeScript", "NestJS", "PostgreSQL"] }),
  sampleJob({ job_id: "sample-2", job_title: "[MẪU] Frontend Developer (React)", company: "Công ty Mẫu B", role: "Frontend Developer", location: "Đà Nẵng", skills_required: ["React", "TypeScript"] }),
  sampleJob({ job_id: "sample-3", job_title: "[MẪU] Backend Developer (Java, Remote)", company: "Công ty Mẫu C", location: "", work_mode: "remote", skills_required: ["Java", "Spring Boot", "MySQL", "Docker"] }),
];

export const SAMPLE_PROFILE_NOTE = `Profile matching theo requirement v1.4: ${PROFILE.targetRole} — ${PROFILE.targetStacks.join(", ")}, ${PROFILE.level} (1–2 năm), chấp nhận Fresher/Fullstack; Đà Nẵng onsite, remote ở đâu cũng được.`;
