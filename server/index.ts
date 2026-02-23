import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Projects API
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description);
  res.json({ id: result.lastInsertRowid, name, description });
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Credentials API
app.get('/api/projects/:projectId/credentials', (req, res) => {
  const credentials = db.prepare('SELECT * FROM credentials WHERE project_id = ?').all(req.params.projectId);
  res.json(credentials);
});

app.post('/api/projects/:projectId/credentials', (req, res) => {
  const { provider, api_key, model_name } = req.body;
  const { projectId } = req.params;

  // Upsert-like behavior for provider per project
  const existing = db.prepare('SELECT id FROM credentials WHERE project_id = ? AND provider = ?').get(projectId, provider) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE credentials SET api_key = ?, model_name = ? WHERE id = ?').run(api_key, model_name, existing.id);
    res.json({ id: existing.id, project_id: projectId, provider, api_key, model_name });
  } else {
    const result = db.prepare('INSERT INTO credentials (project_id, provider, api_key, model_name) VALUES (?, ?, ?, ?)').run(projectId, provider, api_key, model_name);
    res.json({ id: result.lastInsertRowid, project_id: projectId, provider, api_key, model_name });
  }
});

// History API
app.get('/api/projects/:projectId/history', (req, res) => {
  const history = db.prepare('SELECT * FROM analysis_history WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
  res.json(history);
});

app.post('/api/projects/:projectId/history', (req, res) => {
  const { asset, researcher_report, quant_report, risk_report, cio_report, recommendation } = req.body;
  const { projectId } = req.params;
  const result = db.prepare(`
    INSERT INTO analysis_history (project_id, asset, researcher_report, quant_report, risk_report, cio_report, recommendation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, asset, researcher_report, quant_report, risk_report, cio_report, recommendation);
  res.json({ id: result.lastInsertRowid });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
