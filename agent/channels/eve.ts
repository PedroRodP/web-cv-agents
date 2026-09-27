import { eveChannel } from "eve/channels/eve";
import { localDev, none } from "eve/channels/auth";

// none() permite tráfico anónimo en producción — aceptable para un proyecto
// de aprendizaje sin usuarios reales. Cambiar a vercelOidc() o un AuthFn
// propio antes de exponer a usuarios externos.
export default eveChannel({
  auth: [localDev(), none()],
});
