import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the creativity dimension of a CV: innovation, novel approaches, creative problem-solving, and unconventional thinking.",
  model: google("gemini-2.0-flash"),
  modelContextWindowTokens: 1_048_576,
});
