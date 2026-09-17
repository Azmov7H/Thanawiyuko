import { z } from "zod";

export const pdfHeadingBlockSchema = z.object({
  type: z.literal("heading"),
  text: z.string().min(1).max(200),
  level: z.number().int().min(1).max(3).optional(),
});

export const pdfParagraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  text: z.string().max(4000),
});

export const pdfCalloutBlockSchema = z.object({
  type: z.literal("callout"),
  text: z.string().max(2000),
  tone: z.enum(["info", "success", "warning"]).optional(),
});

export const pdfKeyValuesBlockSchema = z.object({
  type: z.literal("keyValues"),
  items: z
    .array(z.object({ label: z.string().max(120), value: z.string().max(500) }))
    .max(40),
});

export const pdfListBlockSchema = z.object({
  type: z.literal("list"),
  items: z.array(z.string().max(1000)).max(200),
  ordered: z.boolean().optional(),
});

export const pdfTableBlockSchema = z.object({
  type: z.literal("table"),
  caption: z.string().max(200).optional(),
  columns: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        label: z.string().min(1).max(120),
        align: z.enum(["start", "center", "end"]).optional(),
      }),
    )
    .min(1)
    .max(12),
  rows: z.array(z.record(z.string(), z.string())).max(500),
});

export const pdfSpacerBlockSchema = z.object({
  type: z.literal("spacer"),
  size: z.enum(["sm", "md", "lg"]).optional(),
});

export const pdfPageBreakBlockSchema = z.object({ type: z.literal("pageBreak") });

export const pdfBlockSchema = z.discriminatedUnion("type", [
  pdfHeadingBlockSchema,
  pdfParagraphBlockSchema,
  pdfCalloutBlockSchema,
  pdfKeyValuesBlockSchema,
  pdfListBlockSchema,
  pdfTableBlockSchema,
  pdfSpacerBlockSchema,
  pdfPageBreakBlockSchema,
]);

export const pdfDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  footer: z.string().max(200).optional(),
  meta: z
    .array(z.object({ label: z.string().max(120), value: z.string().max(300) }))
    .max(20)
    .optional(),
  blocks: z.array(pdfBlockSchema).max(500),
});

export type PdfBlock = z.infer<typeof pdfBlockSchema>;
export type PdfDocument = z.infer<typeof pdfDocumentSchema>;
export type PdfTableColumn = z.infer<typeof pdfTableBlockSchema>["columns"][number];
