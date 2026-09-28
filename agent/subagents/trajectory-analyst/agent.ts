import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the career trajectory of a CV: growth rate, progression pattern, ambition signals, and career momentum.",
  model: google("gemini-3.5-flash-lite"),
  modelContextWindowTokens: 1_048_576,
});
