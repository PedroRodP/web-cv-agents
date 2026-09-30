# 01 — Orquestación por código vs. coordinator LLM

**Fecha:** 2026-09-30 · **Commit del cambio:** `52a931d`

## Contexto

Hasta la Fase 3 el pipeline lo orquestaba un **coordinator LLM** (agente raíz de Eve,
`gemini-3.5-flash-lite`) que despachaba subagentes declarados como background tasks, con
`taskDeliveryPolicy: "cohort"`. Se reemplazó por una **cadena orquestada por código** en
`src/app/api/process-cv/route.ts`, sobre un workspace de Eve con 8 agentes independientes,
cada uno con `outputSchema`.

## Resultado

Mismo CV, mismo modelo en todos los agentes.

| | Coordinator LLM | Cadena por código |
|---|---|---|
| Duración total | ~5 min sin terminar (cancelado) · otra corrida falló a los 50 s | **9,2 s** (26,4 s la primera vez: ~16 s de arranque único del sandbox de Eve) |
| Resultado | JSON alucinado (`schema_version 2.0`) o nunca llega | Visual DNA válido en todas las corridas |
| Llamadas al modelo de `visual-dna` / translator | 4+ steps (usaba `bash`: `node -e`, `npm test`) | 3 steps (2 tools + resultado) |
| Fingerprint del mismo CV | cambiaba entre corridas | estable |

Desglose de la cadena nueva: `cv-ingestion` 2,0 s → 6 analysts en paralelo 1,4–2,6 s → `visual-dna` 5,0 s.

## Línea de tiempo de la corrida vieja (reconstruida de `.eve/.workflow-data`)

```
17:48:05  coordinator recibe texto + PDF
17:48:07  empieza a despachar analysts — UNO POR STEP (7 steps, 11 s)
17:48:19  termina el turn 0 → recién ahora arrancan los 6 analysts
17:48:36  los 6 analysts terminaron (cohort despierta al coordinator)
17:50:44  primer tool call del turn 1: 2 min 08 s para una sola llamada al modelo
17:51:00  despacha visual-translator
17:52:20  en vez de estacionarse, "pollea" al translator → AGENT_MISMATCH
17:52:27  despacha un SEGUNDO translator
17:52:31  termina el turn 1 → recién ahora arrancan los dos translators
17:52:59  translator #1 devuelve un DNA válido… que nadie recibe:
          cohort espera al #2, que quedó colgado corriendo bash en el sandbox
```

## Por qué la cadena por código es más rápida

1. **Los subagentes en background arrancan cuando termina el turno del padre.** Todo lo que el
   coordinator hace después de despachar (pollear, re-despachar, escribir texto) retrasa el
   arranque real de sus hijos. El translator despachado a las 17:51:00 empezó a las 17:52:31.
2. **El paralelismo del LLM no es paralelo.** El coordinator emitió un tool call por step: 7
   llamadas secuenciales al modelo para "lanzar en paralelo". `Promise.all` en código lanza las
   6 sesiones en el mismo milisegundo.
3. **Menos turnos, menos contexto.** El coordinator tenía 3 turnos y en cada uno reprocesaba
   el historial completo (PDF, texto del CV y outputs de los analysts). Cada agente de la
   cadena nueva hace un solo turno con solo lo que necesita.
4. **`outputSchema` elimina el ida y vuelta de formato.** Un step entrega el resultado
   estructurado; no hay texto libre que parsear ni fences ```json que romper.
5. **`defaultTools: false` elimina desvíos.** Sin `bash`/`read_file`, el modelo no "verifica"
   su trabajo corriendo comandos en una microVM.
6. **No hay esperas de coordinación.** Sin cohort ni wake-ups: cada eslabón empieza apenas el
   anterior devuelve su resultado.

## Qué se perdió

- **Durabilidad del pegamento.** Cada sesión de agente sigue siendo durable, pero el paso
  entre eslabones vive en la función de Next. Si muere a mitad de camino, la cadena se corta.
  En la práctica el riesgo para el usuario es el mismo que antes: el frontend tampoco podía
  reconectarse a la sesión del coordinator.
- **Un trace único.** Ahora hay una sesión por agente (en `agents/<nombre>/.eve/`) más los
  logs `[pipeline]` del server, en lugar de una sesión macro.

## Regla que nos llevamos

> Si el orden de los pasos se conoce de antemano, lo orquesta el código. El LLM decide solo
> lo que es interpretativo, y devuelve su parte con `outputSchema`.
