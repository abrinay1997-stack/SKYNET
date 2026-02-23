import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, X, ShieldAlert, Check } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export type Provider = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek' | 'mistral' | 'openrouter';

const PROVIDERS: { id: Provider; name: string; placeholder: string; desc: string }[] = [
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIzaSy...', desc: 'Gemini 1.5 Flash (Default)' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...', desc: 'GPT-4o' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', desc: 'Claude 3.5 Sonnet' },
  { id: 'xai', name: 'xAI (Grok)', placeholder: 'xai-...', desc: 'Grok 2 Latest' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...', desc: 'DeepSeek V3 (Chat)' },
  { id: 'mistral', name: 'Mistral AI', placeholder: '...', desc: 'Mistral Large' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-v1-...', desc: 'Llama 3.3 70B (Default)' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini: '', openai: '', anthropic: '', xai: '', deepseek: '', mistral: '', openrouter: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProvider((localStorage.getItem('llm_provider') as Provider) || 'gemini');
    const loadedKeys = { ...keys };
    PROVIDERS.forEach(p => {
      loadedKeys[p.id] = localStorage.getItem(`${p.id}_key`) || '';
    });
    setKeys(loadedKeys);
  }, []);

  const handleKeyChange = (val: string) => {
    setKeys(prev => ({ ...prev, [provider]: val }));
  };

  const handleSave = () => {
    localStorage.setItem('llm_provider', provider);
    PROVIDERS.forEach(p => {
      localStorage.setItem(`${p.id}_key`, keys[p.id]);
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const activeProvider = PROVIDERS.find(p => p.id === provider)!;

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
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">Configuración de IA (Multi-Modelo)</h2>
              <p className="text-xs text-zinc-400">Selecciona el motor que impulsará a los agentes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-500/90 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>
              <strong>Modo Client-Side (GitHub Pages):</strong> Las API Keys se guardan localmente en tu navegador (localStorage). Nunca se envían a nuestros servidores.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">Proveedor de IA Principal</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all text-center ${
                    provider === p.id 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/50">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-zinc-300">{activeProvider.name} API Key</label>
                <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded">Modelo: {activeProvider.desc}</span>
              </div>
              <input
                type="password"
                value={keys[provider]}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={activeProvider.placeholder}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <p className="text-xs text-zinc-500">
                {provider === 'gemini' 
                  ? 'Si se deja en blanco, usará la llave por defecto del entorno (si existe).' 
                  : `Requerida para usar los modelos de ${activeProvider.name}.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              saved ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Guardado
              </>
            ) : (
              'Guardar Configuración'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
