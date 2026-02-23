import { Loader2, AlertTriangle } from 'lucide-react';
import { AgentState } from '../types';

interface AgentNodeProps {
  agent: AgentState;
  onClick: () => void;
}

export function AgentNode({ agent, onClick }: AgentNodeProps) {
  const isRunning = agent.status === 'running';
  const isComplete = agent.status === 'complete';
  const isError = agent.status === 'error';
  
  return (
    <button
      onClick={onClick}
      disabled={agent.status === 'idle'}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all w-48
        ${agent.status === 'idle' ? 'border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed' : ''}
        ${isRunning ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''}
        ${isComplete ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer' : ''}
        ${isError ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 cursor-pointer' : ''}
      `}
    >
      <div className={`p-3 rounded-full mb-3 
        ${isRunning ? 'bg-amber-500/20 text-amber-400 animate-pulse' : ''}
        ${isComplete ? 'bg-emerald-500/20 text-emerald-400' : ''}
        ${isError ? 'bg-red-500/20 text-red-400' : ''}
        ${agent.status === 'idle' ? 'bg-zinc-800 text-zinc-500' : ''}
      `}>
        {isError ? <AlertTriangle className="w-6 h-6" /> : isRunning ? <Loader2 className="w-6 h-6 animate-spin" /> : agent.icon}
      </div>
      <h3 className="font-medium text-sm text-zinc-100 text-center">{agent.name}</h3>
      <p className="text-xs text-zinc-400 text-center mt-1">{agent.role}</p>
      
      {/* Connection points */}
      <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-zinc-700" />
    </button>
  );
}
