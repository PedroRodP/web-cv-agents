import { createHash } from "node:crypto";

export interface FingerprintInput {
  name: string;
  title: string;
  first_skill: string;
  years_experience: number;
}

export function computeFingerprint(input: FingerprintInput): string {
  const payload = [
    input.name.trim().toLowerCase(),
    input.title.trim().toLowerCase(),
    input.first_skill.trim().toLowerCase(),
    String(Math.round(input.years_experience)),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
