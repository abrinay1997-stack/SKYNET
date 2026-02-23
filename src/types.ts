import { ReactNode } from 'react';

export type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

export interface AgentState {
  id: string;
  name: string;
  role: string;
  icon: ReactNode;
  status: AgentStatus;
  result: string | null;
}
