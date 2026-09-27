import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  model: google("gemini-2.5-flash"),
  // Requerido cuando se usa un provider directo (no gateway de Vercel):
  // Eve no puede resolver el tamaño de ventana de contexto en build time.
  modelContextWindowTokens: 1_048_576, // 1M tokens — gemini-2.5-flash
});
