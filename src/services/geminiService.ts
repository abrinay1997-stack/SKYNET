import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Provider } from "../components/SettingsModal";

export const getSettings = () => {
  return {
    provider: (localStorage.getItem('llm_provider') as Provider) || 'gemini',
    geminiKey: localStorage.getItem('gemini_key') || '',
    openaiKey: localStorage.getItem('openai_key') || '',
    anthropicKey: localStorage.getItem('anthropic_key') || '',
    xaiKey: localStorage.getItem('xai_key') || '',
    deepseekKey: localStorage.getItem('deepseek_key') || '',
    mistralKey: localStorage.getItem('mistral_key') || '',
    openrouterKey: localStorage.getItem('openrouter_key') || '',
  };
};

const getCurrentDateContext = () => {
  return `\nFECHA Y HORA ACTUAL: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York' })} (Hora de NY).\nTen en cuenta esta fecha para tu análisis.`;
};

// ==========================================
// ABSTRACCIÓN DE LLM (MULTI-PROVEEDOR)
// ==========================================
async function* streamLLM(prompt: string, systemInstruction: string, useSearch: boolean = false): AsyncGenerator<string, void, unknown> {
  const settings = getSettings();

  if (settings.provider === 'anthropic' && settings.anthropicKey) {
    const anthropic = new Anthropic({ apiKey: settings.anthropicKey, dangerouslyAllowBrowser: true });
    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4096,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }]
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } else if (['openai', 'xai', 'deepseek', 'mistral', 'openrouter'].includes(settings.provider)) {
    let baseURL, model, apiKey;
    
    switch(settings.provider) {
      case 'openai': 
        baseURL = undefined; model = 'gpt-4o'; apiKey = settings.openaiKey; break;
      case 'xai': 
        baseURL = 'https://api.x.ai/v1'; model = 'grok-2-latest'; apiKey = settings.xaiKey; break;
      case 'deepseek': 
        baseURL = 'https://api.deepseek.com'; model = 'deepseek-chat'; apiKey = settings.deepseekKey; break;
      case 'mistral': 
        baseURL = 'https://api.mistral.ai/v1'; model = 'mistral-large-latest'; apiKey = settings.mistralKey; break;
      case 'openrouter': 
        baseURL = 'https://openrouter.ai/api/v1'; model = 'meta-llama/llama-3.3-70b-instruct'; apiKey = settings.openrouterKey; break;
    }

    if (!apiKey) throw new Error(`Falta la API Key para ${settings.provider}`);

    const config: any = { apiKey, dangerouslyAllowBrowser: true };
    if (baseURL) config.baseURL = baseURL;
    if (settings.provider === 'openrouter') {
      config.defaultHeaders = {
        "HTTP-Referer": window.location.href,
        "X-Title": "AI Trading Platform",
      };
    }

    const openai = new OpenAI(config);
    const stream = await openai.chat.completions.create({
      model: model as string,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      stream: true,
    });
    
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) yield text;
    }
  } else {
    // Default to Gemini
    let envKey = '';
    try {
      envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    } catch (e) {
      // Ignore if not available
    }
    const apiKey = settings.geminiKey || envKey;
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    const config: any = { systemInstruction };
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config
    });
    
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}

export async function getMarketOpportunities() {
  const settings = getSettings();
  const prompt = `Escanea el mercado financiero global (Acciones, Criptomonedas, Materias Primas) y encuentra las 4 mejores oportunidades de inversión en este momento exacto.
    ${getCurrentDateContext()}
    Busca noticias de última hora, reportes de ganancias recientes, movimientos anómalos de volumen, o eventos macroeconómicos que estén creando oportunidades asimétricas hoy.`;
  const systemInstruction = "Eres un Radar de Oportunidades (Market Scanner) de un Hedge Fund. Tu trabajo es encontrar activos con catalizadores inminentes o momentum extremo.";

  const parseJSONResponse = (text: string) => {
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return parsed.opportunities || parsed;
    } catch (e) {
      console.error("Error parsing JSON", e);
      return [];
    }
  };

  if (settings.provider === 'anthropic' && settings.anthropicKey) {
    const anthropic = new Anthropic({ apiKey: settings.anthropicKey, dangerouslyAllowBrowser: true });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2048,
      system: systemInstruction + " Responde ÚNICAMENTE con un objeto JSON válido que contenga la clave 'opportunities' con un array de objetos. Cada objeto debe tener: asset, type, catalyst, sentiment.",
      messages: [{ role: 'user', content: prompt }]
    });
    // @ts-ignore
    return parseJSONResponse(response.content[0]?.text || '{"opportunities": []}');
  } else if (['openai', 'xai', 'deepseek', 'mistral', 'openrouter'].includes(settings.provider)) {
    let baseURL, model, apiKey;
    switch(settings.provider) {
      case 'openai': baseURL = undefined; model = 'gpt-4o'; apiKey = settings.openaiKey; break;
      case 'xai': baseURL = 'https://api.x.ai/v1'; model = 'grok-2-latest'; apiKey = settings.xaiKey; break;
      case 'deepseek': baseURL = 'https://api.deepseek.com'; model = 'deepseek-chat'; apiKey = settings.deepseekKey; break;
      case 'mistral': baseURL = 'https://api.mistral.ai/v1'; model = 'mistral-large-latest'; apiKey = settings.mistralKey; break;
      case 'openrouter': baseURL = 'https://openrouter.ai/api/v1'; model = 'meta-llama/llama-3.3-70b-instruct'; apiKey = settings.openrouterKey; break;
    }
    
    if (!apiKey) return [];

    const config: any = { apiKey, dangerouslyAllowBrowser: true };
    if (baseURL) config.baseURL = baseURL;
    if (settings.provider === 'openrouter') {
      config.defaultHeaders = {
        "HTTP-Referer": window.location.href,
        "X-Title": "AI Trading Platform",
      };
    }

    const openai = new OpenAI(config);
    const response = await openai.chat.completions.create({
      model: model as string,
      messages: [
        { role: 'system', content: systemInstruction + " Responde ÚNICAMENTE con un objeto JSON válido que contenga la clave 'opportunities' con un array de objetos. Cada objeto debe tener: asset, type, catalyst, sentiment." },
        { role: 'user', content: prompt }
      ],
      // OpenRouter/Mistral might not support response_format strict json_object perfectly, so we rely on prompt + parse
    });
    
    return parseJSONResponse(response.choices[0].message.content || '{"opportunities": []}');
  } else {
    let envKey = '';
    try {
      envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    } catch (e) {
      // Ignore if not available
    }
    const apiKey = settings.geminiKey || envKey;
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              asset: { type: Type.STRING, description: "Nombre y ticker, ej. 'Nvidia (NVDA)' o 'Solana (SOL)'" },
              type: { type: Type.STRING, description: "Tipo de activo: 'Crypto', 'Acción', 'Macro'" },
              catalyst: { type: Type.STRING, description: "Explicación de 2-3 líneas del catalizador o noticia que lo hace una oportunidad HOY." },
              sentiment: { type: Type.STRING, description: "'Alcista' o 'Bajista'" }
            },
            required: ["asset", "type", "catalyst", "sentiment"]
          }
        }
      }
    });

    return parseJSONResponse(response.text || "[]");
  }
}

// ==========================================
// TIER 1: SUB-AGENTES (RECOLECTORES DE DATOS)
// ==========================================

const createAgentStream = (systemInstruction: string, promptBuilder: (...args: any[]) => string, useSearch: boolean = false) => {
  return async function* (...args: any[]): AsyncGenerator<string, void, unknown> {
    const prompt = promptBuilder(...args);
    yield* streamLLM(prompt, systemInstruction, useSearch);
  };
};

export const runSentimentStream = createAgentStream(
  "Eres un analista de sentimiento de mercado. Tu trabajo es medir la psicología de las masas.",
  (asset: string) => `Analiza el sentimiento actual del mercado para: ${asset}. ${getCurrentDateContext()}\nBusca en X.com, Reddit y titulares de noticias recientes. ¿Hay euforia, pánico o indiferencia? Resume los temas de conversación principales en 3 viñetas.`,
  true
);

export const runFundamentalsStream = createAgentStream(
  "Eres un analista fundamental purista. Solo te importan los números, balances y ventajas competitivas.",
  (asset: string, financialContext: string) => `Analiza los fundamentales duros de: ${asset}. Contexto: ${financialContext} ${getCurrentDateContext()}\nRevisa ingresos, deuda, P/E ratio (si es acción) o tokenomics/adopción (si es crypto). Resume la salud financiera en 3 viñetas.`,
  true
);

export const runTechnicalsStream = createAgentStream(
  "Eres un analista técnico (Chartista). Tu mundo son las velas japonesas y los indicadores matemáticos de precio.",
  (asset: string) => `Analiza la acción del precio puramente técnica para: ${asset}. ${getCurrentDateContext()}\nRevisa soportes/resistencias clave, RSI, MACD y medias móviles. Resume la estructura del gráfico en 3 viñetas.`,
  true
);

export const runLiquidityStream = createAgentStream(
  "Eres un rastreador de liquidez institucional. Sigues el rastro del 'Smart Money' a través de derivados y datos on-chain.",
  (asset: string) => {
    const isCrypto = asset.toLowerCase().includes('btc') || asset.toLowerCase().includes('eth') || asset.toLowerCase().includes('crypto');
    return isCrypto 
      ? `Analiza los datos On-Chain actuales para: ${asset}. ${getCurrentDateContext()}\n¿Están las ballenas comprando o vendiendo? ¿Cómo están las reservas en los exchanges?`
      : `Analiza el flujo de opciones y Dark Pools para: ${asset}. ${getCurrentDateContext()}\n¿Hay posicionamiento inusual en opciones Call/Put? ¿Dónde está el "Gamma Exposure" (GEX)?`;
  },
  true
);

export const runMonetaryStream = createAgentStream(
  "Eres un experto en bancos centrales y política monetaria. Entiendes que la liquidez mueve los mercados.",
  (asset: string) => `Analiza el entorno monetario actual y su impacto en: ${asset}. ${getCurrentDateContext()}\nRevisa la postura de la FED/BCE, tasas de interés, inflación (CPI) y liquidez global (M2). Resume en 3 viñetas.`,
  true
);

export const runGeopoliticsStream = createAgentStream(
  "Eres un analista de inteligencia geopolítica. Evalúas cómo los eventos del mundo real afectan a los activos financieros.",
  (asset: string) => `Analiza el riesgo geopolítico actual y su impacto en: ${asset}. ${getCurrentDateContext()}\nRevisa conflictos globales, guerras comerciales, aranceles, elecciones y cadenas de suministro. Resume en 3 viñetas.`,
  true
);

// ==========================================
// TIER 2: JEFES DE DEPARTAMENTO (LEADS)
// ==========================================

export const runLeadResearcherStream = createAgentStream(
  "Eres el Lead Fundamental Analyst. Tu trabajo es encontrar divergencias entre el valor real (fundamentales) y el precio (sentimiento).",
  (asset: string, sentiment: string, fundamentals: string) => `Como Jefe de Investigación Fundamental, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nSENTIMIENTO:\n${sentiment}\n\nFUNDAMENTALES:\n${fundamentals}\n\nEmite un veredicto consolidado sobre el valor intrínseco y la percepción pública del activo.`,
  false
);

export const runLeadQuantStream = createAgentStream(
  "Eres el Lead Quant. Combinas la acción del precio con el posicionamiento institucional para predecir el próximo movimiento.",
  (asset: string, technicals: string, liquidity: string) => `Como Jefe Cuantitativo, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nTÉCNICO:\n${technicals}\n\nLIQUIDEZ/FLUJOS:\n${liquidity}\n\nEmite un veredicto consolidado sobre la dirección más probable del precio a corto/medio plazo basado en la estructura y los flujos.`,
  false
);

export const runLeadMacroStream = createAgentStream(
  "Eres el Lead Macro Strategist. Tu visión es 'Top-Down', evaluando si el ecosistema global permite que este activo prospere.",
  (asset: string, monetary: string, geopolitics: string) => `Como Jefe de Estrategia Macro, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nMONETARIO:\n${monetary}\n\nGEOPOLÍTICA:\n${geopolitics}\n\nEmite un veredicto consolidado sobre si el entorno global es un viento a favor o en contra para este activo.`,
  false
);

// ==========================================
// TIER 3 & 4: RIESGO Y CIO
// ==========================================

export const runRiskManagerStream = createAgentStream(
  "Eres el Chief Risk Officer (CRO). Tu único trabajo es proteger el capital, ser paranoico y buscar fallas en las tesis alcistas.",
  (asset: string, leadRes: string, leadQuant: string, leadMacro: string) => `Realiza un "Stress Test" para ${asset} basado en los reportes de los Jefes de Departamento:\n\nFUNDAMENTAL:\n${leadRes}\n\nQUANT:\n${leadQuant}\n\nMACRO:\n${leadMacro}\n\nActúa como el Abogado del Diablo. ¿Qué podría salir mal? Identifica riesgos de cola y da un Nivel de Riesgo (Bajo, Medio, Alto, Extremo).`,
  false
);

export const runCommitteeDebateStream = createAgentStream(
  "Eres el moderador del Comité de Inversiones. Tu objetivo es forzar a los especialistas a debatir sus diferencias y llegar a un consenso unificado antes de pasarle el reporte al CIO.",
  (asset: string, leadRes: string, leadQuant: string, leadMacro: string, risk: string) => `Simula una mesa redonda (debate) final y concisa entre los Jefes de Departamento sobre el activo: ${asset}.
    ${getCurrentDateContext()}
    
    POSTURAS ACTUALES:
    Fundamental: ${leadRes}
    Quant: ${leadQuant}
    Macro: ${leadMacro}
    Riesgo: ${risk}
    
    Instrucciones:
    1. Haz que los analistas debatan brevemente. Si el Quant es alcista pero el Macro es bajista, haz que discutan esa contradicción.
    2. El Gestor de Riesgos debe intervenir si se está ignorando un peligro inminente.
    3. Concluye con un "CONSENSO DEL COMITÉ" claro (1-2 párrafos) que resuma la postura unificada o la condición exacta para operar.`,
  false
);

export const runCIOStream = createAgentStream(
  "Eres el Chief Investment Officer (CIO). Traduces el consenso del comité en señales de trading precisas y ejecutables. Vas directo al grano.",
  (asset: string, investmentAmount: string, debateReport: string) => `Como CIO, emite la señal final para ${asset}. Inversión planeada: ${investmentAmount || 'No especificada'}.\n${getCurrentDateContext()}\n\n--- DEBATE Y CONSENSO DEL COMITÉ ---\n${debateReport}\n\nGenera una SEÑAL DE TRADING EXACTA en Markdown:\n# SEÑAL DE TRADING: [LONG / SHORT / HOLD]\n* **ACCIÓN:** [COMPRAR / VENDER / ESPERAR]\n* **NIVEL DE CONFIANZA:** [1-100%]\n* **HORIZONTE:** [Tiempo exacto]\n* **ENTRADA:** [Precio]\n* **TAKE PROFIT:** [Precio]\n* **STOP LOSS:** [Precio]\n* **ASIGNACIÓN:** [Cómo distribuir el capital]\n\n## JUSTIFICACIÓN EJECUTIVA\n[1 párrafo de resumen basado en el consenso]`,
  false
);
