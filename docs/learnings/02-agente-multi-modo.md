# 02 — Funciones de Vercel y agente multi-modo

**Fecha:** 2026-10-14

## Problema

El deploy en Vercel falló con:

> No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.

El límite es **por deployment** (cada versión subida), no por proyecto. El workspace tenía
8 agentes: `cv-ingestion`, 6 analysts y `visual-dna`.

## Por qué cada agente cuesta 2 funciones

Compilando un agente con `eve build` (salida en `.vercel/output/functions/`):

| Función | Trigger | Rol |
|---|---|---|
| `__server.func` | HTTP | API del agente (session, stream, cancel, health…). Las otras 17 rutas son symlinks a esta |
| `.well-known/workflow/v1/flow.func` | cola `queue/v2beta` | Motor durable: consume un mensaje por step de Vercel Workflow, `maxDuration: "max"`, reintentos cada 5 s |

Tienen triggers y configuración distintos, así que no se pueden unificar sin modificar el
build de Eve. 8 agentes × 2 = 16 funciones, más las de Next.js: por encima de 12.

Antes del workspace los analysts eran *subagentes* del coordinator y corrían dentro de sus
2 funciones. Pasar a un workspace hizo que cada uno trajera su propio servidor y motor.

## Solución: un agente, varios modos

Las funciones salen de las **carpetas** de `agents/` en tiempo de build, no de las
**sesiones** en runtime. 6 sesiones en paralelo del mismo agente son 6 invocaciones de las
mismas 2 funciones. Se reemplazaron los 6 analysts por un único `analyst` multi-modo:
3 agentes → 6 funciones.

```
route.ts ── header x-analyst-dimension: technical ──▶ analyst
   channels/eve.ts       AuthFn copia el header a auth.attributes.dimension
   instructions/criteria.ts   dynamic instructions (session.started):
                              CRITERIA[dimension] → instrucciones de sistema
   lib/criteria/<dim>.ts      los 6 criterios
```

## Lo que descubrió el spike

| Pregunta | Resultado |
|---|---|
| ¿Un `.md` dentro de `agent/criteria/`? | ✗ Eve ignora carpetas no soportadas en la raíz del agente |
| ¿Un `.md` dentro de `agent/lib/`? | ✗ Error de compilación: `lib/` solo acepta módulos de código |
| ¿Un `.ts` que exporta un string? | ✓ Se importa y se incluye en el build |
| ¿El resolver de instrucciones ve el `clientContext`? | ✗ `ctx.messages` llega vacío: corre antes de que el mensaje entre al historial |
| ¿Y `ctx.channel.metadata`? | ✗ Vacío en el canal HTTP de Eve; solo se completa con un canal propio (`defineChannel`) |
| ¿Atributos de auth vía `AuthFn` + header? | ✓ Llegan a `ctx.session.auth.current.attributes` |

El atributo de auth es el patrón que usa la documentación de Eve para dynamic instructions
(el `plan` del caller). Acá transporta un modo de operación, no identidad: cualquiera con
acceso al endpoint puede elegir el modo.

## Medición

6 sesiones en paralelo del `analyst` con un CV sintético: **3,4 s** en caliente. La primera
corrida después de crear el agente tardó 52 s (arranque en frío del agente en dev; no se
repite).

## Reglas que nos llevamos

> En un workspace de Eve, cada agente cuesta infraestructura. Antes de crear un agente nuevo,
> preguntarse si es un agente distinto o un modo de uno existente.

> Si el código conoce el modo, que lo elija el código (dynamic instructions), no el LLM
> (skills con `load_skill`).
