"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import dynamic from "next/dynamic";
import type { VisualDna } from "../../lib/visual-dna";

// WebGL solo existe en el browser: se desactiva el prerender del Canvas
const MorphogenesisCanvas = dynamic(
  () => import("@/components/morphogenesis/MorphogenesisCanvas"),
  { ssr: false },
);

// ── Tipos ──────────────────────────────────────────────────────────────────

type Stage = "idle" | "validating" | "analyzing" | "translating" | "done" | "rejected" | "error";

interface PipelineState {
  stage: Stage;
  sessionId?: string;
  analystsPercent: number;
  result?: VisualDna;
  errorMessage?: string;
  rejectionReason?: string;
  fileName?: string;
}

const ANALYST_NAMES = [
  "Technical",
  "Leadership",
  "Creativity",
  "Trajectory",
  "Communication",
  "Collaboration",
];

const STAGE_LABELS: Record<Exclude<Stage, "idle" | "rejected" | "error">, string> = {
  validating:  "Validating",
  analyzing:   "Analyzing",
  translating: "Translating",
  done:        "Done",
};

const STAGE_ORDER: Array<Exclude<Stage, "idle" | "rejected" | "error">> = [
  "validating",
  "analyzing",
  "translating",
  "done",
];

// ── Zona de upload octagonal ───────────────────────────────────────────────
// El SVG dibuja el borde del octágono con stroke-dashoffset animado — como
// un lápiz que traza y destraza el contorno lentamente en 6s.
// Perímetro aproximado del octágono 480×480: 4×240 + 4×170 ≈ 1640px

function OctagonZone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (file: File) => {
    if (file.type !== "application/pdf") return;
    onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) accept(file);
  };

  const clipPath = "polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)";

  return (
    <div
      className="relative flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ width: 300, height: 300 }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* Glow de fondo — pulsa en idle */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%, var(--glow), transparent)`,
          clipPath,
          animation: "glow-pulse 3.5s ease-in-out infinite",
        }}
      />

      {/* Borde SVG del octágono con animación de trazado */}
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox="0 0 480 480"
        style={{ width: "100%", height: "100%" }}
      >
        <polygon
          points="72,0 408,0 480,72 480,408 408,480 72,480 0,408 0,72"
          fill="none"
          stroke={dragging ? "var(--accent)" : "var(--border)"}
          strokeWidth={dragging ? "2.5" : "1.5"}
          strokeDasharray="1640"
          style={{
            animation: "trace-border 6s linear infinite",
            transition: "stroke 0.3s ease",
          }}
        />
      </svg>

      {/* Interior — fondo de superficie */}
      <div
        className="absolute inset-0"
        style={{
          clipPath,
          background: dragging ? `rgba(184,78,42,0.06)` : "var(--surface)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Texto central */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
        <span
          className="text-4xl"
          style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--text-secondary)" }}
        >
          CV
        </span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.15em" }}>
          DRAG PDF HERE
        </span>
        <span style={{ fontSize: 10, color: "var(--border)" }}>or click to select</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) accept(file);
        }}
      />
    </div>
  );
}

// ── Tracker de etapas (rail horizontal con etiquetas de espécimen) ─────────
// Cada etapa es una etiqueta estilo "tag de herbario" atada a un rail.
// Active: borde inferior grueso en --accent.
// Completed: texto tachado suave.
// Waiting: opacity reducida.

function StageTracker({ currentStage }: { currentStage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number]);

  return (
    <div className="flex items-end justify-center gap-1 w-full max-w-lg mx-auto">
      {STAGE_ORDER.map((stage, idx) => {
        const isActive    = idx === currentIdx;
        const isCompleted = idx < currentIdx;
        const isWaiting   = idx > currentIdx;

        return (
          <div
            key={stage}
            className="flex flex-col items-center gap-1 px-3 py-2 relative"
            style={{
              borderBottom: isActive
                ? "3px solid var(--accent)"
                : isCompleted
                ? "3px solid var(--border)"
                : "3px solid transparent",
              opacity: isWaiting ? 0.4 : 1,
              transition: "all 0.4s ease",
              minWidth: 80,
            }}
          >
            {/* Número de posición — referencias de catálogo */}
            <span style={{ fontSize: 9, color: "var(--border)", letterSpacing: "0.1em" }}>
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                textDecoration: isCompleted ? "line-through var(--border) 1.5px" : "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Panel: Validating ──────────────────────────────────────────────────────
// Dos anillos de puntos concéntricos que giran en sentidos opuestos,
// referenciando rosa de los vientos / brújula de navegación botánica.

function ValidatingPanel({ fileName }: { fileName?: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative" style={{ width: 100, height: 100 }}>
        {/* Anillo exterior — gira CW en 8s */}
        <svg
          viewBox="0 0 100 100"
          style={{ width: 100, height: 100, position: "absolute", inset: 0 }}
        >
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            strokeOpacity="0.6"
            style={{ transformOrigin: "50px 50px", animation: "rotate-cw 8s linear infinite" }}
          />
        </svg>
        {/* Anillo interior — gira CCW en 12s */}
        <svg
          viewBox="0 0 100 100"
          style={{ width: 100, height: 100, position: "absolute", inset: 0 }}
        >
          <circle
            cx="50" cy="50" r="28"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            strokeOpacity="0.45"
            style={{ transformOrigin: "50px 50px", animation: "rotate-ccw 12s linear infinite" }}
          />
        </svg>
        {/* Punto central */}
        <div
          className="absolute"
          style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      {fileName && (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
          {fileName}
        </p>
      )}
      <p style={{ fontSize: 11, color: "var(--border)", letterSpacing: "0.12em" }}>
        VALIDATING DOCUMENT...
      </p>
    </div>
  );
}

// ── Panel: Analyzing (6 analysts en paralelo) ─────────────────────────────
// Cada celda aparece con animación ink-expand (mancha de tinta en papel).
// La barra de progreso avanza de 0→100% con un borde luminoso en el frente.

function AnalyzingPanel({
  percent,
  analystsVisible,
}: {
  percent: number;
  analystsVisible: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto py-6">
      {/* Celdas de analysts */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {ANALYST_NAMES.map((name, i) => {
          const visible = i < analystsVisible;
          return (
            <div
              key={name}
              className="flex items-center justify-center px-2 py-3 rounded"
              style={{
                border: "1px solid var(--border)",
                background: visible ? `rgba(184,78,42,0.07)` : "var(--surface)",
                opacity: visible ? 1 : 0.35,
                // El delay va dentro del shorthand: mezclar animation con
                // animationDelay hace que React advierta al re-renderizar
                animation: visible ? `ink-expand 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.15}s both` : "none",
                transition: "opacity 0.3s ease",
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: "0.08em", color: visible ? "var(--accent)" : "var(--border)" }}>
                {name.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Barra de progreso estilo termómetro de mercurio */}
      <div className="w-full flex flex-col gap-1">
        <div
          className="w-full rounded-sm overflow-hidden"
          style={{ height: 8, background: "var(--border)", opacity: 0.3 }}
        >
          <div
            className="h-full rounded-sm relative"
            style={{
              width: `${percent}%`,
              background: "var(--accent)",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: percent < 100 ? "2px 0 6px rgba(232,201,126,0.7)" : "none",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span style={{ fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
            ANALYSIS
          </span>
          <span style={{ fontSize: 9, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Translating ────────────────────────────────────────────────────
// Una rama botánica SVG que se dibuja sola durante los ~45s que tarda el
// visual-translator. Cada segmento tiene su propio stroke-dashoffset animado
// con un stagger. Al final aparecen nodos circulares en las puntas.

function TranslatingPanel() {
  // Delay acumulativo por tramo — el tronco se dibuja primero, luego las ramas
  const branches: Array<{ d: string; length: number; delay: number; duration: number }> = [
    { d: "M 100 280 C 95 220 105 180 100 100 C 97 60 100 20 100 15", length: 280, delay: 0,    duration: 18 },
    { d: "M 100 200 C 78 188 58 182 42 178",                          length: 72,  delay: 10,   duration: 8  },
    { d: "M 100 160 C 122 146 142 138 158 133",                       length: 72,  delay: 14,   duration: 8  },
    { d: "M 100 120 C 82 110 65 104 50 101",                          length: 60,  delay: 20,   duration: 7  },
    { d: "M 100 100 C 118 90 135 84 150 81",                          length: 60,  delay: 22,   duration: 7  },
  ];

  const nodes = [
    { cx: 42,  cy: 178, delay: 26 },
    { cx: 158, cy: 133, delay: 26 },
    { cx: 50,  cy: 101, delay: 30 },
    { cx: 150, cy: 81,  delay: 30 },
    { cx: 100, cy: 15,  delay: 20 },
  ];

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <svg viewBox="0 0 200 300" style={{ width: 120, height: 180 }}>
        {branches.map((b, i) => (
          <path
            key={i}
            d={b.d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={b.length}
            style={{
              strokeDashoffset: b.length,
              animation: `draw-branch ${b.duration}s linear ${b.delay}s forwards`,
            }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r="0"
            fill="var(--accent)"
            style={{
              animation: `node-appear 0.4s ease ${n.delay + 1}s forwards`,
            }}
          />
        ))}
      </svg>
      <p style={{ fontSize: 11, color: "var(--border)", letterSpacing: "0.12em" }}>
        GENERATING VISUAL DNA...
      </p>
    </div>
  );
}

// ── Panel: Done ───────────────────────────────────────────────────────────
// La máscara 3D aparece con efecto de sello (stamp-in), seguida de una línea
// horizontal que barre de izquierda a derecha. El JSON queda plegado debajo.

function DonePanel({ result, onReset }: { result: VisualDna; onReset: () => void }) {
  return (
    <div
      className="w-full max-w-lg mx-auto flex flex-col gap-3"
      style={{ animation: "stamp-in 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <div className="w-full aspect-square">
        <MorphogenesisCanvas dna={result} />
      </div>
      {/* Línea que barre al aparecer */}
      <div style={{ height: 1, background: "var(--accent)", animation: "sweep-rule 0.8s ease-out 0.4s both", width: 0 }} />
      <p style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
        VISUAL DNA — MORPHOGENESIS MASK · {result.fingerprint.toUpperCase()}
      </p>
      {/* Vuelve a idle: se desmonta el Canvas (R3F libera el contexto WebGL)
          y reaparece la zona de upload, sin recargar la página */}
      <button
        onClick={onReset}
        className="self-center"
        style={{
          fontSize: 10,
          letterSpacing: "0.15em",
          color: "var(--accent)",
          background: "none",
          border: "1px solid var(--border)",
          padding: "6px 20px",
          cursor: "pointer",
        }}
      >
        NEW CV
      </button>
      <details>
        <summary style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em", cursor: "pointer" }}>
          RAW JSON
        </summary>
        <div
          className="rounded-sm overflow-auto mt-2"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "16px",
            maxHeight: 320,
          }}
        >
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function Home() {
  const [state, setState] = useState<PipelineState>({
    stage: "idle",
    analystsPercent: 0,
  });

  // analystsVisible: cuántas celdas de analyst mostrar (se calcula desde el %)
  const analystsVisible = Math.round((state.analystsPercent / 100) * 6);

  const handleFile = useCallback(async (file: File) => {
    setState({ stage: "validating", analystsPercent: 0, fileName: file.name });

    const formData = new FormData();
    formData.append("cv", file);

    let response: Response;
    try {
      response = await fetch("/api/process-cv", { method: "POST", body: formData });
    } catch {
      setState(s => ({ ...s, stage: "error", errorMessage: "No se pudo conectar con el pipeline" }));
      return;
    }

    if (!response.ok || !response.body) {
      setState(s => ({ ...s, stage: "error", errorMessage: "El servidor devolvió un error" }));
      return;
    }

    // Leer el stream SSE manualmente (EventSource solo soporta GET).
    // Se acumula un buffer porque un chunk puede contener múltiples líneas
    // o llegar a mitad de una línea.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleEvent = (raw: string) => {
      let event: Record<string, unknown>;
      try { event = JSON.parse(raw); }
      catch { return; }

      switch (event.type) {
        case "session.started":
          setState(s => ({ ...s, sessionId: event.sessionId as string }));
          break;
        case "stage":
          setState(s => ({ ...s, stage: event.value as Stage }));
          break;
        case "analysts.progress":
          setState(s => ({ ...s, analystsPercent: event.percent as number }));
          break;
        case "result":
          setState(s => ({ ...s, result: event.dna as VisualDna }));
          break;
        case "rejected":
          setState(s => ({ ...s, stage: "rejected", rejectionReason: event.reason as string }));
          break;
        case "error":
          setState(s => ({ ...s, stage: "error", errorMessage: event.message as string }));
          break;
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) handleEvent(line.slice(6));
        }
      }
    } catch {
      setState(s => ({
        ...s,
        stage: "error",
        errorMessage: "Se interrumpió la conexión con el pipeline",
      }));
    }
  }, []);

  const reset = () => setState({ stage: "idle", analystsPercent: 0 });

  const isProcessing = ["validating", "analyzing", "translating"].includes(state.stage);

  return (
    <main
      className="flex flex-col items-center min-h-screen px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      {/* Encabezado */}
      <header className="flex flex-col items-center gap-2 mb-10 text-center">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          Morphogenesis Mask
        </h1>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            letterSpacing: "0.18em",
            fontFamily: "var(--font-mono)",
          }}
        >
          CV → 3D REACTION-DIFFUSION NFT
        </p>
      </header>

      {/* Stage tracker — visible durante el pipeline */}
      {state.stage !== "idle" && state.stage !== "rejected" && state.stage !== "error" && (
        <div className="w-full max-w-lg mb-8">
          <StageTracker currentStage={state.stage} />
        </div>
      )}

      {/* Contenido central según etapa */}
      <div className="flex flex-col items-center w-full">
        {state.stage === "idle" && (
          <OctagonZone onFile={handleFile} disabled={false} />
        )}

        {state.stage === "validating" && (
          <ValidatingPanel fileName={state.fileName} />
        )}

        {state.stage === "analyzing" && (
          <AnalyzingPanel percent={state.analystsPercent} analystsVisible={analystsVisible} />
        )}

        {state.stage === "translating" && (
          <TranslatingPanel />
        )}

        {state.stage === "done" && state.result && (
          <DonePanel result={state.result} onReset={reset} />
        )}

        {state.stage === "rejected" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              NOT A CV
            </p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 320 }}>
              {state.rejectionReason}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 8,
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "var(--accent)",
                background: "none",
                border: "1px solid var(--border)",
                padding: "6px 20px",
                cursor: "pointer",
              }}
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {state.stage === "error" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              PIPELINE ERROR
            </p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 320 }}>
              {state.errorMessage}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 8,
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "var(--accent)",
                background: "none",
                border: "1px solid var(--border)",
                padding: "6px 20px",
                cursor: "pointer",
              }}
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Spinner de "procesando" cuando está en estado de espera larga */}
        {isProcessing && (
          <p
            className="mt-8"
            style={{ fontSize: 9, color: "var(--border)", letterSpacing: "0.2em" }}
          >
            {state.sessionId ? `SESSION ${state.sessionId.slice(0, 8).toUpperCase()}` : "CONNECTING..."}
          </p>
        )}
      </div>
    </main>
  );
}
