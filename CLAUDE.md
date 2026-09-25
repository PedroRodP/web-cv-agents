# web-cv-agents

## Qué es este proyecto

Un conversor de CV a NFT 3D animado. El usuario sube su CV en PDF, un sistema multi-agente lo analiza en múltiples dimensiones en paralelo, y el resultado es un objeto 3D animado único basado en la técnica **Morphogenesis Mask** (Reaction-Diffusion en GPU con Three.js).

## Objetivo principal: aprendizaje

El objetivo primario es **aprender orquestación multi-agente con Eve SDK** a bajo nivel. El NFT es el vehículo, no el fin. Esto implica:

- El usuario quiere **participar activamente en el código**: escribir las `instructions.md` de cada agente, definir tools, entender cada pieza antes de que funcione
- **No generar código completo de una sola vez** — construir paso a paso, explicar qué hace cada parte de Eve SDK antes o durante la implementación
- El usuario quiere **observar cómo Eve orquesta** los agentes: cómo se definen, cómo se comunican, cómo se delega entre ellos, cómo funciona la ejecución durable con Vercel Workflows
- Priorizar claridad y comprensión sobre velocidad de implementación

**Plan de arquitectura completo:** https://claude.ai/artifact/SBtirTQp3wDNx85o9HiwQY

---

## Stack

- **Eve** — orquestación de agentes (https://eve.dev)
- **Next.js** — frontend + API routes
- **Vercel** — deploy (free tier)
- **Gemini 2.5 Flash** — modelo LLM (free tier via Google AI Studio, multimodal)
- **Three.js / @react-three/fiber** — renderer 3D
- **GLSL** — shader Gray-Scott para Reaction-Diffusion en GPU
- **pdf-parse** — extracción de texto de PDF
- **Zod** — schema del Visual DNA JSON

## Pipeline de agentes

```
PDF → CV Ingestion Agent (valida + extrae texto + análisis visual)
       ↓                          ↓
  cv-fingerprint.ts          Output A + B
  (código estático)               ↓
       ↓              ┌──── 6 analysts en paralelo ────┐
       │               Technical · Leadership · Creativity
       │               Trajectory · Communication · Collaboration
       │               └──────────────────────────────┘
       ↓                          ↓
       └────────→ Visual Translator Agent ←── Contextual seed (hora/día/luna)
                          ↓
                    Visual DNA JSON
                          ↓
                   Three.js Renderer
                  (Morphogenesis Mask)
```

## Decisiones clave

- **Solo PDF** — sin DOCX, MVP primero
- **Validación de contenido en el agente** — rechaza documentos que no son CVs; acepta CVs pobres o mal formateados
- **Validación de extensión en el browser** — `accept=".pdf"` + check de `file.type`
- **fingerprint hash** = código estático (SHA-256 sobre nombre + título + primera skill + años), no un agente
- **Contextual seed** = hora UTC + día + fase lunar → pasado como texto al Visual Translator
- **temperature** = regulador de reproducibilidad (0 = reproducible, >0 = nueva variante)
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

## Roadmap

| Fase | Descripción                                      |
|------|--------------------------------------------------|
| 01   | Setup + CV Ingestion Agent (validate + dual output) |
| 02   | 6 Analyst agents en paralelo + fingerprint hash  |
| 03   | Visual Translator Agent + Visual DNA JSON        |
| 04   | Streaming SSE + UI del pipeline                  |
| 05   | Renderer Three.js — Morphogenesis Mask           |
| 06   | Polish: SDF blend + toggle temperatura + share   |
| 07   | (Opcional) Aural DNA — Web Audio                 |
| 08   | (Opcional) Archetype categorization              |

### Arquetipos (Fase 08, opcional)
The Architect · The Catalyst · The Pioneer · The Connector · The Builder

---

## Notas de implementación

- Los analysts son tareas de clasificación focalizada — output Zod-validado: score 0–1 + 2–3 descriptores cualitativos
- El CV Ingestion Agent usa Gemini Vision para analizar la primera página del PDF como imagen (layout, densidad, estilo)
- El fingerprint hash lo corre el Coordinator inmediatamente después del ingestion, antes de esperar a los analysts
- Aural DNA puede correr en paralelo con el Visual Translator en Fase 07
