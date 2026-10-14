import type { Dimension } from "../../../../../lib/pipeline-schemas";
import collaboration from "./collaboration";
import communication from "./communication";
import creativity from "./creativity";
import leadership from "./leadership";
import technical from "./technical";
import trajectory from "./trajectory";

// Un modo de operación del agente por dimensión. Record<Dimension, …> hace
// que TypeScript exija exactamente las 6 dimensiones del contrato.
export const CRITERIA: Record<Dimension, string> = {
  technical,
  leadership,
  creativity,
  trajectory,
  communication,
  collaboration,
};

export const isDimension = (value: unknown): value is Dimension =>
  typeof value === "string" && value in CRITERIA;
