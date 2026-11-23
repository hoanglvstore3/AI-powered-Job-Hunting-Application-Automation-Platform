// Tạo file DOCX cho CV tuỳ biến (§10, FR-13) bằng thư viện `docx`.
// Nội dung lấy từ BASE_CV (dữ kiện thật trong CV gốc) + phân tích FR-12:
// tóm tắt đã điều chỉnh, skill/kinh nghiệm liên quan đưa lên trước, dự án xếp
// theo mức liên quan. Không thêm bất kỳ dữ kiện nào ngoài CV gốc.
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { BASE_CV, analyzeCV, type CVAnalysis } from "./cv";
import type { Job } from "./types";

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, color: "1D4ED8" })],
    spacing: { before: 240, after: 80 },
  });
}

function body(text: string, opts?: { bold?: boolean; italic?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, bold: opts?.bold, italics: opts?.italic })],
    spacing: { after: 60 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

/** Trả về Buffer của file .docx cho bản CV tuỳ biến của một job. */
export async function buildCvDocx(job: Job, analysis: CVAnalysis): Promise<Buffer> {
  const a = analysis;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: BASE_CV.name.toUpperCase(), bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: BASE_CV.title.toUpperCase(), bold: true, size: 26, color: "334155" })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Address: ${BASE_CV.location}   |   Phone: ${BASE_CV.phone}   |   Email: ${BASE_CV.email}`,
          size: 20,
          color: "475569",
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  children.push(heading("ABOUT ME"), body(a.tailoredSummary));

  children.push(heading("SKILLS"));
  for (const g of BASE_CV.skillGroups) {
    // Skill khớp với job đưa lên trước trong từng nhóm (chỉ sắp xếp lại, §10).
    const items = [...g.items].sort((x, y) => {
      const xm = a.matchedSkills.some((m) => m.toLowerCase() === x.toLowerCase()) ? 0 : 1;
      const ym = a.matchedSkills.some((m) => m.toLowerCase() === y.toLowerCase()) ? 0 : 1;
      return xm - ym;
    });
    children.push(body(`${g.label}: ${items.join(", ")}`, { bold: true }));
  }
  for (const s of BASE_CV.otherSkills) children.push(body(s));

  children.push(heading("EXPERIENCE"));
  children.push(
    body(`${BASE_CV.experience.role} - ${BASE_CV.experience.company}`, { bold: true }),
    body(BASE_CV.experience.period, { italic: true }),
  );
  for (const b of BASE_CV.experience.bullets) children.push(bullet(b));

  children.push(heading("PROJECTS"));
  for (const p of a.orderedProjects) {
    children.push(
      body(`${p.name} | ${p.role}`, { bold: true }),
      body(`Time: ${p.period}`, { italic: true }),
      body(p.description),
      body(`Technologies used: ${p.tech.join(", ")}`),
    );
    for (const b of p.bullets) children.push(bullet(b));
  }

  children.push(heading("EDUCATION"), body(BASE_CV.education));
  children.push(heading("HONORS & AWARDS"));
  for (const w of BASE_CV.awards) children.push(bullet(w));

  const doc = new Document({
    sections: [{ children }],
    creator: BASE_CV.name,
    title: `CV - ${BASE_CV.name} - ${job.company} - ${job.role || job.job_title}`,
  });
  return Packer.toBuffer(doc);
}
