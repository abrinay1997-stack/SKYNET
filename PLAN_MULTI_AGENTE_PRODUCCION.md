# SKYNET — Plan Exhaustivo: Arquitectura Multi-Agente y Producción

**Fecha:** 2026-02-23
**Branch:** `claude/multi-agent-architecture-plan-DPCuj`
**Estado Actual:** MVP funcional con orquestación básica en frontend

---

## DIAGNÓSTICO DEL ESTADO ACTUAL

### Problemas Críticos
| # | Problema | Impacto |
|---|----------|---------|
| 1 | API keys expuestas en el browser (`dangerouslyAllowBrowser: true`) | **CRÍTICO** — Seguridad |
| 2 | Orquestación de agentes en el frontend (`App.tsx`) | **ALTO** — Arquitectura |
| 3 | Sin autenticación ni autorización | **CRÍTICO** — Seguridad |
| 4 | API keys en SQLite en texto plano | **CRÍTICO** — Seguridad |
| 5 | Sin streaming — respuestas bloquean la UI | **ALTO** — UX |
| 6 | CORS completamente abierto | **ALTO** — Seguridad |
| 7 | Sin rate limiting | **ALTO** — Seguridad |
| 8 | Base de datos SQLite no apta para producción | **MEDIO** — Escalabilidad |
| 9 | Sin validación de inputs | **ALTO** — Seguridad |
| 10 | Sin logging ni monitoreo | **MEDIO** — Operaciones |

### Lo que ya funciona bien
- Flujo de 4 agentes (Researcher → Quant → Risk → CIO)
- Fallback a localStorage
- Soporte multi-proveedor (Gemini, Anthropic, OpenAI)
- UI en tiempo real con estados por agente
- Deploy automático a GitHub Pages

---

## ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - UI reactiva con streaming via WebSocket               │
│  - Sin acceso directo a APIs de AI                      │
│  - Auth con JWT                                         │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS + WebSocket (wss://)
┌─────────────────▼───────────────────────────────────────┐
│              BACKEND (Node/Express)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │         AGENT ORCHESTRATOR (Core)                │   │
│  │  - Gestiona el ciclo de vida de cada análisis    │   │
│  │  - Coordina fases paralelas y secuenciales       │   │
│  │  - Inyecta contexto entre agentes               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐ ┌──────────┐  │
│  │Researcher │ │  Quant    │ │  Risk   │ │   CIO    │  │
│  │  Agent    │ │  Agent    │ │  Agent  │ │  Agent   │  │
│  └─────┬─────┘ └─────┬─────┘ └────┬────┘ └─────┬────┘  │
│        └─────────────┴────────────┴─────────────┘       │
│                         │ AI Provider Router             │
│              ┌──────────┼──────────┐                    │
│         Gemini API  Claude API  OpenAI API               │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL)                  │
│  - projects, credentials (cifradas), analysis_history    │
│  - agent_sessions, agent_messages, watchlist             │
└─────────────────────────────────────────────────────────┘
```

---

## FASES DE IMPLEMENTACIÓN

---

## FASE 1 — SEGURIDAD Y MIGRACIÓN DE ORQUESTACIÓN AL BACKEND
**Prioridad: CRÍTICA | Duración estimada: 1-2 semanas**

### 1.1 Mover toda la lógica de AI al backend

**Archivos a crear/modificar:**

```
server/
├── agents/
│   ├── BaseAgent.ts          # Clase abstracta con callAI, retry, logging
│   ├── ResearcherAgent.ts    # Extiende BaseAgent
│   ├── QuantAgent.ts         # Extiende BaseAgent
│   ├── RiskAgent.ts          # Extiende BaseAgent
│   └── CIOAgent.ts           # Extiende BaseAgent
├── orchestrator/
│   └── AnalysisOrchestrator.ts  # Coordina el flujo completo
├── routes/
│   ├── analysis.ts           # POST /api/analysis/run
│   └── stream.ts             # GET /api/analysis/:id/stream (SSE)
└── middleware/
    ├── auth.ts               # Validación JWT
    ├── rateLimiter.ts        # express-rate-limit
    └── validation.ts         # zod schema validation
```

**Tareas concretas:**
- [ ] Crear `BaseAgent.ts` con lógica de `callAI`, retry (exponential backoff), y logging estructurado
- [ ] Migrar cada agente de `agentConfigs.ts` a su propia clase `*Agent.ts`
- [ ] Crear `AnalysisOrchestrator.ts` — mueve la lógica actual de `App.tsx` al servidor
- [ ] Eliminar `@anthropic-ai/sdk`, `@google/genai`, `openai` del bundle del frontend
- [ ] El frontend solo llama a `POST /api/analysis/run` y escucha SSE (Server-Sent Events)

**Ejemplo de la nueva API:**
```
POST /api/analysis/run
Body: { projectId, asset, providerOverride? }
Response: { analysisId: "uuid" }

GET /api/analysis/:id/stream   (SSE)
Events:
  agent_start   → { agent: "researcher", timestamp }
  agent_chunk   → { agent: "researcher", content: "..." }  // streaming
  agent_done    → { agent: "researcher", report: "..." }
  analysis_done → { recommendation: "COMPRAR", ... }
  error         → { agent: "...", message: "..." }
```

### 1.2 Cifrado de API Keys

- [ ] Agregar `crypto` (Node built-in) para cifrado AES-256-GCM
- [ ] Crear `server/services/encryption.ts` — `encrypt(text, masterKey)` / `decrypt(cipher, masterKey)`
- [ ] `MASTER_ENCRYPTION_KEY` como variable de entorno (256-bit random)
- [ ] Migrar columna `api_key` en DB para almacenar ciphertext + IV (base64)
- [ ] Las API keys **nunca** viajan al frontend en texto plano — solo indicador "configurada: sí/no"

### 1.3 Autenticación JWT

- [ ] Instalar: `jsonwebtoken`, `bcryptjs`
- [ ] Crear `POST /api/auth/register` y `POST /api/auth/login`
- [ ] Middleware `auth.ts` que valida Bearer token en cada ruta protegida
- [ ] Tabla `users` en DB: `id, email, password_hash, created_at`
- [ ] Refresh token con cookie HttpOnly para renovación automática
- [ ] En el frontend: hook `useAuth` que maneja login/logout y adjunta token en cada request

### 1.4 Rate Limiting y Seguridad General

- [ ] Instalar: `express-rate-limit`, `helmet`, `express-validator`
- [ ] Rate limit global: 100 req/15min por IP
- [ ] Rate limit para análisis: 10 análisis/hora por usuario
- [ ] `helmet()` para headers de seguridad (CSP, HSTS, X-Frame-Options)
- [ ] Validar y sanitizar todos los inputs con `zod` (asset name, project name, etc.)
- [ ] Configurar CORS restringido a dominio de producción

---

## FASE 2 — ARQUITECTURA MULTI-AGENTE VERDADERA
**Prioridad: ALTA | Duración estimada: 2-3 semanas**

### 2.1 Agentes con Diferentes Proveedores

Actualmente todos los agentes usan el mismo proveedor. El objetivo es que **cada agente pueda tener su propio proveedor y modelo**.

**Cambios en la DB:**
```sql
-- Nueva tabla para configuración por agente
CREATE TABLE agent_configs (
  id           INTEGER PRIMARY KEY,
  project_id   INTEGER REFERENCES projects(id),
  agent_id     TEXT NOT NULL,  -- 'researcher' | 'quant' | 'risk' | 'cio'
  provider     TEXT NOT NULL,
  model_name   TEXT,
  temperature  REAL DEFAULT 0.7,
  max_tokens   INTEGER DEFAULT 4096,
  custom_prompt TEXT,          -- override del system prompt
  UNIQUE(project_id, agent_id)
);
```

**Cambios en UI:**
- [ ] Vista de configuración expandida en Settings: sección por agente
- [ ] Selector de provider + model por agente
- [ ] Slider de temperatura por agente
- [ ] Editor de system prompt (textarea con el prompt base editable)

### 2.2 Streaming de Tokens con SSE

- [ ] Implementar streaming en `BaseAgent.ts` para los 3 proveedores:
  - **Gemini:** `generateContentStream()`
  - **Anthropic:** `stream()` con `anthropic.messages.stream()`
  - **OpenAI:** `stream: true` en `chat.completions.create()`
- [ ] En el backend, hacer pipe del stream al SSE connection del frontend
- [ ] En el frontend, acumular chunks en el estado del agente → UI se actualiza token a token
- [ ] Beneficio: respuestas de 4096 tokens aparecen progresivamente, no en bloque

### 2.3 Protocolos de Comunicación entre Agentes

Actualmente los agentes solo reciben el output del agente anterior como string. Propuesta de protocolo estructurado:

**Nuevo formato de mensaje entre agentes:**
```typescript
interface AgentMessage {
  from: AgentRole;
  to: AgentRole | 'all';
  type: 'report' | 'question' | 'challenge' | 'summary';
  content: string;
  metadata: {
    confidence: number;      // 0-1
    sentiment: 'bullish' | 'bearish' | 'neutral';
    keyPoints: string[];
    dataPoints: { metric: string; value: string; source: string }[];
  };
  timestamp: string;
}
```

- [ ] Crear `server/types/agent.ts` con interfaces de mensajes
- [ ] Modificar cada agente para retornar `AgentMessage` estructurado
- [ ] El CIO recibe el array completo de `AgentMessage[]` con metadatos
- [ ] Guardar mensajes individuales en tabla `agent_messages` para auditoría

### 2.4 Nuevo Agente: Macro Economist (Opcional pero Recomendado)

- [ ] Crear `MacroAgent.ts` — analiza contexto macroeconómico global
- [ ] Ejecutar en **paralelo** con Researcher y Quant (Fase 1 del pipeline)
- [ ] System prompt: tasas de interés, inflación, ciclos económicos, correlaciones
- [ ] Configurable: se puede activar/desactivar por proyecto

### 2.5 Mecanismo de Debate (Iteración entre Agentes)

Mejora avanzada: que el Risk Manager pueda **cuestionar directamente** un punto específico del Researcher, y el Researcher responde antes de que el CIO decida.

```
Flujo actual:
Researcher → Quant → Risk → CIO

Flujo mejorado (iterativo):
Researcher + Quant (paralelo)
    ↓
Risk (revisa ambos, genera preguntas/desafíos)
    ↓
Researcher responde desafíos del Risk (opcional, configurable)
    ↓
CIO (síntesis final con la conversación completa)
```

- [ ] Agregar campo `debate_rounds` en configuración de proyecto (0 = comportamiento actual)
- [ ] Implementar `DebateOrchestrator.ts` que gestiona el ciclo de debate
- [ ] UI: mostrar hilo de conversación entre agentes tipo "chat"

### 2.6 Tool Use / Herramientas Reales para Agentes

Los agentes actualmente trabajan solo con conocimiento del modelo. Integrar herramientas reales:

**Herramientas prioritarias:**
- [ ] **Yahoo Finance API** (gratuito vía `yahoo-finance2`): precios en tiempo real, histórico, fundamentales
- [ ] **NewsAPI** o **GDELT**: noticias recientes del activo
- [ ] **Google Search** (ya habilitado en Gemini vía `googleSearch: {}`): expandir a todos los proveedores

**Implementación:**
```typescript
// server/tools/
├── financialDataTool.ts   // getPrice(), getHistory(), getFundamentals()
├── newsTool.ts            // getRecentNews(asset, days)
└── searchTool.ts          // webSearch(query)
```

- [ ] Researcher Agent usa `newsTool` + `searchTool`
- [ ] Quant Agent usa `financialDataTool` (datos reales de precio/volumen/RSI)
- [ ] Los datos reales se inyectan en el prompt como contexto estructurado
- [ ] UI muestra badge "Datos en tiempo real" cuando se usan herramientas

---

## FASE 3 — BASE DE DATOS Y PERSISTENCIA PRODUCTION-GRADE
**Prioridad: MEDIA-ALTA | Duración estimada: 1 semana**

### 3.1 Migración de SQLite a PostgreSQL

- [ ] Instalar: `pg`, `@types/pg`, `drizzle-orm` (ORM type-safe) o `prisma`
- [ ] Crear `server/db/schema.ts` con el schema completo en Drizzle/Prisma
- [ ] Script de migración `server/db/migrate.ts`
- [ ] Variables de entorno: `DATABASE_URL=postgresql://user:pass@host:5432/skynet`
- [ ] Para desarrollo local: Docker Compose con PostgreSQL
- [ ] Mantener SQLite como fallback para modo offline/desarrollo sin Docker

**Schema completo objetivo:**
```sql
users              -- autenticación
projects           -- portfolios
credentials        -- API keys cifradas (por proyecto + proveedor)
agent_configs      -- configuración por agente por proyecto
analysis_sessions  -- cada ejecución de análisis
agent_messages     -- mensajes individuales por agente por sesión
watchlist          -- activos favoritos por proyecto
```

### 3.2 Sistema de Migraciones

- [ ] Usar Drizzle Kit o Prisma Migrate para versionado de schema
- [ ] Script `npm run db:migrate` para aplicar migraciones
- [ ] Script `npm run db:seed` con datos de ejemplo para desarrollo
- [ ] Backups automáticos de la DB (script cron o servicio managed)

---

## FASE 4 — UX/UI MEJORADA
**Prioridad: MEDIA | Duración estimada: 1-2 semanas**

### 4.1 Streaming Visual en Tiempo Real

- [ ] Componente `AgentCard` refactorizado para mostrar texto que aparece progresivamente
- [ ] Cursor parpadeante mientras el agente está generando (efecto "typewriter")
- [ ] Badge de proveedor + modelo en cada tarjeta (ej: "Gemini 2.0 Flash")
- [ ] Timer por agente (cuántos segundos tardó en completarse)

### 4.2 Vista de Historial Enriquecida

- [ ] Página de historial con tabla filtrable y buscable
- [ ] Expandir cada análisis para ver los 4 reportes completos
- [ ] Gráfico de distribución de recomendaciones (COMPRAR/VENDER/MANTENER)
- [ ] Filtrar por activo, fecha, recomendación, proveedor usado
- [ ] Comparar dos análisis del mismo activo lado a lado

### 4.3 Exportación de Reportes

- [ ] Exportar análisis completo a **Markdown** (botón en la UI)
- [ ] Exportar a **PDF** usando `jsPDF` o `@react-pdf/renderer`
- [ ] El PDF incluye: portada, timestamp, 4 secciones de agentes, recomendación final
- [ ] Opción de copiar al clipboard el reporte del CIO

### 4.4 Watchlist y Alertas

- [ ] Tabla `watchlist` con activos monitoreados por proyecto
- [ ] "Re-analizar" un activo desde la watchlist con un click
- [ ] Comparar análisis actual vs. anterior del mismo activo
- [ ] Indicador visual de cambio en recomendación (HOLD→BUY, etc.)

### 4.5 Pantalla de Login/Registro

- [ ] Formulario de login y registro (email + password)
- [ ] Validación en cliente con React Hook Form + Zod
- [ ] Persistencia de sesión con refresh token en cookie HttpOnly
- [ ] "Modo demo" sin cuenta para probar la herramienta con API key propia

---

## FASE 5 — INFRAESTRUCTURA Y DEVOPS
**Prioridad: ALTA para producción | Duración estimada: 1 semana**

### 5.1 Containerización con Docker

**Archivos a crear:**
```
Dockerfile              # Build del backend
Dockerfile.frontend     # Build del frontend (nginx)
docker-compose.yml      # Orquestación local (app + postgres + redis)
docker-compose.prod.yml # Configuración de producción
.dockerignore
```

**`docker-compose.yml` (desarrollo):**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: skynet
      POSTGRES_USER: skynet
      POSTGRES_PASSWORD: dev_password
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  backend:
    build: .
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgresql://skynet:dev_password@postgres:5432/skynet
      MASTER_ENCRYPTION_KEY: ${MASTER_ENCRYPTION_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports: ["3000:80"]
    depends_on: [backend]
```

### 5.2 Variables de Entorno y Secrets

**`.env.example` actualizado:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skynet

# Security
JWT_SECRET=<256-bit-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MASTER_ENCRYPTION_KEY=<256-bit-random-string>

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Optional: Default AI keys (fallback)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional: Tool APIs
NEWS_API_KEY=
```

- [ ] Nunca commitear `.env` con valores reales
- [ ] Script `npm run generate:secrets` que genera JWT_SECRET y MASTER_KEY seguros

### 5.3 CI/CD con GitHub Actions

**Workflows a crear/actualizar:**

```yaml
# .github/workflows/ci.yml — Tests en cada PR
- Install dependencies
- TypeScript type check (tsc --noEmit)
- ESLint
- Unit tests (Jest/Vitest)
- Build check

# .github/workflows/deploy.yml — Deploy en push a main
- Build Docker images
- Push a registry (GHCR o Docker Hub)
- Deploy a servidor (SSH, Railway, Fly.io, etc.)
- Run DB migrations
- Health check post-deploy
- Rollback automático si health check falla
```

### 5.4 Opciones de Deploy (Recomendaciones)

| Plataforma | Pros | Contras | Costo estimado |
|------------|------|---------|----------------|
| **Railway** | Deploy de Docker + PostgreSQL managed, muy fácil | Precio puede subir | ~$5-20/mes |
| **Fly.io** | Excelente para contenedores, PostgreSQL managed | Curva de aprendizaje | ~$5-15/mes |
| **Render** | Free tier, PostgreSQL managed | Free tier tiene cold starts | $0-15/mes |
| **DigitalOcean App Platform** | Simple, managed DB | Más caro | ~$12-25/mes |
| **VPS (Hetzner/DO)** | Control total, económico | Más mantenimiento manual | ~$5-10/mes |

**Recomendación: Railway o Fly.io** para comenzar rápido con un stack completo.

---

## FASE 6 — TESTING
**Prioridad: MEDIA | Duración estimada: 1 semana**

### 6.1 Tests Unitarios (Vitest)

```
tests/
├── unit/
│   ├── agents/
│   │   ├── ResearcherAgent.test.ts
│   │   ├── QuantAgent.test.ts
│   │   ├── RiskAgent.test.ts
│   │   └── CIOAgent.test.ts
│   ├── orchestrator/
│   │   └── AnalysisOrchestrator.test.ts
│   └── services/
│       └── encryption.test.ts
├── integration/
│   ├── api/
│   │   ├── analysis.test.ts
│   │   ├── projects.test.ts
│   │   └── auth.test.ts
│   └── db/
│       └── migrations.test.ts
└── e2e/
    └── analysis-flow.test.ts  (Playwright)
```

- [ ] Mock de llamadas a AI APIs (no gastar tokens en tests)
- [ ] Tests de integración con DB en memoria (pg-mem o SQLite)
- [ ] Coverage mínimo: 70% para lógica de negocio

### 6.2 Tests E2E con Playwright

- [ ] Test del flujo completo: login → crear proyecto → configurar API key → analizar activo → ver recomendación
- [ ] Test de streaming: verificar que los chunks llegan en orden
- [ ] Test de error handling: simular fallo de proveedor AI

---

## FASE 7 — MONITOREO Y OBSERVABILIDAD
**Prioridad: MEDIA | Duración estimada: 3-5 días**

### 7.1 Logging Estructurado

- [ ] Instalar: `pino` + `pino-pretty` (desarrollo)
- [ ] Log de cada análisis: agente, proveedor, tokens usados, latencia, éxito/error
- [ ] Log de autenticación: login, logout, intentos fallidos
- [ ] Formato JSON para ingestión en plataformas de logs (Datadog, Logtail, etc.)

**Campos de log para cada llamada a AI:**
```json
{
  "level": "info",
  "event": "agent_completed",
  "analysisId": "uuid",
  "agent": "researcher",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet",
  "inputTokens": 512,
  "outputTokens": 1200,
  "latencyMs": 3420,
  "asset": "AAPL"
}
```

### 7.2 Métricas y Alertas

- [ ] Endpoint `GET /health` con estado de DB, memoria, uptime
- [ ] Endpoint `GET /metrics` (formato Prometheus opcional)
- [ ] Alerta si la tasa de error de agentes supera el 10%
- [ ] Dashboard en Grafana o plataforma managed (si se usa Railway/Fly.io tienen métricas built-in)

### 7.3 Manejo de Errores en Producción

- [ ] Integrar Sentry para captura de errores no manejados (frontend + backend)
- [ ] Error boundaries en React para fallos de UI
- [ ] Cola de análisis fallidos para reintento automático (opcional: Bull/BullMQ con Redis)

---

## RESUMEN DE STACK TECNOLÓGICO FINAL

### Backend
| Categoría | Tecnología |
|-----------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| ORM | Drizzle ORM |
| DB Principal | PostgreSQL 16 |
| Auth | JWT + bcryptjs |
| Validación | Zod |
| Logging | Pino |
| Rate Limiting | express-rate-limit |
| Seguridad Headers | Helmet |
| Testing | Vitest + Supertest |

### Frontend
| Categoría | Tecnología |
|-----------|-----------|
| Framework | React 19 |
| Lenguaje | TypeScript 5 |
| Build Tool | Vite 6 |
| Estilos | Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| HTTP Client | Fetch API (nativo) |
| Streaming | EventSource (SSE nativo) |
| Animaciones | Motion |
| Testing | Vitest + Playwright |

### Infraestructura
| Categoría | Tecnología |
|-----------|-----------|
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Deploy | Railway / Fly.io |
| DB Managed | PostgreSQL en plataforma |
| Secrets | Variables de entorno del platform |
| Monitoreo | Pino Logs + Sentry |

---

## ORDEN DE PRIORIDAD DE IMPLEMENTACIÓN

```
SPRINT 1 (Semana 1-2) — FUNDAMENTOS DE SEGURIDAD
  ✅ Mover AI calls al backend (eliminar dangerouslyAllowBrowser)
  ✅ Cifrado de API keys en DB
  ✅ Autenticación JWT básica
  ✅ Rate limiting + Helmet
  ✅ Validación de inputs con Zod

SPRINT 2 (Semana 3-4) — MULTI-AGENTE REAL
  ✅ Clases BaseAgent + agentes individuales
  ✅ AnalysisOrchestrator en backend
  ✅ Streaming SSE frontend ↔ backend
  ✅ Configuración por-agente (provider, model, prompt)
  ✅ Protocolo de mensajes estructurados entre agentes

SPRINT 3 (Semana 5) — BASE DE DATOS
  ✅ Migración a PostgreSQL
  ✅ Drizzle ORM + schema completo
  ✅ Script de migraciones
  ✅ Docker Compose con Postgres

SPRINT 4 (Semana 6) — HERRAMIENTAS REALES PARA AGENTES
  ✅ yahoo-finance2 para datos financieros reales
  ✅ NewsAPI para noticias recientes
  ✅ Inyección de datos reales en prompts

SPRINT 5 (Semana 7) — UX/UI
  ✅ Streaming visual token-a-token
  ✅ Historial enriquecido + filtros
  ✅ Exportar a Markdown/PDF
  ✅ Watchlist

SPRINT 6 (Semana 8) — PRODUCCIÓN
  ✅ Dockerfile + docker-compose.prod.yml
  ✅ CI/CD completo (GitHub Actions)
  ✅ Deploy a Railway/Fly.io
  ✅ Pino logging + Sentry
  ✅ Health check endpoint

SPRINT 7 (Semana 9) — TESTING Y PULIDO
  ✅ Tests unitarios agentes (mocks)
  ✅ Tests de integración API
  ✅ Test E2E flujo completo
  ✅ Documentación actualizada
```

---

## CHECKLIST DE PRODUCCIÓN (GO-LIVE)

Antes de considerar la herramienta lista para producción, verificar:

- [ ] **Seguridad:** API keys nunca viajan al frontend
- [ ] **Seguridad:** Todas las rutas están autenticadas (excepto `/health`, `/api/auth/*`)
- [ ] **Seguridad:** Rate limiting activo en análisis
- [ ] **Seguridad:** CORS restringido al dominio real
- [ ] **Seguridad:** Helmet headers configurados
- [ ] **Seguridad:** Inputs validados con Zod
- [ ] **Funcionalidad:** Streaming SSE funcionando en los 3 proveedores
- [ ] **Funcionalidad:** Fallback a proveedor disponible si uno falla
- [ ] **Funcionalidad:** Historial persistente en PostgreSQL
- [ ] **Datos:** Migraciones aplicadas en producción
- [ ] **Infraestructura:** Docker build exitoso
- [ ] **Infraestructura:** Variables de entorno configuradas en el platform
- [ ] **Infraestructura:** HTTPS activado
- [ ] **Monitoreo:** Health check responde 200
- [ ] **Monitoreo:** Logs visibles en plataforma
- [ ] **Monitoreo:** Sentry capturando errores
- [ ] **Testing:** Tests unitarios pasan (CI verde)
- [ ] **Testing:** Flujo completo E2E probado manualmente

---

*Plan generado el 2026-02-23. Sujeto a revisión según feedback del equipo.*
