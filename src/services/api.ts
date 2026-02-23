const API_BASE = 'http://localhost:3001/api';

// Helper to determine if we should use local storage
async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/projects`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

let useLocalStorage = false;
checkBackend().then(available => {
  useLocalStorage = !available;
  console.log(useLocalStorage ? 'Usando LocalStorage (Modo Estático)' : 'Conectado al Backend Express');
});

// LocalStorage Mock Logic
const ls = {
  get: (key: string) => JSON.parse(localStorage.getItem(`invest_ai_${key}`) || '[]'),
  set: (key: string, data: any) => localStorage.setItem(`invest_ai_${key}`, JSON.stringify(data)),
};

export const api = {
  async getProjects() {
    if (useLocalStorage) return ls.get('projects');
    try {
      const res = await fetch(`${API_BASE}/projects`);
      return res.json();
    } catch {
      useLocalStorage = true;
      return ls.get('projects');
    }
  },
  async createProject(name: string, description: string) {
    if (useLocalStorage) {
      const projects = ls.get('projects');
      const newProject = { id: Date.now(), name, description, created_at: new Date().toISOString() };
      ls.set('projects', [...projects, newProject]);
      return newProject;
    }
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    return res.json();
  },
  async deleteProject(id: number) {
    if (useLocalStorage) {
      const projects = ls.get('projects').filter((p: any) => p.id !== id);
      ls.set('projects', projects);
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getCredentials(projectId: number) {
    if (useLocalStorage) {
      return ls.get('credentials').filter((c: any) => c.project_id === projectId);
    }
    const res = await fetch(`${API_BASE}/projects/${projectId}/credentials`);
    return res.json();
  },
  async saveCredentials(projectId: number, provider: string, apiKey: string, modelName: string) {
    if (useLocalStorage) {
      const credentials = ls.get('credentials');
      const existingIdx = credentials.findIndex((c: any) => c.project_id === projectId && c.provider === provider);
      const newCred = { id: Date.now(), project_id: projectId, provider, api_key: apiKey, model_name: modelName };

      if (existingIdx > -1) {
        credentials[existingIdx] = newCred;
        ls.set('credentials', credentials);
      } else {
        ls.set('credentials', [...credentials, newCred]);
      }
      return newCred;
    }
    const res = await fetch(`${API_BASE}/projects/${projectId}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey, model_name: modelName }),
    });
    return res.json();
  },
  async getHistory(projectId: number) {
    if (useLocalStorage) {
      return ls.get('history').filter((h: any) => h.project_id === projectId);
    }
    const res = await fetch(`${API_BASE}/projects/${projectId}/history`);
    return res.json();
  },
  async saveHistory(projectId: number, data: any) {
    if (useLocalStorage) {
      const history = ls.get('history');
      const newHistory = { ...data, id: Date.now(), project_id: projectId, created_at: new Date().toISOString() };
      ls.set('history', [...history, newHistory]);
      return { id: newHistory.id };
    }
    const res = await fetch(`${API_BASE}/projects/${projectId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
};
