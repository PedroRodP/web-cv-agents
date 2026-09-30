"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { VisualDnaSchema, type VisualDna } from "../../../lib/visual-dna";
import { VISUAL_DNA_SAMPLES } from "../../../lib/fixtures/visual-dna-samples";
import { dnaToRenderParams } from "@/components/morphogenesis/mapping";

// WebGL solo existe en el browser: se desactiva el prerender del Canvas
const MorphogenesisCanvas = dynamic(
  () => import("@/components/morphogenesis/MorphogenesisCanvas"),
  { ssr: false },
);

// ── Laboratorio del renderer ───────────────────────────────────────────────
// Permite probar la Fase 5 con Visual DNA fijos (fixtures) o pegados a mano,
// sin ejecutar el pipeline de agentes.

const sampleNames = Object.keys(VISUAL_DNA_SAMPLES);

export default function RenderLab() {
  const [dna, setDna] = useState<VisualDna>(VISUAL_DNA_SAMPLES[sampleNames[0]]);
  const [draft, setDraft] = useState(() => JSON.stringify(dna, null, 2));
  const [error, setError] = useState<string>();
  // Cambiar la key remonta el Canvas → reinicia la simulación desde el seed
  const [runId, setRunId] = useState(0);

  const params = useMemo(() => dnaToRenderParams(dna), [dna]);

  const load = (next: VisualDna) => {
    setDna(next);
    setDraft(JSON.stringify(next, null, 2));
    setError(undefined);
    setRunId((n) => n + 1);
  };

  const applyDraft = () => {
    let raw: unknown;
    try { raw = JSON.parse(draft); }
    catch { setError("JSON inválido"); return; }
    const parsed = VisualDnaSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
      return;
    }
    load(parsed.data);
  };

  const buttonStyle = {
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "var(--accent)",
    background: "none",
    border: "1px solid var(--border)",
    padding: "6px 14px",
    cursor: "pointer",
  } as const;

  return (
    <main className="flex flex-col items-center min-h-screen px-4 py-10 gap-6" style={{ background: "var(--bg)" }}>
      <header className="text-center">
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24 }}>Render Lab</h1>
        <p style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.18em" }}>
          FASE 05 — MORPHOGENESIS MASK
        </p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center">
        {sampleNames.map((name) => (
          <button key={name} style={buttonStyle} onClick={() => load(VISUAL_DNA_SAMPLES[name])}>
            {name.toUpperCase()}
          </button>
        ))}
        <button style={buttonStyle} onClick={() => setRunId((n) => n + 1)}>
          RESTART SIM
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl">
        <div className="w-full lg:flex-1 aspect-square">
          <MorphogenesisCanvas key={runId} dna={dna} />
        </div>

        <div className="flex flex-col gap-3 w-full lg:w-80">
          {/* Valores efectivos después del mapeo — útil para ver qué hace mapping.ts */}
          <pre
            style={{
              fontSize: 10,
              lineHeight: 1.6,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: 12,
            }}
          >
{`feed   ${dna.rd.feed.toFixed(4)} → ${params.feed.toFixed(4)}
kill   ${dna.rd.kill.toFixed(4)} → ${params.kill.toFixed(4)}
speed  ${dna.rd.speed.toFixed(2)} → ${params.stepsPerFrame} steps/frame
scale  ${params.scale}   blend ${params.blend}
poles  ${params.poles.length}`}
          </pre>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              lineHeight: 1.5,
              height: 360,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: 12,
              color: "var(--text-primary)",
            }}
          />
          <button style={buttonStyle} onClick={applyDraft}>APPLY JSON</button>
          {error && (
            <pre style={{ fontSize: 10, color: "var(--accent)", whiteSpace: "pre-wrap" }}>{error}</pre>
          )}
        </div>
      </div>
    </main>
  );
}
