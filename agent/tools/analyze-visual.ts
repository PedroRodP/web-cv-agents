import { defineTool, toolOutput, toolOutputPart } from "eve/tools";
import { z } from "zod";
import {
  GoogleGenerativeAI,
  type GenerateContentResult,
} from "@google/generative-ai";

const VisualAnalysisSchema = z.object({
  layout_style: z.enum(["minimal", "dense", "creative", "standard"]),
  density: z.enum(["sparse", "moderate", "dense"]),
  has_photo: z.boolean(),
  color_usage: z.enum(["monochrome", "accent", "colorful"]),
  visual_notes: z.string(),
});

export default defineTool({
  description:
    "Analyze the visual layout and design of the first page of a PDF resume. Returns layout style, density, presence of photo, color usage, and qualitative observations. Takes the PDF as a base64-encoded string.",
  inputSchema: z.object({
    pdf_base64: z
      .string()
      .describe("The PDF file content encoded as a base64 string"),
  }),
  outputSchema: VisualAnalysisSchema,
  async execute({ pdf_base64 }) {
    const genAI = new GoogleGenerativeAI(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY!
    );
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze the visual design and layout of this CV/resume page.

Respond with a JSON object (no markdown, just raw JSON) matching exactly this structure:
{
  "layout_style": one of "minimal" | "dense" | "creative" | "standard",
  "density": one of "sparse" | "moderate" | "dense",
  "has_photo": boolean,
  "color_usage": one of "monochrome" | "accent" | "colorful",
  "visual_notes": "1-2 sentences describing the visual style, typography choices, and any distinctive design elements"
}`;

    const result: GenerateContentResult = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdf_base64,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Gemini returned non-JSON response: ${responseText}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return VisualAnalysisSchema.parse(parsed);
  },
});
