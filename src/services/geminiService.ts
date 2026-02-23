import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function runMarketResearcher(asset: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a Market Researcher. Your job is to find the latest news, earnings reports, and market sentiment for the financial asset: ${asset}. Use Google Search to find recent and relevant information. Summarize your findings in a clear, concise report.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a professional financial market researcher. Focus on fundamental analysis, news, and sentiment. Be objective and factual.",
    },
  });
  return response.text || "No data found.";
}

export async function runQuantitativeAnalyst(asset: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a Quantitative Analyst. Your job is to find recent price data, moving averages, trading volume, and technical indicators for the financial asset: ${asset}. Use Google Search to find current numbers. Summarize the technical outlook in a clear, concise report.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a professional quantitative analyst. Focus on hard numbers, technical indicators, and price trends. Be objective and precise.",
    },
  });
  return response.text || "No data found.";
}

export async function runRiskManager(asset: string, researcherReport: string, quantReport: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a Risk Manager (Devil's Advocate). Review the following reports for the asset ${asset}:
    
    --- Market Researcher Report ---
    ${researcherReport}
    
    --- Quantitative Analyst Report ---
    ${quantReport}
    
    Your job is to find flaws in these ideas, highlight macroeconomic risks, and find hidden reasons NOT to invest in this asset. Be critical and pessimistic. Summarize the risks in a clear report.`,
    config: {
      systemInstruction: "You are a strict, pessimistic Risk Manager. Your goal is capital preservation. Always look for the downside, systemic risks, and flaws in bullish arguments.",
    },
  });
  return response.text || "No data found.";
}

export async function runCIO(asset: string, researcherReport: string, quantReport: string, riskReport: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the Chief Investment Officer (CIO). Review the following reports for the asset ${asset}:
    
    --- Market Researcher Report ---
    ${researcherReport}
    
    --- Quantitative Analyst Report ---
    ${quantReport}
    
    --- Risk Manager Report ---
    ${riskReport}
    
    Weigh the arguments and make a final investment decision: BUY, SELL, or HOLD. 
    Provide a final executive summary justifying your decision based on the debate between the agents.
    Format your response starting with a clear "RECOMMENDATION: [BUY/SELL/HOLD]" followed by your reasoning.`,
    config: {
      systemInstruction: "You are the Chief Investment Officer. You make the final call based on the data provided by your team. Be decisive, authoritative, and clear in your reasoning.",
    },
  });
  return response.text || "No data found.";
}
