import { writeFile } from "node:fs/promises";
import { generatePdf, parsePdfDocument } from "../src/server/modules/pdf";

const doc = parsePdfDocument({
  title: "تقرير تقدم تجريبي",
  subtitle: "ثانويكو — أداة اختبار بنية PDF",
  footer: "ثانويكو — تقرير تجريبي",
  meta: [
    { label: "الطالب", value: "طالب تجريبي" },
    { label: "الصف", value: "الثالث الثانوي" },
    { label: "التاريخ", value: new Date().toISOString().slice(0, 10) },
  ],
  blocks: [
    { type: "heading", text: "الملخص", level: 2 },
    {
      type: "paragraph",
      text: "هذا مستند اختباري للتحقق من دعم العربية واتجاه RTL والجداول وتقسيم الصفحات.",
    },
    {
      type: "callout",
      tone: "success",
      text: "كل النصوص هنا مرّت عبر نفس مسار الترميز المستخدم في التقارير الفعلية.",
    },
    {
      type: "table",
      caption: "نموذج بيانات",
      columns: [
        { key: "subject", label: "المادة" },
        { key: "accuracy", label: "الدقة", align: "end" },
      ],
      rows: [
        { subject: "الفيزياء", accuracy: "82%" },
        { subject: "الكيمياء", accuracy: "74%" },
      ],
    },
    { type: "pageBreak" },
    { type: "heading", text: "صفحة ثانية", level: 2 },
    { type: "list", ordered: true, items: ["بند أول", "بند ثانٍ", "بند ثالث"] },
  ],
});

const out = process.argv[2] ?? "/tmp/thanawico-pdf-smoke.pdf";

async function main() {
  const { buffer, filename } = await generatePdf(doc);
  const signature = buffer.subarray(0, 5).toString("latin1");
  if (signature !== "%PDF-") {
    throw new Error(`Unexpected PDF signature: ${JSON.stringify(signature)}`);
  }
  await writeFile(out, buffer);
  console.log(`PDF ok: ${filename} -> ${out} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
