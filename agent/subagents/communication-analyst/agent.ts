import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description: "Analyze communication signals in a CV: writing clarity, quantified achievements, public presence, teaching, and roles requiring frequent stakeholder communication.",
  model: groq("openai/gpt-oss-120b"),
  modelContextWindowTokens: 128_000,
});
