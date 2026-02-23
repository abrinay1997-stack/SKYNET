import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProvider = 'gemini' | 'anthropic' | 'openai';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export async function callAI(config: AIConfig, prompt: string, systemInstruction?: string): Promise<string> {
  try {
    switch (config.provider) {
      case 'gemini':
        const genAI = new GoogleGenAI(config.apiKey);
        const model = genAI.getGenerativeModel({
          model: config.model || "gemini-2.0-flash",
          systemInstruction: systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

      case 'anthropic':
        const anthropic = new Anthropic({ apiKey: config.apiKey });
        const msg = await anthropic.messages.create({
          model: config.model || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: systemInstruction,
          messages: [{ role: "user", content: prompt }],
        });
        return msg.content[0].type === 'text' ? msg.content[0].text : "No text response";

      case 'openai':
        const openai = new OpenAI({ apiKey: config.apiKey });
        const completion = await openai.chat.completions.create({
          model: config.model || "gpt-4o",
          messages: [
            { role: "system", content: systemInstruction || "" },
            { role: "user", content: prompt },
          ],
        });
        return completion.choices[0].message.content || "No content";

      default:
        throw new Error(`Provider ${config.provider} not supported`);
    }
  } catch (error: any) {
    console.error(`Error calling ${config.provider}:`, error);
    throw new Error(`Error de comunicación con ${config.provider}: ${error.message}`);
  }
}
