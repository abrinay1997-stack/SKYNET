import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { AgentState } from '../types';

interface AgentModalProps {
  agent: AgentState;
  onClose: () => void;
}

export function AgentModal({ agent, onClose }: AgentModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400">
              {agent.icon}
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">{agent.name}</h2>
              <p className="text-xs text-zinc-500">{agent.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-sm prose-emerald max-w-none">
          {agent.status === 'error' ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
              <h3 className="text-red-400 font-bold mb-2">Error en el Agente</h3>
              <p className="text-sm">{agent.result}</p>
            </div>
          ) : agent.result ? (
            <div className="markdown-body">
              <Markdown>{agent.result}</Markdown>
              {agent.status === 'running' && (
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1 align-middle" />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Generando reporte...
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
