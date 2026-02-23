import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Briefcase, Loader2, Play, ArrowDown, Search, Globe, ShieldAlert, Radar, Zap, X, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import Markdown from 'react-markdown';
import { AgentNode } from './components/AgentNode';
import { AgentModal } from './components/AgentModal';
import { SettingsModal } from './components/SettingsModal';
import { useTradingAnalysis } from './hooks/useTradingAnalysis';
import { getMarketOpportunities } from './services/geminiService';

interface Opportunity {
  asset: string;
  type: string;
  catalyst: string;
  sentiment: string;
}

export default function App() {
  const [asset, setAsset] = useState('Bitcoin (BTC)');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  const { isAnalyzing, runAnalysis, getAgent } = useTradingAnalysis();

  const handleScanMarket = async () => {
    setIsScanning(true);
    setShowRadar(true);
    try {
      const opps = await getMarketOpportunities();
      setOpportunities(opps);
    } catch (error) {
      console.error("Failed to scan market", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectOpportunity = (selectedAsset: string) => {
    setAsset(selectedAsset);
    setShowRadar(false);
    setSelectedAgentId(null);
    runAnalysis(selectedAsset, investmentAmount);
  };

  const selectedAgent = selectedAgentId ? getAgent(selectedAgentId) : null;
  const cioAgent = getAgent('cio');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Terminal de Trading IA</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Configuración de IA"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <button
              onClick={handleScanMarket}
              disabled={isAnalyzing || isScanning}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Radar className="w-4 h-4 text-amber-500" />}
              Radar de Oportunidades
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="Activo (ej. BTC, AAPL)"
              className="bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all w-48"
              disabled={isAnalyzing}
            />
            <input
              type="text"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="Monto a invertir (ej. $1000)"
              className="bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all w-48"
              disabled={isAnalyzing}
            />
            <button
              onClick={() => {
                setSelectedAgentId(null);
                runAnalysis(asset, investmentAmount);
              }}
              disabled={isAnalyzing || !asset.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isAnalyzing ? 'Ejecutando...' : 'Generar Señal'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Pipeline Layout */}
      <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center">
        
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Comité de Inversión IA</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Arquitectura de "Fusión de Sensores" en 4 niveles. Los sub-agentes filtran el ruido, los Jefes de Departamento sintetizan la señal, Riesgo hace un stress-test y el CIO toma la decisión final.
          </p>
        </div>

        {/* TIER 1 & 2: Departments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl relative z-0">
          
          {/* Fundamental Department */}
          <div className="flex flex-col items-center gap-4 bg-zinc-900/20 p-6 rounded-3xl border border-zinc-800/50 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Search className="w-3 h-3" /> Dpto. Fundamental
            </div>
            <div className="flex gap-4 w-full justify-center">
              <AgentNode agent={getAgent('sentiment')} onClick={() => setSelectedAgentId('sentiment')} />
              <AgentNode agent={getAgent('fundamentals')} onClick={() => setSelectedAgentId('fundamentals')} />
            </div>
            <ArrowDown className="w-5 h-5 text-zinc-600" />
            <AgentNode agent={getAgent('lead_researcher')} onClick={() => setSelectedAgentId('lead_researcher')} />
          </div>

          {/* Quant Department */}
          <div className="flex flex-col items-center gap-4 bg-zinc-900/20 p-6 rounded-3xl border border-zinc-800/50 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Dpto. Cuantitativo
            </div>
            <div className="flex gap-4 w-full justify-center">
              <AgentNode agent={getAgent('technicals')} onClick={() => setSelectedAgentId('technicals')} />
              <AgentNode agent={getAgent('liquidity')} onClick={() => setSelectedAgentId('liquidity')} />
            </div>
            <ArrowDown className="w-5 h-5 text-zinc-600" />
            <AgentNode agent={getAgent('lead_quant')} onClick={() => setSelectedAgentId('lead_quant')} />
          </div>

          {/* Macro Department */}
          <div className="flex flex-col items-center gap-4 bg-zinc-900/20 p-6 rounded-3xl border border-zinc-800/50 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Dpto. Macro
            </div>
            <div className="flex gap-4 w-full justify-center">
              <AgentNode agent={getAgent('monetary')} onClick={() => setSelectedAgentId('monetary')} />
              <AgentNode agent={getAgent('geopolitics')} onClick={() => setSelectedAgentId('geopolitics')} />
            </div>
            <ArrowDown className="w-5 h-5 text-zinc-600" />
            <AgentNode agent={getAgent('lead_macro')} onClick={() => setSelectedAgentId('lead_macro')} />
          </div>

        </div>

        {/* Connection to Risk */}
        <div className="flex flex-col items-center my-4 opacity-50">
          <div className="w-px h-8 bg-gradient-to-b from-zinc-700 to-zinc-500" />
          <ArrowDown className="w-4 h-4 text-zinc-500 -mt-1" />
        </div>

        {/* TIER 3: Risk Manager & Debate */}
        <div className="flex gap-8 relative z-0">
          <div className="bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/80">
            <AgentNode agent={getAgent('risk')} onClick={() => setSelectedAgentId('risk')} />
          </div>
          <div className="bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/80">
            <AgentNode agent={getAgent('debate')} onClick={() => setSelectedAgentId('debate')} />
          </div>
        </div>

        {/* Connection to CIO */}
        <div className="flex flex-col items-center my-4 opacity-50">
          <div className="w-px h-8 bg-gradient-to-b from-zinc-700 to-emerald-500" />
          <ArrowDown className="w-4 h-4 text-emerald-500 -mt-1" />
        </div>

        {/* Level 4: CIO Final Result (Prominent) */}
        <div className="w-full max-w-3xl mt-4">
          <div className={`rounded-2xl border-2 transition-all overflow-hidden
            ${cioAgent.status === 'idle' ? 'border-zinc-800 bg-zinc-900/30' : ''}
            ${cioAgent.status === 'running' ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : ''}
            ${cioAgent.status === 'complete' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : ''}
          `}>
            <div className={`px-6 py-4 border-b flex items-center gap-3
              ${cioAgent.status === 'idle' ? 'border-zinc-800' : 'border-emerald-500/20'}
            `}>
              <div className={`p-2 rounded-lg ${cioAgent.status === 'idle' ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {cioAgent.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Briefcase className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Señal de Trading Final</h2>
                <p className="text-sm text-zinc-400">Generada por el Director de Inversiones</p>
              </div>
            </div>
            
            <div className="p-6 min-h-[200px]">
              {cioAgent.status === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12">
                  <p>Esperando a que los agentes terminen su análisis...</p>
                </div>
              )}
              
              {(cioAgent.status === 'running' || cioAgent.status === 'complete') && cioAgent.result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="markdown-body text-zinc-200 prose prose-invert prose-emerald max-w-none prose-h1:text-2xl prose-h1:font-bold prose-h1:text-emerald-400 prose-h2:text-xl prose-h2:text-zinc-300 prose-li:marker:text-emerald-500"
                >
                  <Markdown>{cioAgent.result}</Markdown>
                  {cioAgent.status === 'running' && (
                    <span className="inline-block w-2 h-5 bg-emerald-400 animate-pulse ml-1 align-middle" />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Modal for viewing individual agent reports */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentModal agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />
        )}

        {/* Radar Modal */}
        {showRadar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !isScanning && setShowRadar(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Radar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-100 text-lg">Radar de Oportunidades</h2>
                    <p className="text-xs text-zinc-400">Escaneando el mercado global en tiempo real</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRadar(false)}
                  disabled={isScanning}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-amber-500 animate-spin"></div>
                      <Radar className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="animate-pulse">Buscando catalizadores y momentum extremo...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opportunities.map((opp, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectOpportunity(opp.asset)}
                        className="bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-zinc-900 group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-zinc-100 group-hover:text-amber-400 transition-colors">{opp.asset}</h3>
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{opp.type}</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1
                            ${opp.sentiment.toLowerCase() === 'alcista' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}
                          `}>
                            {opp.sentiment.toLowerCase() === 'alcista' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {opp.sentiment}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {opp.catalyst}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <Zap className="w-4 h-4" />
                          Analizar con el Comité
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

