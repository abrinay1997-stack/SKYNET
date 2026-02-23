import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Activity, ShieldAlert, Briefcase, Loader2, Play } from 'lucide-react';
import Markdown from 'react-markdown';
import { runMarketResearcher, runQuantitativeAnalyst, runRiskManager, runCIO } from './services/geminiService';

type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

interface AgentState {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  status: AgentStatus;
  result: string | null;
}

export default function App() {
  const [asset, setAsset] = useState('Apple (AAPL)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'researcher', name: 'Market Researcher', role: 'Fundamental Analysis & Sentiment', icon: <Search className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'quant', name: 'Quant Analyst', role: 'Technical Indicators & Price Action', icon: <Activity className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'risk', name: 'Risk Manager', role: "Devil's Advocate & Macro Risks", icon: <ShieldAlert className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'cio', name: 'Chief Investment Officer', role: 'Final Decision Maker', icon: <Briefcase className="w-5 h-5" />, status: 'idle', result: null },
  ]);

  const updateAgent = (id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const runAnalysis = async () => {
    if (!asset.trim()) return;
    
    setIsAnalyzing(true);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: null })));

    try {
      // Phase 1: Parallel Data Gathering
      updateAgent('researcher', { status: 'running' });
      updateAgent('quant', { status: 'running' });
      
      const [researcherReport, quantReport] = await Promise.all([
        runMarketResearcher(asset).then(res => {
          updateAgent('researcher', { status: 'complete', result: res });
          return res;
        }),
        runQuantitativeAnalyst(asset).then(res => {
          updateAgent('quant', { status: 'complete', result: res });
          return res;
        })
      ]);

      // Phase 2: Risk Analysis
      updateAgent('risk', { status: 'running' });
      const riskReport = await runRiskManager(asset, researcherReport, quantReport);
      updateAgent('risk', { status: 'complete', result: riskReport });

      // Phase 3: CIO Decision
      updateAgent('cio', { status: 'running' });
      const cioReport = await runCIO(asset, researcherReport, quantReport, riskReport);
      updateAgent('cio', { status: 'complete', result: cioReport });

    } catch (error) {
      console.error("Analysis failed:", error);
      // In a real app, we'd handle errors per agent or globally
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">AI Investment Committee</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="e.g. Bitcoin, AAPL, Tesla"
              className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all w-64"
              disabled={isAnalyzing}
            />
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || !asset.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-xl border ${agent.id === 'cio' ? 'border-emerald-500/30 bg-emerald-500/5 lg:col-span-2' : 'border-zinc-800 bg-zinc-900/30'} overflow-hidden flex flex-col`}
            >
              {/* Agent Header */}
              <div className={`px-5 py-4 border-b ${agent.id === 'cio' ? 'border-emerald-500/20' : 'border-zinc-800'} flex items-center justify-between bg-zinc-900/50`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${agent.id === 'cio' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {agent.icon}
                  </div>
                  <div>
                    <h2 className="font-medium text-zinc-100">{agent.name}</h2>
                    <p className="text-xs text-zinc-500">{agent.role}</p>
                  </div>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {agent.status === 'running' && (
                    <span className="flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Working...
                    </span>
                  )}
                  {agent.status === 'complete' && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                      Completed
                    </span>
                  )}
                  {agent.status === 'idle' && (
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                      Waiting
                    </span>
                  )}
                </div>
              </div>

              {/* Agent Content */}
              <div className="p-5 flex-1 overflow-y-auto max-h-[400px] prose prose-invert prose-sm prose-emerald max-w-none">
                {agent.status === 'idle' && !agent.result && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12">
                    {agent.icon}
                    <p className="mt-2 text-sm">Waiting for analysis to start...</p>
                  </div>
                )}
                
                {agent.status === 'running' && !agent.result && (
                  <div className="h-full flex flex-col items-center justify-center text-amber-500/50 py-12">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm animate-pulse">Gathering data and analyzing...</p>
                  </div>
                )}

                {agent.result && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="markdown-body text-zinc-300"
                  >
                    <Markdown>{agent.result}</Markdown>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
