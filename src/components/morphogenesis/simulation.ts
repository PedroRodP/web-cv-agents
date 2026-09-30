import * as THREE from "three";
import type { RenderParams } from "./mapping";
import { fullscreenVertex, grayScottFragment, patternFragment } from "./shaders";

// ── Simulación Gray-Scott en GPU con ping-pong ──────────────────────────────
// Un shader no puede leer y escribir la misma textura a la vez. Por eso hay
// dos render targets: en cada paso se lee de uno y se escribe en el otro, y
// después se intercambian. Todo corre en la GPU; la CPU solo orquesta.

const SIM_WIDTH = 1024;
const SIM_HEIGHT = 512; // 2:1 = proporción de la proyección equirectangular
const SEED_SPOTS = 160;
// Arranque acelerado: los primeros frames corren muchos más pasos para que el
// patrón cubra la superficie en ~1s. Repartido en frames (y no todo en el
// primero) para no congelar la página y que se vea "crecer".
const WARMUP_STEPS = 5000;
const WARMUP_STEPS_PER_FRAME = 150;

// PRNG determinístico: mismo fingerprint → mismos spots iniciales.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dirección 3D → UV de THREE.SphereGeometry (phi = u·2π, theta = (1 − v)·π)
function directionToUv(x: number, y: number, z: number): [number, number] {
  const len = Math.hypot(x, y, z) || 1;
  const theta = Math.acos(y / len);
  let phi = Math.atan2(z, -x);
  if (phi < 0) phi += Math.PI * 2;
  return [phi / (Math.PI * 2), 1 - theta / Math.PI];
}

/** Estado inicial: U = 1 en todos lados, V = 1 en algunos spots. */
function createSeedTexture(params: RenderParams) {
  const data = new Float32Array(SIM_WIDTH * SIM_HEIGHT * 4);
  for (let i = 0; i < SIM_WIDTH * SIM_HEIGHT; i++) {
    data[i * 4] = 1;
    data[i * 4 + 3] = 1;
  }

  const stamp = (u: number, v: number, radius: number) => {
    const cx = u * SIM_WIDTH;
    const cy = v * SIM_HEIGHT;
    // Mismo estiramiento horizontal que en el shader, para que el spot sea
    // redondo sobre la superficie y no en la textura
    const stretch = 1 / Math.max(Math.sin(Math.PI * v), 0.15);
    const rx = radius * stretch;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      if (y < 0 || y >= SIM_HEIGHT) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / radius;
        if (nx * nx + ny * ny > 1) continue;
        const wx = ((x % SIM_WIDTH) + SIM_WIDTH) % SIM_WIDTH; // wrap horizontal
        const idx = (y * SIM_WIDTH + wx) * 4;
        data[idx] = 0.5;
        data[idx + 1] = 0.25;
      }
    }
  };

  // Los polos de collaboration son focos de nacimiento del patrón
  for (const pole of params.poles) {
    const [u, v] = directionToUv(pole.x, pole.y, pole.z);
    stamp(u, v, 4 + pole.strength * 8);
  }

  const rand = mulberry32(params.prngSeed);
  for (let i = 0; i < SEED_SPOTS; i++) {
    stamp(rand(), 0.1 + rand() * 0.8, 3 + rand() * 4);
  }

  const texture = new THREE.DataTexture(data, SIM_WIDTH, SIM_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export interface Simulation {
  /** Textura en escala de grises con el patrón actual, lista para el material */
  patternTexture: THREE.Texture;
  step(elapsed: number): void;
  dispose(): void;
}

export function createSimulation(gl: THREE.WebGLRenderer, params: RenderParams): Simulation {
  // Float necesita extensiones para ser renderizable y filtrable; si faltan
  // (algunos móviles), HalfFloat es el fallback universal en WebGL2.
  const fullFloat =
    gl.extensions.has("EXT_color_buffer_float") && gl.extensions.has("OES_texture_float_linear");

  const rtOptions: THREE.RenderTargetOptions = {
    type: fullFloat ? THREE.FloatType : THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, // la longitud da la vuelta: x = 0 y x = 1 son vecinos
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
  };

  let read = new THREE.WebGLRenderTarget(SIM_WIDTH, SIM_HEIGHT, rtOptions);
  let write = new THREE.WebGLRenderTarget(SIM_WIDTH, SIM_HEIGHT, rtOptions);
  const patternTarget = new THREE.WebGLRenderTarget(SIM_WIDTH, SIM_HEIGHT, {
    ...rtOptions,
    type: THREE.UnsignedByteType,
  });

  const seed = createSeedTexture(params);
  let source: THREE.Texture = seed; // el primer paso lee del estado inicial

  const simMaterial = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: grayScottFragment,
    uniforms: {
      uState: { value: seed },
      uTexel: { value: new THREE.Vector2(1 / SIM_WIDTH, 1 / SIM_HEIGHT) },
      uFeed: { value: params.feed },
      uKill: { value: params.kill },
    },
  });

  const patternMaterial = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: patternFragment,
    uniforms: { uState: { value: null } },
  });

  // Escena mínima: un quad 2×2 frente a una cámara ortográfica
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
  scene.add(quad);

  let warmupLeft = WARMUP_STEPS;

  return {
    patternTexture: patternTarget.texture,

    step(elapsed) {
      const previousTarget = gl.getRenderTarget();

      // Oscilación lenta del feed: evita que el patrón se congele en un
      // equilibrio y lo mantiene mutando en tiempo real
      simMaterial.uniforms.uFeed.value =
        params.feed + params.feedDrift * Math.sin(elapsed * 0.15 + params.driftPhase);

      const steps = warmupLeft > 0 ? WARMUP_STEPS_PER_FRAME : params.stepsPerFrame;
      warmupLeft -= steps;

      quad.material = simMaterial;
      for (let i = 0; i < steps; i++) {
        simMaterial.uniforms.uState.value = source;
        gl.setRenderTarget(write);
        gl.render(scene, camera);
        [read, write] = [write, read];
        source = read.texture;
      }

      quad.material = patternMaterial;
      patternMaterial.uniforms.uState.value = source;
      gl.setRenderTarget(patternTarget);
      gl.render(scene, camera);

      gl.setRenderTarget(previousTarget);
    },

    dispose() {
      read.dispose();
      write.dispose();
      patternTarget.dispose();
      seed.dispose();
      simMaterial.dispose();
      patternMaterial.dispose();
      quad.geometry.dispose();
    },
  };
}
