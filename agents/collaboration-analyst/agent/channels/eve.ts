import { eveChannel } from "eve/channels/eve";
import { localDev, none } from "eve/channels/auth";

// Canal HTTP del agente: en el workspace cada agente expone su propia API en
// /eve/<nombre>/v1/* y route.ts lo invoca como un eslabón de la cadena.
//
// none() permite tráfico anónimo en producción — aceptable para un proyecto
// de aprendizaje sin usuarios reales. Cambiar a vercelOidc() o un AuthFn
// propio antes de exponer a usuarios externos.
export default eveChannel({
  auth: [localDev(), none()],
});
