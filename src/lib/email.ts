// Giai đoạn 4 — soạn nội dung email ứng tuyển (FR-15/FR-16).
// CHỈ soạn content, KHÔNG truy cập/gửi Gmail (Shu dặn tin 295, 18:17 23/11/2026).
// Mẫu theo email Shu đã gửi cho VTVcab (26/10/2026): tiêu đề "Application for
// {Role} Position – Le Viet Hoang", mở đầu giới thiệu + kinh nghiệm, liệt kê
// 3 dự án KLDX / MetaSight / Rabid, kết + chữ ký. Nội dung chỉ dùng dữ kiện
// trong CV gốc (§10): không bịa kinh nghiệm, công ty, dự án hay skill.
import { BASE_CV } from "./cv";
import type { Job } from "./types";
import type { CVAnalysis } from "./cv";

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Đoán tên dự án từ tiêu đề / nội dung job (VD: "VTVprime"). Chỉ nhận khi
    có từ "dự án"/"project" đi kèm tên riêng, hoặc tên sản phẩm viết hoa rõ ràng
    trong tiêu đề — không đoán mò. Loại trừ từ chức danh (VD: "Project Manager"
    thì "Manager" không phải tên dự án). Trả về "" nếu không chắc. */
const ROLE_WORDS = new Set([
  "manager", "developer", "engineer", "lead", "senior", "junior", "intern",
  "fresher", "architect", "analyst", "designer", "tester", "qa", "devops",
  "product", "team", "head", "director", "officer", "specialist",
  "coordinator", "consultant", "owner", "scrum", "master",
]);

export function extractProjectName(job: Job): string {
  const text = `${job.job_title} ${job.raw_text || ""}`;
  const m = text.match(/(?:dự án|project)\s+([A-Z][A-Za-z0-9_-]{2,30})/i);
  if (m && !ROLE_WORDS.has(m[1].toLowerCase())) return m[1];
  return "";
}

/** Mô tả 1 dòng cho từng dự án trong CV gốc (theo mẫu email Shu đã gửi). */
function projectLine(name: string): string {
  switch (name) {
    case "KLDX":
      return "KLDX: Developed backend services for a financial platform, including API development, transaction processing, and database optimization.";
    case "MetaSight":
      return "MetaSight: Built backend APIs, processed data, implemented background jobs, and improved system performance.";
    case "Rabid":
      return "Rabid: Developed backend services for a podcast platform, including user authentication, subscription management, background processing, and third-party service integrations.";
    default:
      return "";
  }
}

export function buildEmailDraft(job: Job, analysis: CVAnalysis): EmailDraft {
  const company = job.company || "the company";
  const role = job.role || job.job_title || "Backend Developer";
  const project = extractProjectName(job);

  // Skill khớp (chỉ skill có thật trong CV gốc) — dùng làm điểm nhấn kỹ thuật.
  // Mặc định theo mẫu Shu gửi nếu phân tích không khớp skill nào.
  const techSkills = analysis.matchedSkills.length > 0
    ? analysis.matchedSkills.slice(0, 4)
    : ["Node.js", "TypeScript", "NestJS", "Moleculer"];
  const techList = joinList(techSkills);

  const projectNames = ["KLDX", "MetaSight", "Rabid"];
  const projectLines = projectNames.map(projectLine).filter(Boolean);

  const introProject = project
    ? ` for the ${project} project at ${company}`
    : ` at ${company}`;
  const closingProject = project ? project : company;

  const body = [
    `Dear ${company} Recruitment Team,`,
    "",
    `My name is Le Viet Hoang, and I have nearly two years of experience working as a Backend Developer. I am writing to apply for the ${role} position${introProject}.`,
    "",
    `My technical experience includes developing backend services using ${techList}, building RESTful APIs, designing and optimizing databases, implementing asynchronous processing, and developing microservices-based systems.`,
    "",
    "Some projects I have worked on include:",
    "",
    ...projectLines.map((l) => `• ${l}`),
    "",
    `With hands-on backend development experience and a strong willingness to learn, I look forward to the opportunity to contribute to the development of ${closingProject} while continuing to strengthen my technical skills through real-world projects.`,
    "",
    "I have attached my CV for your consideration and would appreciate the opportunity to discuss my experience and qualifications further in an interview.",
    "",
    "Thank you for your time and consideration. I look forward to hearing from you.",
    "",
    "Best regards,",
    "",
    "Le Viet Hoang",
    `Phone: ${BASE_CV.phone}`,
    `Email: ${BASE_CV.email}`,
  ].join("\n");

  return {
    to: job.contact_email || "",
    subject: `Application for ${role} Position – Le Viet Hoang`,
    body,
  };
}
