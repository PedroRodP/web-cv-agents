import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description: "Analyze collaboration signals in a CV: cross-team work, community involvement, mentoring, joint projects, and collective language — across any industry.",
  model: groq("openai/gpt-oss-120b"),
  modelContextWindowTokens: 128_000,
});
