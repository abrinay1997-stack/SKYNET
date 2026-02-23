import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getCurrentDateContext = () => {
  return `\nFECHA Y HORA ACTUAL: ${new Date().toLocaleString('es-ES', { timeZone: 'America/New_York' })} (Hora de NY).\nTen en cuenta esta fecha para tu análisis.`;
};

export async function getMarketOpportunities() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Escanea el mercado financiero global (Acciones, Criptomonedas, Materias Primas) y encuentra las 4 mejores oportunidades de inversión en este momento exacto.
    ${getCurrentDateContext()}
    Busca noticias de última hora, reportes de ganancias recientes, movimientos anómalos de volumen, o eventos macroeconómicos que estén creando oportunidades asimétricas hoy.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "Eres un Radar de Oportunidades (Market Scanner) de un Hedge Fund. Tu trabajo es encontrar activos con catalizadores inminentes o momentum extremo.",
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

  try {
    const text = response.text || "[]";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error parsing opportunities JSON", e);
    return [];
  }
}

// ==========================================
// TIER 1: SUB-AGENTES (RECOLECTORES DE DATOS)
// ==========================================

export async function* runSentimentStream(asset: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza el sentimiento actual del mercado para: ${asset}. ${getCurrentDateContext()}
    Busca en X.com, Reddit y titulares de noticias recientes. ¿Hay euforia, pánico o indiferencia? Resume los temas de conversación principales en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un analista de sentimiento de mercado. Tu trabajo es medir la psicología de las masas." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runFundamentalsStream(asset: string, financialContext: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza los fundamentales duros de: ${asset}. Contexto: ${financialContext} ${getCurrentDateContext()}
    Revisa ingresos, deuda, P/E ratio (si es acción) o tokenomics/adopción (si es crypto). Resume la salud financiera en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un analista fundamental purista. Solo te importan los números, balances y ventajas competitivas." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runTechnicalsStream(asset: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza la acción del precio puramente técnica para: ${asset}. ${getCurrentDateContext()}
    Revisa soportes/resistencias clave, RSI, MACD y medias móviles. Resume la estructura del gráfico en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un analista técnico (Chartista). Tu mundo son las velas japonesas y los indicadores matemáticos de precio." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runLiquidityStream(asset: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza la liquidez y flujos ocultos para: ${asset}. ${getCurrentDateContext()}
    Si es crypto: Revisa datos On-Chain (flujos de exchanges, ballenas). Si es acción tradicional: Revisa mercado de opciones (Gamma, Put/Call ratio) y Dark Pools. Resume en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un rastreador de liquidez institucional. Sigues el rastro del 'Smart Money' a través de derivados y datos on-chain." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runMonetaryStream(asset: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza el entorno monetario actual y su impacto en: ${asset}. ${getCurrentDateContext()}
    Revisa la postura de la FED/BCE, tasas de interés, inflación (CPI) y liquidez global (M2). Resume en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un experto en bancos centrales y política monetaria. Entiendes que la liquidez mueve los mercados." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runGeopoliticsStream(asset: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Analiza el riesgo geopolítico actual y su impacto en: ${asset}. ${getCurrentDateContext()}
    Revisa conflictos globales, guerras comerciales, aranceles, elecciones y cadenas de suministro. Resume en 3 viñetas.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: "Eres un analista de inteligencia geopolítica. Evalúas cómo los eventos del mundo real afectan a los activos financieros." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

// ==========================================
// TIER 2: JEFES DE DEPARTAMENTO (LEADS)
// ==========================================

export async function* runLeadResearcherStream(asset: string, sentiment: string, fundamentals: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Como Jefe de Investigación Fundamental, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nSENTIMIENTO:\n${sentiment}\n\nFUNDAMENTALES:\n${fundamentals}\n\nEmite un veredicto consolidado sobre el valor intrínseco y la percepción pública del activo.`,
    config: { systemInstruction: "Eres el Lead Fundamental Analyst. Tu trabajo es encontrar divergencias entre el valor real (fundamentales) y el precio (sentimiento)." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runLeadQuantStream(asset: string, technicals: string, liquidity: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Como Jefe Cuantitativo, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nTÉCNICO:\n${technicals}\n\nLIQUIDEZ/FLUJOS:\n${liquidity}\n\nEmite un veredicto consolidado sobre la dirección más probable del precio a corto/medio plazo basado en la estructura y los flujos.`,
    config: { systemInstruction: "Eres el Lead Quant. Combinas la acción del precio con el posicionamiento institucional para predecir el próximo movimiento." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runLeadMacroStream(asset: string, monetary: string, geopolitics: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Como Jefe de Estrategia Macro, sintetiza los reportes de tus sub-agentes para ${asset}:\n\nMONETARIO:\n${monetary}\n\nGEOPOLÍTICA:\n${geopolitics}\n\nEmite un veredicto consolidado sobre si el entorno global es un viento a favor o en contra para este activo.`,
    config: { systemInstruction: "Eres el Lead Macro Strategist. Tu visión es 'Top-Down', evaluando si el ecosistema global permite que este activo prospere." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

// ==========================================
// TIER 3 & 4: RIESGO Y CIO
// ==========================================

export async function* runRiskManagerStream(asset: string, leadRes: string, leadQuant: string, leadMacro: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Realiza un "Stress Test" para ${asset} basado en los reportes de los Jefes de Departamento:\n\nFUNDAMENTAL:\n${leadRes}\n\nQUANT:\n${leadQuant}\n\nMACRO:\n${leadMacro}\n\nActúa como el Abogado del Diablo. ¿Qué podría salir mal? Identifica riesgos de cola y da un Nivel de Riesgo (Bajo, Medio, Alto, Extremo).`,
    config: { systemInstruction: "Eres el Chief Risk Officer (CRO). Tu único trabajo es proteger el capital, ser paranoico y buscar fallas en las tesis alcistas." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runCommitteeDebateStream(asset: string, leadRes: string, leadQuant: string, leadMacro: string, risk: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Simula una mesa redonda (debate) final y concisa entre los Jefes de Departamento sobre el activo: ${asset}.
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
    config: { systemInstruction: "Eres el moderador del Comité de Inversiones. Tu objetivo es forzar a los especialistas a debatir sus diferencias y llegar a un consenso unificado antes de pasarle el reporte al CIO." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}

export async function* runCIOStream(asset: string, investmentAmount: string, debateReport: string): AsyncGenerator<string, void, unknown> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Como CIO, emite la señal final para ${asset}. Inversión planeada: ${investmentAmount || 'No especificada'}.\n${getCurrentDateContext()}\n\n--- DEBATE Y CONSENSO DEL COMITÉ ---\n${debateReport}\n\nGenera una SEÑAL DE TRADING EXACTA en Markdown:\n# SEÑAL DE TRADING: [LONG / SHORT / HOLD]\n* **ACCIÓN:** [COMPRAR / VENDER / ESPERAR]\n* **NIVEL DE CONFIANZA:** [1-100%]\n* **HORIZONTE:** [Tiempo exacto]\n* **ENTRADA:** [Precio]\n* **TAKE PROFIT:** [Precio]\n* **STOP LOSS:** [Precio]\n* **ASIGNACIÓN:** [Cómo distribuir el capital]\n\n## JUSTIFICACIÓN EJECUTIVA\n[1 párrafo de resumen basado en el consenso]`,
    config: { systemInstruction: "Eres el Chief Investment Officer (CIO). Traduces el consenso del comité en señales de trading precisas y ejecutables. Vas directo al grano." }
  });
  for await (const chunk of stream) if (chunk.text) yield chunk.text;
}
