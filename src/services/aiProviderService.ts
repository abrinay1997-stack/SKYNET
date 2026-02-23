export type AIProvider = 'gemini' | 'anthropic' | 'openai';

interface AnalysisRequest {
  projectId: number;
  provider: AIProvider;
  prompt: string;
  systemInstruction?: string;
}

export async function callAIBackend(request: AnalysisRequest): Promise<string> {
  const token = localStorage.getItem('skynet_token');
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  try {
    const res = await fetch(`${API_BASE}/analysis/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to call AI via backend');
    }

    const data = await res.json();
    return data.response;
  } catch (error: any) {
    console.error('Error calling backend AI:', error);
    throw error;
  }
}
