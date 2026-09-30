import { defineTool } from "eve/tools";
import { z } from "zod";
import { computeParameters } from "../../../../lib/visual-parameters";

const score = z.number().min(0).max(1);

export default defineTool({
  description:
    "Compute the numeric Visual DNA parameters (form, reaction-diffusion, pole count and strength, material) " +
    "from the 6 dimension scores and the CV layout style. Call it once, before writing the Visual DNA, " +
    "and copy every returned value unchanged.",
  inputSchema: z.object({
    scores: z.object({
      technical: score,
      leadership: score,
      creativity: score,
      trajectory: score,
      communication: score,
      collaboration: score,
    }),
    layout_style: z.enum(["minimal", "dense", "creative", "standard"]),
  }),
  outputSchema: z.object({
    form: z.object({ scale: z.number(), blend: z.number() }),
    rd: z.object({ feed: z.number(), kill: z.number(), speed: z.number() }),
    poles: z.object({
      count: z.number().describe("Exact number of poles the Visual DNA must contain"),
      strength: z.number().describe("Strength value for every pole"),
    }),
    material: z.object({ metalness: z.number(), emissive_strength: z.number() }),
  }),
  async execute({ scores, layout_style }) {
    return computeParameters(scores, layout_style);
  },
});
