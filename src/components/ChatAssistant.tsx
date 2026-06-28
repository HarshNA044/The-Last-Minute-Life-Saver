import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, AlertTriangle, Zap, X } from 'lucide-react';
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
        <strong key={`double-${i}`} className={isUser ? "font-bold text-neutral-950" : "font-bold text-purple-700 dark:text-purple-400"}>
          {part}
        </strong>
      );
    }
    // Now split any remaining single asterisks
    const subParts = part.split(/\*([^*]+)\*/g);
    return subParts.map((subPart, j) => {
      if (j % 2 === 1) {
        return (
          <strong key={`single-${j}`} className={isUser ? "font-bold text-neutral-950" : "font-bold text-purple-700 dark:text-purple-400"}>
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
  onAddTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const ENCOURAGING_PROMPTS = [
  "Stressed about deadlines? Let's optimize!",
  "Procrastinating? Tap to beat it!",
  "Deadlines looming? Let's plan together!",
  "Need a quick time-management technique?",
  "Double your study efficiency with me!"
];

export default function ChatAssistant({
  currentTasks,
  onTriggerOptimization,
  statusText,
  isProcessing,
  onAddSystemLog,
  onAddTask,
  onDeleteTask
}: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! I am **The Last-Minute Life Saver**. I can help you structure your task backlogs, explain deadline-beating study techniques (like **Pomodoro**, **Eat the Frog**, or **Time Blocking**), and autonomously optimize your calendar gaps. Procrastination stops today!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: ["Eat the frog strategy?", "Time Blocking guide", "Explain Pomodoro technique"]
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rotate encouraging text periodically
  useEffect(() => {
    const promptInterval = setInterval(() => {
      setActivePromptIndex((prev) => (prev + 1) % ENCOURAGING_PROMPTS.length);
    }, 6000);
    return () => clearInterval(promptInterval);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

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
    onAddSystemLog(`Processing chat: "${textToSend.substring(0, 30)}..."`, 'tracking');

    const valClean = textToSend.toLowerCase().trim();
    let handledLocally = false;
    let addedTaskTitle: string | null = null;
    let deletedTaskTitle: string | null = null;

    // --- ROBUST NLP PARSING ---
    // 1. Check for DELETE requests first
    const deleteKeywords = ["delete", "remove", "discard", "cancel", "clear", "get rid of", "erase", "trash", "remove task", "delete task"];
    let isDeleteRequest = false;
    let extractedDeleteTitle = "";

    for (const kw of deleteKeywords) {
      if (valClean.includes(kw)) {
        const index = valClean.indexOf(kw);
        // Get raw text from the user input after the keyword
        const rawTarget = textToSend.substring(index + kw.length).trim();
        // Clean up common noise words
        const cleanedTarget = rawTarget
          .replace(/^(?:the\s+)?(?:task|todo|assignment|milestone|project)?\s*(?:called|named)?\s*/i, "")
          .trim();
        const strippedTarget = cleanedTarget.replace(/^["']|["']$/g, "").trim();
        
        if (strippedTarget && strippedTarget.length > 1) {
          isDeleteRequest = true;
          extractedDeleteTitle = strippedTarget;
          break;
        }
      }
    }

    if (isDeleteRequest && extractedDeleteTitle && onDeleteTask) {
      const found = currentTasks.find(t => 
        t.title.toLowerCase().includes(extractedDeleteTitle.toLowerCase()) || 
        extractedDeleteTitle.toLowerCase().includes(t.title.toLowerCase())
      );
      if (found) {
        onDeleteTask(found.id);
        handledLocally = true;
        deletedTaskTitle = found.title;
      }
    }

    // 2. Check for ADD requests (if not already handled as delete)
    if (!handledLocally) {
      const addKeywords = ["add task", "create task", "add todo", "create todo", "add a task", "create a task", "add a new task", "create a new task", "add", "create", "schedule", "insert", "make", "new task", "plan"];
      let isAddRequest = false;
      let extractedAddTitle = "";

      for (const kw of addKeywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        const match = textToSend.match(regex);
        if (match && match.index !== undefined) {
          const rawTarget = textToSend.substring(match.index + match[0].length).trim();
          // Clean up noise words
          const cleanedTarget = rawTarget
            .replace(/^(?:a\s+)?(?:new\s+)?(?:task|todo|assignment|milestone|project)?\s*(?:called|named|to|for)?\s*/i, "")
            .trim();
          const strippedTarget = cleanedTarget.replace(/^["']|["']$/g, "").trim();

          // Reject matches if stripped target is a command keyword like "task", "todo", "pomodoro"
          const lower = strippedTarget.toLowerCase();
          if (
            strippedTarget &&
            strippedTarget.length > 1 &&
            lower !== "task" &&
            lower !== "todo" &&
            !lower.startsWith("blocking") &&
            !lower.includes("pomodoro") &&
            !lower.includes("frog") &&
            !lower.includes("technique") &&
            !lower.includes("guide") &&
            !lower.includes("strategy") &&
            !lower.includes("how to")
          ) {
            isAddRequest = true;
            extractedAddTitle = strippedTarget;
            break;
          }
        }
      }

      if (isAddRequest && extractedAddTitle && onAddTask) {
        const capitalizedTitle = extractedAddTitle.charAt(0).toUpperCase() + extractedAddTitle.slice(1);
        const newTask: Task = {
          id: 'task-' + Math.random().toString(36).substring(2, 9),
          title: capitalizedTitle,
          originalDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
          priority: 'medium',
          estimatedHours: 2,
          status: 'backlog',
          description: 'Added via chat companion command.',
          subtasks: []
        };
        onAddTask(newTask);
        handledLocally = true;
        addedTaskTitle = capitalizedTitle;
      }
    }

    // Prepare updated tasks state to send to Gemini/Express API so backend is fully synchronized
    let updatedTasks = [...currentTasks];
    if (addedTaskTitle) {
      const addedTaskMock: Task = {
        id: 'temp-id',
        title: addedTaskTitle,
        originalDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        estimatedHours: 2,
        status: 'backlog',
        description: 'Added via chat companion command.',
        subtasks: []
      };
      updatedTasks = [addedTaskMock, ...updatedTasks];
    } else if (deletedTaskTitle) {
      updatedTasks = updatedTasks.filter(t => t.title !== deletedTaskTitle);
    }

    // Intercept optimization commands
    if (valClean.includes("lock") || valClean.includes("optimize") || valClean.includes("schedule")) {
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
          currentTasksState: updatedTasks
        })
      });

      if (!resp.ok) throw new Error("Connection error inside server");

      const data = await resp.json();
      if (data.success) {
        let replyText = data.text;
        if (addedTaskTitle) {
          replyText = `🚀 **Task Added Successfully!** I've added **"${addedTaskTitle}"** to your backlog.\n\n` + replyText;
        } else if (deletedTaskTitle) {
          replyText = `🗑️ **Task Discarded Successfully!** I've removed **"${deletedTaskTitle}"** from your agenda.\n\n` + replyText;
        }

        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: data.suggestions
        }]);

        // Intercept action if returned by real Gemini and not handled locally yet
        if (!handledLocally && data.action) {
          if (data.action.type === 'add_task' && onAddTask) {
            const t = data.action.task;
            const newTask: Task = {
              id: 'task-' + Math.random().toString(36).substring(2, 9),
              title: t.title,
              originalDeadline: t.originalDeadline || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
              priority: t.priority || 'medium',
              estimatedHours: t.estimatedHours || 2,
              status: 'backlog',
              description: t.description || 'Added via Chat Companion.',
              subtasks: [] // Strict rule: No subtasks of your own!
            };
            onAddTask(newTask);
          } else if (data.action.type === 'delete_task' && onDeleteTask) {
            let idToDelete = data.action.taskId;
            if (!idToDelete && data.action.taskTitle) {
              const found = currentTasks.find(t => t.title.toLowerCase().includes(data.action.taskTitle.toLowerCase()));
              if (found) {
                idToDelete = found.id;
              }
            }
            if (idToDelete) {
              onDeleteTask(idToDelete);
            }
          }
        }

        onAddSystemLog("AI response formulated.", "info");
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      console.warn("Using offline fallback rule for chat.", err);
      setTimeout(() => {
        let reply = "";
        if (addedTaskTitle) {
          reply = `🚀 **Task Added Successfully!** I've added **"${addedTaskTitle}"** to your backlog board without any extra subtasks.\n\nFor best time management, try the **Feynman Technique** or **Time Blocking** to conquer this efficiently!`;
        } else if (deletedTaskTitle) {
          reply = `🗑️ **Task Discarded Successfully!** I've removed **"${deletedTaskTitle}"** from your agenda list.\n\nKeeping your desk clean is the first step to beating procrastination!`;
        } else {
          reply = "I am actively monitoring your agenda! ";
          if (valClean.includes("pomodoro")) {
            reply += "The **Pomodoro Technique** is a time management method where you work for 25 minutes followed by a 5-minute break. This prevents mental fatigue and maintains peak performance!";
          } else if (valClean.includes("frog")) {
            reply += "The **Eat the Frog** strategy means tackling your most important, difficult task first thing in the morning when your concentration battery is full!";
          } else if (valClean.includes("block")) {
            reply += "**Time Blocking** is when you assign explicit focus slots in your calendar for specific tasks, turning a passive to-do list into an active deadline-defense plan.";
          } else {
            reply += "I recommend setting up a 45-minute focus session tonight. Click **Lock in Focus Blocks** to organize empty calendar spots instantly!";
          }
        }

        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: addedTaskTitle ? ["Set due date", "Re-optimize week"] : ["Lock in Study Sessions", "Show techniques", "Help me schedule"]
        }]);
      }, 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. CLOSED FLOATING STATE (ActionButton + SpeechBubble) */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex items-center gap-3 pointer-events-none" id="floating-chat-trigger-container">
            {/* Encouraging text bubble */}
            {showSpeechBubble && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                key={activePromptIndex}
                className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 text-purple-400 font-sans text-[10px] sm:text-xs pl-3 sm:pl-4 pr-1.5 sm:pr-2.5 py-1.5 sm:py-2.5 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-1.5 sm:gap-2 select-none relative max-w-[200px] sm:max-w-xs"
              >
                <div 
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:text-purple-300 mr-1" 
                  onClick={() => setIsOpen(true)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                  <span className="font-medium tracking-tight leading-snug">{ENCOURAGING_PROMPTS[activePromptIndex]}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeechBubble(false);
                  }}
                  className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer shrink-0"
                  title="Hide message"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {/* Pulsing trigger button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-xl hover:shadow-purple-500/10 hover:scale-105 active:scale-95 transition-all duration-200 pointer-events-auto cursor-pointer relative shrink-0 group"
              title="Open Chat Companion"
            >
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-neutral-950 animate-bounce" />
              <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* 2. OPENED POPUP DIALOG STATE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[380px] h-[520px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] sm:max-h-[600px] z-[100] bg-neutral-900/95 backdrop-blur-md border border-neutral-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            id="chat-assistant-container"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 p-4 bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400 animate-pulse" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Savers Chat Companion
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-950/80 border border-neutral-800/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="font-mono text-[9px] text-neutral-400">ONLINE</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 p-1.5 rounded-lg transition-all cursor-pointer"
                  title="Hide Companion"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border text-[10px] ${
                      msg.role === 'user' 
                        ? 'bg-neutral-950 border-neutral-800 text-purple-400' 
                        : 'bg-gradient-to-br from-purple-500/10 to-neutral-950 border-purple-500/20 text-purple-400'
                    }`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-tr from-purple-600 to-cyan-500 text-white rounded-tr-none font-medium'
                          : 'bg-slate-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 border border-slate-200/80 dark:border-neutral-800/60 rounded-tl-none font-sans'
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
                    <div className="w-6 h-6 rounded-lg bg-neutral-950 border border-neutral-800 text-purple-400 flex items-center justify-center skeleton">
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
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {messages[messages.length - 1].suggestions?.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    className="text-[10px] font-sans px-2.5 py-1 rounded-full bg-neutral-950/80 hover:bg-neutral-900 text-neutral-400 hover:text-purple-400 border border-neutral-800 hover:border-purple-500/30 transition-all duration-200 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex items-center gap-2 p-4 bg-neutral-950/40 border-t border-neutral-800/50 mt-auto"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask advice, type 'add task [name]'..."
                className="flex-1 bg-neutral-950 text-neutral-100 rounded-xl px-3.5 py-2.5 border border-neutral-800/80 text-xs focus:outline-none focus:border-purple-500/50"
                disabled={sending}
              />
              <button
                type="submit"
                className="aspect-square h-[36px] rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white transition-colors cursor-pointer shrink-0"
                disabled={sending || !inputText.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
