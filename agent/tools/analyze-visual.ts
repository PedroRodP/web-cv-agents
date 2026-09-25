import { defineTool, toolOutput, toolOutputPart } from "eve/tools";
import { z } from "zod";

// This tool doesn't call any API itself. It passes the PDF as a visual content
// part (toModelOutput) so the agent's own Gemini model sees it directly and
// produces the visual analysis in its reasoning turn — one API call, not two.
export default defineTool({
  description:
    "Provide the PDF resume to the model for visual analysis. Call this to let the model observe the layout, design, density, color usage, and visual style of the CV.",
  inputSchema: z.object({
    pdf_base64: z
      .string()
      .describe("The PDF file content encoded as a base64 string"),
  }),
  execute({ pdf_base64 }) {
    return { pdf_base64 };
  },
  toModelOutput({ pdf_base64 }) {
    return toolOutput.content([
      toolOutputPart.text(
        "Here is the CV/resume PDF. Analyze its visual layout and design as instructed."
      ),
      toolOutputPart.file(pdf_base64, { mediaType: "application/pdf" }),
    ]);
  },
});
