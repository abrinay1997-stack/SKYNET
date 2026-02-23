import { useState } from 'react';
import { Search, Activity, ShieldAlert, Briefcase, Globe, Database, LineChart, MessageSquare, FileText, Droplets, Landmark, Globe2, Users } from 'lucide-react';
import { AgentState } from '../types';
import {
  runSentimentStream,
  runFundamentalsStream,
  runTechnicalsStream,
  runLiquidityStream,
  runMonetaryStream,
  runGeopoliticsStream,
  runLeadResearcherStream,
  runLeadQuantStream,
  runLeadMacroStream,
  runRiskManagerStream,
  runCommitteeDebateStream,
  runCIOStream
} from '../services/geminiService';

export function useTradingAnalysis() {
  const [agents, setAgents] = useState<AgentState[]>([
    // Tier 1: Sub-Agents
    { id: 'sentiment', name: 'Sentimiento', role: 'Noticias y Redes', icon: <MessageSquare className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'fundamentals', name: 'Financiero', role: 'Balances y Métricas', icon: <FileText className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'technicals', name: 'Acción del Precio', role: 'Gráficos e Indicadores', icon: <LineChart className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'liquidity', name: 'Liquidez', role: 'Volumen y Flujos', icon: <Droplets className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'monetary', name: 'Monetario', role: 'FED y Tasas', icon: <Landmark className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'geopolitics', name: 'Geopolítica', role: 'Conflictos Globales', icon: <Globe2 className="w-5 h-5" />, status: 'idle', result: null },
    
    // Tier 2: Leads
    { id: 'lead_researcher', name: 'Lead Fundamental', role: 'Síntesis de Valor', icon: <Search className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'lead_quant', name: 'Lead Quant', role: 'Síntesis de Flujos', icon: <Activity className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'lead_macro', name: 'Lead Macro', role: 'Síntesis Global', icon: <Globe className="w-5 h-5" />, status: 'idle', result: null },
    
    // Tier 3 & 4: Risk and CIO
    { id: 'risk', name: 'Gestor de Riesgos', role: "Stress Test y Cisnes Negros", icon: <ShieldAlert className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'debate', name: 'Mesa de Debate', role: 'Consenso y Refutación', icon: <Users className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'cio', name: 'Señal de Trading', role: 'Ejecución en Exchange', icon: <Briefcase className="w-5 h-5" />, status: 'idle', result: null },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateAgent = (id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const appendAgentResult = (id: string, chunk: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, result: (a.result || '') + chunk } : a));
  };

  const getAgent = (id: string) => agents.find(a => a.id === id)!;

  const runAnalysis = async (asset: string, investmentAmount: string) => {
    if (!asset.trim()) return;
    
    setIsAnalyzing(true);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: null })));

    try {
      let financialContext = "";
      try {
        const tickerMatch = asset.match(/\(([A-Z]{1,5})\)/);
        const ticker = tickerMatch ? tickerMatch[1] : asset.split(' ')[0];
        // En GitHub Pages / Vercel Static no hay backend, así que esto fallará.
        // Solo lo intentamos si no parece ser una URL de producción estática
        const isStatic = window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app');
        if (!isStatic) {
          const res = await fetch(`/api/finance/${ticker}`);
          if (res.ok) {
            const data = await res.json();
            financialContext = data.data;
          }
        }
      } catch (e) {
        // Fallback silencioso
      }

      const isCrypto = /btc|eth|sol|crypto|bitcoin|ethereum|solana|usdt|usd\b/i.test(asset);
      
      updateAgent('liquidity', { 
        name: isCrypto ? 'On-Chain' : 'Opciones',
        role: isCrypto ? 'Ballenas y Red' : 'Derivados y Gamma',
        icon: <Database className="w-5 h-5" />
      });

      // ==========================================
      // PHASE 1: TIER 1 (Sub-Agents Parallel)
      // ==========================================
      const tier1Ids = ['sentiment', 'fundamentals', 'technicals', 'liquidity', 'monetary', 'geopolitics'];
      tier1Ids.forEach(id => updateAgent(id, { status: 'running', result: '' }));
      
      let sentimentRep = '', fundRep = '', techRep = '', liqRep = '', monRep = '', geoRep = '';

      await Promise.all([
        (async () => {
          try {
            for await (const chunk of runSentimentStream(asset)) { sentimentRep += chunk; appendAgentResult('sentiment', chunk); }
            updateAgent('sentiment', { status: 'complete' });
          } catch (e) { updateAgent('sentiment', { status: 'error', result: 'Error en sentimiento.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runFundamentalsStream(asset, financialContext)) { fundRep += chunk; appendAgentResult('fundamentals', chunk); }
            updateAgent('fundamentals', { status: 'complete' });
          } catch (e) { updateAgent('fundamentals', { status: 'error', result: 'Error financiero.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runTechnicalsStream(asset)) { techRep += chunk; appendAgentResult('technicals', chunk); }
            updateAgent('technicals', { status: 'complete' });
          } catch (e) { updateAgent('technicals', { status: 'error', result: 'Error técnico.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runLiquidityStream(asset)) { liqRep += chunk; appendAgentResult('liquidity', chunk); }
            updateAgent('liquidity', { status: 'complete' });
          } catch (e) { updateAgent('liquidity', { status: 'error', result: 'Error de liquidez.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runMonetaryStream(asset)) { monRep += chunk; appendAgentResult('monetary', chunk); }
            updateAgent('monetary', { status: 'complete' });
          } catch (e) { updateAgent('monetary', { status: 'error', result: 'Error monetario.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runGeopoliticsStream(asset)) { geoRep += chunk; appendAgentResult('geopolitics', chunk); }
            updateAgent('geopolitics', { status: 'complete' });
          } catch (e) { updateAgent('geopolitics', { status: 'error', result: 'Error geopolítico.' }); }
        })()
      ]);

      // ==========================================
      // PHASE 2: TIER 2 (Leads Parallel)
      // ==========================================
      const tier2Ids = ['lead_researcher', 'lead_quant', 'lead_macro'];
      tier2Ids.forEach(id => updateAgent(id, { status: 'running', result: '' }));
      
      let leadResRep = '', leadQuantRep = '', leadMacroRep = '';

      await Promise.all([
        (async () => {
          try {
            for await (const chunk of runLeadResearcherStream(asset, sentimentRep, fundRep)) { leadResRep += chunk; appendAgentResult('lead_researcher', chunk); }
            updateAgent('lead_researcher', { status: 'complete' });
          } catch (e) { updateAgent('lead_researcher', { status: 'error', result: 'Error en Lead Fundamental.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runLeadQuantStream(asset, techRep, liqRep)) { leadQuantRep += chunk; appendAgentResult('lead_quant', chunk); }
            updateAgent('lead_quant', { status: 'complete' });
          } catch (e) { updateAgent('lead_quant', { status: 'error', result: 'Error en Lead Quant.' }); }
        })(),
        (async () => {
          try {
            for await (const chunk of runLeadMacroStream(asset, monRep, geoRep)) { leadMacroRep += chunk; appendAgentResult('lead_macro', chunk); }
            updateAgent('lead_macro', { status: 'complete' });
          } catch (e) { updateAgent('lead_macro', { status: 'error', result: 'Error en Lead Macro.' }); }
        })()
      ]);

      // ==========================================
      // PHASE 3: TIER 3 (Risk Manager)
      // ==========================================
      updateAgent('risk', { status: 'running', result: '' });
      let riskRep = '';
      try {
        for await (const chunk of runRiskManagerStream(asset, leadResRep, leadQuantRep, leadMacroRep)) {
          riskRep += chunk;
          appendAgentResult('risk', chunk);
        }
        updateAgent('risk', { status: 'complete' });
      } catch (e) {
        updateAgent('risk', { status: 'error', result: 'Error en el análisis de riesgo.' });
      }

      // ==========================================
      // PHASE 4: TIER 4 (Committee Debate)
      // ==========================================
      updateAgent('debate', { status: 'running', result: '' });
      let debateRep = '';
      try {
        for await (const chunk of runCommitteeDebateStream(asset, leadResRep, leadQuantRep, leadMacroRep, riskRep)) {
          debateRep += chunk;
          appendAgentResult('debate', chunk);
        }
        updateAgent('debate', { status: 'complete' });
      } catch (e) {
        updateAgent('debate', { status: 'error', result: 'Error en el debate del comité.' });
      }

      // ==========================================
      // PHASE 5: TIER 5 (CIO Signal)
      // ==========================================
      updateAgent('cio', { status: 'running', result: '' });
      let cioReport = '';
      try {
        for await (const chunk of runCIOStream(asset, investmentAmount, debateRep)) {
          cioReport += chunk;
          appendAgentResult('cio', chunk);
        }
        updateAgent('cio', { status: 'complete' });
      } catch (e) {
        updateAgent('cio', { status: 'error', result: 'Error al generar la señal final.' });
      }

    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { agents, isAnalyzing, runAnalysis, getAgent };
}
