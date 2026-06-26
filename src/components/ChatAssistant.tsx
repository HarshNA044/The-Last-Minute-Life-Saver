import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, Task } from '../types';

// Robust helper to parse and format text bolded by asterisks (*bold* or **bold**)
const parseAsterisks = (text: string, isUser: boolean) => {
  if (!text) return "";
  // Split on double asterisks first
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={`double-${i}`} className={isUser ? "font-bold text-neutral-950" : "font-semibold text-amber-500 dark:text-amber-400"}>
          {part}
        </strong>
      );
    }
    // Now split any remaining single asterisks
    const subParts = part.split(/\*([^*]+)\*/g);
    return subParts.map((subPart, j) => {
      if (j % 2 === 1) {
        return (
          <strong key={`single-${j}`} className={isUser ? "font-bold text-neutral-950" : "font-semibold text-amber-500 dark:text-amber-400"}>
            {subPart}
          </strong>
        );
      }
      return subPart;
    });
  });
};

interface ChatAssistantProps {
  currentTasks: Task[];
  onTriggerOptimization: () => void;
  statusText: string;
  isProcessing: boolean;
  onAddSystemLog: (text: string, type: 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert') => void;
}

export default function ChatAssistant({
  currentTasks,
  onTriggerOptimization,
  statusText,
  isProcessing,
  onAddSystemLog
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! I am **The Last-Minute Life Saver**. Drop a task list, project brief, or syllabus, describe your upcoming due dates, or click below to let me scan and autonomously optimize your calendar gaps. Procrastination stops today!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: ["Lock in Work Sessions", "Am I behind?", "Help me schedule deliverables"]
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setSending(true);
    onAddSystemLog(`Processing input: "${textToSend.substring(0, 30)}..."`, 'tracking');

    // Intercept some custom prompt helpers locally to make UI interactive & reactive
    const val = textToSend.toLowerCase();
    if (val.includes("lock") || val.includes("optimize") || val.includes("schedule")) {
      setTimeout(() => {
        onTriggerOptimization();
      }, 1000);
    }

    try {
      const resp = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
          currentTasksState: currentTasks
        })
      });

      if (!resp.ok) throw new Error("Connection glitch inside server");

      const data = await resp.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: data.suggestions
        }]);
        onAddSystemLog("AI response fully formulated.", "info");
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      console.warn("Failed sending chat, using elegant offline fallback rule.", err);
      // Offline fallback
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: "I am actively monitoring your scheduler! I recommend opening a core 45-minute focus pocket to manage anxiety. Click **Lock in Study Sessions** to coordinate calendars immediately.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ["Lock in Study Sessions", "Re-optimize schedule"]
        }]);
      }, 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col h-[480px] relative overflow-hidden" id="chat-assistant-container">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Savers Chat Companion
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-950/80 border border-neutral-800/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-mono text-[9px] text-neutral-400">ONLINE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 mb-3 custom-scrollbar text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border text-[10px] ${
                msg.role === 'user' 
                  ? 'bg-neutral-950 border-neutral-800 text-amber-500' 
                  : 'bg-gradient-to-br from-amber-500/10 to-neutral-950 border-amber-500/20 text-amber-400'
              }`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div>
                <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-neutral-950 rounded-tr-none font-medium'
                    : 'bg-neutral-950 text-neutral-200 border border-neutral-800/60 rounded-tl-none font-sans'
                }`}>
                  {parseAsterisks(msg.text, msg.role === 'user')}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[9px] text-neutral-500 font-mono">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex gap-2.5 items-start">
              <div className="w-6 h-6 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-500 flex items-center justify-center skeleton">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-2xl rounded-tl-none border border-neutral-850 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 bg-neutral-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggested Fast Replies */}
      {messages[messages.length - 1]?.suggestions && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {messages[messages.length - 1].suggestions?.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(sug)}
              className="text-[10px] font-sans px-2.5 py-1 rounded-full bg-neutral-950/80 hover:bg-neutral-900 text-neutral-400 hover:text-amber-400 border border-neutral-800 hover:border-amber-500/30 transition-all duration-200 cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex items-center gap-2 mt-auto"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask saver companion, or set goal..."
          className="flex-1 bg-neutral-950 text-neutral-100 rounded-xl px-3.5 py-2.5 border border-neutral-800/80 text-xs focus:outline-none focus:border-amber-500/50"
          disabled={sending}
        />
        <button
          type="submit"
          className="aspect-square h-[36px] rounded-xl flex items-center justify-center bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors cursor-pointer"
          disabled={sending || !inputText.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
