// Test matching FR-05/FR-06. Chạy: npm run test:matching
// (test import từ bản biên dịch tạm của src/lib/matching.ts — xem lệnh trong README).
import test from "node:test";
import assert from "node:assert/strict";
import { scoreJob, makeJobId, normalizeUrl } from "../build-test/matching.js";

test("Backend Node.js Junior ở Đà Nẵng đạt ngưỡng", () => {
  const r = scoreJob({ role: "Backend Developer", level: "Junior", location: "Đà Nẵng", work_mode: "onsite", skills_required: ["Node.js", "TypeScript", "NestJS"] });
  assert.equal(r.is_matched, true);
  assert.ok(r.score >= 60, `score=${r.score}`);
  assert.deepEqual(r.missing_skills, []);
});

test("Frontend React không khớp role, điểm thấp", () => {
  const r = scoreJob({ role: "Frontend Developer", level: "Junior", location: "Đà Nẵng", work_mode: "onsite", skills_required: ["React", "Vue"] });
  assert.equal(r.is_matched, false);
  assert.ok(r.score < 60, `score=${r.score}`);
});

test("Remote Java Spring Boot đạt ngưỡng dù không ở Đà Nẵng", () => {
  const r = scoreJob({ role: "Backend Developer", level: "Junior", location: "", work_mode: "remote", skills_required: ["Java", "Spring Boot"] });
  assert.equal(r.is_matched, true);
});

test("Bài đăng thiếu thông tin không bịa điểm — ghi rõ Chưa rõ", () => {
  const r = scoreJob({ role: "", level: "", location: "", work_mode: "", skills_required: [] });
  assert.match(r.reason, /Chưa rõ/);
  assert.ok(r.score < 60, `score=${r.score}`);
});

test("Chống trùng FR-02: cùng post_id cho cùng job_id; URL chuẩn hoá giống nhau", () => {
  assert.equal(makeJobId("src-1", "123", "https://x"), makeJobId("src-1", "123", "https://y"));
  assert.equal(normalizeUrl("https://www.facebook.com/share/g/ABC/"), normalizeUrl("http://facebook.com/share/g/abc"));
});
