import { defineTool } from "eve/tools";
import { z } from "zod";
import { computeFingerprint } from "../../lib/cv-fingerprint";

export default defineTool({
  description:
    "Compute a short deterministic fingerprint (16-char hex) from key CV fields. " +
    "Call this once you have extracted the person's name, job title, first skill, and years of experience from the CV text.",
  inputSchema: z.object({
    name: z.string().describe("Full name of the person"),
    title: z.string().describe("Current or most recent job title"),
    first_skill: z.string().describe("First technical or professional skill mentioned in the CV"),
    years_experience: z.number().describe("Approximate total years of professional experience"),
  }),
  outputSchema: z.object({
    hash: z.string().describe("16-character deterministic hex fingerprint"),
  }),
  async execute(input) {
    return { hash: computeFingerprint(input) };
  },
});
