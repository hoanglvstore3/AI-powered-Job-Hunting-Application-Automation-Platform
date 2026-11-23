// CV gốc + phân tích khoảng cách + tuỳ biến theo requirement v1.5 (§10, FR-12/FR-13).
//
// QUY TẮC CỨNG (§10): CV tuỳ biến CHỈ dùng dữ kiện có trong CV gốc và Profile.
// Không thêm kinh nghiệm, công ty, dự án, chứng chỉ, số năm hay thành tích
// không có trong CV gốc. Skill job yêu cầu mà CV gốc không có thì ghi "chưa có"
// trong phần phân tích, KHÔNG chèn vào CV. Tuỳ biến chỉ được: sắp xếp lại thứ tự
// mục, nhấn mạnh kinh nghiệm/skill liên quan, điều chỉnh tóm tắt, dùng từ khoá
// đúng với bài đăng — từ dữ kiện có thật.
//
// Dữ kiện dưới đây trích nguyên văn từ file CV gốc trên Drive:
// "Lê Việt Hoàng - Backend Developer.pdf" (cập nhật 23/11/2026). CV giữ tiếng Anh
// như bản gốc.
import { PROFILE } from "./profile";
import type { Job } from "./types";

export const BASE_CV = {
  name: "Lê Việt Hoàng",
  nameAscii: "Le Viet Hoang",
  title: "Backend Developer",
  location: "Da Nang, Viet Nam",
  phone: "0814 254 442",
  email: "hoanglvjob3@gmail.com",
  education: "BTEC FPT - Software Engineering (2022 - 2025)",
  about:
    "Back-end Developer with nearly 2 years of professional experience building and maintaining backend applications using Node.js, TypeScript, and NestJS. Experienced in designing RESTful APIs, database management, authentication, and developing scalable backend services using microservices architecture. Proficient in working with SQL databases, Redis, and asynchronous processing to build reliable and maintainable systems. Familiar with Next.js, enabling effective collaboration across the full-stack development process.",
  skillGroups: [
    { label: "Programming Languages", items: ["TypeScript", "JavaScript", "Java", "Python"] },
    { label: "Frameworks and Libraries", items: ["Node.js", "NestJS", "Moleculer", "Next.js", "Spring Boot"] },
    { label: "Databases", items: ["MySQL", "PostgreSQL", "Redis"] },
    { label: "Backend Concepts", items: ["RESTful API Development", "Microservices Architecture", "Authentication & Authorization", "Asynchronous Processing"] },
    { label: "Tools & Platforms", items: ["Git", "GitLab", "Docker", "Postman", "DBeaver", "Argo"] },
  ],
  otherSkills: ["Good English communication skills"],
  experience: {
    role: "Backend Developer",
    company: "Varmeta (Software Development Company)",
    period: "4/2025 - Present",
    bullets: [
      "Develop and maintain backend services using Node.js, TypeScript, and NestJS for web applications.",
      "Design and implement RESTful APIs, database schemas, and authentication and authorization mechanisms.",
      "Implement business logic, data processing, and asynchronous tasks to support application requirements.",
      "Optimize database queries and integrate caching solutions to improve system performance and reliability.",
      "Collaborate with frontend developers and cross-functional teams to integrate APIs, troubleshoot issues, and maintain code quality.",
    ],
  },
  projects: [
    {
      name: "KLDX – Malaysia Digital Securities Platform",
      role: "Backend Developer",
      period: "2/2026 - Present",
      description:
        "A microservices-based financial platform for digital securities management, supporting asset management, investor services, transaction processing, and financial workflows.",
      tech: ["Node.js", "TypeScript", "Moleculer", "MySQL", "TypeORM", "Redis", "BullMQ", "NATS", "Docker", "AWS SDK"],
      bullets: [
        "Developed and maintained backend services using Node.js, TypeScript, and Moleculer within a microservices architecture.",
        "Designed and implemented RESTful APIs for Admin and Investor systems, supporting asset management, transaction processing, and financial operations.",
        "Designed database schemas, optimized SQL queries, and improved data access performance using MySQL, TypeORM, and Redis caching.",
        "Implemented asynchronous job processing with BullMQ to handle background tasks and improve system efficiency.",
        "Managed inter-service communication using NATS and maintained the monorepo architecture with pnpm and Turborepo.",
        "Implemented authentication, authorization, and unit tests using Vitest to improve application security, reliability, and code quality.",
      ],
    },
    {
      name: "MetaSight – Digital Finance Analytics Platform",
      role: "Backend Developer",
      period: "7/2025 - 2/2026",
      description:
        "A digital finance analytics platform providing data processing, financial monitoring, and management services through backend APIs and asynchronous processing.",
      tech: ["TypeScript", "Node.js", "NestJS", "PostgreSQL", "TypeORM", "Redis", "BullMQ", "WebSockets", "AWS SDK", "Docker", "Jest", "Swagger"],
      bullets: [
        "Developed and maintained backend services using Node.js, TypeScript, and NestJS with a modular architecture.",
        "Designed and implemented RESTful APIs for financial analytics, data management, and monitoring features.",
        "Designed database entities and optimized data queries using PostgreSQL and TypeORM.",
        "Implemented background jobs and asynchronous processing using Redis and BullMQ to handle data-intensive tasks efficiently.",
        "Developed real-time communication features using WebSockets to support timely data updates.",
        "Implemented authentication, maintained API documentation with Swagger, and wrote unit tests using Jest to improve application reliability and code quality.",
      ],
    },
    {
      name: "Rabid - Podcast Platform API",
      role: "Backend Developer",
      period: "4/2025 - 7/2025",
      description:
        "Rabid is a Podcast platform providing content management, user authentication, social interactions, subscriptions, and background processing services.",
      tech: ["TypeScript", "Node.js", "NestJS", "Next.js", "PostgreSQL", "TypeORM", "Redis", "BullMQ", "AWS S3", "JWT", "OAuth2", "Docker", "Jest"],
      bullets: [
        "Developed and maintained backend services using Node.js, TypeScript, and NestJS with a modular architecture.",
        "Designed and implemented RESTful APIs for content management, authentication, and subscription features.",
        "Implemented background jobs and asynchronous processing using Redis and BullMQ.",
        "Implemented authentication with JWT and OAuth2, and file storage with AWS S3.",
      ],
    },
  ],
  awards: [
    "02/2025: Top 30 nationwide of the Web3 HackFest 2025 – A competition on Blockchain - AI applications.",
    "02/2025: Third prize in HACKATHON 2025 competition organized by FPT University.",
    "01/2024: Excellent student majoring in software engineering",
    "09/2023: Best student majoring in software engineering",
    "9/2023: Second Prize GenZ Talk",
  ],
};

export type CVProject = (typeof BASE_CV.projects)[number];

function normSkill(s: string): string {
  const t = s.trim();
  return PROFILE.skillAliases[t]?.toLowerCase() ?? t.toLowerCase();
}

/** Toàn bộ skill trong CV gốc, đã chuẩn hoá để so sánh (kèm alias). */
export function baseCvSkillSet(): Set<string> {
  const set = new Set<string>();
  for (const g of BASE_CV.skillGroups) for (const s of g.items) set.add(normSkill(s));
  for (const p of BASE_CV.projects) for (const t of p.tech) set.add(normSkill(t));
  return set;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Từ điển skill để trích từ JD: [tên chuẩn hiển thị, các cách viết trong JD].
    Chỉ gồm skill kỹ thuật khớp chắc chắn; bỏ các từ mơ hồ (go, rest, net...)
    để tránh khớp nhầm. */
const JD_SKILL_VOCAB: [string, string[]][] = [
  ["JavaScript", ["javascript", "js"]],
  ["TypeScript", ["typescript", "ts"]],
  ["Java", ["java"]],
  ["Python", ["python"]],
  ["Node.js", ["node.js", "nodejs", "node"]],
  ["NestJS", ["nestjs", "nest"]],
  ["Moleculer", ["moleculer"]],
  ["Next.js", ["next.js", "nextjs"]],
  ["Spring Boot", ["spring boot", "springboot", "spring"]],
  ["MySQL", ["mysql"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["Redis", ["redis"]],
  ["SQL", ["sql"]],
  ["RESTful API", ["restful api", "rest api", "restful"]],
  ["Microservices", ["microservices", "microservice"]],
  ["Authentication & Authorization", ["authentication & authorization", "authentication", "authorization", "auth"]],
  ["Asynchronous Processing", ["asynchronous processing", "async processing", "async"]],
  ["Docker", ["docker"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["AWS", ["aws"]],
  ["GraphQL", ["graphql"]],
  ["Kafka", ["kafka"]],
  ["RabbitMQ", ["rabbitmq"]],
  ["MongoDB", ["mongodb", "mongo"]],
  ["React", ["react", "reactjs"]],
  ["Vue", ["vue", "vue.js"]],
  ["Angular", ["angular"]],
  ["Git", ["git", "github"]],
  ["GitLab", ["gitlab"]],
  ["CI/CD", ["ci/cd", "ci cd"]],
  ["Jenkins", ["jenkins"]],
  ["Linux", ["linux"]],
  ["TypeORM", ["typeorm"]],
  ["Prisma", ["prisma"]],
  ["Jest", ["jest"]],
  ["Swagger", ["swagger", "openapi"]],
  ["JWT", ["jwt"]],
  ["OAuth2", ["oauth2", "oauth"]],
  ["ServiceNow", ["servicenow"]],
  ["Snowflake", ["snowflake"]],
  ["OutSystems", ["outsystems"]],
  ["Oracle", ["oracle"]],
  ["Firebase", ["firebase"]],
  ["Elasticsearch", ["elasticsearch"]],
  ["NATS", ["nats"]],
  ["BullMQ", ["bullmq"]],
  ["WebSockets", ["websocket", "websockets"]],
  ["Golang", ["golang"]],
  ["HTML", ["html"]],
  ["CSS", ["css"]],
  ["Postman", ["postman"]],
  ["DBeaver", ["dbeaver"]],
  ["Argo", ["argo"]],
];

/** Trích skill từ JD text: quét từ điển theo độ dài giảm dần, xoá phần đã khớp
    để skill ngắn không khớp nhầm bên trong skill dài (Java trong JavaScript,
    SQL trong MySQL). Trả về skill khớp với CV gốc và skill JD yêu cầu mà CV
    gốc chưa có. */
export function extractSkillsFromJD(jdText: string): { matched: string[]; missing: string[] } {
  const mine = baseCvSkillSet();
  let work = ` ${jdText.toLowerCase()} `;
  const found: string[] = [];
  // Skill dài trước (cả tên chuẩn lẫn alias) để cụm dài khớp trước cụm ngắn.
  const vocab = [...JD_SKILL_VOCAB].sort((a, b) => {
    const maxLen = (v: [string, string[]]) => Math.max(v[0].length, ...v[1].map((s) => s.length));
    return maxLen(b) - maxLen(a);
  });
  for (const [canonical, aliases] of vocab) {
    const pats = [canonical.toLowerCase(), ...aliases].sort((a, b) => b.length - a.length);
    for (const pat of pats) {
      const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(pat)}(?![A-Za-z0-9])`);
      const m = re.exec(work);
      if (m) {
        found.push(canonical);
        work = work.slice(0, m.index) + " ".repeat(m[0].length) + work.slice(m.index + m[0].length);
        break;
      }
    }
  }
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of found) {
    (mine.has(normSkill(s)) ? matched : missing).push(s);
  }
  return { matched, missing };
}

export interface CVAnalysis {
  /** Skill job yêu cầu mà CV gốc có. */
  matchedSkills: string[];
  /** Skill job yêu cầu mà CV gốc KHÔNG có — ghi "chưa có", không chèn vào CV. */
  missingSkills: string[];
  /** Từ khoá quan trọng trong tiêu đề job mà CV gốc chưa nhắc tới. */
  keywordsMissing: string[];
  /** Nhận xét khớp role / cấp bậc / địa điểm. */
  roleFit: string;
  /** Đề xuất sửa cụ thể theo từng mục (§10: chỉ sắp xếp/nhấn mạnh/tóm tắt). */
  suggestions: { section: string; text: string }[];
  /** Tóm tắt nghề nghiệp đã điều chỉnh theo job — chỉ từ dữ kiện CV gốc. */
  tailoredSummary: string;
  /** Dự án xếp theo mức liên quan tới job (đếm skill khớp trong tech). */
  orderedProjects: CVProject[];
  /** true khi phân tích có dùng JD do Shu cung cấp (jd_text). */
  usedJD: boolean;
}

/** FR-12: phân tích khoảng cách giữa CV gốc và một job. Thuần, không đọc Sheet/API. */
export function analyzeCV(job: Job): CVAnalysis {
  const mine = baseCvSkillSet();
  const required = [...new Set(job.skills_required.map((s) => s.trim()).filter(Boolean))];
  // Gộp thêm skill trích từ JD (Shu cung cấp khi xin được JD) — JD thường chi
  // tiết hơn bài post nên matching chính xác hơn. Ưu tiên tên chuẩn từ JD khi
  // trùng (khử trùng theo tên đã chuẩn hoá để "JS" và "JavaScript" không cùng hiện).
  const jd = job.jd_text?.trim() ? extractSkillsFromJD(job.jd_text) : { matched: [], missing: [] };
  const jdRequired = [...jd.matched, ...jd.missing];
  const byNorm = new Map<string, string>();
  for (const s of [...jdRequired, ...required]) {
    const n = normSkill(s);
    if (!byNorm.has(n)) byNorm.set(n, s);
  }
  const allRequired = [...byNorm.values()];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const req of allRequired) {
    (mine.has(normSkill(req)) ? matchedSkills : missingSkills).push(req);
  }

  // Từ khoá trong tiêu đề job chưa có trong CV (bỏ từ chung chung).
  const stop = new Set(["developer", "dev", "engineer", "tuyển", "dụng", "tuyển dụng", "junior", "middle", "senior", "fresher", "intern", "fullstack", "full-stack", "backend", "back-end", "frontend", "front-end", "remote", "onsite", "hybrid", "và", "and", "the", "a", "an", "for", "with"]);
  const cvText = JSON.stringify(BASE_CV).toLowerCase();
  const keywordsMissing: string[] = [];
  for (const word of (job.job_title || "").split(/[^A-Za-z0-9À-ỹ]+/).filter(Boolean)) {
    const w = word.trim();
    if (w.length < 3 || stop.has(w.toLowerCase())) continue;
    if (!cvText.includes(w.toLowerCase()) && !keywordsMissing.some((k) => k.toLowerCase() === w.toLowerCase())) {
      keywordsMissing.push(w);
    }
  }

  const roleLower = (job.role || "").toLowerCase();
  const roleFit =
    roleLower.includes("backend") || roleLower.includes("fullstack")
      ? `Role ${job.role || "chưa rõ"} khớp role mục tiêu Backend/Fullstack.`
      : `Role ${job.role || "chưa rõ"} — kiểm tra lại với role mục tiêu Backend Developer.`;
  const levelLower = (job.level || "").toLowerCase();
  const levelNote = !job.level
    ? "Bài đăng không nêu cấp bậc."
    : levelLower.includes("junior") || levelLower.includes("fresher")
      ? `Cấp bậc ${job.level} khớp Junior/Fresher.`
      : `Cấp bậc ${job.level} — cao hơn mục tiêu Junior một bậc, vẫn ứng tuyển được.`;

  const suggestions: { section: string; text: string }[] = [];
  if (matchedSkills.length > 0) {
    suggestions.push({
      section: "Tóm tắt nghề nghiệp",
      text: `Nhấn mạnh ${matchedSkills.slice(0, 4).join(", ")} — các skill job yêu cầu mà CV gốc đã có.`,
    });
    suggestions.push({
      section: "Kỹ năng",
      text: `Đưa ${matchedSkills.slice(0, 5).join(", ")} lên đầu danh sách skill để nhà tuyển dụng thấy ngay.`,
    });
  }
  const ranked = [...BASE_CV.projects]
    .map((p) => ({ p, score: p.tech.filter((t) => matchedSkills.some((m) => normSkill(m) === normSkill(t))).length }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0] && ranked[0].score > 0) {
    suggestions.push({
      section: "Dự án",
      text: `Đưa dự án ${ranked[0].p.name} lên đầu — dùng nhiều nhất các skill khớp (${ranked[0].score} skill).`,
    });
  }
  if (missingSkills.length > 0) {
    suggestions.push({
      section: "Skill thiếu (chưa có)",
      text: `Job yêu cầu ${missingSkills.join(", ")} mà CV gốc chưa có — ghi rõ là "chưa có" trong phân tích, KHÔNG chèn vào CV (§10).`,
    });
  }
  if (keywordsMissing.length > 0) {
    suggestions.push({
      section: "Từ khoá job",
      text: `Tiêu đề job nhắc tới ${keywordsMissing.join(", ")} mà CV gốc chưa nhắc tới — chỉ dùng làm từ khoá trong tóm tắt khi đúng với kinh nghiệm thật, không bịa thêm.`,
    });
  }

  const tailoredSummary =
    `${BASE_CV.about} ` +
    (matchedSkills.length > 0
      ? `Relevant strengths for the ${job.role || job.job_title || "role"} at ${job.company || "the company"}: ${matchedSkills.join(", ")}.`
      : "") +
    (missingSkills.length > 0
      ? ` (Note: ${missingSkills.join(", ")} are not in the base CV and are not claimed here.)`
      : "");

  return {
    matchedSkills,
    missingSkills,
    keywordsMissing,
    roleFit: `${roleFit} ${levelNote}`,
    suggestions,
    tailoredSummary,
    orderedProjects: ranked.map((r) => r.p),
    usedJD: Boolean(job.jd_text?.trim()),
  };
}

function sanitizePart(s: string, maxLen: number): string {
  const ascii = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
  const clean = ascii.replace(/[^A-Za-z0-9]+/g, "").trim();
  return clean.slice(0, maxLen) || "Job";
}

export function yyyymmdd(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** Tên file theo mẫu §10: CV_<HoTen>_<CongTy>_<Role>_<YYYYMMDD> (không dấu, không ký tự lạ). */
export function buildCVFileName(job: Job, d = new Date()): string {
  return [
    "CV",
    sanitizePart(BASE_CV.nameAscii.replace(/\s+/g, ""), 20),
    sanitizePart(job.company || "Company", 30),
    sanitizePart(job.role || job.job_title || "Role", 40),
    yyyymmdd(d),
  ].join("_");
}
