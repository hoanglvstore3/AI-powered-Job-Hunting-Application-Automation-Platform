// Matching FR-05 / FR-06 — chấm 0–100 theo role, skill, địa điểm, cấp bậc trong Profile.
// Hàm thuần, không đọc Sheet/API — test được độc lập. Không bịa dữ liệu: trường
// bài đăng không nêu thì tính là "Chưa rõ", không cộng điểm phỏng đoán.
import { PROFILE } from "./profile";

export interface MatchInput {
  role: string;
  level: string;
  location: string;
  work_mode: string;
  skills_required: string[];
}

export interface MatchResult {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  reason: string;
  is_matched: boolean;
}

function norm(s: string): string {
  const t = s.trim().toLowerCase();
  return PROFILE.skillAliases[s.trim()]?.toLowerCase() ?? t;
}

export function scoreJob(input: MatchInput, threshold = 60): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Role — 30 điểm. Backend / Fullstack / Fresher-Java-TS-Node đều tính.
  const role = (input.role || "").toLowerCase();
  const roleHit =
    role.includes("backend") || role.includes("back-end") ||
    role.includes("fullstack") || role.includes("full-stack") ||
    role.includes("full stack") ||
    PROFILE.targetStacks.some((st) => role.includes(st.toLowerCase()));
  if (roleHit) {
    score += 30;
    reasons.push("Role Backend/Fullstack khớp với role mục tiêu");
  } else if (role) {
    reasons.push(`Role "${input.role}" không khớp role mục tiêu`);
  } else {
    reasons.push("Chưa rõ role");
  }

  // 2. Skill — 40 điểm, theo tỉ lệ skill yêu cầu mà profile có.
  const required = [...new Set(input.skills_required.map((s) => s.trim()).filter(Boolean))];
  const mine = new Set(PROFILE.skills.map((s) => norm(s)));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of required) {
    if (mine.has(norm(req))) matched.push(req);
    else missing.push(req);
  }
  if (required.length > 0) {
    const skillScore = Math.round((matched.length / required.length) * 40);
    score += skillScore;
    reasons.push(
      `Skill khớp ${matched.length}/${required.length}` +
        (missing.length ? `; thiếu: ${missing.join(", ")}` : "; đủ skill yêu cầu"),
    );
  } else {
    score += 20; // Không nêu skill: cho nửa điểm, ghi rõ "Chưa rõ".
    reasons.push("Bài đăng không nêu skill — chấm một nửa điểm skill");
  }

  // 3. Địa điểm / hình thức — 15 điểm.
  const loc = (input.location || "").toLowerCase();
  const mode = (input.work_mode || "").toLowerCase();
  if (mode === "remote") {
    score += 15;
    reasons.push("Remote — chấp nhận ở đâu cũng được");
  } else if (PROFILE.locations.some((l) => loc.includes(l.toLowerCase()))) {
    score += 15;
    reasons.push("Địa điểm Đà Nẵng khớp");
  } else if (!loc && !mode) {
    reasons.push("Chưa rõ địa điểm");
  } else {
    reasons.push(`Địa điểm "${input.location || "Chưa rõ"}" không phải Đà Nẵng/remote`);
  }

  // 4. Cấp bậc — 15 điểm.
  const level = (input.level || "").toLowerCase();
  if (!level) {
    reasons.push("Chưa rõ cấp bậc");
  } else if (level.includes("junior") || level.includes("fresher") || level.includes("intern")) {
    score += 15;
    reasons.push("Cấp bậc Junior/Fresher khớp");
  } else if (level.includes("fullstack")) {
    score += 15;
    reasons.push("Cấp bậc Fullstack — chấp nhận");
  } else if (level.includes("middle") || level.includes("mid")) {
    score += 7;
    reasons.push("Cấp bậc Middle — cao hơn mục tiêu một bậc");
  } else {
    reasons.push(`Cấp bậc "${input.level}" cao hơn mục tiêu Junior`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    matched_skills: matched,
    missing_skills: missing,
    reason: reasons.join(". ") + ".",
    is_matched: finalScore >= threshold,
  };
}

/** Chống trùng FR-02: job_id sinh từ nguồn + post_id, fallback post_url đã chuẩn hoá. */
export function makeJobId(sourceId: string, postId: string, postUrl: string): string {
  const key = (postId || "").trim() || normalizeUrl(postUrl);
  return `${sourceId}:${key}`;
}

export function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\/(www\.)?/, "");
}
