import { eveChannel } from "eve/channels/eve";
import { localDev, none } from "eve/channels/auth";

// none() permite tráfico anónimo en producción — aceptable para un proyecto
// de aprendizaje sin usuarios reales. Cambiar a vercelOidc() o un AuthFn
// propio antes de exponer a usuarios externos.
//
// IMPORTANTE — taskDeliveryPolicy:
// eveChannel no acepta esta opción a nivel global. Debe pasarse en cada
// client.sessions.create({ taskDeliveryPolicy: "cohort" }).
// "cohort" es obligatorio en este pipeline: agrupa las 6 notificaciones de
// los analysts y despierta al coordinator una sola vez, evitando superar el
// límite de 20 RPM de Google AI Studio free tier.
export default eveChannel({
  auth: [localDev(), none()],
});
