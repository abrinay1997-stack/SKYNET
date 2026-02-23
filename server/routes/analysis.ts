import express from 'express';
import { db } from '../db.js';
import { credentials } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../services/encryption.js';
import { callAI, AIProvider } from '../services/aiProvider.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.post('/run', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { projectId, provider, prompt, systemInstruction } = req.body;

    if (!projectId || !provider || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get credentials for the project and provider
    const [cred] = await db.select()
      .from(credentials)
      .where(eq(credentials.projectId, projectId))
      .where(eq(credentials.provider, provider))
      .limit(1);

    if (!cred) {
      return res.status(404).json({ error: `Credentials not found for provider ${provider}` });
    }

    const apiKey = decrypt(cred.apiKeyEncrypted);
    const model = cred.modelName || '';

    const response = await callAI({
      provider: provider as AIProvider,
      apiKey,
      model,
    }, prompt, systemInstruction);

    res.json({ response });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
