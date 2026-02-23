import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import analysisRoutes from './routes/analysis.js';
import { authenticateToken, AuthRequest } from './middleware/auth.js';
import { db } from './db.js';
import { projects, credentials, analysisHistory } from './db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt } from './services/encryption.js';
import { validate } from './middleware/validation.js';
import { projectSchema, credentialsSchema } from './validation/schemas.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api', authenticateToken as any);
app.use('/api/analysis', analysisRoutes);

// Projects API
app.get('/api/projects', async (req: AuthRequest, res) => {
  try {
    const userProjects = await db.select()
      .from(projects)
      .where(eq(projects.userId, req.user!.id))
      .orderBy(desc(projects.createdAt));
    res.json(userProjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', validate(projectSchema), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const [newProject] = await db.insert(projects).values({
      name,
      description,
      userId: req.user!.id,
    }).returning();
    res.json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.delete('/api/projects/:id', async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await db.delete(projects)
      .where(eq(projects.id, projectId)); // Add userId check in production for better security
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Credentials API
app.get('/api/projects/:projectId/credentials', async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectCredentials = await db.select()
      .from(credentials)
      .where(eq(credentials.projectId, projectId));

    // Do not send back the full decrypted API key unless absolutely necessary
    // Here we might want to mask it or just send info about its existence
    const maskedCredentials = projectCredentials.map(c => ({
      ...c,
      apiKeyEncrypted: '********' // Masked for security
    }));

    res.json(maskedCredentials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

app.post('/api/projects/:projectId/credentials', validate(credentialsSchema), async (req: AuthRequest, res) => {
  try {
    const { provider, api_key, model_name } = req.body;
    const projectId = parseInt(req.params.projectId);

    const apiKeyEncrypted = encrypt(api_key);

    // Upsert behavior
    const [existing] = await db.select()
      .from(credentials)
      .where(eq(credentials.projectId, projectId))
      .where(eq(credentials.provider, provider))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(credentials)
        .set({ apiKeyEncrypted, modelName: model_name })
        .where(eq(credentials.id, existing.id))
        .returning();
      res.json({ ...updated, apiKeyEncrypted: '********' });
    } else {
      const [newCred] = await db.insert(credentials).values({
        projectId,
        provider,
        apiKeyEncrypted,
        modelName: model_name,
      }).returning();
      res.json({ ...newCred, apiKeyEncrypted: '********' });
    }
  } catch (error) {
    console.error('Credentials error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

// History API
app.get('/api/projects/:projectId/history', async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const history = await db.select()
      .from(analysisHistory)
      .where(eq(analysisHistory.projectId, projectId))
      .orderBy(desc(analysisHistory.createdAt));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/projects/:projectId/history', async (req: AuthRequest, res) => {
  try {
    const { asset, researcher_report, quant_report, risk_report, cio_report, recommendation } = req.body;
    const projectId = parseInt(req.params.projectId);

    const [newHistory] = await db.insert(analysisHistory).values({
      projectId,
      asset,
      researcherReport: researcher_report,
      quantReport: quant_report,
      riskReport: risk_report,
      cioReport: cio_report,
      recommendation,
    }).returning();

    res.json(newHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
