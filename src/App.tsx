import { useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Send, Trash2, Key, Bot, User } from 'lucide-react';
import './App.css';

function App() {
  const { messages, isLoading, error, apiKey, saveApiKey, sendMessage, clearChat } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (inputRef.current?.value) {
      sendMessage(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <Key size={24} />
            <h1 className="text-xl font-bold">Setup Agent</h1>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Please enter your Gemini API Key. Your key is stored locally in your browser.
          </p>
          <input
            type="password"
            placeholder="Enter API Key"
            className="w-full p-2 border rounded mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveApiKey((e.target as HTMLInputElement).value);
            }}
          />
          <button
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              saveApiKey(input.value);
            }}
          >
            Save Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold text-gray-800 flex items-center gap-2">
          <Bot className="text-blue-600" />
          Gemini Agent
        </h1>
        <button
          onClick={clearChat}
          className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
          title="Clear Chat"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Bot size={48} className="mx-auto mb-2 opacity-20" />
            <p>How can I help you today?</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0
              ${msg.role === 'user' ? 'bg-blue-600' : 'bg-green-600'}
            `}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>

            <div className={`
              p-3 rounded-lg max-w-[80%] text-sm shadow-sm
              ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}
            `}>
              {typeof msg.content === 'string' ? (
                msg.content
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-gray-700 italic border-l-2 border-green-500 pl-2">
                    "{msg.content.thought}"
                  </div>
                  {msg.content.action !== 'finish' && (
                    <div className="text-xs bg-gray-100 p-2 rounded flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>Executing: <b>{msg.content.action}</b> on <code>{msg.content.selector || 'page'}</code></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0 animate-pulse">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white p-3 rounded-lg rounded-tl-none border border-gray-100 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded text-sm text-center">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
