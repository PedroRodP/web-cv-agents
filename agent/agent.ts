import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  // gemini-3.1-pro-preview: soporta PDF como file attachment (vision).
  // Solo el coordinator usa Google — los 6 subagents usan Groq.
  model: google("gemini-3.5-flash-lite"),
  modelContextWindowTokens: 1_048_576,
});
