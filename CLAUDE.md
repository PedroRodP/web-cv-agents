# web-cv-agents

## Qué es este proyecto

Un conversor de CV a NFT 3D animado. El usuario sube su CV en PDF, un sistema multi-agente lo analiza en múltiples dimensiones en paralelo, y el resultado es un objeto 3D animado único basado en la técnica **Morphogenesis Mask** (Reaction-Diffusion en GPU con Three.js).

## Objetivo principal: aprendizaje

El objetivo primario es **aprender orquestación multi-agente con Eve SDK** a bajo nivel. El NFT es el vehículo, no el fin. Esto implica:

- El usuario quiere **participar activamente en el código**: escribir las `instructions.md` de cada agente, definir tools, entender cada pieza antes de que funcione
- **No generar código completo de una sola vez** — construir paso a paso, explicar qué hace cada parte de Eve SDK antes o durante la implementación
- El usuario quiere **observar cómo Eve orquesta** los agentes: cómo se definen, cómo se comunican, cómo se delega entre ellos, cómo funciona la ejecución durable con Vercel Workflows
- Priorizar claridad y comprensión sobre velocidad de implementación

**Plan de arquitectura original:** https://claude.ai/artifact/SBtirTQp3wDNx85o9HiwQY (anterior al cambio a orquestación por código — ver `docs/learnings/`)

**Aprendizajes del proyecto:** [`docs/learnings/README.md`](docs/learnings/README.md) — índice de decisiones y hallazgos con evidencia. Leerlo antes de proponer cambios de arquitectura.

---

## Stack

- **Eve** — agentes (https://eve.dev), en modo **workspace** (`agents/<nombre>/agent/`)
- **Next.js 16** — frontend + API route que orquesta la cadena
- **Vercel** — deploy (free tier)
- **Gemini 3.5 Flash Lite** — modelo de todos los agentes (Google AI Studio, multimodal)
- **Three.js / @react-three/fiber** — renderer 3D
- **GLSL** — shader Gray-Scott para Reaction-Diffusion en GPU
- **unpdf** — extracción de texto de PDF
- **Zod** — contratos entre eslabones (`outputSchema`) y schema del Visual DNA JSON

## Pipeline de agentes

La cadena la orquesta **código** (`src/app/api/process-cv/route.ts`), no un LLM. Cada agente es un miembro independiente del workspace de Eve con su propia API en `/eve/<nombre>/v1`, y devuelve su resultado con `outputSchema`.

```
PDF → unpdf (código) ─ texto
       ↓
  cv-ingestion         texto + PDF → valida · identidad · análisis visual
       ↓                (rechazo → fin)
  fingerprint          código: SHA-256 de full_name + latest_title + años
       ↓
  ┌──── 6 analysts en paralelo (Promise.all) ────┐
   technical · leadership · creativity
   trajectory · communication · collaboration
  └──────────────── score + descriptores ────────┘
       ↓
  visual-dna           tools: contextual-seed + compute-parameters
       ↓                el LLM solo decide polos y colores
  verificación         código: recalcula parámetros y corrige si difieren
       ↓
  Visual DNA JSON → Three.js Renderer (Morphogenesis Mask)
```

### Estructura

```
agents/
├── cv-ingestion/agent/         instructions.md · agent.ts · channels/eve.ts
├── <dimensión>-analyst/agent/  ×6
└── visual-dna/agent/           + tools/contextual-seed.ts · tools/compute-parameters.ts
lib/
├── pipeline-schemas.ts         IngestionSchema · AnalystSchema (outputSchema de cada eslabón)
├── visual-dna.ts               VisualDnaSchema (contrato agentes ↔ renderer)
├── visual-parameters.ts        fórmulas scores → parámetros (tool + verificación en route)
├── cv-fingerprint.ts           hash determinístico
└── fixtures/                   Visual DNA reales para probar el renderer
src/components/morphogenesis/   renderer (shaders, simulación, forma SDF, mapping)
src/app/render-lab/             página para iterar el renderer sin correr el pipeline
```

## Decisiones clave

- **Orquestación por código, no por LLM** — el coordinator LLM polleaba, re-despachaba y alucinaba outputs; la cadena en código es determinística y pasó de minutos (o no terminar) a ~9 s (ver `docs/learnings/01`)
- **Workspace de Eve** — los subagentes declarados solo los puede invocar un agente padre; para que el código llame a cada agente, cada uno es un miembro del workspace
- **`outputSchema` en cada eslabón** — Eve obliga al modelo a cumplir el schema; `route.ts` revalida con Zod porque el cliente no lo hace
- **`defaultTools: false` en todos los agentes** — sin `bash`/`read_file`; cada agente solo ve sus tools
- **Solo PDF** — sin DOCX, MVP primero
- **Validación de contenido en `cv-ingestion`** — rechaza documentos que no son CVs; acepta CVs pobres o mal formateados
- **Validación de extensión en el browser** — `accept=".pdf"` + check de `file.type`
- **Fingerprint en código** — SHA-256 sobre `full_name` + `latest_title` (último título laboral, verbatim) + años, normalizados (sin tildes, espacios colapsados). El LLM solo extrae los campos
- **Parámetros numéricos en código** — `compute-parameters` aplica las fórmulas; el LLM decide solo lo interpretativo (posición de polos, colores)
- **Contextual seed** = hora UTC + día + fase lunar, la obtiene `visual-dna` con su tool
- **temperature** = regulador de reproducibilidad (0 = reproducible, >0 = nueva variante) — pendiente, Fase 06
- **Visual DNA JSON** = contrato entre agentes y renderer — toda la variabilidad vive ahí

## Concepto Three.js: Morphogenesis Mask

Forma 3D (SDF blend sphere-torus) cuya superficie corre un shader **Gray-Scott** (Reaction-Diffusion) en GPU via ping-pong entre dos `WebGLRenderTarget`. Los patrones de Turing emergen y mutan en tiempo real. Cada dimensión del Visual DNA afecta un parámetro del shader:

| Dimensión       | Parámetro RD          |
|-----------------|-----------------------|
| technical_depth | feed rate             |
| leadership      | escala de la forma    |
| creativity      | kill rate             |
| trajectory      | velocidad simulación  |
| communication   | metalness + emissive  |
| collaboration   | polos atractores SDF  |

El renderer re-mapea feed/kill del Visual DNA a la banda del mapa de Pearson donde hay patrón estable (`src/components/morphogenesis/mapping.ts`, validada con barrido numérico). Fuera de esa banda Gray-Scott inunda la superficie o muere.

## Roadmap

| Fase | Descripción                                      | Estado |
|------|--------------------------------------------------|--------|
| 01   | Setup + CV Ingestion Agent (validate + dual output) | ✓ |
| 02   | 6 Analyst agents en paralelo + fingerprint hash  | ✓ |
| 03   | Visual DNA Agent + Visual DNA JSON               | ✓ (rehecho con orquestación por código) |
| 04   | Streaming SSE + UI del pipeline                  | ✓ |
| 05   | Renderer Three.js — Morphogenesis Mask           | ✓ |
| 06   | Polish: SDF blend + toggle temperatura + share   |        |
| 07   | (Opcional) Aural DNA — Web Audio                 |        |
| 08   | (Opcional) Archetype categorization              |        |

### Arquetipos (Fase 08, opcional)
The Architect · The Catalyst · The Pioneer · The Connector · The Builder

---

## Notas de implementación

- Los analysts son tareas de clasificación focalizada — `AnalystSchema`: score 0–1 + 2–3 descriptores + summary
- `cv-ingestion` recibe el PDF como file attachment y hace el análisis visual con Gemini (enums: `layout_style`, `density`, `color_usage`)
- Un subagente de Eve no puede recibir archivos (su input es `message: string`); por eso el análisis visual vive en el primer eslabón
- Logs del pipeline: prefijo `[pipeline]` en la consola de `next dev`, con tiempo y `session=wrun_...` por eslabón
- Debug de una corrida: decodificar la sesión en `agents/<nombre>/.eve/.workflow-data` (ver `docs/learnings/README.md`)
- Pendiente: calibrar scores de los analysts — tienden a inflarse (0.75–0.95 en un CV senior), lo que satura los parámetros
- Aural DNA puede correr en paralelo con `visual-dna` en Fase 07
