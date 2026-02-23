const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getHeaders() {
  const token = localStorage.getItem('skynet_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Handle unauthorized - maybe redirect to login or clear token
    localStorage.removeItem('skynet_token');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  async login(credentials: any) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    localStorage.setItem('skynet_token', data.token);
    return data;
  },
  async register(credentials: any) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  logout() {
    localStorage.removeItem('skynet_token');
  },
  isAuthenticated() {
    return !!localStorage.getItem('skynet_token');
  },

  // Projects
  async getProjects() {
    return request('/projects');
  },
  async createProject(name: string, description: string) {
    return request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },
  async deleteProject(id: number) {
    return request(`/projects/${id}`, { method: 'DELETE' });
  },

  // Credentials
  async getCredentials(projectId: number) {
    return request(`/projects/${projectId}/credentials`);
  },
  async saveCredentials(projectId: number, provider: string, apiKey: string, modelName: string) {
    return request(`/projects/${projectId}/credentials`, {
      method: 'POST',
      body: JSON.stringify({ provider, api_key: apiKey, model_name: modelName }),
    });
  },

  // History
  async getHistory(projectId: number) {
    return request(`/projects/${projectId}/history`);
  },
  async saveHistory(projectId: number, data: any) {
    return request(`/projects/${projectId}/history`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
