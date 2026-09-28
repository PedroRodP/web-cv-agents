import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description: "Analyze leadership signals in a CV: team management, decision-making authority, organizational influence, and people development.",
  model: groq("openai/gpt-oss-120b"),
  modelContextWindowTokens: 128_000,
});
