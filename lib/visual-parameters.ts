import type { Dimension, VisualAnalysis } from "./pipeline-schemas";

// ── Fórmulas del Visual DNA ─────────────────────────────────────────────────
// La parte mecánica de la traducción scores → parámetros. Antes la calculaba
// el LLM "de cabeza" (mismo CV → speed 1.92 en una corrida y 2.06 en otra);
// en código, mismos scores dan siempre los mismos parámetros.
// La usan el tool compute-parameters (para el agente visual-dna) y route.ts
// (para verificar que el agente copió bien los valores).

export type Scores = Record<Dimension, number>;

export interface ComputedParameters {
  form: { scale: number; blend: number };
  rd: { feed: number; kill: number; speed: number };
  poles: { count: number; strength: number };
  material: { metalness: number; emissive_strength: number };
}

const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// blend: 0 = esfera pura, 1 = toro puro. Base y rango según el layout del CV,
// modulados por creatividad.
const BLEND_BY_LAYOUT: Record<VisualAnalysis["layout_style"], [base: number, range: number]> = {
  minimal: [0.1, 0.3],
  standard: [0.2, 0.4],
  dense: [0.15, 0.35],
  creative: [0.3, 0.5],
};

function poleCount(collaboration: number) {
  if (collaboration < 0.25) return 1;
  if (collaboration < 0.55) return 2;
  if (collaboration < 0.8) return 3;
  return 4;
}

export function computeParameters(
  scores: Scores,
  layoutStyle: VisualAnalysis["layout_style"],
): ComputedParameters {
  const s = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, clamp01(v)]),
  ) as Scores;
  const [blendBase, blendRange] = BLEND_BY_LAYOUT[layoutStyle];

  return {
    form: {
      scale: round(0.7 + s.leadership * 1.1, 3), // leadership → [0.7, 1.8]
      blend: round(clamp01(blendBase + s.creativity * blendRange), 2),
    },
    rd: {
      feed: round(0.025 + s.technical * 0.045, 4), // technical → [0.025, 0.070]
      kill: round(0.072 - s.creativity * 0.027, 4), // creativity → [0.072, 0.045], invertido
      speed: round(0.3 + s.trajectory * 2.7, 2), // trajectory → [0.3, 3.0]
    },
    poles: {
      count: poleCount(s.collaboration),
      strength: round(s.collaboration * 0.9 + 0.1, 3),
    },
    material: {
      metalness: round(0.1 + s.communication * 0.8, 2), // communication → [0.1, 0.9]
      emissive_strength: round(s.communication * 0.8, 2), // communication → [0.0, 0.8]
    },
  };
}
