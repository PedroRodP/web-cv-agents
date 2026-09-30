import { createHash } from "node:crypto";

export interface FingerprintInput {
  full_name: string;
  latest_title: string;
  years_experience: number;
}

// Normaliza lo que el LLM pudo transcribir con pequeñas variaciones:
// mayúsculas, tildes ("Sofía" = "Sofia") y espacios repetidos.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function computeFingerprint(input: FingerprintInput): string {
  const payload = [
    normalize(input.full_name),
    normalize(input.latest_title),
    String(Math.round(input.years_experience)),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
