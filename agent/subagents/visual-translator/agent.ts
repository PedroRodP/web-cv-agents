import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description:
    "Translate a CV analysis (6 dimension scores + visual analysis + contextual seed) into a Visual DNA JSON object that drives the Gray-Scott Reaction-Diffusion shader and Three.js renderer.",
  model: groq("openai/gpt-oss-120b"),
  modelContextWindowTokens: 128_000,
});
