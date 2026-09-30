# Aprendizajes

Decisiones y hallazgos del proyecto, con la evidencia que los respalda.

| # | Tema | Resumen |
|---|------|---------|
| [01](./01-orquestacion-codigo-vs-llm.md) | Orquestación por código vs. coordinator LLM | De ~5 min sin terminar a 9,2 s: por qué la cadena en `route.ts` es más rápida y confiable que un coordinator LLM |

## Cómo reconstruir una corrida

Eve guarda cada sesión en `agents/<nombre>/.eve/.workflow-data/streams/chunks/strm_<id>_user/*.bin`.
Cada chunk contiene `["Uint8Array",1],"<base64>"` con un evento JSON (`message.received`,
`actions.requested`, `action.result`, `result.completed`...). El `session=wrun_...` que loguea
`route.ts` identifica la carpeta (`strm_` + el id sin `wrun_`).
