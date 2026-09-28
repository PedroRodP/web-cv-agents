import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description:
    "Analyze the execution skills and craft mastery in a CV: depth of expertise in the person's own field, regardless of industry.",
  model: groq("llama-3.3-70b-versatile"),
  modelContextWindowTokens: 128_000,
});
