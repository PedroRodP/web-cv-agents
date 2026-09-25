import { defineTool } from "eve/tools";
import { z } from "zod";
import { PDFParse } from "pdf-parse";

export default defineTool({
  description:
    "Extract all text content from a PDF file provided as a base64-encoded string. Returns the raw text and page count.",
  inputSchema: z.object({
    pdf_base64: z
      .string()
      .describe("The PDF file content encoded as a base64 string"),
  }),
  outputSchema: z.object({
    text: z.string(),
    pages: z.number(),
  }),
  async execute({ pdf_base64 }) {
    const buffer = Buffer.from(pdf_base64, "base64");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return {
      text: result.text,
      pages: result.total,
    };
  },
});
