import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToPitBoss } from '../services/geminiService';
import { MessageSquare, X, Send, User, Bot } from 'lucide-react';
import { ChatMessage } from '../types';

export const PitBossChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hey there! I'm Ace. Need a tip or just wanna chat about the games?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToPitBoss(input);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-lavender-500 to-indigo-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(167,139,250,0.5)] hover:scale-110 transition-transform z-50 flex items-center gap-2 group"
          aria-label="Open AI Pit Boss Chat"
        >
          <MessageSquare className="animate-pulse" />
          <span className="hidden group-hover:block font-bold">Ask Ace</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white dark:bg-navy-900 border border-slate-200 dark:border-lavender-500/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-lavender-500 to-indigo-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Bot size={24} className="text-white" />
               </div>
               <div>
                  <h3 className="font-bold text-white">Ace</h3>
                  <p className="text-xs text-indigo-100">Gaming Assistant</p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white" aria-label="Close Chat">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-navy-900">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-navy-800 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-white/10 rounded-bl-none shadow-sm'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                   <div className="bg-white dark:bg-navy-800 px-4 py-2 rounded-xl rounded-bl-none border border-slate-200 dark:border-white/10 shadow-sm">
                       <div className="flex gap-1">
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                           <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                       </div>
                   </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-navy-800 border-t border-slate-200 dark:border-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lavender-400 transition-colors"
                aria-label="Chat input"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-lavender-500 p-2 rounded-lg text-white hover:bg-lavender-600 disabled:opacity-50 transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};