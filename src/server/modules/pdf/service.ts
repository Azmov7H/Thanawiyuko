import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { pdfDocumentSchema, type PdfDocument } from "./document";
import { getPdfEngine, type PdfRenderOptions } from "./engine";
import { renderPdfHtml } from "./html";

export type GeneratePdfOptions = PdfRenderOptions & {
  filename?: string;
  locale?: Locale;
};

export type GeneratedPdf = {
  buffer: Buffer;
  filename: string;
  contentType: "application/pdf";
};

export function parsePdfDocument(input: unknown): PdfDocument {
  return pdfDocumentSchema.parse(input);
}

export function slugifyTitle(title: string, fallback = "report"): string {
  const slug = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

export function defaultPdfFilename(title: string): string {
  return `thanawico-${slugifyTitle(title)}.pdf`;
}

export function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function generatePdf(
  doc: PdfDocument,
  options: GeneratePdfOptions = {},
): Promise<GeneratedPdf> {
  const engine = getPdfEngine();
  const html = renderPdfHtml(doc, { locale: options.locale ?? DEFAULT_LOCALE });
  const buffer = await engine.render(html, {
    footer: options.footer ?? doc.footer,
    headerTitle: options.headerTitle,
  });
  return {
    buffer,
    filename: options.filename ?? defaultPdfFilename(doc.title),
    contentType: "application/pdf",
  };
}
