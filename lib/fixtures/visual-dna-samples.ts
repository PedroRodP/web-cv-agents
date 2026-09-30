import type { VisualDna } from "../visual-dna";

// Visual DNA reales generados por el pipeline en corridas anteriores.
// Sirven para iterar sobre el renderer sin ejecutar todo el flujo de agentes.
// Mismo CV (mismo fingerprint), distinto contextual seed → distinta variante.

export const VISUAL_DNA_SAMPLES: Record<string, VisualDna> = {
  "night-tetra": {
    fingerprint: "86b48b32d15a61cf",
    seed: { hour_utc: 22, day_of_week: 1, moon_phase: 0.58 },
    form: { scale: 1.228, blend: 0.346 },
    rd: {
      feed: 0.0646,
      kill: 0.0499,
      speed: 2.6,
      poles: [
        { x: 0.57735, y: 0.57735, z: 0.57735, strength: 0.856 },
        { x: 0.57735, y: -0.57735, z: -0.57735, strength: 0.856 },
        { x: -0.57735, y: 0.57735, z: -0.57735, strength: 0.856 },
        { x: -0.57735, y: -0.57735, z: 0.57735, strength: 0.856 },
      ],
    },
    material: {
      metalness: 0.73,
      emissive_strength: 0.63,
      color_primary: "#3b4e5a",
      color_emissive: "#ffaa33",
    },
  },
  "noon-equator": {
    fingerprint: "86b48b32d15a61cf",
    seed: { hour_utc: 12, day_of_week: 3, moon_phase: 0.63 },
    form: { scale: 1.415, blend: 0.54 },
    rd: {
      feed: 0.0632,
      kill: 0.04905,
      speed: 2.595,
      poles: [
        { x: 0.707, y: 0, z: 0.707, strength: 0.865 },
        { x: -0.707, y: 0, z: 0.707, strength: 0.865 },
        { x: -0.707, y: 0, z: -0.707, strength: 0.865 },
        { x: 0.707, y: 0, z: -0.707, strength: 0.865 },
      ],
    },
    material: {
      metalness: 0.78,
      emissive_strength: 0.68,
      color_primary: "#1f2f45",
      color_emissive: "#ffaa00",
    },
  },
  // Output real del visual-translator (CV con leadership 0.1, collaboration 0.65).
  // El coordinator lo reemplazó por un JSON "schema_version 2.0" alucinado.
  "radiology-student": {
    fingerprint: "3e72467033602564",
    seed: { hour_utc: 17, day_of_week: 3, moon_phase: 0.64 },
    form: { scale: 0.81, blend: 0.28 },
    rd: {
      feed: 0.0453,
      kill: 0.0666,
      speed: 1.92,
      poles: [
        { x: 1, y: 0, z: 0, strength: 0.69 },
        { x: -0.5, y: 0, z: 0.87, strength: 0.69 },
        { x: -0.5, y: 0, z: -0.87, strength: 0.69 },
      ],
    },
    material: {
      metalness: 0.62,
      emissive_strength: 0.52,
      color_primary: "#1e2530",
      color_emissive: "#00ddaa",
    },
  },
};
