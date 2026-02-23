const API_BASE = 'http://localhost:3001/api';

export const api = {
  async getProjects() {
    const res = await fetch(`${API_BASE}/projects`);
    return res.json();
  },
  async createProject(name: string, description: string) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    return res.json();
  },
  async deleteProject(id: number) {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    return res.json();
  },
  async getCredentials(projectId: number) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/credentials`);
    return res.json();
  },
  async saveCredentials(projectId: number, provider: string, apiKey: string, modelName: string) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey, model_name: modelName }),
    });
    return res.json();
  },
  async getHistory(projectId: number) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/history`);
    return res.json();
  },
  async saveHistory(projectId: number, data: any) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
};
