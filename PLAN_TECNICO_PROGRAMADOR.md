# SKYNET — Plan Técnico para Programador
**Versión:** 2.0 | **Fecha:** 2026-02-23
**Branch activo:** `claude/multi-agent-architecture-plan-DPCuj`

---

## COMPARACIÓN DE AMBOS ANÁLISIS

Tenemos dos análisis complementarios del mismo sistema:

| Aspecto | Análisis A (Flujo de Código) | Análisis B (Arquitectura) | Veredicto fusionado |
|---------|------------------------------|---------------------------|---------------------|
| **Foco** | *Qué hace cada línea hoy* | *Qué debe cambiar y por qué* | Ambos necesarios |
| **Orquestación** | Vive en `App.tsx:127` (`runAnalysis`) | Debe moverse al backend | **Migrar al servidor** |
| **Paralelismo** | `Promise.all` en `App.tsx:148` | Mantener pero en backend | **Reusar el patrón, moverlo** |
| **Retries** | Loop en `App.tsx:110` (retries=2) | Exponential backoff real | **Mejorar el retry existente** |
| **Persistencia** | Dual lógica en `api.ts:94` | PostgreSQL + eliminar localStorage para AI | **Simplificar y migrar DB** |
| **API Keys** | Viajan al browser vía `api.ts:101` | Nunca deben salir del servidor | **CRÍTICO: eliminar esta ruta** |
| **callAI** | `aiProviderService.ts:13` (browser) | Solo debe existir en backend | **Mover archivo completo** |
| **Streaming** | No existe, respuesta bloquea UI | SSE token-a-token | **Nuevo: SSE en backend** |
| **Auth** | No existe | JWT obligatorio | **Nuevo: middleware auth** |

### Cómo se complementan

```
Análisis de Flujo (tuyo)    +    Análisis Arquitectónico (mío)
         ↓                                    ↓
"runStep está en App.tsx:92"     "runStep debe ser BaseAgent en el backend"
         ↓                                    ↓
              RESULTADO: sé EXACTAMENTE qué mover y A DÓNDE
```

El análisis de flujo da el **punto de origen exacto** de cada función.
El análisis arquitectónico da el **punto de destino y la razón**.
Juntos producen instrucciones sin ambigüedad para el programador.

---

## ARQUITECTURA FINAL (Referencia Visual)

```
ANTES (estado actual):
┌──────────────────────────────────────────────────────────┐
│  BROWSER                                                  │
│  App.tsx:127  runAnalysis()                              │
│  App.tsx:92   runStep() → callAI() → Gemini/Claude/GPT  │
│  api.ts:94    saveHistory() → fetch() o localStorage     │
│  ⚠️ API Keys viajan como texto plano al browser          │
└──────────────────────────────────────────────────────────┘

DESPUÉS (objetivo):
┌──────────────────────────────────────────────────────────┐
│  BROWSER                                                  │
│  App.tsx      POST /api/analysis/run  ──────────────┐    │
│  App.tsx      EventSource('/api/analysis/:id/stream')│    │
│  App.tsx      Muestra chunks conforme llegan          │    │
└───────────────────────────────────┬──────────────────┘    │
                                    │ SSE (chunks)          │
┌───────────────────────────────────▼──────────────────┐    │
│  BACKEND (server/)                                    │    │
│  AnalysisOrchestrator  ← (era App.tsx:127)           │    │
│    ├── ResearcherAgent ← (era App.tsx:136 + runStep) │    │
│    ├── QuantAgent      ← (era App.tsx:142 + runStep) │    │
│    ├── RiskAgent       ← (era App.tsx:151 + runStep) │    │
│    └── CIOAgent        ← (era App.tsx:161 + runStep) │    │
│  aiProviderService.ts  ← (mismo archivo, solo backend)│   │
│  PostgreSQL            ← (era SQLite index.ts:59)    │    │
│  API Keys cifradas     ← (nunca salen del servidor)  │    │
└──────────────────────────────────────────────────────┘
```

---

## MAPA EXACTO DE MIGRACIONES

Cada nodo del análisis de flujo mapeado a su destino:

| Nodo Original | Archivo:Línea | Acción | Destino |
|---------------|---------------|--------|---------|
| Botón análisis | `App.tsx:253` | Modificar `onClick` | Llama `POST /api/analysis/run` |
| `runAnalysis()` | `App.tsx:127` | **Mover** | `server/orchestrator/AnalysisOrchestrator.ts` |
| Reset de agentes | `App.tsx:132` | **Reemplazar** | Escucha evento SSE `analysis_started` |
| Tarea Researcher | `App.tsx:136` | **Mover** | `server/agents/ResearcherAgent.ts` |
| Tarea Quant | `App.tsx:142` | **Mover** | `server/agents/QuantAgent.ts` |
| `Promise.all` | `App.tsx:148` | **Mover** (mantener el patrón) | Dentro de `AnalysisOrchestrator.ts` |
| `runStep()` | `App.tsx:92` | **Convertir en clase** | `server/agents/BaseAgent.ts` |
| Retry loop | `App.tsx:110` | **Mejorar** con exponential backoff | `BaseAgent.ts:retry()` |
| `callAI()` call | `App.tsx:112` | **Mover** | `BaseAgent.ts:call()` interno |
| `callAI()` función | `aiProviderService.ts:13` | **Reusar** en backend | `server/services/aiProvider.ts` |
| Switch proveedores | `aiProviderService.ts:15` | **Reusar** en backend | Mismo switch, mismo archivo movido |
| Análisis de Riesgo | `App.tsx:151` | **Mover** | `server/agents/RiskAgent.ts` |
| Decisión CIO | `App.tsx:161` | **Mover** | `server/agents/CIOAgent.ts` |
| Formato salida | `agentConfigs.ts:43` | **Mantener + extender** | `server/agents/agentConfigs.ts` |
| `saveHistory()` call | `App.tsx:172` | **Eliminar del frontend** | Backend lo hace internamente |
| Regex recomendación | `App.tsx:178` | **Mover** | `CIOAgent.ts:parseRecommendation()` |
| Lógica dual persistencia | `api.ts:94` | **Eliminar localStorage AI** | Backend siempre persiste |
| `fetch()` historial | `api.ts:101` | **Mantener** + agregar JWT header | `api.ts` con interceptor auth |
| `INSERT` SQLite | `index.ts:59` | **Migrar** a PostgreSQL | `server/db/queries.ts` con Drizzle |
| Estado proyectos | `App.tsx:40` | **Mantener** en frontend | Sin cambio |
| `loadProjects()` | `App.tsx:65` | **Mantener** + auth header | `api.ts` |
| Endpoint proyectos | `index.ts:12` | **Mantener** + proteger con JWT | `server/routes/projects.ts` |
| `saveCredentials()` | `App.tsx:532` | **Mantener** - API Key cifrada en backend | `server/routes/credentials.ts` |

---

## SPRINTS DE EJECUCIÓN

---

## SPRINT 1 — Seguridad Base (Semana 1-2)
> **Objetivo:** Que ninguna API key salga jamás del servidor.

### Tarea 1.1 — Instalar dependencias nuevas

```bash
npm install jsonwebtoken bcryptjs zod helmet express-rate-limit
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### Tarea 1.2 — Variables de entorno

Crear/actualizar `.env` (nunca en git):
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<256-bit-hex>
JWT_REFRESH_SECRET=<256-bit-hex-diferente>
MASTER_ENCRYPTION_KEY=<256-bit-hex>

DATABASE_URL=postgresql://skynet:password@localhost:5432/skynet
```

Actualizar `.env.example` con las mismas claves pero sin valores.

### Tarea 1.3 — Crear `server/services/encryption.ts`

**Propósito:** Cifrar/descifrar API keys antes de guardar en DB.

```typescript
// server/services/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex');

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Formato: iv:tag:ciphertext (todo en base64, separado por :)
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(ciphertext: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
```

### Tarea 1.4 — Crear `server/middleware/auth.ts`

```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

### Tarea 1.5 — Crear `server/middleware/validation.ts`

```typescript
// server/middleware/validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const analysisSchema = z.object({
  projectId: z.number().int().positive(),
  asset: z.string().min(1).max(100).trim(),
  providerOverride: z.enum(['gemini', 'anthropic', 'openai']).optional(),
});

export const credentialSchema = z.object({
  provider: z.enum(['gemini', 'anthropic', 'openai']),
  api_key: z.string().min(10).max(500),
  model_name: z.string().max(100).optional(),
});

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}
```

### Tarea 1.6 — Agregar auth route y tabla users

**Agregar tabla `users` al schema de DB** (`server/db.ts`):
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Crear `server/routes/auth.ts`:**
```typescript
// server/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    res.json({ token });
  } catch {
    res.status(409).json({ error: 'El email ya está registrado' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  res.json({ token });
});

export default router;
```

### Tarea 1.7 — Actualizar `server/index.ts`

Agregar en el servidor existente:
```typescript
// Agregar imports
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

// Agregar ANTES de las rutas existentes
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api/auth', authRouter);

// Agregar requireAuth a TODAS las rutas existentes /api/projects y /api/...
// Ejemplo:
app.get('/api/projects', requireAuth, (req, res) => { ... });
```

### Tarea 1.8 — Cifrar API keys al guardar (modificar `index.ts:34`)

En el endpoint `POST /api/projects/:projectId/credentials`:
```typescript
import { encrypt, decrypt } from './services/encryption.js';

// Al GUARDAR: cifrar antes de insertar en DB
const encrypted_key = encrypt(api_key);
db.prepare('INSERT INTO credentials ... VALUES (?, ?, ?, ?)').run(projectId, provider, encrypted_key, model_name);

// Al LEER para uso interno: descifrar
const cred = db.prepare('SELECT * FROM credentials WHERE ...').get(...) as any;
const real_api_key = decrypt(cred.api_key);

// Al LEER para el frontend: NUNCA enviar la key real, solo confirmar que existe
app.get('/api/projects/:projectId/credentials', requireAuth, (req, res) => {
  const credentials = db.prepare('SELECT id, project_id, provider, model_name FROM credentials WHERE project_id = ?').all(req.params.projectId);
  // Nótese: NO se incluye api_key en la respuesta
  res.json(credentials.map(c => ({ ...c, configured: true })));
});
```

### Tarea 1.9 — Actualizar frontend `src/services/api.ts`

Agregar interceptor de autenticación:
```typescript
// Al inicio de api.ts
let authToken: string | null = localStorage.getItem('skynet_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('skynet_token', token);
}

// Helper para headers
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
}

// Usar authHeaders() en todos los fetch() de api.ts
```

**ENTREGABLE SPRINT 1:** La app funciona igual visualmente, pero las API keys ya no viajan al browser y todas las rutas requieren token.

---

## SPRINT 2 — Multi-Agente Real en Backend (Semana 3-4)
> **Objetivo:** Mover `runAnalysis` (App.tsx:127) y `runStep` (App.tsx:92) completamente al servidor, con streaming SSE.

### Tarea 2.1 — Mover `aiProviderService.ts` al backend

```bash
# El archivo src/services/aiProviderService.ts se COPIA a:
cp src/services/aiProviderService.ts server/services/aiProvider.ts

# Luego ELIMINAR del frontend:
rm src/services/aiProviderService.ts
```

En `server/services/aiProvider.ts` — el contenido es IDÉNTICO al actual `aiProviderService.ts:1-56`, no cambiar la lógica del switch. Solo agregar soporte de streaming (ver Tarea 2.4).

Eliminar del `src/App.tsx`:
```typescript
// BORRAR estas líneas de App.tsx:
import { callAI, AIProvider } from './services/aiProviderService';  // línea 10
```

### Tarea 2.2 — Crear `server/agents/BaseAgent.ts`

Este archivo reemplaza y mejora el `runStep` de `App.tsx:92-125`:

```typescript
// server/agents/BaseAgent.ts
import { decrypt } from '../services/encryption.js';
import { callAI, callAIStream } from '../services/aiProvider.js';

export interface AgentResult {
  agentId: string;
  report: string;
  provider: string;
  model: string;
  durationMs: number;
  inputTokensEstimate: number;
}

export interface AgentCredential {
  provider: 'gemini' | 'anthropic' | 'openai';
  api_key_encrypted: string;
  model_name: string;
}

export abstract class BaseAgent {
  abstract agentId: string;
  abstract systemInstruction: string;

  // Reemplaza runStep de App.tsx:92
  // Mejora: exponential backoff real (antes era 1000ms fijo)
  async run(
    prompt: string,
    credential: AgentCredential,
    onChunk?: (chunk: string) => void,  // NUEVO: callback de streaming
    maxRetries = 3
  ): Promise<AgentResult> {
    const start = Date.now();
    const apiKey = decrypt(credential.api_key_encrypted);  // NUEVO: descifrar aquí

    const config = {
      provider: credential.provider,
      apiKey,
      model: credential.model_name,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let report: string;

        if (onChunk) {
          // NUEVO: modo streaming
          report = await callAIStream(config, prompt, this.systemInstruction, onChunk);
        } else {
          report = await callAI(config, prompt, this.systemInstruction);
        }

        return {
          agentId: this.agentId,
          report,
          provider: credential.provider,
          model: credential.model_name,
          durationMs: Date.now() - start,
          inputTokensEstimate: prompt.length / 4,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s (mejora sobre App.tsx:121 que era lineal)
          const waitMs = 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, waitMs));
        }
      }
    }

    throw lastError ?? new Error(`${this.agentId} falló tras ${maxRetries} intentos`);
  }
}
```

### Tarea 2.3 — Crear los 4 agentes individuales

```typescript
// server/agents/ResearcherAgent.ts
import { BaseAgent } from './BaseAgent.js';

export class ResearcherAgent extends BaseAgent {
  agentId = 'researcher';
  systemInstruction = `Eres un Investigador de Mercado Senior...`; // Mismo texto de agentConfigs.ts
}

// server/agents/QuantAgent.ts
export class QuantAgent extends BaseAgent {
  agentId = 'quant';
  systemInstruction = `Eres un Analista Cuantitativo...`; // Mismo texto de agentConfigs.ts
}

// server/agents/RiskAgent.ts
export class RiskAgent extends BaseAgent {
  agentId = 'risk';
  systemInstruction = `Eres un Gestor de Riesgos...`; // Mismo texto de agentConfigs.ts
}

// server/agents/CIOAgent.ts
import { BaseAgent } from './BaseAgent.js';

export class CIOAgent extends BaseAgent {
  agentId = 'cio';
  systemInstruction = `Eres el Director de Inversiones (CIO)...`; // Mismo texto de agentConfigs.ts

  // Mismo regex de App.tsx:178, movido aquí
  parseRecommendation(report: string): string {
    return report.match(/RECOMENDACIÓN:\s*(\w+)/i)?.[1]?.toUpperCase() ?? 'UNKNOWN';
  }
}
```

### Tarea 2.4 — Agregar streaming a `server/services/aiProvider.ts`

Agregar función `callAIStream` junto a `callAI` existente:

```typescript
// Agregar a server/services/aiProvider.ts
export async function callAIStream(
  config: AIConfig,
  prompt: string,
  systemInstruction: string | undefined,
  onChunk: (chunk: string) => void
): Promise<string> {
  let fullText = '';

  switch (config.provider) {
    case 'gemini': {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const stream = await ai.models.generateContentStream({
        model: config.model || 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction },
      });
      for await (const chunk of stream) {
        const text = chunk.text ?? '';
        fullText += text;
        if (text) onChunk(text);
      }
      break;
    }
    case 'anthropic': {
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      const stream = anthropic.messages.stream({
        model: config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemInstruction,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          onChunk(event.delta.text);
        }
      }
      break;
    }
    case 'openai': {
      const openai = new OpenAI({ apiKey: config.apiKey });
      const stream = await openai.chat.completions.create({
        model: config.model || 'gpt-4o',
        stream: true,
        messages: [
          { role: 'system', content: systemInstruction ?? '' },
          { role: 'user', content: prompt },
        ],
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        fullText += text;
        if (text) onChunk(text);
      }
      break;
    }
  }

  return fullText;
}
```

### Tarea 2.5 — Crear `server/orchestrator/AnalysisOrchestrator.ts`

Este archivo reemplaza `runAnalysis` de `App.tsx:127-187`.
El patrón `Promise.all` de `App.tsx:148` se mantiene intacto, solo se mueve:

```typescript
// server/orchestrator/AnalysisOrchestrator.ts
import { ResearcherAgent } from '../agents/ResearcherAgent.js';
import { QuantAgent } from '../agents/QuantAgent.js';
import { RiskAgent } from '../agents/RiskAgent.js';
import { CIOAgent } from '../agents/CIOAgent.js';

export type SSEEmitter = (event: string, data: object) => void;

export class AnalysisOrchestrator {
  private researcher = new ResearcherAgent();
  private quant = new QuantAgent();
  private risk = new RiskAgent();
  private cio = new CIOAgent();

  async run(
    asset: string,
    credential: any,  // credential descifrada de DB
    emit: SSEEmitter  // función para enviar eventos SSE al frontend
  ) {
    emit('analysis_started', { asset, timestamp: new Date().toISOString() });

    // ── FASE 1: Paralelo (replica exacta de App.tsx:136-148 pero en backend) ──
    emit('agent_start', { agent: 'researcher' });
    emit('agent_start', { agent: 'quant' });

    const [researcherResult, quantResult] = await Promise.all([
      this.researcher.run(
        `Analiza el activo: ${asset}. Encuentra las últimas noticias, informes de ganancias y sentimiento del mercado.`,
        credential,
        (chunk) => emit('agent_chunk', { agent: 'researcher', chunk })  // NUEVO: streaming
      ),
      this.quant.run(
        `Analiza el activo: ${asset}. Encuentra datos de precio recientes, indicadores técnicos y volumen.`,
        credential,
        (chunk) => emit('agent_chunk', { agent: 'quant', chunk })
      ),
    ]);

    emit('agent_done', { agent: 'researcher', report: researcherResult.report, durationMs: researcherResult.durationMs });
    emit('agent_done', { agent: 'quant', report: quantResult.report, durationMs: quantResult.durationMs });

    // ── FASE 2: Risk (replica de App.tsx:151-158) ──
    emit('agent_start', { agent: 'risk' });

    const riskResult = await this.risk.run(
      `Revisa estos informes para ${asset}:
      REPORTE INVESTIGADOR: ${researcherResult.report}
      REPORTE CUANTITATIVO: ${quantResult.report}
      Identifica riesgos y razones para NO invertir.`,
      credential,
      (chunk) => emit('agent_chunk', { agent: 'risk', chunk })
    );

    emit('agent_done', { agent: 'risk', report: riskResult.report, durationMs: riskResult.durationMs });

    // ── FASE 3: CIO (replica de App.tsx:161-168) ──
    emit('agent_start', { agent: 'cio' });

    const cioResult = await this.cio.run(
      `Basándote en estos informes para ${asset}:
      INVESTIGADOR: ${researcherResult.report}
      CUANTITATIVO: ${quantResult.report}
      RIESGOS: ${riskResult.report}
      Toma una decisión final y justifica.`,
      credential,
      (chunk) => emit('agent_chunk', { agent: 'cio', chunk })
    );

    const recommendation = this.cio.parseRecommendation(cioResult.report);

    emit('agent_done', { agent: 'cio', report: cioResult.report, durationMs: cioResult.durationMs });
    emit('analysis_complete', {
      recommendation,
      totalDurationMs: researcherResult.durationMs + quantResult.durationMs + riskResult.durationMs + cioResult.durationMs,
    });

    return {
      researcherReport: researcherResult.report,
      quantReport: quantResult.report,
      riskReport: riskResult.report,
      cioReport: cioResult.report,
      recommendation,
    };
  }
}
```

### Tarea 2.6 — Crear endpoint SSE en `server/routes/analysis.ts`

```typescript
// server/routes/analysis.ts
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validate, analysisSchema } from '../middleware/validation.js';
import { AnalysisOrchestrator } from '../orchestrator/AnalysisOrchestrator.js';
import { decrypt } from '../services/encryption.js';
import db from '../db.js';

const router = Router();
const orchestrator = new AnalysisOrchestrator();

router.post('/run', requireAuth, validate(analysisSchema), async (req: AuthRequest, res) => {
  const { projectId, asset, providerOverride } = req.body;

  // Obtener credential de DB (descifrada aquí, nunca en frontend)
  let cred = db.prepare(
    'SELECT * FROM credentials WHERE project_id = ?' + (providerOverride ? ' AND provider = ?' : ' LIMIT 1')
  ).get(...(providerOverride ? [projectId, providerOverride] : [projectId])) as any;

  if (!cred) return res.status(400).json({ error: 'No hay credenciales configuradas para este proyecto' });

  // Cabeceras SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Función emit que escribe eventos SSE al cliente
  const emit = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Descifrar la API key aquí en el backend (NUNCA llega al frontend)
  const decryptedCred = {
    provider: cred.provider,
    api_key_encrypted: cred.api_key,  // BaseAgent.run() llama decrypt() internamente
    model_name: cred.model_name,
  };

  try {
    const result = await orchestrator.run(asset, decryptedCred, emit);

    // Persistir en DB (replica de App.tsx:172, ahora en backend)
    db.prepare(`
      INSERT INTO analysis_history (project_id, asset, researcher_report, quant_report, risk_report, cio_report, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, asset, result.researcherReport, result.quantReport, result.riskReport, result.cioReport, result.recommendation);

  } catch (err: any) {
    emit('error', { message: err.message });
  } finally {
    res.end();
  }
});

export default router;
```

### Tarea 2.7 — Actualizar `server/index.ts` con nueva ruta

```typescript
import analysisRouter from './routes/analysis.js';
app.use('/api/analysis', analysisRouter);
```

### Tarea 2.8 — Modificar `App.tsx` para consumir SSE

Reemplazar toda la función `runAnalysis` (líneas 127-187) con:

```typescript
// REEMPLAZAR runAnalysis (App.tsx:127-187) con esto:
const runAnalysis = async () => {
  if (!asset.trim() || !currentProject) return;

  setIsAnalyzing(true);
  setError(null);
  // Mantener reset de agentes (App.tsx:132) igual
  setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: null })));

  const token = localStorage.getItem('skynet_token');

  // Usar fetch con POST para iniciar y recibir SSE en una sola conexión
  const response = await fetch(`/api/analysis/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ projectId: currentProject.id, asset, providerOverride: selectedProvider === 'auto' ? undefined : selectedProvider }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // Parser de SSE manual (el EventSource nativo no soporta POST)
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        handleSSEEvent(currentEvent, data);
      }
    }
  }
  setIsAnalyzing(false);
};

// Handler de eventos SSE
const handleSSEEvent = (event: string, data: any) => {
  switch (event) {
    case 'agent_start':
      updateAgent(data.agent, { status: 'running', result: '' });
      break;
    case 'agent_chunk':
      // NUEVO: streaming token a token — acumula en el estado del agente
      setAgents(prev => prev.map(a =>
        a.id === data.agent ? { ...a, result: (a.result ?? '') + data.chunk } : a
      ));
      break;
    case 'agent_done':
      updateAgent(data.agent, { status: 'complete', result: data.report });
      break;
    case 'analysis_complete':
      // Ya persistido en backend, solo actualizar UI si hace falta
      break;
    case 'error':
      setError(data.message);
      break;
  }
};
```

**TAMBIÉN:** Eliminar del `App.tsx`:
- Línea 10: `import { callAI, AIProvider } from './services/aiProviderService';` — ya no existe en frontend
- Función `getAgentConfig` (líneas 82-90) — ya no se usa
- Función `runStep` completa (líneas 92-125) — migrada a BaseAgent

**ENTREGABLE SPRINT 2:** Streaming token-a-token funcionando, AI calls solo en backend.

---

## SPRINT 3 — Migración a PostgreSQL (Semana 5)

### Tarea 3.1 — Instalar Drizzle ORM

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

### Tarea 3.2 — Crear schema en `server/db/schema.ts`

```typescript
// server/db/schema.ts
import { pgTable, serial, text, integer, timestamp, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const credentials = pgTable('credentials', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(),  // 'gemini' | 'anthropic' | 'openai'
  apiKeyEncrypted: text('api_key_encrypted').notNull(),  // cifrada con AES-256-GCM
  modelName: text('model_name'),
});

export const analysisHistory = pgTable('analysis_history', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  asset: text('asset').notNull(),
  researcherReport: text('researcher_report'),
  quantReport: text('quant_report'),
  riskReport: text('risk_report'),
  cioReport: text('cio_report'),
  recommendation: text('recommendation'),
  providerUsed: text('provider_used'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Tarea 3.3 — Configurar `drizzle.config.ts`

```typescript
// drizzle.config.ts (en raíz del proyecto)
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### Tarea 3.4 — Scripts de migración

```json
// Agregar a package.json scripts:
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

```bash
# Ejecutar para generar migración inicial:
npm run db:generate
npm run db:migrate
```

### Tarea 3.5 — Docker Compose para desarrollo local

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: skynet
      POSTGRES_USER: skynet
      POSTGRES_PASSWORD: dev_password_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U skynet"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

```bash
# Para iniciar DB en desarrollo:
docker compose up -d postgres
```

### Tarea 3.6 — Actualizar `server/db.ts`

Reemplazar la conexión SQLite con Drizzle + PostgreSQL:

```typescript
// server/db.ts — REEMPLAZAR todo el contenido con:
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export default db;
```

**ENTREGABLE SPRINT 3:** App corriendo sobre PostgreSQL con Drizzle ORM.

---

## SPRINT 4 — Herramientas Reales para Agentes (Semana 6)

### Tarea 4.1 — Instalar dependencias de datos

```bash
npm install yahoo-finance2
# NewsAPI: solo requiere fetch, no librería adicional
```

### Tarea 4.2 — Crear `server/tools/financialDataTool.ts`

```typescript
// server/tools/financialDataTool.ts
import yahooFinance from 'yahoo-finance2';

export async function getFinancialContext(ticker: string): Promise<string> {
  try {
    const [quote, history] = await Promise.all([
      yahooFinance.quote(ticker),
      yahooFinance.historical(ticker, { period1: '3mo', interval: '1d' }),
    ]);

    const recent = history.slice(-5);
    const priceChange5d = ((recent.at(-1)!.close - recent[0].close) / recent[0].close * 100).toFixed(2);

    return `
=== DATOS FINANCIEROS EN TIEMPO REAL (${ticker}) ===
Precio actual: $${quote.regularMarketPrice}
Cambio hoy: ${quote.regularMarketChangePercent?.toFixed(2)}%
Cambio 5 días: ${priceChange5d}%
Volumen: ${quote.regularMarketVolume?.toLocaleString()}
P/E Ratio: ${quote.trailingPE ?? 'N/A'}
Market Cap: $${((quote.marketCap ?? 0) / 1e9).toFixed(2)}B
52w High: $${quote.fiftyTwoWeekHigh} | 52w Low: $${quote.fiftyTwoWeekLow}
Analistas recomiendan: ${quote.averageAnalystRating ?? 'N/A'}
`;
  } catch {
    return ''; // Si falla, el agente trabaja sin datos externos
  }
}
```

### Tarea 4.3 — Inyectar datos reales en los prompts del Orchestrator

En `AnalysisOrchestrator.ts`, antes de correr los agentes:

```typescript
// Agregar al inicio de run():
import { getFinancialContext } from '../tools/financialDataTool.js';

// Intentar extraer ticker del asset (ej: "Apple (AAPL)" → "AAPL")
const tickerMatch = asset.match(/\(([A-Z]{1,5})\)/);
const financialContext = tickerMatch
  ? await getFinancialContext(tickerMatch[1])
  : '';

// Agregar financialContext al prompt del ResearcherAgent y QuantAgent:
const researcherPrompt = `${financialContext}
Analiza el activo: ${asset}...`;

const quantPrompt = `${financialContext}
Analiza el activo: ${asset}...`;
```

**ENTREGABLE SPRINT 4:** Los agentes reciben datos reales de precios y fundamentales.

---

## SPRINT 5 — UX Mejorada (Semana 7)

### Tarea 5.1 — Streaming visual en AgentCard

El streaming ya funciona desde Sprint 2 (acumula chunks en `agent.result`).
Solo ajustar el componente visual para mostrar cursor parpadeante:

En `App.tsx`, dentro del card de agente donde se renderiza el resultado:
```tsx
{agent.status === 'running' && agent.result && (
  <motion.div className="markdown-body text-zinc-300">
    <Markdown>{agent.result}</Markdown>
    {/* Cursor parpadeante mientras genera */}
    <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
  </motion.div>
)}
```

### Tarea 5.2 — Badge de proveedor y timer en AgentCard

En el header del AgentCard, junto al status badge existente:
```tsx
{agent.status === 'complete' && agent.durationMs && (
  <span className="text-[10px] text-zinc-500">{(agent.durationMs / 1000).toFixed(1)}s</span>
)}
{agent.providerUsed && (
  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">{agent.providerUsed}</span>
)}
```

Agregar `durationMs` y `providerUsed` al estado `AgentState` en App.tsx.

### Tarea 5.3 — Vista de Historial completa

Crear nuevo componente `HistoryView` en `App.tsx` (o archivo separado `src/components/HistoryView.tsx`):

```tsx
// Agregar tab "Historial" en el nav del header
// Cargar desde GET /api/projects/:projectId/history
// Tabla con columnas: Activo | Fecha | Recomendación | Proveedor | Acciones
// Click en fila → expandir los 4 reportes completos
// Filtro por: Activo (texto), Recomendación (select), Rango de fechas
```

### Tarea 5.4 — Exportar a Markdown

```tsx
// Botón en análisis completado
const exportMarkdown = (analysis: AnalysisResult) => {
  const content = `# Análisis: ${analysis.asset}\n**Fecha:** ${analysis.createdAt}\n**Recomendación:** ${analysis.recommendation}\n\n## Investigador\n${analysis.researcherReport}\n\n## Cuantitativo\n${analysis.quantReport}\n\n## Riesgos\n${analysis.riskReport}\n\n## CIO\n${analysis.cioReport}`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${analysis.asset}-${Date.now()}.md`;
  a.click();
};
```

**ENTREGABLE SPRINT 5:** UX con streaming visual, historial completo y exportación.

---

## SPRINT 6 — Infraestructura y Deploy (Semana 8)

### Tarea 6.1 — Dockerfile del backend

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S skynet && adduser -S skynet -G skynet
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER skynet
EXPOSE 3001
CMD ["node", "dist/server/index.js"]
```

### Tarea 6.2 — Actualizar `tsconfig.json` para compilar el servidor

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*", "server/**/*"]
}
```

### Tarea 6.3 — Actualizar `package.json` con script de build del servidor

```json
"scripts": {
  "build": "vite build && tsc -p tsconfig.server.json",
  "build:server": "tsc -p tsconfig.server.json",
  "start": "node dist/server/index.js",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

### Tarea 6.4 — GitHub Actions CI/CD actualizado

```yaml
# .github/workflows/deploy.yml
name: Deploy SKYNET

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: npx @railway/cli up --service skynet-backend
```

### Tarea 6.5 — Endpoint de health check

```typescript
// Agregar a server/index.ts ANTES de cualquier middleware de auth:
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### Tarea 6.6 — Deploy en Railway (recomendado)

1. Ir a [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Agregar PostgreSQL plugin desde Railway dashboard
3. Configurar variables de entorno en Railway:
   - `DATABASE_URL` (Railway lo provee automáticamente con el plugin)
   - `JWT_SECRET`, `MASTER_ENCRYPTION_KEY` (generar con `openssl rand -hex 32`)
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://tu-dominio.railway.app`
4. Ejecutar migraciones: `npm run db:migrate` (desde Railway CLI o en el deploy step)

**ENTREGABLE SPRINT 6:** App corriendo en producción con dominio HTTPS.

---

## SPRINT 7 — Testing (Semana 9)

### Tarea 7.1 — Instalar framework de tests

```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

### Tarea 7.2 — Tests unitarios de agentes (con mock de AI)

```typescript
// tests/unit/agents/ResearcherAgent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ResearcherAgent } from '../../../server/agents/ResearcherAgent';

// Mock de callAI para no gastar tokens en tests
vi.mock('../../../server/services/aiProvider', () => ({
  callAI: vi.fn().mockResolvedValue('Análisis mock del investigador'),
  callAIStream: vi.fn().mockImplementation(async (config, prompt, system, onChunk) => {
    onChunk('chunk1 ');
    onChunk('chunk2');
    return 'chunk1 chunk2';
  }),
}));

vi.mock('../../../server/services/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('fake-api-key'),
}));

describe('ResearcherAgent', () => {
  it('should return a report on success', async () => {
    const agent = new ResearcherAgent();
    const result = await agent.run('Test AAPL prompt', {
      provider: 'gemini',
      api_key_encrypted: 'encrypted-key',
      model_name: 'gemini-2.0-flash',
    });
    expect(result.report).toBe('Análisis mock del investigador');
    expect(result.agentId).toBe('researcher');
  });

  it('should retry on failure with exponential backoff', async () => {
    const { callAI } = await import('../../../server/services/aiProvider');
    vi.mocked(callAI)
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce('Éxito en segundo intento');

    const agent = new ResearcherAgent();
    const result = await agent.run('prompt', { provider: 'gemini', api_key_encrypted: 'x', model_name: 'gemini-2.0-flash' });
    expect(result.report).toBe('Éxito en segundo intento');
  });
});
```

### Tarea 7.3 — Test de integración del endpoint SSE

```typescript
// tests/integration/analysis.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index';

describe('POST /api/analysis/run', () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).post('/api/analysis/run').send({ projectId: 1, asset: 'AAPL' });
    expect(res.status).toBe(401);
  });

  it('should return 400 with invalid payload', async () => {
    const res = await request(app)
      .post('/api/analysis/run')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ asset: '' }); // projectId faltante
    expect(res.status).toBe(400);
  });
});
```

### Tarea 7.4 — Test del CIOAgent: parseRecommendation

```typescript
// tests/unit/agents/CIOAgent.test.ts
import { describe, it, expect } from 'vitest';
import { CIOAgent } from '../../../server/agents/CIOAgent';

describe('CIOAgent.parseRecommendation', () => {
  const agent = new CIOAgent();

  it('should parse COMPRAR', () => {
    expect(agent.parseRecommendation('RECOMENDACIÓN: COMPRAR porque...')).toBe('COMPRAR');
  });

  it('should parse VENDER', () => {
    expect(agent.parseRecommendation('RECOMENDACIÓN: VENDER')).toBe('VENDER');
  });

  it('should return UNKNOWN for malformed output', () => {
    expect(agent.parseRecommendation('No hay recomendación aquí')).toBe('UNKNOWN');
  });
});
```

**ENTREGABLE SPRINT 7:** CI verde con tests automáticos en cada PR.

---

## CHECKLIST FINAL DE GO-LIVE

```
SEGURIDAD
[ ] API keys nunca aparecen en respuestas del frontend
[ ] Todas las rutas /api/* (excepto /health y /api/auth/*) requieren JWT
[ ] API keys cifradas en DB con AES-256-GCM
[ ] Rate limiting activo: 100 req/15min global, 10 análisis/hora/usuario
[ ] Helmet headers configurados
[ ] CORS restringido a FRONTEND_URL

FUNCIONALIDAD
[ ] Streaming SSE funciona en Gemini, Anthropic y OpenAI
[ ] Promise.all paralelo funciona (researcher + quant simultáneos)
[ ] Retry con exponential backoff funciona
[ ] Datos de Yahoo Finance se inyectan en prompts
[ ] Historial persiste en PostgreSQL

INFRAESTRUCTURA
[ ] docker compose up levanta todo sin errores
[ ] npm run db:migrate no da errores en producción
[ ] GET /health responde 200 en producción
[ ] Variables de entorno configuradas en Railway/plataforma
[ ] HTTPS activo (Railway lo provee automáticamente)

TESTING
[ ] npm run lint pasa sin errores
[ ] Tests de agentes pasan (con mocks)
[ ] Tests de auth pasan
[ ] CI/CD verde en GitHub Actions
```

---

## ORDEN DE ARCHIVOS A CREAR/MODIFICAR

```
CREAR (nuevos):
server/services/encryption.ts
server/middleware/auth.ts
server/middleware/validation.ts
server/routes/auth.ts
server/routes/analysis.ts
server/agents/BaseAgent.ts
server/agents/ResearcherAgent.ts
server/agents/QuantAgent.ts
server/agents/RiskAgent.ts
server/agents/CIOAgent.ts
server/orchestrator/AnalysisOrchestrator.ts
server/tools/financialDataTool.ts
server/db/schema.ts
server/db/migrations/ (generado por drizzle-kit)
docker-compose.yml
drizzle.config.ts
tests/unit/agents/ResearcherAgent.test.ts
tests/unit/agents/CIOAgent.test.ts
tests/integration/analysis.test.ts

MODIFICAR (existentes):
server/index.ts          → agregar helmet, rate limit, auth, rutas nuevas
server/db.ts             → reemplazar SQLite por Drizzle + PostgreSQL
server/services/aiProvider.ts → nuevo (copia de src/services/aiProviderService.ts + callAIStream)
src/App.tsx              → reemplazar runAnalysis + runStep con SSE consumer
src/services/api.ts      → agregar auth headers en todos los fetch()
package.json             → nuevas dependencias y scripts
.env.example             → variables nuevas
.github/workflows/deploy.yml → CI/CD actualizado

ELIMINAR:
src/services/aiProviderService.ts  → movido al backend
```

---

*Este plan técnico es la fusión del análisis de flujo de código + análisis arquitectónico.
Cada tarea referencia el origen exacto en el código actual y su destino final.*
