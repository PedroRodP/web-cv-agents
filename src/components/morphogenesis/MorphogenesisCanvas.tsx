"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { VisualDna } from "../../../lib/visual-dna";
import { dnaToRenderParams, type RenderParams } from "./mapping";
import { buildMaskGeometry } from "./shape";
import { createSimulation } from "./simulation";

// ── La máscara: forma SDF + material PBR alimentado por la simulación ──────

function MorphogenesisMask({ params }: { params: RenderParams }) {
  const gl = useThree((s) => s.gl);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => buildMaskGeometry(params), [params]);
  const sim = useMemo(() => createSimulation(gl, params), [gl, params]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => sim.dispose(), [sim]);

  // useFrame con prioridad 0: corre antes del render principal de R3F, así
  // la textura del patrón ya está actualizada cuando se dibuja la malla.
  useFrame((state, delta) => {
    sim.step(state.clock.elapsedTime);
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={params.scale}>
      <meshStandardMaterial
        color={params.colorPrimary}
        metalness={params.metalness}
        roughness={0.35}
        emissive={params.colorEmissive}
        emissiveIntensity={params.emissiveIntensity}
        emissiveMap={sim.patternTexture}
        displacementMap={sim.patternTexture}
        displacementScale={0.03}
        bumpMap={sim.patternTexture}
        bumpScale={2}
      />
    </mesh>
  );
}

// ── Iluminación basada en imagen (sin descargar HDRs) ──────────────────────
// Metalness alto sin environment map se ve negro: el metal solo refleja.

function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  // Sin dispose explícito: es un render target (su contenido no se puede
  // re-subir) y StrictMode ejecuta el cleanup al montar. Se libera junto con
  // el contexto WebGL cuando el Canvas se desmonta.
  // attach="environment" → R3F asigna scene.environment = env (y lo limpia al desmontar)
  return <primitive object={env} attach="environment" />;
}

function Controls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.enablePan = false;
    c.minDistance = 4;
    c.maxDistance = 12;
    controlsRef.current = c;
    return () => {
      c.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);
  useFrame(() => controlsRef.current?.update());
  return null;
}

// ── Canvas público ─────────────────────────────────────────────────────────

export default function MorphogenesisCanvas({ dna }: { dna: VisualDna }) {
  const params = useMemo(() => dnaToRenderParams(dna), [dna]);

  return (
    // Sin color de fondo: el canvas de R3F es transparente (alpha: true), así
    // que el objeto flota sobre el background de la página
    <Canvas camera={{ position: [0, 0, 7], fov: 40 }} dpr={[1, 2]}>
      <StudioEnvironment />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <MorphogenesisMask params={params} />
      <Controls />
    </Canvas>
  );
}
