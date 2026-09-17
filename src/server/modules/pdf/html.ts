import { DEFAULT_LOCALE, htmlAttributes, type Locale } from "@/lib/i18n";
import type { PdfBlock, PdfDocument, PdfTableColumn } from "./document";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_STYLES = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Noto Naskh Arabic", "Noto Sans Arabic", "IBM Plex Sans Arabic", serif;
    font-size: 12pt;
    line-height: 1.75;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { margin: 0 0 6px; line-height: 1.4; break-after: avoid; }
  h1 { font-size: 20pt; }
  h2 { font-size: 16pt; }
  h3 { font-size: 13pt; }
  p { margin: 0 0 8px; }
  .report-header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 18px; }
  .subtitle { color: #4b5563; margin: 0; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 28px; margin: 12px 0 0; }
  .meta div { min-width: 120px; }
  .meta dt { color: #6b7280; font-size: 9pt; margin: 0; }
  .meta dd { margin: 0; font-weight: 600; }
  section { break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  caption { caption-side: top; text-align: start; color: #6b7280; font-size: 9pt; padding-bottom: 4px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: start; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; }
  td.align-center, th.align-center { text-align: center; }
  td.align-end, th.align-end { text-align: end; }
  tr { break-inside: avoid; }
  .num { font-variant-numeric: tabular-nums; }
  .callout { border: 1px solid #d1d5db; border-inline-start: 4px solid #6b7280; padding: 8px 12px; margin: 8px 0; break-inside: avoid; }
  .callout-info { border-inline-start-color: #2563eb; background: #eff6ff; }
  .callout-success { border-inline-start-color: #16a34a; background: #f0fdf4; }
  .callout-warning { border-inline-start-color: #d97706; background: #fffbeb; }
  .page-break { break-after: page; }
  .spacer-sm { height: 6px; }
  .spacer-md { height: 14px; }
  .spacer-lg { height: 28px; }
  ul, ol { margin: 6px 0; padding-inline-start: 22px; }
`;

function renderHeading(block: Extract<PdfBlock, { type: "heading" }>): string {
  const level = block.level ?? 2;
  return `<h${level}>${escapeHtml(block.text)}</h${level}>`;
}

function renderParagraph(block: Extract<PdfBlock, { type: "paragraph" }>): string {
  return `<p>${escapeHtml(block.text)}</p>`;
}

function renderCallout(block: Extract<PdfBlock, { type: "callout" }>): string {
  const tone = block.tone ?? "info";
  return `<aside class="callout callout-${tone}">${escapeHtml(block.text)}</aside>`;
}

function renderKeyValues(block: Extract<PdfBlock, { type: "keyValues" }>): string {
  const items = block.items
    .map(
      (item) =>
        `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`,
    )
    .join("");
  return `<dl class="meta">${items}</dl>`;
}

function renderList(block: Extract<PdfBlock, { type: "list" }>): string {
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag}>${items}</${tag}>`;
}

function cellClass(column: PdfTableColumn): string {
  return column.align ? ` class="align-${column.align}"` : "";
}

function renderTable(block: Extract<PdfBlock, { type: "table" }>): string {
  const head = block.columns
    .map((column) => `<th${cellClass(column)}>${escapeHtml(column.label)}</th>`)
    .join("");
  const rows = block.rows
    .map((row) => {
      const cells = block.columns
        .map((column) => `<td${cellClass(column)}>${escapeHtml(row[column.key] ?? "")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const caption = block.caption ? `<caption>${escapeHtml(block.caption)}</caption>` : "";
  return `<table>${caption}<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderBlock(block: PdfBlock): string {
  switch (block.type) {
    case "heading":
      return renderHeading(block);
    case "paragraph":
      return renderParagraph(block);
    case "callout":
      return renderCallout(block);
    case "keyValues":
      return renderKeyValues(block);
    case "list":
      return renderList(block);
    case "table":
      return renderTable(block);
    case "spacer":
      return `<div class="spacer-${block.size ?? "md"}" aria-hidden="true"></div>`;
    case "pageBreak":
      return `<div class="page-break" aria-hidden="true"></div>`;
  }
}

export type RenderPdfHtmlOptions = {
  locale?: Locale;
};

export function renderPdfHtml(
  doc: PdfDocument,
  options: RenderPdfHtmlOptions = {},
): string {
  const attributes = htmlAttributes(options.locale ?? DEFAULT_LOCALE);
  const meta = (doc.meta ?? [])
    .map(
      (item) =>
        `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`,
    )
    .join("");
  const subtitle = doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : "";
  const body = doc.blocks.map(renderBlock).join("\n");
  const header = `
    <header class="report-header">
      <h1>${escapeHtml(doc.title)}</h1>
      ${subtitle}
      ${meta ? `<dl class="meta">${meta}</dl>` : ""}
    </header>`;

  return `<!doctype html>
<html lang="${attributes.lang}" dir="${attributes.dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${header}
<main>
${body}
</main>
</body>
</html>`;
}
