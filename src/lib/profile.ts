// Profile đã xác nhận theo §3 / §16 requirement v1.4 (theo CV mới nhất trên Drive).
// Đây là căn cứ matching chính thức. Trường "chưa xác nhận" giữ null — không tự điền.
export const PROFILE = {
  name: "Lê Việt Hoàng",
  phone: "0814 254 442",
  emailContact: "hoanglvjob3@gmail.com", // email liên hệ / gửi thật
  emailDraft: "hoanglv00256@gmail.com", // Gmail dùng để tạo draft
  targetRole: "Backend Developer",
  targetStacks: ["Java", "TypeScript", "JavaScript", "Node.js"],
  level: "Junior" as const, // 1–2 năm kinh nghiệm
  acceptedLevels: ["Fresher", "Junior", "Fullstack"],
  skills: [
    "TypeScript", "JavaScript", "Java", "Python",
    "Node.js", "NestJS", "Moleculer", "Next.js", "Spring Boot",
    "MySQL", "PostgreSQL", "Redis",
    "RESTful API", "Microservices", "Authentication & Authorization", "Asynchronous Processing",
    "Git", "GitLab", "Docker", "Postman", "DBeaver", "Argo",
  ],
  // Đồng nghĩa để matching không bỏ sót (Config tab — có thể sửa từ Sheet sau).
  skillAliases: {
    "NodeJS": "Node.js",
    "Node": "Node.js",
    "TS": "TypeScript",
    "JS": "JavaScript",
    "Spring": "Spring Boot",
    "Nest": "NestJS",
    "Postgres": "PostgreSQL",
    "Rest API": "RESTful API",
    "REST API": "RESTful API",
    // Chuẩn hoá tên dài trong CV gốc về dạng ngắn để matching khớp
    // ("RESTful API" trong JD/post phải khớp với "RESTful API Development" trong CV).
    "RESTful API Development": "RESTful API",
    "Microservices Architecture": "Microservices",
    "AWS SDK": "AWS",
    "AWS S3": "AWS",
  } as Record<string, string>,
  locations: ["Đà Nẵng", "Da Nang"],
  remoteOkAnywhere: true,
  // Chưa xác nhận (§16): loại hình/lương tối thiểu, skill đang học, role loại ngay.
  workType: null as string | null,
  minSalary: null as string | null,
  learningSkills: null as string[] | null,
  excludedRoles: null as string[] | null,
};

export function matchThreshold(): number {
  const raw = Number(process.env.MATCH_THRESHOLD ?? "60");
  // Doc không ghi con số cụ thể — mặc định 60, chờ Shu chốt (xem PLAN.md B3).
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 60;
}
