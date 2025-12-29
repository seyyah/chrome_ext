import { useState, useEffect } from 'react';
import { GeminiService } from '../lib/gemini';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: number;
}

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Load history and API key on mount
    useEffect(() => {
        chrome.storage.local.get(['chatHistory', 'geminiApiKey'], (result) => {
            if (result.chatHistory) setMessages(result.chatHistory as ChatMessage[]);
            if (result.geminiApiKey) setApiKey(result.geminiApiKey as string);
        });
    }, []);

    // Save history on change
    useEffect(() => {
        if (messages.length > 0) {
            chrome.storage.local.set({ chatHistory: messages });
        }
    }, [messages]);

    const saveApiKey = (key: string) => {
        setApiKey(key);
        chrome.storage.local.set({ geminiApiKey: key });
    };

    const clearChat = () => {
        setMessages([]);
        chrome.storage.local.remove('chatHistory');
    };

    const sendMessage = async (text: string) => {
        if (!apiKey) {
            setError("Please set your Gemini API Key first.");
            return;
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);

        try {
            // Initialize service
            const gemini = new GeminiService(apiKey);

            // Prepare history for API
            const history = messages.map(m => ({
                role: m.role,
                parts: m.content
            }));

            const responseText = await gemini.generateResponse(text, history);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: responseText,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to generate response");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        isLoading,
        error,
        apiKey,
        saveApiKey,
        sendMessage,
        clearChat
    };
}
