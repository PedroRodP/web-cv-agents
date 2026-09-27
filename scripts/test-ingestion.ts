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
  });

  console.log("Session ID:", response.sessionId);

  const result = await response.result();

  console.log("\nStatus:", result.status);
  console.log("\nResultado completo:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
