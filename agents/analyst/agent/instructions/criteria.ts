import { defineDynamic, defineInstructions } from "eve/instructions";
import { CRITERIA, isDimension } from "../lib/criteria";

// Elige el modo del agente: inyecta como instrucciones de sistema los
// criterios de la dimensión que pidió el caller. La dimensión llega como
// atributo de auth (ver channels/eve.ts), porque el resolver corre antes de
// que el mensaje del turno entre al historial.
// session.started: el modo es fijo durante toda la sesión, y resolverlo una
// vez favorece el prompt cache del proveedor.
export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => {
      const dimension = ctx.session.auth.current?.attributes?.dimension;
      if (!isDimension(dimension)) {
        throw new Error(`analyst: dimensión inválida o ausente (${String(dimension)})`);
      }
      return defineInstructions({ content: CRITERIA[dimension] });
    },
  },
});
