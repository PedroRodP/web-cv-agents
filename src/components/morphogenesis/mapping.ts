import type { VisualDna } from "../../../lib/visual-dna";

// ── Visual DNA → parámetros concretos del renderer ──────────────────────────
// El JSON de los agentes vive en rangos "semánticos" (definidos en el schema).
// Acá se traducen a valores que el shader puede usar sin romperse.

export interface RenderParams {
  feed: number;
  kill: number;
  /** Amplitud de la oscilación lenta del feed — mantiene el patrón mutando */
  feedDrift: number;
  /** Fase inicial de la oscilación, derivada de la fase lunar */
  driftPhase: number;
  /** Iteraciones de Gray-Scott por frame */
  stepsPerFrame: number;
  scale: number;
  blend: number;
  poles: VisualDna["rd"]["poles"];
  metalness: number;
  emissiveIntensity: number;
  colorPrimary: string;
  colorEmissive: string;
  /** Semilla numérica para el PRNG determinístico (spots iniciales) */
  prngSeed: number;
}

const norm = (v: number, min: number, max: number) =>
  Math.min(1, Math.max(0, (v - min) / (max - min)));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Banda "viva" del mapa de Pearson, validada con un barrido numérico del mismo
// kernel: todo el rectángulo produce patrón estable. Fuera de ella Gray-Scott
// converge a un estado uniforme (con kill < ~0.060 y feed alto, V inunda todo
// y la superficie queda lisa). Dentro: feed bajo → spots, feed alto →
// laberintos/gusanos; kill alto afina y separa las estructuras.
const FEED_BAND: [number, number] = [0.030, 0.050];
const KILL_BAND: [number, number] = [0.061, 0.064];

export function dnaToRenderParams(dna: VisualDna): RenderParams {
  const feedN = norm(dna.rd.feed, 0.025, 0.070);
  const killN = norm(dna.rd.kill, 0.045, 0.072);
  const speedN = norm(dna.rd.speed, 0.3, 3.0);

  return {
    feed: lerp(FEED_BAND[0], FEED_BAND[1], feedN),
    kill: lerp(KILL_BAND[0], KILL_BAND[1], killN),
    feedDrift: 0.0015,
    driftPhase: dna.seed.moon_phase * Math.PI * 2,
    stepsPerFrame: Math.round(lerp(4, 24, speedN)),
    scale: dna.form.scale,
    blend: dna.form.blend,
    poles: dna.rd.poles,
    metalness: dna.material.metalness,
    emissiveIntensity: dna.material.emissive_strength * 2.5,
    colorPrimary: dna.material.color_primary,
    colorEmissive: dna.material.color_emissive,
    prngSeed: parseInt(dna.fingerprint.slice(0, 8), 16),
  };
}
