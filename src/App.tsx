import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Activity, ShieldAlert, Briefcase, Loader2, Play,
  Settings, FolderOpen, Plus, Trash2, Save, X, ChevronRight,
  Database, AlertTriangle, CheckCircle2
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from './services/api';
import { callAI, AIProvider } from './services/aiProviderService';
import { AGENT_CONFIGS } from './services/agentConfigs';

type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

interface AgentState {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  status: AgentStatus;
  result: string | null;
}

interface Project {
  id: number;
  name: string;
  description: string;
}

interface Credential {
  id: number;
  project_id: number;
  provider: AIProvider;
  api_key: string;
  model_name: string;
}

export default function App() {
  const [view, setView] = useState<'analysis' | 'projects' | 'settings'>('analysis');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [asset, setAsset] = useState('Apple (AAPL)');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | 'auto'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'researcher', name: AGENT_CONFIGS.researcher.name, role: AGENT_CONFIGS.researcher.role, icon: <Search className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'quant', name: AGENT_CONFIGS.quant.name, role: AGENT_CONFIGS.quant.role, icon: <Activity className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'risk', name: AGENT_CONFIGS.risk.name, role: AGENT_CONFIGS.risk.role, icon: <ShieldAlert className="w-5 h-5" />, status: 'idle', result: null },
    { id: 'cio', name: AGENT_CONFIGS.cio.name, role: AGENT_CONFIGS.cio.role, icon: <Briefcase className="w-5 h-5" />, status: 'idle', result: null },
  ]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadCredentials(currentProject.id);
    }
  }, [currentProject]);

  const loadProjects = async () => {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0 && !currentProject) {
      setCurrentProject(data[0]);
    }
  };

  const loadCredentials = async (projectId: number) => {
    const data = await api.getCredentials(projectId);
    setCredentials(data);
  };

  const updateAgent = (id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const getAgentConfig = (provider: AIProvider) => {
    const cred = credentials.find(c => c.provider === provider);
    if (!cred) return null;
    return {
      provider: cred.provider,
      apiKey: cred.api_key,
      model: cred.model_name
    };
  };

  const runStep = async (agentId: string, prompt: string, systemInstruction: string, retries = 2) => {
    updateAgent(agentId, { status: 'running' });

    let targetCred = credentials.find(c => c.provider === selectedProvider);
    if (!targetCred && credentials.length > 0) {
      targetCred = credentials[0];
    }

    const config = targetCred ? {
      provider: targetCred.provider,
      apiKey: targetCred.api_key,
      model: targetCred.model_name
    } : null;

    if (!config) {
      throw new Error("No hay credenciales configuradas para este proyecto.");
    }

    for (let i = 0; i <= retries; i++) {
      try {
        const result = await callAI(config, prompt, systemInstruction);
        updateAgent(agentId, { status: 'complete', result });
        return result;
      } catch (err: any) {
        if (i === retries) {
          updateAgent(agentId, { status: 'error' });
          throw err;
        }
        console.warn(`Intento ${i + 1} fallido para ${agentId}, reintentando...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error("Fallo tras reintentos");
  };

  const runAnalysis = async () => {
    if (!asset.trim() || !currentProject) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: null })));

    try {
      // Phase 1: Parallel Data Gathering
      const researcherTask = runStep(
        'researcher',
        `Analiza el activo: ${asset}. Encuentra las últimas noticias, informes de ganancias y sentimiento del mercado.`,
        AGENT_CONFIGS.researcher.systemInstruction
      );

      const quantTask = runStep(
        'quant',
        `Analiza el activo: ${asset}. Encuentra datos de precio recientes, indicadores técnicos y volumen.`,
        AGENT_CONFIGS.quant.systemInstruction
      );

      const [researcherReport, quantReport] = await Promise.all([researcherTask, quantTask]);

      // Phase 2: Risk Analysis
      const riskReport = await runStep(
        'risk',
        `Revisa estos informes para ${asset}:
        REPORTE INVESTIGADOR: ${researcherReport}
        REPORTE CUANTITATIVO: ${quantReport}
        Identifica riesgos y razones para NO invertir.`,
        AGENT_CONFIGS.risk.systemInstruction
      );

      // Phase 3: CIO Decision
      const cioReport = await runStep(
        'cio',
        `Basándote en estos informes para ${asset}:
        INVESTIGADOR: ${researcherReport}
        CUANTITATIVO: ${quantReport}
        RIESGOS: ${riskReport}
        Toma una decisión final y justifica.`,
        AGENT_CONFIGS.cio.systemInstruction
      );

      // Save to history
      await api.saveHistory(currentProject.id, {
        asset,
        researcher_report: researcherReport,
        quant_report: quantReport,
        risk_report: riskReport,
        cio_report: cioReport,
        recommendation: cioReport.match(/RECOMENDACIÓN:\s*(\w+)/)?.[1] || 'UNKNOWN'
      });

    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Error desconocido durante el análisis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight hidden md:block">Comité de Inversión AI</h1>
            </div>

            <nav className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg border border-zinc-700">
              <button
                onClick={() => setView('analysis')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'analysis' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                Análisis
              </button>
              <button
                onClick={() => setView('projects')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'projects' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                Proyectos
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'settings' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                Configuración
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {currentProject && view === 'analysis' && (
              <>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-300 font-medium">{currentProject.name}</span>
                </div>

                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-zinc-300"
                  disabled={isAnalyzing}
                >
                  <option value="auto">Auto (1ra Disp.)</option>
                  {credentials.map(c => (
                    <option key={c.id} value={c.provider}>{c.provider.toUpperCase()}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  placeholder="Ej. Bitcoin, AAPL, Tesla"
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all w-32 sm:w-48"
                  disabled={isAnalyzing}
                />
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !asset.trim() || credentials.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isAnalyzing ? 'Analizando...' : 'Analizar'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Error en el proceso</p>
              <p className="opacity-80">{error}</p>
            </div>
          </div>
        )}

        {view === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {credentials.length === 0 && !isAnalyzing && (
              <div className="lg:col-span-2 py-20 flex flex-col items-center justify-center text-center bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                  <Settings className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Faltan credenciales</h3>
                <p className="text-zinc-500 max-w-md mb-6">Debes configurar al menos una API Key en la sección de Configuración para poder realizar análisis.</p>
                <button
                  onClick={() => setView('settings')}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium"
                >
                  Ir a Configuración
                </button>
              </div>
            )}

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
                        Trabajando...
                      </span>
                    )}
                    {agent.status === 'complete' && (
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                        Completado
                      </span>
                    )}
                    {agent.status === 'error' && (
                      <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                        Error
                      </span>
                    )}
                    {agent.status === 'idle' && (
                      <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                        Esperando
                      </span>
                    )}
                  </div>
                </div>

                {/* Agent Content */}
                <div className="p-5 flex-1 overflow-y-auto max-h-[400px] prose prose-invert prose-sm prose-emerald max-w-none">
                  {agent.status === 'idle' && !agent.result && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12">
                      {agent.icon}
                      <p className="mt-2 text-sm">Esperando a que comience el análisis...</p>
                    </div>
                  )}

                  {agent.status === 'running' && !agent.result && (
                    <div className="h-full flex flex-col items-center justify-center text-amber-500/50 py-12">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <p className="text-sm animate-pulse">Recopilando datos y analizando...</p>
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
        )}

        {view === 'projects' && (
          <ProjectsView
            projects={projects}
            currentProject={currentProject}
            onSelect={setCurrentProject}
            onRefresh={loadProjects}
          />
        )}

        {view === 'settings' && currentProject && (
          <SettingsView
            projectId={currentProject.id}
            projectName={currentProject.name}
            credentials={credentials}
            onRefresh={() => loadCredentials(currentProject.id)}
          />
        )}
      </main>
    </div>
  );
}

function ProjectsView({ projects, currentProject, onSelect, onRefresh }: {
  projects: Project[],
  currentProject: Project | null,
  onSelect: (p: Project) => void,
  onRefresh: () => void
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    if (!newName) return;
    await api.createProject(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setIsAdding(false);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este proyecto? Se borrarán todos los datos asociados.')) {
      await api.deleteProject(id);
      onRefresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-1">Mis Proyectos</h2>
          <p className="text-zinc-500">Gestiona tus diferentes portafolios o áreas de investigación.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden"
          >
            <h3 className="font-semibold mb-4">Crear Nuevo Proyecto</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Nombre del Proyecto</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  placeholder="Ej. Criptomonedas, Bolsa USA, Tecnología..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Descripción</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none h-24"
                  placeholder="Opcional: ¿De qué trata este proyecto?"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Cancelar</button>
                <button onClick={handleCreate} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors">Crear Proyecto</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {projects.map(project => (
          <div
            key={project.id}
            className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${currentProject?.id === project.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}
            onClick={() => onSelect(project)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${currentProject?.id === project.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 transition-colors'}`}>
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-sm text-zinc-500">{project.description || 'Sin descripción'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentProject?.id === project.id && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Activo</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 text-zinc-700" />
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-500">
            No tienes proyectos creados. Crea uno para empezar.
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ projectId, projectName, credentials, onRefresh }: {
  projectId: number,
  projectName: string,
  credentials: Credential[],
  onRefresh: () => void
}) {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const providers: { id: AIProvider, name: string, icon: string, defaultModel: string }[] = [
    { id: 'gemini', name: 'Google Gemini', icon: 'https://www.gstatic.com/lamda/images/favicon_v1_150160d138a353314575.png', defaultModel: 'gemini-2.0-flash' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: 'https://anthropic.com/favicon.ico', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: 'openai', name: 'OpenAI GPT', icon: 'https://openai.com/favicon.ico', defaultModel: 'gpt-4o' },
  ];

  const handleSave = async () => {
    if (!apiKey) return;
    setIsSaving(true);
    try {
      await api.saveCredentials(projectId, provider, apiKey, model || providers.find(p => p.id === provider)?.defaultModel || '');
      setApiKey('');
      setModel('');
      onRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1">Configuración del Proyecto</h2>
        <p className="text-zinc-500 italic">Configurando: <span className="text-emerald-400 font-semibold">{projectName}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* API Credentials Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Configurar APIs
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Proveedor</label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${provider === p.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-500'}`}
                    >
                      <span className="text-sm font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  placeholder={`Pega tu API Key de ${providers.find(p => p.id === provider)?.name}`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Modelo (Opcional)</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  placeholder={`Por defecto: ${providers.find(p => p.id === provider)?.defaultModel}`}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>

        {/* Active Credentials Sidebar */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">APIs Configuradas</h3>
          {credentials.length === 0 && (
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-500 italic">
              No hay APIs configuradas para este proyecto todavía.
            </div>
          )}
          {credentials.map(c => (
            <div key={c.id} className="p-4 bg-zinc-900 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold capitalize">{c.provider}</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">{c.model_name}</p>
                </div>
              </div>
              <div className="text-[10px] text-zinc-600 bg-zinc-950 px-2 py-1 rounded">Activa</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
