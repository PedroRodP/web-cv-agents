import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  description:
    "Analyze creativity and innovation signals in a CV: initiatives beyond role scope, novel solutions, entrepreneurial ventures, and original contributions, regardless of industry.",
  model: groq("llama-3.3-70b-versatile"),
  modelContextWindowTokens: 128_000,
});
