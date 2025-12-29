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
        chrome.storage.local.get(['chatHistory', 'geminiApiKey', 'pendingMessage'], (result) => {
            if (result.chatHistory) setMessages(result.chatHistory as ChatMessage[]);
            if (result.geminiApiKey) setApiKey(result.geminiApiKey as string);

            // Check for pending message (Race condition fix)
            if (result.pendingMessage) {
                const pendingMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: result.pendingMessage as string,
                    timestamp: Date.now()
                };
                // Avoid duplicates if it was also saved in history
                setMessages(prev => {
                    // Simple duplicate check by content + recent time could be better but this suffices for now
                    return [...prev, pendingMsg];
                });
                // Clear it
                chrome.storage.local.remove('pendingMessage');
            }
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

    // Listen for incoming messages from Content Script (Page Chat)
    useEffect(() => {
        const handleMessage = (message: any) => {
            if (message.action === "incoming_message_from_page" || message.action === "relayed_message_from_page") {
                const userMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: message.text,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, userMsg]);

                // Opsiyonel: Agent'ın buna cevap vermesini istiyorsak sendMessage(message.text) çağrılabilir.
                // Şimdilik sadece "görünsün" dendiği için listeye ekliyoruz.
                // Eğer otomatik cevap istenirse:
                // sendMessage(message.text); // Bu recursion yaratabilir, dikkat.
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

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
