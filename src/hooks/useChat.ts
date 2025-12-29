import { useState, useEffect } from 'react';
import { GeminiService } from '../lib/gemini';
import type { ChatMessage, AgentAction } from '../types';

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

            // Get Page Context (Simplified DOM)
            let pageContext = "";
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    // Promise wrap for sendMessage
                    pageContext = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tab.id!, { action: "get_page_context" }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.warn("Context fetch warning:", chrome.runtime.lastError);
                                resolve("");
                            } else {
                                resolve(response?.context || "");
                            }
                        });
                    });
                }
            } catch (ctxErr) {
                console.warn("Context fetch failed:", ctxErr);
            }

            // Prepare history for API
            const history = messages.map(m => ({
                role: m.role,
                parts: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            }));

            const responseAction: AgentAction = await gemini.generateResponse(text, history, pageContext);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: responseAction,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);

            // Execute Action
            if (responseAction.action !== 'finish' && responseAction.action !== 'error') {
                // Send to Content Script
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: "execute_agent_action",
                        data: responseAction
                    }, (response) => {
                        console.log("Execution Response:", response);
                        // TODO: Gelecekte sonucun Gemini'ye geri beslenmesi eklenecek
                    });
                }
            }

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
