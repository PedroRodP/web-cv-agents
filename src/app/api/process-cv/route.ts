import { NextRequest } from "next/server";
import { Client } from "eve/client";
import type { UserContent } from "ai";
import { extractText } from "unpdf";
import type { z } from "zod";
import { VisualDnaSchema, type VisualDna } from "../../../../lib/visual-dna";
import {
  AnalystSchema,
  ANALYST_DIMENSIONS,
  IngestionSchema,
  type Analysis,
} from "../../../../lib/pipeline-schemas";
import { computeFingerprint } from "../../../../lib/cv-fingerprint";
import { computeParameters, type ComputedParameters } from "../../../../lib/visual-parameters";

// Vercel function timeout — el pipeline puede tardar 2-3 minutos
export const maxDuration = 300;

// ── Cadena de agentes orquestada por código ────────────────────────────────
//
//   PDF → unpdf (código)
//       → cv-ingestion            valida · identidad · análisis visual
//       → fingerprint (código)
//       → 6 analysts en paralelo  un score + descriptores por dimensión
//       → visual-dna              seed + parámetros + polos + colores
//       → verificación (código)   → renderer
//
// Cada agente es un miembro independiente del workspace (agents/<nombre>/),
// con su propia API en /eve/<nombre>/v1. El orden, el paralelismo y el paso de
// datos entre eslabones los decide este archivo, no un LLM.

class AgentError extends Error {
  constructor(agent: string, detail: string) {
    super(`${agent}: ${detail}`);
  }
}

/**
 * Ejecuta un eslabón: abre una sesión con el agente, espera el fin del turno y
 * devuelve su structured output validado.
 * `outputSchema` hace que Eve obligue al modelo a cumplir el schema; el
 * cliente no revalida `result.data`, así que lo validamos acá con Zod.
 */
async function runAgent<S extends z.ZodType>(
  origin: string,
  agent: string,
  message: string | UserContent,
  schema: S,
  signal: AbortSignal,
): Promise<z.infer<S>> {
  const startedAt = Date.now();
  const client = new Client({ host: `${origin}/eve/${agent}` });

  const { response } = await client.sessions.create({ message, outputSchema: schema, signal });
  const result = await response.result();
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (result.status === "failed") {
    console.error(`[pipeline] ${agent} FAILED (${seconds}s) session=${result.sessionId}`);
    throw new AgentError(agent, "la sesión falló");
  }

  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    console.error(`[pipeline] ${agent} schema inválido (${seconds}s) session=${result.sessionId}`);
    console.error("[pipeline] data:", JSON.stringify(result.data));
    console.error("[pipeline] message:", result.message?.slice(0, 1000));
    throw new AgentError(
      agent,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | "),
    );
  }

  console.log(`[pipeline] ${agent} ok (${seconds}s) session=${result.sessionId}`);
  return parsed.data;
}

/**
 * Red de seguridad del determinismo: el agente visual-dna debe copiar los
 * valores de compute-parameters, pero es un LLM transcribiendo números.
 * Recalculamos con la misma función y, si difieren, gana el código.
 */
function enforceComputedParameters(
  dna: VisualDna,
  expected: ComputedParameters,
  fingerprint: string,
): VisualDna {
  const fixed: VisualDna = {
    ...dna,
    fingerprint,
    form: { ...expected.form },
    rd: {
      ...expected.rd,
      poles: dna.rd.poles.map((p) => ({ ...p, strength: expected.poles.strength })),
    },
    material: { ...dna.material, ...expected.material },
  };

  const drift = JSON.stringify({ ...dna, seed: null }) !== JSON.stringify({ ...fixed, seed: null });
  if (drift) console.warn("[pipeline] visual-dna alteró valores calculados — se corrigieron");
  if (dna.rd.poles.length !== expected.poles.count) {
    console.warn(
      `[pipeline] visual-dna colocó ${dna.rd.poles.length} polos, se esperaban ${expected.poles.count}`,
    );
  }
  return fixed;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("cv") as File | null;

  if (!file || file.type !== "application/pdf") {
    return Response.json({ error: "Se requiere un archivo PDF" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  // Buffer.from copia el ArrayBuffer antes de que unpdf lo consuma (detach)
  const pdfBuffer = Buffer.from(bytes);
  const { text: cvText } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });
  const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

  // El host se deriva de la request para funcionar igual en local y en Vercel
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();
  const abort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      // Cada evento SSE es una línea "data: <json>\n\n"
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const pipelineStart = Date.now();
      console.log(`[pipeline] inicio — ${file.name} (${cvText.length} caracteres de texto)`);

      try {
        // ── 1. cv-ingestion ──────────────────────────────────────────────
        send({ type: "stage", value: "validating" });

        const ingestion = await runAgent(
          origin,
          "cv-ingestion",
          [
            { type: "text", text: `Extracted text of the document:\n\n${cvText}` },
            { type: "file", data: dataUrl, mediaType: "application/pdf", filename: file.name },
          ],
          IngestionSchema,
          abort.signal,
        );

        if (!ingestion.valid) {
          console.log(`[pipeline] documento rechazado: ${ingestion.rejection_reason}`);
          send({ type: "rejected", reason: ingestion.rejection_reason ?? "El documento no es un CV" });
          controller.close();
          return;
        }
        if (!ingestion.identity || !ingestion.visual_analysis) {
          throw new AgentError("cv-ingestion", "CV válido sin identity o visual_analysis");
        }

        // ── 2. fingerprint (código) ──────────────────────────────────────
        const fingerprint = computeFingerprint(ingestion.identity);
        console.log(`[pipeline] fingerprint ${fingerprint} ←`, ingestion.identity);
        send({ type: "session.started", sessionId: fingerprint });

        // ── 3. 6 analysts en paralelo ────────────────────────────────────
        send({ type: "stage", value: "analyzing" });
        send({ type: "analysts.progress", percent: 0 });

        let completed = 0;
        const results = await Promise.all(
          ANALYST_DIMENSIONS.map(async (dimension) => {
            const result = await runAgent(
              origin,
              `${dimension}-analyst`,
              cvText,
              AnalystSchema,
              abort.signal,
            );
            completed += 1;
            send({ type: "analysts.progress", percent: Math.round((completed / 6) * 100) });
            return [dimension, result] as const;
          }),
        );
        const analysis = Object.fromEntries(results) as Analysis;

        // ── 4. visual-dna ────────────────────────────────────────────────
        send({ type: "stage", value: "translating" });

        const dna = await runAgent(
          origin,
          "visual-dna",
          JSON.stringify(
            { fingerprint, visual_analysis: ingestion.visual_analysis, analysis },
            null,
            2,
          ),
          VisualDnaSchema,
          abort.signal,
        );

        // ── 5. verificación (código) ─────────────────────────────────────
        const scores = Object.fromEntries(
          ANALYST_DIMENSIONS.map((d) => [d, analysis[d].score]),
        ) as Record<(typeof ANALYST_DIMENSIONS)[number], number>;
        const expected = computeParameters(scores, ingestion.visual_analysis.layout_style);
        const finalDna = VisualDnaSchema.parse(enforceComputedParameters(dna, expected, fingerprint));

        console.log(
          `[pipeline] fin (${((Date.now() - pipelineStart) / 1000).toFixed(1)}s)`,
          JSON.stringify(finalDna),
        );
        send({ type: "stage", value: "done" });
        send({ type: "result", dna: finalDna });
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== "AbortError") {
          console.error("[pipeline] error:", err);
          const message = err instanceof Error ? err.message : "Error inesperado";
          send({ type: "error", message });
        }
      }

      controller.close();
    },

    // Si el browser desconecta (cierra la pestaña, navega, etc.), abortamos
    // la sesión en curso para no seguir consumiendo cuota de los modelos
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // Evita que nginx/Vercel edge bufferee los eventos antes de enviarlos
      "X-Accel-Buffering": "no",
    },
  });
}
