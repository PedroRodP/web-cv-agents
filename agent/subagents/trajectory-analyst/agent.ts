import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description: "Analyze career trajectory in a CV: progression in title and scope, pace of advancement, pivots, and momentum relative to career stage.",
  model: groq("openai/gpt-oss-120b"),
  modelContextWindowTokens: 128_000,
});
