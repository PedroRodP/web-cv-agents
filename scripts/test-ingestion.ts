/**
 * Script de prueba para el pipeline completo (Fase 1 + 2).
 * Uso: npx tsx scripts/test-ingestion.ts <ruta-al-pdf> [url-del-agente]
 *
 * Ejemplos:
 *   npx tsx scripts/test-ingestion.ts ~/mi-cv.pdf
 *   npx tsx scripts/test-ingestion.ts ~/mi-cv.pdf https://web-cv-agents.vercel.app
 */
import { readFile } from "node:fs/promises";
import { Client } from "eve/client";

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

async function main() {
  const pdfPath = process.argv[2];
  const host = process.argv[3] ?? "http://localhost:3000";

  if (!pdfPath) {
    console.error("Uso: npx tsx scripts/test-ingestion.ts <ruta-al-pdf> [url]");
    process.exit(1);
  }

  const bytes = await readFile(pdfPath);
  const dataUrl = `data:application/pdf;base64,${bytes.toString("base64")}`;

  console.log(`Enviando ${pdfPath} a ${host} ...\n`);

  const client = new Client({ host });

  const { session, response } = await client.sessions.create({
    message: [
      { type: "text", text: "Procesá este CV." },
      { type: "file", data: dataUrl, mediaType: "application/pdf", filename: "cv.pdf" },
    ],
    // "cohort": Eve espera a que TODOS los subagentes terminen y despierta al
    // coordinator una sola vez con todos los resultados. Sin esto, el coordinator
    // se despierta 6 veces (una por notificación) y supera el límite de 20 RPM.
    taskDeliveryPolicy: "cohort",
  });

  console.log("Session ID:", response.sessionId);

  // Turn 1: el coordinator valida el CV, extrae texto, calcula fingerprint y
  // despacha los 6 analysts como background tasks. Termina con status "waiting".
  const turn1 = await response.result();
  console.log("\n[Turn 1] Status:", turn1.status);
  if (turn1.message) console.log("[Turn 1] Mensaje:", turn1.message);

  if (turn1.status === "completed") {
    console.log("\nResultado final (turn 1):");
    console.log(JSON.stringify(turn1, null, 2));
    return;
  }

  if (turn1.status === "failed") {
    console.error("\nFallo en turn 1:", JSON.stringify(turn1, null, 2));
    process.exit(1);
  }

  // Status "waiting": los 6 analysts están corriendo en background.
  // Eve disparará una notificación cuando todos completen, despertando
  // al coordinator en un segundo turn automático (sin mensaje del usuario).
  console.log("\nSubagentes corriendo en background. Esperando resultados...\n");

  const abort = new AbortController();
  const timer = setTimeout(() => {
    console.error("\nTimeout: el pipeline tardó más de 5 minutos.");
    abort.abort();
  }, TIMEOUT_MS);

  let finalMessage = "";

  try {
    // session.stream() continúa desde el cursor actual y sigue eventos live.
    // Cuando los subagentes completen, Eve dispara las task notifications y el
    // coordinator se despierta — esos eventos aparecen aquí.
    for await (const event of session.stream({ signal: abort.signal })) {
      switch (event.type) {
        case "turn.started":
          console.log(`[Turn ${event.data.sequence}] Iniciando...`);
          break;
        case "message.received":
          if (event.data.kind === "execution.background_task") {
            console.log("  [task notification] subagente completó");
          }
          break;
        case "message.appended":
          process.stdout.write(event.data.messageDelta);
          break;
        case "message.completed":
          finalMessage = event.data.message ?? "";
          console.log(); // newline tras el streaming del mensaje
          break;
        case "session.completed":
          console.log("\n[Sesión completada]");
          clearTimeout(timer);
          abort.abort(); // cierra el stream
          break;
        case "session.failed":
          console.error("\n[Sesión fallida]:", event.data.message);
          clearTimeout(timer);
          abort.abort();
          break;
        case "session.waiting":
          // Eve entrega task notifications una por vez. El coordinator parkea
          // entre notificaciones hasta tener todas.
          if (finalMessage) {
            // Ya tenemos el output final — el siguiente waiting es el cierre.
            clearTimeout(timer);
            abort.abort();
          } else {
            console.log("  [session.waiting] esperando más notificaciones...");
          }
          break;
      }
    }
  } catch (err: unknown) {
    if (!(err instanceof Error) || err.name !== "AbortError") throw err;
  }

  // Intentar parsear el mensaje final como JSON
  if (finalMessage) {
    console.log("\n--- Resultado Final ---");
    try {
      const parsed = JSON.parse(finalMessage);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(finalMessage);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
