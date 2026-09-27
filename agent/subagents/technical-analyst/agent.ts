import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the execution skills and craft mastery in a CV: depth of expertise in the person's own field, regardless of industry.",
  model: google("gemini-2.5-flash"),
  modelContextWindowTokens: 1_048_576,
});
