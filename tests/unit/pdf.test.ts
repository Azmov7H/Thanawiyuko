import { describe, expect, it } from "vitest";
import {
  PdfDisabledError,
  contentDisposition,
  defaultPdfFilename,
  escapeHtml,
  getPdfEngine,
  isPdfEnabled,
  parsePdfDocument,
  renderPdfHtml,
  slugifyTitle,
} from "@/server/modules/pdf";

const baseDoc = {
  title: "تقرير <تجريبي>",
  subtitle: "ثانويكو",
  footer: "تذييل",
  meta: [{ label: "الطالب", value: "أحمد & محمد" }],
  blocks: [
    { type: "heading", text: "الملخص", level: 2 },
    { type: "paragraph", text: "نص عادي" },
    { type: "callout", tone: "success", text: "رسالة" },
    { type: "list", ordered: true, items: ["واحد", "اثنان"] },
    {
      type: "table",
      caption: "جدول",
      columns: [
        { key: "a", label: "الاسم" },
        { key: "b", label: "القيمة", align: "end" },
      ],
      rows: [
        { a: "فيزياء", b: "82" },
        { a: "كيمياء" },
      ],
    },
    { type: "pageBreak" },
  ],
};

describe("escapeHtml", () => {
  it("escapes html-sensitive characters", () => {
    expect(escapeHtml('<a href="x" data-y=\'z\'>&')).toBe(
      "&lt;a href=&quot;x&quot; data-y=&#39;z&#39;&gt;&amp;",
    );
  });
});

describe("renderPdfHtml", () => {
  const html = renderPdfHtml(parsePdfDocument(baseDoc));

  it("sets RTL Arabic document attributes", () => {
    expect(html).toContain('<html lang="ar" dir="rtl">');
  });

  it("escapes content and keeps print styles", () => {
    expect(html).toContain("تقرير &lt;تجريبي&gt;");
    expect(html).toContain("أحمد &amp; محمد");
    expect(html).not.toContain("<تجريبي>");
    expect(html).toContain("@page");
  });

  it("renders tables, callouts, lists and page breaks", () => {
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain('<th class="align-end">القيمة</th>');
    expect(html).toContain("callout-success");
    expect(html).toContain("<ol>");
    expect(html).toContain('class="page-break"');
  });

  it("renders missing table cells as empty", () => {
    expect(html).toContain('<td>كيمياء</td><td class="align-end"></td>');
  });
});

describe("parsePdfDocument", () => {
  it("rejects unknown block types", () => {
    expect(() =>
      parsePdfDocument({ title: "x", blocks: [{ type: "unknown" }] }),
    ).toThrow();
  });

  it("rejects a table without columns", () => {
    expect(() =>
      parsePdfDocument({ title: "x", blocks: [{ type: "table", columns: [], rows: [] }] }),
    ).toThrow();
  });
});

describe("filenames", () => {
  it("builds safe filenames", () => {
    expect(slugifyTitle("تقرير تقدم الطالب")).toBe("تقرير-تقدم-الطالب");
    expect(slugifyTitle("a/b:c*d")).toBe("abcd");
    expect(slugifyTitle("   ")).toBe("report");
    expect(defaultPdfFilename("خطتي")).toBe("thanawico-خطتي.pdf");
  });

  it("encodes non-ascii names for content-disposition", () => {
    const header = contentDisposition("thanawico-خطتي.pdf");
    expect(header).toContain('filename="thanawico-____.pdf"');
    expect(header).toContain("filename*=UTF-8''thanawico-%D8%AE%D8%B7%D8%AA%D9%8A.pdf");
  });
});

describe("engine selection", () => {
  it("is enabled by default and can be disabled", () => {
    expect(isPdfEnabled(undefined)).toBe(true);
    expect(isPdfEnabled("chromium")).toBe(true);
    expect(isPdfEnabled("disabled")).toBe(false);
  });

  it("resolves the chromium engine and rejects disabled/unknown", () => {
    expect(getPdfEngine("chromium").name).toBe("chromium");
    expect(() => getPdfEngine("disabled")).toThrow(PdfDisabledError);
    expect(() => getPdfEngine("nope")).toThrow(/Unknown PDF_ENGINE/);
  });
});
