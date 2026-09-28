import { defineAgent } from "eve";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default defineAgent({
  model: google("gemini-3.5-flash-lite"),
  // Requerido cuando se usa un provider directo (no gateway de Vercel):
  // Eve no puede resolver el tamaño de ventana de contexto en build time.
  modelContextWindowTokens: 1_048_576, // gemini-3.5-flash-lite
});
