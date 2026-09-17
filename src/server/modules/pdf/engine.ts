import { escapeHtml } from "./html";

type ChromiumPage = {
  setContent(html: string, options?: { waitUntil?: "load" | "networkidle" }): Promise<void>;
  pdf(options: Record<string, unknown>): Promise<Uint8Array>;
};

type ChromiumBrowser = {
  newPage(): Promise<ChromiumPage>;
  close(): Promise<void>;
};

type ChromiumModule = {
  launch(options?: { args?: string[]; channel?: string }): Promise<ChromiumBrowser>;
};

async function loadChromium(): Promise<ChromiumModule> {
  const specifier = "playwright";
  const mod = (await import(/* webpackIgnore: true */ specifier)) as {
    chromium: ChromiumModule;
  };
  return mod.chromium;
}

export type PdfRenderOptions = {
  footer?: string;
  headerTitle?: string;
};

export interface PdfEngine {
  name: string;
  render(html: string, options?: PdfRenderOptions): Promise<Buffer>;
}

export class PdfDisabledError extends Error {
  constructor() {
    super("PDF generation is disabled (PDF_ENGINE=disabled)");
    this.name = "PdfDisabledError";
  }
}

const FOOTER_STYLE =
  "width:100%;font-size:9px;color:#6b7280;padding:0 14mm;display:flex;justify-content:space-between;";

export const chromiumPdfEngine: PdfEngine = {
  name: "chromium",
  async render(html, options = {}) {
    const chromium = await loadChromium();
    const browser = await chromium.launch({ channel: "chromium", args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const footer = options.footer
        ? `<div style="${FOOTER_STYLE}"><span>${escapeHtml(options.footer)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
        : "<div></div>";
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: Boolean(options.footer),
        headerTemplate: "<div></div>",
        footerTemplate: footer,
        margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  },
};

const ENGINES: Record<string, PdfEngine> = {
  chromium: chromiumPdfEngine,
};

export function isPdfEnabled(engine = process.env.PDF_ENGINE): boolean {
  return (engine ?? "chromium") !== "disabled";
}

export function getPdfEngine(engine = process.env.PDF_ENGINE): PdfEngine {
  const name = engine ?? "chromium";
  if (name === "disabled") throw new PdfDisabledError();
  const found = ENGINES[name];
  if (!found) throw new Error(`Unknown PDF_ENGINE: ${name}`);
  return found;
}
