// Tạo file PDF cho CV tuỳ biến (§10, FR-13) bằng `pdfkit` (thuần Node, chạy
// được trên Vercel serverless — không cần Chromium). Nội dung giống hệt bản
// DOCX: dữ kiện thật trong CV gốc + phân tích FR-12, không bịa thêm.
import PDFDocument from "pdfkit";
import { BASE_CV, type CVAnalysis } from "./cv";
import type { Job } from "./types";

/** Trả về Buffer của file .pdf cho bản CV tuỳ biến của một job. */
export function buildCvPdf(job: Job, analysis: CVAnalysis): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 54, right: 54 } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const a = analysis;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // PDF dùng font Helvetica (WinAnsi) nên tên dùng bản không dấu như CV gốc
    // ("LE VIET HOANG") — tránh lỗi glyph cho dấu tiếng Việt. Bản DOCX giữ tên có dấu.
    doc.font("Helvetica-Bold").fontSize(19).fillColor("#0f172a")
      .text(BASE_CV.nameAscii.toUpperCase(), { align: "center" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#334155")
      .text(BASE_CV.title.toUpperCase(), { align: "center" });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#475569")
      .text(`Address: ${BASE_CV.location}   |   Phone: ${BASE_CV.phone}   |   Email: ${BASE_CV.email}`, { align: "center" });
    doc.moveDown(0.5);

    const section = (title: string) => {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#1d4ed8").text(title);
      doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.margins.left + W, doc.y + 2)
        .strokeColor("#cbd5e1").lineWidth(1).stroke();
      doc.moveDown(0.4);
      doc.fillColor("#0f172a").font("Helvetica").fontSize(10);
    };

    section("ABOUT ME");
    doc.text(a.tailoredSummary, { width: W, align: "justify" });
    doc.moveDown(0.5);

    section("SKILLS");
    for (const g of BASE_CV.skillGroups) {
      const items = [...g.items].sort((x, y) => {
        const xm = a.matchedSkills.some((m) => m.toLowerCase() === x.toLowerCase()) ? 0 : 1;
        const ym = a.matchedSkills.some((m) => m.toLowerCase() === y.toLowerCase()) ? 0 : 1;
        return xm - ym;
      });
      doc.font("Helvetica-Bold").text(`${g.label}: `, { continued: true });
      doc.font("Helvetica").text(items.join(", "));
    }
    for (const s of BASE_CV.otherSkills) doc.text(s);
    doc.moveDown(0.5);

    section("EXPERIENCE");
    doc.font("Helvetica-Bold").text(`${BASE_CV.experience.role} - ${BASE_CV.experience.company}`);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#475569").text(BASE_CV.experience.period);
    doc.fillColor("#0f172a").font("Helvetica").fontSize(10);
    for (const b of BASE_CV.experience.bullets) doc.text(`•  ${b}`, { width: W });
    doc.moveDown(0.5);

    section("PROJECTS");
    for (const p of a.orderedProjects) {
      doc.font("Helvetica-Bold").text(`${p.name} | ${p.role}`);
      doc.font("Helvetica-Oblique").fontSize(9).fillColor("#475569").text(`Time: ${p.period}`);
      doc.fillColor("#0f172a").font("Helvetica").fontSize(10);
      doc.text(p.description, { width: W });
      doc.text(`Technologies used: ${p.tech.join(", ")}`, { width: W });
      for (const b of p.bullets) doc.text(`•  ${b}`, { width: W });
      doc.moveDown(0.4);
    }

    section("EDUCATION");
    doc.text(BASE_CV.education, { width: W });
    doc.moveDown(0.5);

    section("HONORS & AWARDS");
    for (const w of BASE_CV.awards) doc.text(`•  ${w}`, { width: W });

    doc.end();
  });
}
