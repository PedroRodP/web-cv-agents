import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the collaboration dimension of a CV: teamwork, cross-functional work, open-source contributions, and interpersonal impact.",
  model: google("gemini-3.5-flash-lite"),
  modelContextWindowTokens: 1_048_576,
});
