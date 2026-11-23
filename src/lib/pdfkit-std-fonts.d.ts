// Khai báo type cho các module font chuẩn của pdfkit 0.21
// (pdfkit/standard-fonts/* không có trong @types/pdfkit).
// Mỗi module export default một object mô tả font (name, bbox, glyphWidths...).
declare module "pdfkit/standard-fonts/Helvetica" {
  const font: { name: "Helvetica" };
  export default font;
}
declare module "pdfkit/standard-fonts/HelveticaBold" {
  const font: { name: "Helvetica-Bold" };
  export default font;
}
declare module "pdfkit/standard-fonts/HelveticaOblique" {
  const font: { name: "Helvetica-Oblique" };
  export default font;
}
