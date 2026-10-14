import { eveChannel } from "eve/channels/eve";
import { localDev, none, type AuthFn } from "eve/channels/auth";

// El header x-analyst-dimension elige el modo del agente: viaja como
// atributo del caller hasta ctx.session.auth, donde lo lee el resolver de
// instructions/criteria.ts. Es el patrón de la doc de Eve para dynamic
// instructions por principal; no es seguridad (el canal ya acepta tráfico
// anónimo con none()).
const analystMode: AuthFn<Request> = (request) => {
  const dimension = request.headers.get("x-analyst-dimension");
  if (!dimension) return null;
  return {
    attributes: { dimension },
    authenticator: "pipeline",
    principalId: "process-cv",
    principalType: "service",
  };
};

// none() permite tráfico anónimo en producción — aceptable para un proyecto
// de aprendizaje sin usuarios reales. Cambiar a vercelOidc() o un AuthFn
// propio antes de exponer a usuarios externos.
export default eveChannel({
  auth: [analystMode, localDev(), none()],
});
