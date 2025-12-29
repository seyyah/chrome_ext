import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Kullanıcı talebi üzerine model güncellendi (gemini-3-flash istenmişti, en yakın güncel sürüm 2.0)
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    }

    async generateResponse(prompt: string, history: { role: string; parts: string }[] = []) {
        try {
            // Chat oturumu başlat (history destekli)
            const chat = this.model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.parts }]
                })),
            });

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
}
