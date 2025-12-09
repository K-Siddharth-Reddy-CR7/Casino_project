import { GoogleGenAI, Chat } from "@google/genai";
import { AI_SYSTEM_INSTRUCTION } from '../constants';
import { Transaction } from '../types';

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAiInstance = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const initializeChat = async () => {
  const ai = getAiInstance();
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: AI_SYSTEM_INSTRUCTION,
      temperature: 0.9,
    },
  });
  return chatSession;
};

export const sendMessageToPitBoss = async (message: string): Promise<string> => {
  try {
    if (!chatSession) {
      await initializeChat();
    }
    
    if (!chatSession) {
        throw new Error("Failed to initialize chat session");
    }

    const result = await chatSession.sendMessage({ message });
    return result.text || "The pit boss is busy right now. Try again later.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ace is on a coffee break. (API Error)";
  }
};

export const analyzePlayerHistory = async (history: Transaction[]): Promise<string> => {
  try {
    const ai = getAiInstance();
    // Summarize history for the prompt to save tokens/complexity
    const recentTx = history.slice(-20);
    const summary = recentTx.map(tx => `${tx.type.toUpperCase()}: $${Math.abs(tx.amount)} (${tx.description})`).join('\n');
    
    const prompt = `
      You are Ace, the casino Pit Boss. Analyze this player's recent transaction history and give them a short, punchy paragraph of feedback.
      Be charismatic. If they are winning, congratulate them but warn them not to get cocky. If they are losing, give them a fun morale boost or a specific strategic tip for Blackjack or Dice.
      
      Recent History:
      ${summary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Keep playing, I'm watching the tables.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Computers are down, kid. Just trust your gut for now.";
  }
};