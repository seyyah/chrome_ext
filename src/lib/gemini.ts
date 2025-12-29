import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentAction } from "../types";

const SYSTEM_PROMPT = `
You are a Browser Agent that can interact with web pages.
You receive a user prompt and optionally a "Page Context" which lists interactive elements with simplified IDs (ai-ref).

YOUR GOAL:
1. Understand the user's intent (e.g., click a button, type text, scroll).
2. Analyze the provided "Page Context" to find the most relevant element.
3. Return a JSON object with the action to perform.

CONTEXT ANALYSIS:
- Elements have 'visuals' (colors) and 'pos' (position on screen).
- 'pos' format: "vertical-horizontal" (e.g., "top-left", "bottom-right", "center-center").
- Use these attributes to resolve queries like "click the blue button" or "click the button on the bottom right".

SAFETY RULES:
- You must REFUSE to perform actions on sensitive fields like passwords, credit card numbers, or banking login forms.
- If a user asks for a sensitive action, return { "action": "finish", "thought": "I cannot perform security-sensitive operations." }.

RULES:
- RESPONSE FORMAT: You must ONLY return a valid JSON object. No markdown, no text descriptions outside the JSON.
- SELECTORS: 
  - If "Page Context" provides an element with 'ai-ref', USE THAT as the selector (e.g., '[data-ai-id="ai-ref-0"]').
  - If no context/match, try to guess a standard CSS selector (e.g., '#save-btn', 'button[type="submit"]').
- ACTIONS:
  - "click": For buttons, links, etc. (Req: selector)
  - "type": For input fields. (Req: selector, value)
  - "scroll": To scroll down.
  - "navigate": To go to a URL. (Req: value)
  - "extract": To read data. (Req: selector)
  - "finish": If task is done or impossible. (Req: thought)

Example JSON:
{
  "thought": "I found the 'Save' button in the context with id ai-ref-2.",
  "action": "click",
  "selector": "[data-ai-id=\\"ai-ref-2\\"]"
}
`;

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp", // gemini-3-flash henüz yok
            systemInstruction: SYSTEM_PROMPT
        });
    }

    async generateResponse(userPrompt: string, history: { role: string; parts: string }[] = [], pageContext?: string): Promise<AgentAction> {
        try {
            const chat = this.model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.parts }]
                })),
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            // Context varsa prompt'a ekle
            let finalPrompt = userPrompt;
            if (pageContext) {
                finalPrompt += `\n\n--- Current Page Context ---\n${pageContext}`;
            }

            const result = await chat.sendMessage(finalPrompt);
            const responseText = result.response.text();

            try {
                return JSON.parse(responseText) as AgentAction;
            } catch (e) {
                console.error("JSON Parse Error:", responseText);
                return {
                    thought: responseText,
                    action: "finish" // Fallback
                };
            }

        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
}
