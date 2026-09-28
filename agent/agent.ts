import { defineAgent } from "eve";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineAgent({
  model: groq("llama-3.3-70b-versatile"),
  // Requerido cuando se usa un provider directo: Eve no puede resolver
  // el tamaño de ventana de contexto en build time desde el catálogo.
  modelContextWindowTokens: 128_000,
});
