// ── GLSL de la simulación Reaction-Diffusion ────────────────────────────────
// La simulación vive en una textura 2D que se mapea sobre la forma con las UV
// de la esfera (proyección equirectangular): x = longitud, y = latitud.
// Cada texel guarda dos concentraciones químicas: U en .r y V en .g.

// Quad a pantalla completa: dibuja un rectángulo que cubre todo el render
// target para que el fragment shader corra una vez por texel.
export const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Un paso de Gray-Scott:
//   dU/dt = Du·∇²U − U·V² + feed·(1 − U)
//   dV/dt = Dv·∇²V + U·V² − (feed + kill)·V
// U es "comida" que se repone a tasa feed; V la consume y se reproduce, y
// muere a tasa kill. Como U difunde más rápido que V, emergen patrones de Turing.
export const grayScottFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uFeed;
  uniform float uKill;
  varying vec2 vUv;

  vec2 s(vec2 uv) { return texture2D(uState, uv).rg; }

  void main() {
    // En la proyección equirectangular, un texel horizontal mide menos cerca
    // de los polos (proporcional a sin(latitud)). Estiramos el paso horizontal
    // para que la difusión sea isótropa sobre la superficie real.
    float lat = sin(3.14159265 * vUv.y);
    float dx = uTexel.x / max(lat, 0.15);
    float dy = uTexel.y;

    vec2 c = s(vUv);

    // Laplaciano 3×3 (kernel de Karl Sims): vecinos 0.2, diagonales 0.05, centro −1
    vec2 lap = -c
      + 0.2  * (s(vUv + vec2( dx, 0.0)) + s(vUv + vec2(-dx, 0.0))
              + s(vUv + vec2(0.0,  dy)) + s(vUv + vec2(0.0, -dy)))
      + 0.05 * (s(vUv + vec2( dx,  dy)) + s(vUv + vec2(-dx,  dy))
              + s(vUv + vec2( dx, -dy)) + s(vUv + vec2(-dx, -dy)));

    float u = c.r;
    float v = c.g;
    float uvv = u * v * v;

    float du = 1.0 * lap.r - uvv + uFeed * (1.0 - u);
    float dv = 0.5 * lap.g + uvv - (uFeed + uKill) * v;

    gl_FragColor = vec4(clamp(u + du, 0.0, 1.0), clamp(v + dv, 0.0, 1.0), 0.0, 1.0);
  }
`;

// Convierte el estado (U, V) en una máscara de patrón 0..1 en escala de grises.
// Esa textura se reutiliza como displacementMap, bumpMap y emissiveMap del
// MeshStandardMaterial — así el material PBR de Three hace el resto.
export const patternFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uState;
  varying vec2 vUv;

  void main() {
    float v = texture2D(uState, vUv).g;
    float p = smoothstep(0.10, 0.35, v);
    // Los polos de la esfera UV tienen muchos vértices en el mismo punto con
    // distintas UV: si el desplazamiento difiere entre ellos, la malla se abre.
    p *= smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    gl_FragColor = vec4(vec3(p), 1.0);
  }
`;
