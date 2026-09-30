import * as THREE from "three";
import type { RenderParams } from "./mapping";

// ── Forma base: SDF blend esfera ↔ toro + polos atractores ─────────────────
// Un SDF (signed distance field) devuelve la distancia de un punto a la
// superficie: < 0 adentro, > 0 afuera. Mezclar dos SDFs con `mix` interpola
// las formas. Los polos restan una gaussiana → "tiran" la superficie hacia afuera.
//
// Partimos de una esfera UV (que ya trae las coordenadas UV donde corre la
// simulación) y, para cada vértice, buscamos a qué radio la dirección de ese
// vértice cruza la superficie del SDF. Se hace una sola vez en CPU porque la
// forma no cambia en el tiempo — lo que anima es el shader.

const TORUS_MAJOR = 0.75;
const TORUS_MINOR = 0.35;
const POLE_REACH = 0.95;
const POLE_AMPLITUDE = 0.55;
const POLE_WIDTH_SQ = 0.18;
const R_MAX = 2.4;
const MARCH_STEPS = 64;
const BISECT_STEPS = 12;

type Pole = RenderParams["poles"][number];

function makeSdf(blend: number, poles: Pole[]) {
  const centers = poles.map((p) => {
    const c = new THREE.Vector3(p.x, p.y, p.z);
    if (c.lengthSq() > 0) c.normalize();
    return { c: c.multiplyScalar(POLE_REACH), s: p.strength };
  });

  return (x: number, y: number, z: number) => {
    const sphere = Math.hypot(x, y, z) - 1.0;
    const torus = Math.hypot(Math.hypot(x, z) - TORUS_MAJOR, y) - TORUS_MINOR;
    let d = sphere + (torus - sphere) * blend;
    for (const { c, s } of centers) {
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      d -= s * POLE_AMPLITUDE * Math.exp(-(dx * dx + dy * dy + dz * dz) / POLE_WIDTH_SQ);
    }
    return d;
  };
}

/** Busca el radio más externo donde la dirección `dir` cruza la superficie. */
function solveRadius(sdf: ReturnType<typeof makeSdf>, dir: THREE.Vector3) {
  const at = (r: number) => sdf(dir.x * r, dir.y * r, dir.z * r);
  const dr = R_MAX / MARCH_STEPS;

  let prevR = R_MAX;
  let minR = R_MAX;
  let minD = Infinity;

  // March de afuera hacia adentro: el primer cambio de signo es la cáscara externa
  for (let i = 1; i <= MARCH_STEPS; i++) {
    const r = R_MAX - i * dr;
    const d = at(r);
    if (d < minD) { minD = d; minR = r; }
    if (d <= 0) {
      let lo = r, hi = prevR;
      for (let j = 0; j < BISECT_STEPS; j++) {
        const mid = (lo + hi) / 2;
        if (at(mid) <= 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prevR = r;
  }
  // Sin cruce (p.ej. el eje del agujero con blend≈1): hundimos hasta el punto
  // más cercano a la superficie → queda un hoyuelo en lugar de un agujero.
  return minR;
}

export function buildMaskGeometry(params: RenderParams) {
  const geometry = new THREE.SphereGeometry(1, 512, 256);
  const sdf = makeSdf(params.blend, params.poles);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const nrm = geometry.attributes.normal as THREE.BufferAttribute;
  const dir = new THREE.Vector3();
  const e = 1e-3;

  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    const r = solveRadius(sdf, dir);
    const x = dir.x * r, y = dir.y * r, z = dir.z * r;
    pos.setXYZ(i, x, y, z);

    // Normal = gradiente del SDF. A diferencia de computeVertexNormals(), da el
    // mismo resultado en los vértices duplicados de la costura UV → sin seam.
    const n = new THREE.Vector3(
      sdf(x + e, y, z) - sdf(x - e, y, z),
      sdf(x, y + e, z) - sdf(x, y - e, z),
      sdf(x, y, z + e) - sdf(x, y, z - e),
    ).normalize();
    nrm.setXYZ(i, n.x, n.y, n.z);
  }

  pos.needsUpdate = true;
  nrm.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}
