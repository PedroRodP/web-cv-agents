import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description: "Analyze communication signals in a CV: writing clarity, quantified achievements, public presence, teaching, and roles requiring frequent stakeholder communication.",
  model: google("gemini-3.5-flash-lite"),
  modelContextWindowTokens: 1_048_576,
  // Sin bash/read_file/etc.: el agente solo ve los tools de su carpeta tools/
  defaultTools: false,
});
