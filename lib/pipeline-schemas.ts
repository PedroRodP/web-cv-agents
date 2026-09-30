import { z } from "zod";

// ── Contratos entre eslabones de la cadena de agentes ──────────────────────
// route.ts pasa cada schema como `outputSchema` a su agente: Eve lo convierte
// a JSON Schema, obliga al modelo a cumplirlo antes de cerrar el turno y
// devuelve el resultado ya estructurado en `result.data`.
// Los `.describe()` viajan dentro del JSON Schema: el modelo los lee como
// instrucciones pegadas a cada campo.

// Campos opcionales (no `.nullable()`): "propiedad no requerida" es la forma
// más compatible con el structured output de los proveedores.

export const IngestionSchema = z.object({
  valid: z
    .boolean()
    .describe("true if the document is a CV/resume, even a poor or sparse one"),
  rejection_reason: z
    .string()
    .optional()
    .describe("Only when valid is false: one sentence explaining what the document is instead"),
  identity: z
    .object({
      full_name: z
        .string()
        .describe("The person's full name exactly as written in the CV header"),
      latest_title: z
        .string()
        .describe(
          "Most recent professional title, copied verbatim. Prefer a job title over an academic one",
        ),
      years_experience: z
        .number()
        .int()
        .describe("Total years of professional work experience, rounded to an integer"),
    })
    .optional()
    .describe("Only when valid is true"),
  visual_analysis: z
    .object({
      layout_style: z.enum(["minimal", "dense", "creative", "standard"]),
      density: z.enum(["sparse", "moderate", "dense"]),
      has_photo: z.boolean(),
      color_usage: z.enum(["monochrome", "accent", "colorful"]),
      visual_notes: z
        .string()
        .describe("One sentence describing the most distinctive design choices"),
    })
    .optional()
    .describe("Only when valid is true"),
});

export type Ingestion = z.infer<typeof IngestionSchema>;
export type VisualAnalysis = NonNullable<Ingestion["visual_analysis"]>;

// Un único contrato para los 6 analysts: route.ts ya sabe a qué dimensión
// corresponde cada respuesta porque sabe a qué agente llamó.
export const AnalystSchema = z.object({
  score: z.number().min(0).max(1),
  descriptors: z.array(z.string()).min(2).max(3),
  summary: z.string(),
});

export type AnalystResult = z.infer<typeof AnalystSchema>;

export const ANALYST_DIMENSIONS = [
  "technical",
  "leadership",
  "creativity",
  "trajectory",
  "communication",
  "collaboration",
] as const;

export type Dimension = (typeof ANALYST_DIMENSIONS)[number];
export type Analysis = Record<Dimension, AnalystResult>;
