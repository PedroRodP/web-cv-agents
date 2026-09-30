import { defineTool } from "eve/tools";
import { z } from "zod";

// Returns the lunar phase (0=new moon, 0.5=full moon, 1=back to new)
// based on a known new moon date and the synodic period.
function moonPhase(date: Date): number {
  const knownNewMoon = new Date("2000-01-06T18:14:00Z").getTime();
  const synodicMs = 29.53058867 * 24 * 60 * 60 * 1000;
  const elapsed = date.getTime() - knownNewMoon;
  const raw = ((elapsed % synodicMs) / synodicMs + 1) % 1;
  return Math.round(raw * 100) / 100;
}

export default defineTool({
  description:
    "Compute the contextual seed for the current moment: UTC hour, day of week, and lunar phase. " +
    "Call it once at the start and copy the result unchanged into the Visual DNA `seed` field.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    hour_utc: z.number().describe("Current UTC hour (0–23)"),
    day_of_week: z.number().describe("Day of week (0=Sunday … 6=Saturday)"),
    moon_phase: z
      .number()
      .describe("Lunar phase fraction: 0.0 = new moon, 0.5 = full moon"),
  }),
  async execute() {
    const now = new Date();
    return {
      hour_utc: now.getUTCHours(),
      day_of_week: now.getUTCDay(),
      moon_phase: moonPhase(now),
    };
  },
});
