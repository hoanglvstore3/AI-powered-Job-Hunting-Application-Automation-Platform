// Worker Canva — chạy mỗi 2 phút bằng cron (canva-cv-worker-2m).
//
// Luồng mới (Shu dặn 23/11/2026): khi user tạo CV cho job mới trên web, AI
// đánh giá (FR-12) xong thì worker sẽ:
//   1. duplicate template Canva "Lê Việt Hoàng CV 1" (giữ nguyên mọi content chung),
//   2. đổi tên theo file_name (CV_<HoTen>_<CongTy>_<Role>_<YYYYMMDD>),
//   3. tuỳ biến 2 chỗ duy nhất: câu strengths vào cuối About Me + đưa skill khớp
//      lên đầu dòng Programming Languages (không thêm skill ngoài CV gốc, §10),
//   4. export PDF, upload lên thư mục Drive "CV", ghi link Canva + PDF vào Sheet.
//
// Worker đọc các dòng CV_Versions có canva_status = "Chờ xử lý", xử lý 1 dòng
// mỗi lần chạy (export PDF mất ~40s, cron timeout 120s). Ghi canva_design_id
// ngay sau khi copy để chạy lại không tạo trùng design (idempotent). Khi xong,
// ghi tóm tắt thay đổi so với CV gốc vào cột changes để Shu kiểm tra nhanh.
// Dòng "Chờ sửa" có marker [JD mới] trong notes (Shu vừa lưu JD cho job) cũng
// do script này xử lý: tuỳ biến LẠI design Canva đã có theo phân tích đã gộp
// JD (retaylorOne) — thay câu strengths + sắp lại dòng Programming Languages,
// export lại PDF, nối thêm vào cột changes. Dòng "Chờ sửa" còn lại (Shu gửi
// feedback tự do trên web) KHÔNG do script này xử lý — cron agent sẽ áp dụng
// feedback trực tiếp trên Canva (cần hiểu ngôn ngữ tự nhiên), rồi export lại
// PDF và ghi changes. Xem cron canva-cv-worker-2m.
// Chạy: cd app && npx -y tsx --env-file=.env.local scripts/canva-worker.mts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSheetData, updateCVVersion, uploadCVToDrive } from "../src/lib/sheets";
import { analyzeCV, isKnownSkill } from "../src/lib/cv";

const CANVA_BIN = "/opt/hatch/bin/canva";
// Template Canva "Lê Việt Hoàng CV 1" của Shu (2 trang A4, nội dung = CV gốc).
const TEMPLATE_DESIGN_ID = "DAGfDv-fDpM";
const USER_INTENT = "Duplicate the owners CV template and tailor it for a job (Canva CV worker).";

/** Giờ hiện tại theo Asia/Bangkok, dạng "HH:MM dd/MM" — ghi vào cột changes
    để Shu thấy rõ lần cập nhật theo JD diễn ra khi nào. */
function bangkokStamp(d = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

/** Gọi Canva CLI, trả về object JSON trong content[0].text (hoặc structuredContent). */
function canva<T>(tool: string, args: Record<string, unknown>): T {
  const dir = mkdtempSync(join(tmpdir(), "canva-worker-"));
  const outFile = join(dir, "out.json");
  execFileSync(
    CANVA_BIN,
    [tool, "--json-output-file", outFile, "--arguments-json", JSON.stringify(args)],
    { encoding: "utf-8", timeout: 120000 },
  );
  const data = JSON.parse(readFileSync(outFile, "utf-8")) as {
    isError?: boolean;
    content?: { text?: string }[];
    structuredContent?: unknown;
  };
  if (data.isError) {
    const msg = (data.content?.[0]?.text ?? "unknown error").slice(0, 400);
    throw new Error(`canva ${tool} failed: ${msg}`);
  }
  const text = data.content?.[0]?.text;
  if (typeof text === "string" && text.length > 0) return JSON.parse(text) as T;
  return data.structuredContent as T;
}

interface DesignContent {
  title?: string;
  pages?: {
    type?: string;
    id?: string;
    elements?: Element[];
  }[];
}
interface Element {
  id?: string;
  type?: string;
  locator_id?: string;
  textRegions?: { characters?: string }[];
  children?: Element[];
}

function elementText(el: Element): string {
  return (el.textRegions ?? []).map((r) => r.characters ?? "").join("");
}

function* walkElements(els: Element[]): Generator<Element> {
  for (const el of els) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}

function findTextElement(content: DesignContent, pred: (t: string) => boolean): Element | null {
  for (const page of content.pages ?? []) {
    for (const el of walkElements(page.elements ?? [])) {
      if (el.type === "text" && pred(elementText(el))) return el;
    }
  }
  return null;
}

/** Đưa skill khớp lên đầu dòng "Programming Languages: ..." (giữ nguyên casing gốc).
    Trả về dòng mới + danh sách skill đã đưa lên đầu, hoặc null nếu không đổi. */
function reorderLanguages(line: string, matched: string[]): { line: string; front: string[] } | null {
  const m = line.match(/Programming Languages:\s*([^\n]+)/);
  if (!m) return null;
  const items = m[1].replace(/\.$/, "").split(",").map((s) => s.trim()).filter(Boolean);
  const norm = (s: string) => s.toLowerCase();
  const matchedSet = new Set(matched.map(norm));
  const front = items.filter((it) => matchedSet.has(norm(it)));
  if (front.length === 0) return null;
  const rest = items.filter((it) => !matchedSet.has(norm(it)));
  const reordered = [...front, ...rest].join(", ") + ".";
  const original = m[1].trim();
  if (reordered === original) return null;
  return { line: reordered, front };
}

async function processOne(cv: {
  cv_id: string;
  job_id: string;
  file_name: string;
  notes: string;
  canva_design_id: string;
  canva_url: string;
}): Promise<void> {
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === cv.job_id);
  if (!job) throw new Error(`không tìm thấy job ${cv.job_id}`);
  const analysis = analyzeCV(job);

  // 1. Duplicate template (hoặc dùng lại design đã copy ở lần chạy trước).
  let designId = cv.canva_design_id;
  let editUrl = cv.canva_url;
  if (!designId) {
    const copied = await canva<{ design: { id: string; urls?: { edit_url?: string } } }>(
      "copy-design",
      { design_id: TEMPLATE_DESIGN_ID, user_intent: USER_INTENT },
    );
    designId = copied.design.id;
    editUrl = copied.design.urls?.edit_url ?? `https://www.canva.com/design/${designId}`;
    await updateCVVersion(cv.cv_id, { canva_design_id: designId, canva_url: editUrl });
    console.log(`[${cv.cv_id}] duplicated template -> ${designId}`);
  }

  // 2. Mở transaction, lấy locator của 2 ô text cần sửa.
  const opened = await canva<{
    transaction: { transaction_id: string };
    design_content: DesignContent;
  }>("read-design", {
    design_id: designId,
    open_transaction: true,
    filter: { fields: ["design_content"], page_indices: [1] },
    user_intent: USER_INTENT,
  });
  const txId = opened.transaction.transaction_id;
  const content = opened.design_content;
  const aboutEl = findTextElement(content, (t) =>
    t.startsWith("Back-end Developer with nearly 2 years"),
  );
  const skillsEl = findTextElement(content, (t) => t.includes("Programming Languages:"));
  if (!aboutEl || !skillsEl) {
    throw new Error("không tìm thấy ô About Me / Technical Skills trong template");
  }

  // 3. Chuẩn bị các thao tác sửa (chỉ đổi 2 chỗ, còn lại giữ nguyên).
  // Ghi lại từng thay đổi để viết vào cột changes (Shu kiểm tra nhanh).
  const changeParts: string[] = [`Đổi tên → ${cv.file_name}`];
  const ops: Record<string, unknown>[] = [
    { type: "update_title", title: cv.file_name },
  ];
  if (analysis.matchedSkills.length > 0) {
    const aboutText = elementText(aboutEl);
    const sentence = ` Relevant strengths for the ${job.role || job.job_title} role at ${job.company}: ${analysis.matchedSkills.join(", ")}.`;
    if (!aboutText.includes("Relevant strengths for the")) {
      ops.push({
        type: "find_and_replace_text",
        locator_id: aboutEl.locator_id,
        find_text: aboutText,
        replace_text: aboutText + sentence,
      });
      changeParts.push(`About Me: thêm câu strengths (${analysis.matchedSkills.join(", ")})`);
    }
  }
  const skillsText = elementText(skillsEl);
  const reordered = reorderLanguages(skillsText, analysis.matchedSkills);
  if (reordered) {
    const originalLine = skillsText.match(/Programming Languages:\s*([^\n]+)/)?.[1].trim() ?? "";
    ops.push({
      type: "find_and_replace_text",
      locator_id: skillsEl.locator_id,
      find_text: originalLine,
      replace_text: reordered.line,
    });
    changeParts.push(`Programming Languages: ${reordered.front.join(", ")} lên đầu`);
  }

  // 4. Áp dụng sửa (keep_open) rồi kiểm chứng trước khi commit.
  const edited = await canva<{
    status: string;
    document?: { title?: string; page?: { elements?: Element[] } };
  }>("edit-design", {
    transaction_id: txId,
    page_index: 1,
    finalize: "keep_open",
    operations: ops,
    user_intent: USER_INTENT,
  });
  if (edited.status !== "edits_unverified") {
    throw new Error(`edit-design trả về status ${edited.status}`);
  }
  const doc = edited.document;
  if (doc?.title !== cv.file_name) {
    await canva("edit-design", { transaction_id: txId, finalize: "cancel", user_intent: USER_INTENT });
    throw new Error("đổi tên không khớp, đã huỷ transaction");
  }
  const editedAbout = findTextElement(
    { pages: [{ elements: doc?.page?.elements ?? [] }] },
    (t) => t.startsWith("Back-end Developer with nearly 2 years"),
  );
  if (
    analysis.matchedSkills.length > 0 &&
    editedAbout &&
    !elementText(editedAbout).includes("Relevant strengths for the")
  ) {
    await canva("edit-design", { transaction_id: txId, finalize: "cancel", user_intent: USER_INTENT });
    throw new Error("câu strengths chưa được chèn, đã huỷ transaction");
  }

  // 5. Lưu thay đổi.
  await canva("edit-design", {
    transaction_id: txId,
    finalize: "commit",
    user_intent: USER_INTENT,
  });
  console.log(`[${cv.cv_id}] edited + committed (${ops.length} ops)`);

  // 6. Export PDF, upload lên Drive, ghi link vào Sheet.
  const exported = await canva<{ job: { status: string; urls?: string[] } }>("export-design", {
    design_id: designId,
    format: { type: "pdf", size: "a4" },
    user_intent: USER_INTENT,
  });
  const pdfUrl = exported.job.urls?.[0];
  if (!pdfUrl) throw new Error("export PDF không trả về download URL");
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`tải PDF Canva lỗi HTTP ${res.status}`);
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  const uploaded = await uploadCVToDrive(
    `${cv.file_name}_Canva.pdf`,
    "application/pdf",
    pdfBuf,
  );
  await updateCVVersion(cv.cv_id, {
    canva_url: editUrl,
    canva_design_id: designId,
    canva_pdf_url: uploaded.webViewLink,
    canva_status: "Hoàn thành",
    // Tóm tắt thay đổi so với CV gốc để Shu kiểm tra nhanh trên trang /cv.
    changes: changeParts.join("; "),
  });
  console.log(`[${cv.cv_id}] done: ${editUrl}`);
}

/** Tuỳ biến lại một bản Canva ĐÃ CÓ theo JD mới (Shu lưu JD sau khi CV đã tạo).
    Không tạo design mới — sửa trực tiếp design cũ: thay câu strengths bằng câu
    mới tính từ phân tích đã gộp JD (analyzeCV), sắp xếp lại dòng Programming
    Languages theo skill khớp mới. Export lại PDF, upload file mới lên Drive,
    cập nhật canva_pdf_url + nối thêm vào cột changes, canva_status về "Hoàn thành". */
async function retaylorOne(cv: {
  cv_id: string;
  job_id: string;
  file_name: string;
  notes: string;
  changes: string;
  canva_design_id: string;
  canva_url: string;
}): Promise<void> {
  const sheet = await loadSheetData();
  const job = sheet?.jobs.find((j) => j.job_id === cv.job_id);
  if (!job) throw new Error(`không tìm thấy job ${cv.job_id}`);
  if (!cv.canva_design_id) throw new Error("bản CV chưa có canva_design_id");
  const analysis = analyzeCV(job);

  const opened = await canva<{
    transaction: { transaction_id: string };
    design_content: DesignContent;
  }>("read-design", {
    design_id: cv.canva_design_id,
    open_transaction: true,
    filter: { fields: ["design_content"], page_indices: [1] },
    user_intent: USER_INTENT,
  });
  const txId = opened.transaction.transaction_id;
  const content = opened.design_content;
  const aboutEl = findTextElement(content, (t) =>
    t.startsWith("Back-end Developer with nearly 2 years"),
  );
  const skillsEl = findTextElement(content, (t) => t.includes("Programming Languages:"));
  if (!aboutEl || !skillsEl) {
    throw new Error("không tìm thấy ô About Me / Technical Skills trong design");
  }

  const changeParts: string[] = [];
  const ops: Record<string, unknown>[] = [];
  const stamp = bangkokStamp();
  // 1. Câu strengths: thay bằng câu mới (tính từ phân tích đã gộp JD).
  // Giữ lại từ khoá do Shu thêm tay (không phải skill, VD: FSOFT, Đà Nẵng)
  // để tuỳ biến lại không làm mất sửa tay của Shu.
  const aboutText = elementText(aboutEl);
  const marker = "Relevant strengths for the";
  const baseAbout = aboutText.includes(marker)
    ? aboutText.slice(0, aboutText.indexOf(marker)).trimEnd()
    : aboutText;
  const oldItems = (() => {
    const m = aboutText.match(/Relevant strengths for the[^:]*:\s*([^\n]+)/);
    if (!m) return [] as string[];
    return m[1].replace(/\.$/, "").split(",").map((s) => s.trim()).filter(Boolean);
  })();
  const carriedKeywords = oldItems.filter((it) => !isKnownSkill(it));
  const allListed = [...analysis.matchedSkills, ...carriedKeywords];
  const newSentence =
    allListed.length > 0
      ? ` Relevant strengths for the ${job.role || job.job_title} role at ${job.company}: ${allListed.join(", ")}.`
      : "";
  const newAbout = baseAbout + newSentence;
  if (newAbout !== aboutText) {
    ops.push({
      type: "find_and_replace_text",
      locator_id: aboutEl.locator_id,
      find_text: aboutText,
      replace_text: newAbout,
    });
    changeParts.push(
      newSentence
        ? `JD mới ${stamp}: cập nhật câu strengths (${allListed.join(", ")})`
        : `JD mới ${stamp}: xoá câu strengths (không còn skill khớp)`,
    );
  }
  // 2. Sắp xếp lại dòng Programming Languages theo skill khớp mới.
  const skillsText = elementText(skillsEl);
  const reordered = reorderLanguages(skillsText, analysis.matchedSkills);
  if (reordered) {
    const originalLine = skillsText.match(/Programming Languages:\s*([^\n]+)/)?.[1].trim() ?? "";
    ops.push({
      type: "find_and_replace_text",
      locator_id: skillsEl.locator_id,
      find_text: originalLine,
      replace_text: reordered.line,
    });
    changeParts.push(`JD mới ${stamp}: Programming Languages: ${reordered.front.join(", ")} lên đầu`);
  }
  if (ops.length === 0) {
    // JD không làm thay đổi gì (skill khớp như cũ) — không cần sửa Canva,
    // chỉ đổi trạng thái về Hoàn thành.
    await canva("edit-design", { transaction_id: txId, finalize: "cancel", user_intent: USER_INTENT });
    await updateCVVersion(cv.cv_id, {
      canva_status: "Hoàn thành",
      changes: `${cv.changes ? `${cv.changes}; ` : ""}JD mới ${stamp}: không thay đổi (skill khớp như cũ)`,
    });
    console.log(`[${cv.cv_id}] JD không đổi gì, đã về Hoàn thành.`);
    return;
  }

  const edited = await canva<{
    status: string;
    document?: { title?: string; page?: { elements?: Element[] } };
  }>("edit-design", {
    transaction_id: txId,
    page_index: 1,
    finalize: "keep_open",
    operations: ops,
    user_intent: USER_INTENT,
  });
  if (edited.status !== "edits_unverified") {
    throw new Error(`edit-design trả về status ${edited.status}`);
  }
  const editedAbout = findTextElement(
    { pages: [{ elements: edited.document?.page?.elements ?? [] }] },
    (t) => t.startsWith("Back-end Developer with nearly 2 years"),
  );
  const editedAboutText = editedAbout ? elementText(editedAbout) : "";
  if (newSentence && !editedAboutText.includes(newSentence.trim())) {
    await canva("edit-design", { transaction_id: txId, finalize: "cancel", user_intent: USER_INTENT });
    throw new Error("câu strengths mới chưa được chèn, đã huỷ transaction");
  }
  if (!newSentence && editedAboutText.includes(marker)) {
    await canva("edit-design", { transaction_id: txId, finalize: "cancel", user_intent: USER_INTENT });
    throw new Error("câu strengths cũ chưa được xoá, đã huỷ transaction");
  }

  await canva("edit-design", {
    transaction_id: txId,
    finalize: "commit",
    user_intent: USER_INTENT,
  });
  console.log(`[${cv.cv_id}] retailored by JD + committed (${ops.length} ops)`);

  const exported = await canva<{ job: { status: string; urls?: string[] } }>("export-design", {
    design_id: cv.canva_design_id,
    format: { type: "pdf", size: "a4" },
    user_intent: USER_INTENT,
  });
  const pdfUrl = exported.job.urls?.[0];
  if (!pdfUrl) throw new Error("export PDF không trả về download URL");
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`tải PDF Canva lỗi HTTP ${res.status}`);
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  const uploaded = await uploadCVToDrive(
    `${cv.file_name}_Canva.pdf`,
    "application/pdf",
    pdfBuf,
  );
  await updateCVVersion(cv.cv_id, {
    canva_pdf_url: uploaded.webViewLink,
    canva_status: "Hoàn thành",
    changes: `${cv.changes ? `${cv.changes}; ` : ""}${changeParts.join("; ")}`,
  });
  console.log(`[${cv.cv_id}] done: ${cv.canva_url}`);
}

async function main(): Promise<void> {
  const sheet = await loadSheetData();
  if (!sheet) {
    console.log("canva-worker: Sheet chưa cấu hình, bỏ qua.");
    return;
  }
  // Ưu tiên CV mới ("Chờ xử lý") trước, rồi mới tới tuỳ biến lại theo JD mới.
  const pending = sheet.cvVersions.filter((v) => v.canva_status === "Chờ xử lý");
  if (pending.length > 0) {
    const cv = pending[0];
    console.log(`canva-worker: xử lý ${cv.cv_id} (${cv.file_name}), còn ${pending.length - 1} chờ.`);
    try {
      await processOne(cv);
    } catch (err) {
      await markError(cv, err);
    }
    return;
  }
  // JD mới: dòng "Chờ sửa" có marker [JD mới] trong notes (API /api/jobs/[id]/jd ghi).
  const jdRows = sheet.cvVersions.filter(
    (v) => v.canva_status === "Chờ sửa" && v.notes.includes("[JD mới"),
  );
  if (jdRows.length === 0) {
    console.log("canva-worker: không có CV nào chờ xử lý hay JD mới.");
    return;
  }
  const cv = jdRows[0];
  console.log(`canva-worker: tuỳ biến lại theo JD ${cv.cv_id} (${cv.file_name}).`);
  try {
    await retaylorOne(cv);
  } catch (err) {
    await markError(cv, err);
  }
}

async function markError(cv: { cv_id: string; notes: string }, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`canva-worker: lỗi ${cv.cv_id}: ${msg}`);
  await updateCVVersion(cv.cv_id, {
    canva_status: "Lỗi",
    notes: `${cv.notes ? cv.notes + " " : ""}[Canva lỗi: ${msg.slice(0, 200)}]`,
  }).catch((e) => console.error("ghi lỗi vào Sheet thất bại:", e));
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("canva-worker fatal:", err);
  process.exitCode = 1;
});
