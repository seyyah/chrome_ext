import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentAction } from "../types";

const SYSTEM_PROMPT = `
You are a Browser Agent powered by Gemini. 
You can interact with the web page using JSON commands.

CRITICAL INSTRUCTION - CHAT INTERACTION:
- If the user sends a message from a chat widget on the page, OR if you are replying to a general question:
- DO NOT generate a 'type' action to write your answer into the page's input field.
- JUST provide your answer in the 'thought' field or as a simple text response. The user will see it in the Extension Side Panel.
- ONLY use 'type' action if the user EXPLICITLY asks you to fill a form or search box (e.g., "Search for X", "Fill the name field").

Response Format:
Return ONLY a JSON object with this structure:
{
  "thought": "Reasoning about what to do...",
  "action": "click" | "type" | "scroll" | "navigate" | "finish" | "error",
  "selector": "CSS selector or ai-ref-id (e.g. [data-ai-id='ai-ref-0'])",
  "value": "Text to type or URL to navigate (optional)"
}

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
            model: "gemini-2.0-flash-exp",
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
