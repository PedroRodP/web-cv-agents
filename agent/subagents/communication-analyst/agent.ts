import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the communication dimension of a CV: clarity of writing, articulation of impact, presentation skills, and public-facing work.",
  model: google("gemini-2.0-flash"),
  modelContextWindowTokens: 1_048_576,
});
