import { z } from "zod";

const PoleSchema = z.object({
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
  z: z.number().min(-1).max(1),
  strength: z.number().min(0).max(1),
});

export const VisualDnaSchema = z.object({
  fingerprint: z.string().length(16),

  seed: z.object({
    hour_utc: z.number().int().min(0).max(23),
    day_of_week: z.number().int().min(0).max(6),
    moon_phase: z.number().min(0).max(1),
  }),

  form: z.object({
    // leadership → shape scale. Range [0.7, 1.8]
    scale: z.number().min(0.7).max(1.8),
    // blend between sphere (0) and torus (1)
    blend: z.number().min(0).max(1),
  }),

  rd: z.object({
    // technical_depth → Gray-Scott feed rate. Range [0.025, 0.070]
    feed: z.number().min(0.025).max(0.070),
    // creativity → Gray-Scott kill rate. Range [0.045, 0.072]
    kill: z.number().min(0.045).max(0.072),
    // trajectory → simulation speed multiplier. Range [0.3, 3.0]
    speed: z.number().min(0.3).max(3.0),
    // collaboration → SDF attractor poles (1–4 poles)
    poles: z.array(PoleSchema).min(1).max(4),
  }),

  material: z.object({
    // communication → PBR metalness. Range [0.0, 1.0]
    metalness: z.number().min(0).max(1),
    // communication → emissive glow intensity. Range [0.0, 1.0]
    emissive_strength: z.number().min(0).max(1),
    // hex color for base surface
    color_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    // hex color for emissive glow
    color_emissive: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
});

export type VisualDna = z.infer<typeof VisualDnaSchema>;
